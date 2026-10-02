/**
 * screenshotStorage.js — Galeria interna de capturas do emulador do ZEREI!
 * 
 * Regra de Segurança: As fotos que podem ser publicadas no Feed ou no Mural de Dicas
 * provêm EXCLUSIVAMENTE do canvas do emulador interno do site e são gravadas
 * localmente no IndexedDB do navegador. Não é permitido upload de imagens do sistema/disco.
 */

const DB_NAME = 'zerei_emulator_media'
const DB_VERSION = 1
const STORE_NAME = 'screenshots'

function openDatabase() {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB não suportado neste ambiente.'))
      return
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = (event) => {
      const db = event.target.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
        store.createIndex('gameId', 'gameId', { unique: false })
        store.createIndex('capturedAt', 'capturedAt', { unique: false })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

/**
 * Salva uma captura de tela originada do canvas do emulador
 */
export async function saveScreenshot({ gameId = 'retro-game', gameTitle = 'Jogo Retrô', dataUrl, caption = '' }) {
  if (!dataUrl) throw new Error('Dados de imagem ausentes.')
  const db = await openDatabase()

  const id = `sc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
  const item = {
    id,
    gameId,
    gameTitle,
    dataUrl,
    caption: caption.trim(),
    capturedAt: new Date().toISOString(),
    isFromZereiEmulator: true, // Tag de autenticidade da engine interna
  }

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const request = store.put(item)

    request.onsuccess = () => resolve(item)
    request.onerror = () => reject(request.error)
  })
}

/**
 * Lista todas as screenshots salvas no dispositivo (ordenadas da mais recente para a mais antiga)
 */
export async function listMyScreenshots(gameId = null) {
  try {
    const db = await openDatabase()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const request = store.getAll()

      request.onsuccess = () => {
        let items = request.result || []
        if (gameId) {
          items = items.filter((i) => i.gameId === gameId)
        }
        // Ordena por data decrescente
        items.sort((a, b) => new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime())
        resolve(items)
      }
      request.onerror = () => reject(request.error)
    })
  } catch (err) {
    console.warn('Erro ao listar screenshots da galeria interna:', err)
    return []
  }
}

/**
 * Obtém uma captura específica
 */
export async function getScreenshotById(id) {
  if (!id) return null
  const db = await openDatabase()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const request = store.get(id)

    request.onsuccess = () => resolve(request.result || null)
    request.onerror = () => reject(request.error)
  })
}

/**
 * Deleta uma captura da galeria
 */
export async function deleteScreenshot(id) {
  if (!id) return
  const db = await openDatabase()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const request = store.delete(id)

    request.onsuccess = () => resolve(true)
    request.onerror = () => reject(request.error)
  })
}

