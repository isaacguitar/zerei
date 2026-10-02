import { collection, deleteDoc, doc, getDoc, getDocs } from 'firebase/firestore'
import { firestore } from '../../firebaseClient'
import { getCurrentUser, isCloudUser } from '../auth/authService'
import {
  cloudSaveLimitBytes,
  deleteCloudSave,
  downloadCloudSave,
  listCloudSaves,
  uploadCloudSave,
} from './cloudSaveService'

const databaseName = 'zerei-local-cache'
const romStoreName = 'roms'
const romBlobStoreName = 'romBlobs'
const saveStoreName = 'saveStates'
export const romStorageLimit = 500 * 1024 * 1024
export const saveDataLimitBytes = cloudSaveLimitBytes

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(databaseName, 3)

    request.onupgradeneeded = () => {
      const database = request.result

      if (!database.objectStoreNames.contains(romStoreName)) {
        database.createObjectStore(romStoreName, { keyPath: 'gameId' })
      }

      if (!database.objectStoreNames.contains(romBlobStoreName)) {
        database.createObjectStore(romBlobStoreName, { keyPath: 'hash' })
      }

      if (!database.objectStoreNames.contains(saveStoreName)) {
        database.createObjectStore(saveStoreName, { keyPath: 'id' })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function saveLocalRom(gameId, file) {
  const hash = await hashFile(file)
  const database = await openDatabase()
  const current = await readRomRecord(database, gameId)
  const records = await readAllRomRecords(database)
  const blobs = await readAllRomBlobs(database)
  const existingBlob = await readRomBlob(database, hash)
  const currentHashReferences = records.filter((record) => record.hash === current?.hash).length
  const legacyBytes = records.filter((record) => record.buffer && record.gameId !== gameId).reduce((total, record) => total + (record.size || 0), 0)
  const blobBytes = blobs.reduce((total, blob) => total + (blob.size || 0), 0)
  const orphanedCurrentBytes = current?.hash && currentHashReferences === 1 ? (blobs.find((blob) => blob.hash === current.hash)?.size || 0) : 0
  const projectedBytes = blobBytes + legacyBytes - orphanedCurrentBytes + (existingBlob ? 0 : file.size)
  if (projectedBytes > romStorageLimit) {
    database.close()
    throw new Error('O cache de ROMs atingiu o limite de 500 MB. Remova uma ROM antes de adicionar outra.')
  }
  await new Promise((resolve, reject) => {
    const transaction = database.transaction([romStoreName, romBlobStoreName], 'readwrite')
    if (!existingBlob) transaction.objectStore(romBlobStoreName).put({ hash, buffer: file, size: file.size, fileName: file.name, type: file.type })
    transaction.objectStore(romStoreName).put({
      gameId,
      fileName: file.name,
      size: file.size,
      type: file.type,
      hash,
      savedAt: new Date().toISOString(),
    })
    transaction.oncomplete = resolve
    transaction.onerror = () => reject(transaction.error)
  })
  database.close()
}

export async function getLocalRomMetadata(gameId) {
  // 1. Verifica se há uma ROM vinculada na biblioteca de ROMs nativa
  try {
    const rawAssignments = localStorage.getItem('zerei:game_rom_assignments')
    if (rawAssignments) {
      const map = JSON.parse(rawAssignments)
      const assigned = map[gameId]
      if (assigned) {
        return {
          gameId,
          fileName: assigned.fileName,
          size: assigned.fileSize || assigned.size || 0,
          filePath: assigned.filePath || null,
          savedAt: assigned.modifiedAt || new Date().toISOString(),
          isNativeLibrary: true,
        }
      }
    }
  } catch {}

  // 2. Fallback para IndexedDB (modo Web)
  const database = await openDatabase()
  const metadata = await new Promise((resolve, reject) => {
    const request = database.transaction(romStoreName, 'readonly').objectStore(romStoreName).get(gameId)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
  database.close()
  return metadata ? { gameId: metadata.gameId, fileName: metadata.fileName, size: metadata.size, hash: metadata.hash || null, savedAt: metadata.savedAt } : null
}

export async function getLocalRomFile(gameId) {
  // 1. Se for aplicativo nativo e tiver ROM vinculada da biblioteca local
  try {
    const rawAssignments = localStorage.getItem('zerei:game_rom_assignments')
    if (rawAssignments) {
      const map = JSON.parse(rawAssignments)
      const assigned = map[gameId]
      if (assigned?.filePath && window.zereiNative?.readRomBuffer) {
        const buffer = await window.zereiNative.readRomBuffer(assigned.filePath)
        const blob = new Blob([buffer])
        return new File([blob], assigned.fileName, { type: 'application/octet-stream' })
      }
    }
  } catch (err) {
    console.warn('Erro ao ler ROM nativa do disco:', err)
  }

  // 2. Fallback para IndexedDB
  const database = await openDatabase()

  try {
    const record = await new Promise((resolve, reject) => {
      const request = database.transaction(romStoreName, 'readonly').objectStore(romStoreName).get(gameId)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })

    if (!record) return null
    if (record.buffer) return record.buffer

    const blob = await readRomBlob(database, record.hash)
    return blob?.buffer ?? null
  } finally {
    database.close()
  }
}

export async function useCachedRom(targetGameId, sourceGameId) {
  const database = await openDatabase()
  try {
    const sourceRecord = await readRomRecord(database, sourceGameId)
    if (!sourceRecord) {
      throw new Error('ROM de origem não encontrada no cache.')
    }

    const payload = {
      gameId: targetGameId,
      fileName: sourceRecord.fileName,
      size: sourceRecord.size,
      type: sourceRecord.type,
      hash: sourceRecord.hash,
      buffer: sourceRecord.buffer || null,
      savedAt: new Date().toISOString(),
    }

    await new Promise((resolve, reject) => {
      const transaction = database.transaction(romStoreName, 'readwrite')
      transaction.objectStore(romStoreName).put(payload)
      transaction.oncomplete = resolve
      transaction.onerror = () => reject(transaction.error)
    })

    return {
      gameId: targetGameId,
      fileName: payload.fileName,
      size: payload.size,
      savedAt: payload.savedAt,
    }
  } finally {
    database.close()
  }
}

export async function deleteLocalRom(gameId) {
  const database = await openDatabase()
  await new Promise((resolve, reject) => {
    const transaction = database.transaction(romStoreName, 'readwrite')
    const request = transaction.objectStore(romStoreName).delete(gameId)
    request.onerror = () => reject(request.error)
    transaction.oncomplete = resolve
    transaction.onerror = () => reject(transaction.error)
  })
  await removeOrphanedRomBlobs(database)
  database.close()
}

export async function getRomStorageInfo() {
  const database = await openDatabase()
  const records = await readAllRomRecords(database)
  const blobs = await readAllRomBlobs(database)
  const bytes = blobs.reduce((total, blob) => total + (blob.size || 0), 0) + records.filter((record) => record.buffer && !record.hash).reduce((total, record) => total + (record.size || 0), 0)
  database.close()
  return { bytes, limit: romStorageLimit, count: records.length }
}

export async function listLocalRoms() {
  const database = await openDatabase()
  const records = await readAllRomRecords(database)
  database.close()
  return records.map(({ gameId, fileName, size, savedAt }) => ({ gameId, fileName, size, savedAt }))
}

export async function requestPersistentStorage() {
  if (!navigator.storage?.persist) return false
  try {
    return await navigator.storage.persist()
  } catch {
    return false
  }
}

function hashFile(file) {
  return file.arrayBuffer().then((buffer) => crypto.subtle.digest('SHA-256', buffer)).then((digest) => Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join(''))
}

function readRomRecord(database, gameId) {
  return new Promise((resolve, reject) => {
    const request = database.transaction(romStoreName, 'readonly').objectStore(romStoreName).get(gameId)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function readAllRomRecords(database) {
  return new Promise((resolve, reject) => {
    const request = database.transaction(romStoreName, 'readonly').objectStore(romStoreName).getAll()
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function readRomBlob(database, hash) {
  return new Promise((resolve, reject) => {
    const request = database.transaction(romBlobStoreName, 'readonly').objectStore(romBlobStoreName).get(hash)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function readAllRomBlobs(database) {
  return new Promise((resolve, reject) => {
    const request = database.transaction(romBlobStoreName, 'readonly').objectStore(romBlobStoreName).getAll()
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function removeOrphanedRomBlobs(database) {
  const records = await readAllRomRecords(database)
  const hashes = new Set(records.map((record) => record.hash).filter(Boolean))
  const blobs = await readAllRomBlobs(database)
  await new Promise((resolve, reject) => {
    const transaction = database.transaction(romBlobStoreName, 'readwrite')
    blobs.filter((blob) => !hashes.has(blob.hash)).forEach((blob) => transaction.objectStore(romBlobStoreName).delete(blob.hash))
    transaction.oncomplete = resolve
    transaction.onerror = () => reject(transaction.error)
  })
}

function getCloudUserId() {
  return isCloudUser() ? getCurrentUser()?.id : null
}

function getUserScope() {
  return getCurrentUser()?.id || 'anonymous'
}

function toSaveBytes(value) {
  if (value instanceof Uint8Array) return value
  if (value instanceof ArrayBuffer) return new Uint8Array(value)
  if (ArrayBuffer.isView(value)) return new Uint8Array(value.buffer, value.byteOffset, value.byteLength)
  return Uint8Array.from(value || [])
}

function localSaveId(userId, gameId, kind, romHash, slotId) {
  return `${userId}:${gameId}:${kind}:${romHash || 'unverified'}:${slotId}`
}

async function writeLocalSave(record) {
  const database = await openDatabase()
  try {
    await new Promise((resolve, reject) => {
      const transaction = database.transaction(saveStoreName, 'readwrite')
      transaction.objectStore(saveStoreName).put(record)
      transaction.oncomplete = resolve
      transaction.onerror = () => reject(transaction.error)
    })
  } finally {
    database.close()
  }
  return record
}

async function archiveLocalConflict(record) {
  if (!record?.conflict || record.conflictCopy) return
  await writeLocalSave({
    ...record,
    id: `${record.id}:conflict:${new Date(record.savedAt).getTime()}`,
    conflictCopy: true,
  })
}

async function readLocalSave(gameId, kind, romHash, slotId) {
  const database = await openDatabase()
  try {
    return await new Promise((resolve, reject) => {
      const request = database.transaction(saveStoreName, 'readonly').objectStore(saveStoreName)
        .get(localSaveId(getUserScope(), gameId, kind, romHash, slotId))
      request.onsuccess = () => resolve(request.result || null)
      request.onerror = () => reject(request.error)
    })
  } finally {
    database.close()
  }
}

async function listLocalSaves(gameId, kind, romHash) {
  const database = await openDatabase()
  try {
    return await new Promise((resolve, reject) => {
      const request = database.transaction(saveStoreName, 'readonly').objectStore(saveStoreName).getAll()
      request.onsuccess = () => resolve(request.result.filter((record) =>
        !record.conflictCopy && record.userId === getUserScope() && record.gameId === gameId && record.kind === kind && record.romHash === romHash
      ))
      request.onerror = () => reject(request.error)
    })
  } finally {
    database.close()
  }
}

export async function saveGameData(gameId, kind, slotId, romHash, data, {
  expectedRevision = 0,
  snapshot = null,
  core = null,
} = {}) {
  if (!['state', 'sram'].includes(kind)) throw new Error('Tipo de save inválido.')
  const bytes = toSaveBytes(data)
  if (!bytes.byteLength) throw new Error('O save está vazio.')
  if (bytes.byteLength > saveDataLimitBytes) throw new Error('O save ultrapassa o limite de 100 MB.')

  const payload = {
    id: localSaveId(getUserScope(), gameId, kind, romHash, slotId),
    userId: getUserScope(),
    gameId,
    kind,
    slotId,
    romHash: romHash || null,
    data: bytes,
    snapshot,
    core,
    revision: Number(expectedRevision || 0),
    cloudSynced: false,
    savedAt: new Date().toISOString(),
  }
  await archiveLocalConflict(await readLocalSave(gameId, kind, romHash, slotId))
  await writeLocalSave(payload)

  try {
    const result = await uploadCloudSave({
      gameId,
      kind,
      slotId,
      romHash,
      data: bytes,
      snapshot,
      core,
      savedAt: payload.savedAt,
      expectedRevision: payload.revision,
    })
    const saved = { ...payload, ...result, conflict: Boolean(result.conflict) }
    await writeLocalSave(saved)
    return saved
  } catch (error) {
    console.warn('Save mantido localmente; falha na sincronização cloud:', error)
    return { ...payload, cloudSynced: false, error: error.message || 'Falha ao enviar para a nuvem.' }
  }
}

export async function loadGameData(gameId, kind, romHash, slotId) {
  const local = await readLocalSave(gameId, kind, romHash, slotId)
  try {
    const cloud = await downloadCloudSave({ gameId, kind, slotId, romHash })
    if (cloud) {
      const payload = {
        id: localSaveId(getUserScope(), gameId, kind, romHash, slotId),
        userId: getUserScope(),
        ...cloud,
        gameId,
        kind,
        slotId,
        romHash,
      }
      if (local?.conflict) return { ...payload, localConflictAvailable: true }
      if (!local || local.cloudSynced !== false || new Date(cloud.savedAt) >= new Date(local.savedAt)) {
        await writeLocalSave(payload)
        return payload
      }
    }
  } catch (error) {
    console.warn('Usando cache local do save:', error)
  }
  return local ? { ...local, data: toSaveBytes(local.data) } : null
}

export async function listGameDataSlots(gameId, kind, romHash) {
  const localRecords = await listLocalSaves(gameId, kind, romHash)
  const bySlot = new Map(localRecords.map((record) => [record.slotId, { ...record, data: undefined }]))
  try {
    const cloudRecords = await listCloudSaves({ gameId, kind, romHash })
    cloudRecords.forEach((record) => {
      const current = bySlot.get(record.slotId)
      if (!current || current.cloudSynced !== false || new Date(record.savedAt) >= new Date(current.savedAt)) {
        bySlot.set(record.slotId, record)
      }
    })
  } catch (error) {
    console.warn('Falha ao listar saves cloud; mantendo cache local:', error)
  }
  return [...bySlot.values()].sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt))
}

export async function syncPendingGameData(gameId, romHash) {
  if (!getCloudUserId() || !romHash) return { synced: 0, conflicts: [] }
  let synced = 0
  const conflicts = []

  for (const kind of ['state', 'sram']) {
    const pending = (await listLocalSaves(gameId, kind, romHash)).filter((record) => !record.cloudSynced && !record.conflict)
    for (const record of pending) {
      try {
        const result = await uploadCloudSave({
          gameId,
          kind,
          slotId: record.slotId,
          romHash,
          data: toSaveBytes(record.data),
          snapshot: record.snapshot || null,
          core: record.core || null,
          savedAt: record.savedAt,
          expectedRevision: Number(record.revision || 0),
        })
        const updated = { ...record, ...result, conflict: Boolean(result.conflict) }
        await writeLocalSave(updated)
        if (result.cloudSynced) synced++
        if (result.conflict) conflicts.push({ kind, slotId: record.slotId })
      } catch (error) {
        console.warn('Save pendente continua somente local:', error)
      }
    }
  }

  return { synced, conflicts }
}

export async function deleteGameData(gameId, kind, slotId, romHash) {
  await deleteCloudSave({ gameId, kind, slotId, romHash })
  const database = await openDatabase()
  try {
    await new Promise((resolve, reject) => {
      const request = database.transaction(saveStoreName, 'readwrite').objectStore(saveStoreName)
        .delete(localSaveId(getUserScope(), gameId, kind, romHash, slotId))
      request.onsuccess = resolve
      request.onerror = () => reject(request.error)
    })
  } finally {
    database.close()
  }
}

export async function getRomHash(gameId, romOverride = null) {
  try {
    if (romOverride?.filePath && window.zereiNative?.hashRomFile) {
      return await window.zereiNative.hashRomFile(romOverride.filePath)
    }
    const rawAssignments = localStorage.getItem('zerei:game_rom_assignments')
    const assigned = rawAssignments ? JSON.parse(rawAssignments)[gameId] : null
    if (assigned?.filePath && window.zereiNative?.hashRomFile) {
      return await window.zereiNative.hashRomFile(assigned.filePath)
    }
  } catch (error) {
    console.warn('Não foi possível calcular o hash da ROM local:', error)
  }

  const metadata = await getLocalRomMetadata(gameId)
  if (metadata?.hash) return metadata.hash
  const file = await getLocalRomFile(gameId)
  return file ? hashFile(file) : null
}

async function getLegacyLocalState(gameId, slotId) {
  const database = await openDatabase()
  try {
    return await new Promise((resolve, reject) => {
      const store = database.transaction(saveStoreName, 'readonly').objectStore(saveStoreName)
      const scoped = store.get(`${getUserScope()}:${gameId}:${slotId}`)
      scoped.onsuccess = () => {
        if (scoped.result) return resolve(scoped.result)
        const fallback = store.get(`${gameId}:${slotId}`)
        fallback.onsuccess = () => resolve(fallback.result || null)
        fallback.onerror = () => reject(fallback.error)
      }
      scoped.onerror = () => reject(scoped.error)
    })
  } finally {
    database.close()
  }
}

async function listLegacyLocalStates(gameId) {
  const database = await openDatabase()
  try {
    return await new Promise((resolve, reject) => {
      const request = database.transaction(saveStoreName, 'readonly').objectStore(saveStoreName).getAll()
      request.onsuccess = () => resolve(request.result.filter((record) =>
        record.gameId === gameId && !record.kind && record.userId === getUserScope()
      ))
      request.onerror = () => reject(request.error)
    })
  } finally {
    database.close()
  }
}

export async function saveGameState(gameId, slotId, snapshot, state, options = {}) {
  return saveGameData(gameId, 'state', slotId, options.romHash, state, {
    expectedRevision: options.expectedRevision,
    snapshot,
    core: options.core,
  })
}

export async function getGameStateSlots(gameId, { romHash } = {}) {
  const slots = await listGameDataSlots(gameId, 'state', romHash)
  const knownSlots = new Set(slots.map((slot) => slot.slotId))

  const legacyLocal = await listLegacyLocalStates(gameId)
  legacyLocal.forEach((record) => {
    if (knownSlots.has(record.slotId)) return
    slots.push({
      id: record.id,
      slotId: record.slotId,
      savedAt: record.savedAt,
      snapshot: record.snapshot || null,
      revision: 0,
      cloudSynced: false,
      verified: false,
      legacy: true,
    })
    knownSlots.add(record.slotId)
  })

  if (getCloudUserId() && firestore) {
    try {
      const legacy = await getDocs(collection(firestore, 'users', getCloudUserId(), 'saveStates', gameId, 'slots'))
      legacy.docs.forEach((item) => {
        const data = item.data()
        const slotId = data.slotId || item.id
        if (knownSlots.has(slotId)) return
        slots.push({
          id: item.id,
          slotId,
          savedAt: data.savedAt,
          snapshot: data.snapshot || null,
          revision: 0,
          cloudSynced: true,
          verified: false,
          legacy: true,
        })
        knownSlots.add(slotId)
      })
    } catch (error) {
      console.warn('Falha ao consultar slots antigos:', error)
    }
  }
  return slots.sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt))
}

export async function loadGameState(gameId, slotId, { romHash } = {}) {
  const current = await loadGameData(gameId, 'state', romHash, slotId)
  if (current) {
    return {
      snapshot: current.snapshot,
      state: toSaveBytes(current.data),
      revision: Number(current.revision || 0),
      verified: Boolean(romHash && current.romHash === romHash),
      cloudSynced: Boolean(current.cloudSynced),
    }
  }

  const localLegacy = await getLegacyLocalState(gameId, slotId)
  if (localLegacy) {
    return {
      snapshot: localLegacy.snapshot,
      state: toSaveBytes(localLegacy.state),
      revision: 0,
      verified: false,
      legacy: true,
      cloudSynced: false,
    }
  }

  if (getCloudUserId() && firestore) {
    try {
      const legacyRef = doc(firestore, 'users', getCloudUserId(), 'saveStates', gameId, 'slots', slotId)
      const legacy = await getDoc(legacyRef)
      if (legacy.exists()) {
        const data = legacy.data()
        return {
          snapshot: data.snapshot,
          state: toSaveBytes(data.state),
          revision: 0,
          verified: false,
          legacy: true,
          cloudSynced: true,
        }
      }
    } catch (error) {
      console.warn('Falha ao carregar slot antigo:', error)
    }
  }
  return null
}

export async function deleteGameState(gameId, slotId, { romHash } = {}) {
  await deleteGameData(gameId, 'state', slotId, romHash)
  if (getCloudUserId() && firestore) {
    await deleteDoc(doc(firestore, 'users', getCloudUserId(), 'saveStates', gameId, 'slots', slotId)).catch(() => {})
  }
  const database = await openDatabase()
  try {
    await new Promise((resolve, reject) => {
      const transaction = database.transaction(saveStoreName, 'readwrite')
      const store = transaction.objectStore(saveStoreName)
      store.delete(`${getUserScope()}:${gameId}:${slotId}`)
      store.delete(`${gameId}:${slotId}`)
      transaction.oncomplete = resolve
      transaction.onerror = () => reject(transaction.error)
    })
  } finally {
    database.close()
  }
}
