import { collection, deleteDoc, doc, getDoc, getDocs, runTransaction, serverTimestamp } from 'firebase/firestore'
import { deleteObject, getBytes, ref, uploadBytes } from 'firebase/storage'
import { firebaseStorage, firestore } from '../../firebaseClient'
import { getCurrentUser, isCloudUser } from '../auth/authService'

export const cloudSaveLimitBytes = 100 * 1024 * 1024

function getCloudUserId() {
  return isCloudUser() ? getCurrentUser()?.id : null
}

function canUseCloudStorage() {
  return Boolean(firebaseStorage && firestore && getCloudUserId())
}

function safeSegment(value) {
  return encodeURIComponent(String(value || 'unknown')).replaceAll('%', '_').slice(0, 120)
}

function documentId({ gameId, kind, romHash, slotId }) {
  return [safeSegment(gameId), kind, romHash, safeSegment(slotId)].join('__')
}

function saveDocument(userId, descriptor) {
  return doc(firestore, 'users', userId, 'cloud_saves', documentId(descriptor))
}

function objectPath(userId, descriptor, revision, objectId) {
  return [
    'users', userId, 'game-saves', safeSegment(descriptor.gameId), descriptor.kind,
    descriptor.romHash, safeSegment(descriptor.slotId), `${revision}-${objectId}.bin`,
  ].join('/')
}

function randomId() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function conflictResult(currentRevision) {
  return { cloudSynced: false, conflict: true, currentRevision }
}

export async function uploadCloudSave({ gameId, kind, slotId, romHash, data, snapshot = null, core = null, savedAt, expectedRevision = 0 }) {
  const userId = getCloudUserId()
  if (!canUseCloudStorage()) return { cloudSynced: false, reason: 'cloud-account-required' }
  if (!romHash) return { cloudSynced: false, reason: 'rom-hash-unavailable' }
  if (!data?.byteLength) return { cloudSynced: false, reason: 'empty-save' }
  if (data.byteLength > cloudSaveLimitBytes) return { cloudSynced: false, reason: 'save-too-large' }

  const descriptor = { gameId, kind, slotId, romHash }
  const metadataRef = saveDocument(userId, descriptor)
  const beforeUpload = await getDoc(metadataRef)
  const currentRevision = beforeUpload.exists() ? Number(beforeUpload.data().revision || 0) : 0
  if (Number(expectedRevision || 0) !== currentRevision) return conflictResult(currentRevision)

  const revision = currentRevision + 1
  const storagePath = objectPath(userId, descriptor, revision, randomId())
  const fileRef = ref(firebaseStorage, storagePath)
  await uploadBytes(fileRef, data, {
    contentType: 'application/octet-stream',
    customMetadata: {
      ownerId: userId,
      gameId: String(gameId),
      kind,
      romHash,
      slotId: String(slotId),
      revision: String(revision),
    },
  })

  try {
    await runTransaction(firestore, async (transaction) => {
      const latest = await transaction.get(metadataRef)
      const latestRevision = latest.exists() ? Number(latest.data().revision || 0) : 0
      if (latestRevision !== currentRevision) {
        const error = new Error('Outro dispositivo atualizou este save durante o envio.')
        error.code = 'save/conflict'
        throw error
      }
      transaction.set(metadataRef, {
        userId,
        gameId,
        kind,
        slotId,
        romHash,
        revision,
        storagePath,
        byteLength: data.byteLength,
        snapshot,
        core,
        savedAt,
        updatedAt: serverTimestamp(),
      })
    })
  } catch (error) {
    await deleteObject(fileRef).catch(() => {})
    if (error.code === 'save/conflict') return conflictResult(currentRevision + 1)
    throw error
  }

  const previousPath = beforeUpload.exists() ? beforeUpload.data().storagePath : null
  if (previousPath && previousPath !== storagePath) {
    await deleteObject(ref(firebaseStorage, previousPath)).catch(() => {})
  }

  return { cloudSynced: true, revision, storagePath }
}

export async function downloadCloudSave({ gameId, kind, slotId, romHash }) {
  if (!canUseCloudStorage() || !romHash) return null
  const userId = getCloudUserId()
  const snapshot = await getDoc(saveDocument(userId, { gameId, kind, slotId, romHash }))
  if (!snapshot.exists()) return null

  const metadata = snapshot.data()
  if (metadata.romHash !== romHash || !metadata.storagePath) return null
  const data = await getBytes(ref(firebaseStorage, metadata.storagePath), cloudSaveLimitBytes)
  return {
    ...metadata,
    data: new Uint8Array(data),
    cloudSynced: true,
    verified: true,
  }
}

export async function listCloudSaves({ gameId, kind, romHash }) {
  if (!canUseCloudStorage() || !romHash) return []
  const userId = getCloudUserId()
  const snapshot = await getDocs(collection(firestore, 'users', userId, 'cloud_saves'))
  return snapshot.docs
    .map((item) => ({ id: item.id, ...item.data() }))
    .filter((item) => item.gameId === gameId && item.kind === kind && item.romHash === romHash)
    .map((item) => ({ ...item, cloudSynced: true, verified: true }))
}

export async function deleteCloudSave({ gameId, kind, slotId, romHash }) {
  if (!canUseCloudStorage() || !romHash) return false
  const userId = getCloudUserId()
  const metadataRef = saveDocument(userId, { gameId, kind, slotId, romHash })
  const snapshot = await getDoc(metadataRef)
  if (!snapshot.exists()) return true

  const storagePath = snapshot.data().storagePath
  await deleteDoc(metadataRef)
  if (storagePath) await deleteObject(ref(firebaseStorage, storagePath)).catch(() => {})
  return true
}
