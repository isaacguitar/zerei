import { addDoc, collection, getDocs, orderBy, query, serverTimestamp } from 'firebase/firestore'
import { firebaseAuth, firestore } from '../../firebaseClient'
import { getCurrentUser } from '../auth/authService'
import { logActivity } from '../feed/activityService'
import { awardXp } from '../gamification/xpService'

const localKey = (clubId, gameId) => `zerei-checkpoints:${clubId}:${gameId}`
const canUseCloudCheckpoints = () => Boolean(firestore && firebaseAuth?.currentUser)

function normalizeCheckpoint(data, id) {
  return {
    id,
    title: data.title,
    note: data.note || '',
    userId: data.userId,
    author: data.author || 'Jogador',
    createdAt: data.createdAt?.toDate?.()?.toISOString?.() || data.createdAt || new Date().toISOString(),
  }
}

export async function listCheckpoints(clubId, gameId) {
  if (canUseCloudCheckpoints()) {
    try {
      const result = await getDocs(query(collection(firestore, 'clubs', clubId, 'games', gameId, 'checkpoints'), orderBy('createdAt', 'desc')))
      return result.docs.map((snapshot) => normalizeCheckpoint(snapshot.data(), snapshot.id))
    } catch {
      return readLocalCheckpoints(clubId, gameId)
    }
  }

  return readLocalCheckpoints(clubId, gameId)
}

export async function createCheckpoint(clubId, gameId, { title, note }) {
  const user = getCurrentUser()
  const payload = {
    title: title.trim(),
    note: note.trim(),
    userId: user?.id || 'local-user',
    author: user?.displayName || 'Jogador',
  }

  // Concede +20 XP por registro no diário de bordo
  if (user?.id) {
    awardXp(user.id, 20, 'Nota no diário de bordo', { isCheckpoint: true }).catch(() => {})
  }

  if (canUseCloudCheckpoints()) {
    try {
      const reference = await addDoc(collection(firestore, 'clubs', clubId, 'games', gameId, 'checkpoints'), {
        ...payload,
        createdAt: serverTimestamp(),
      })
      
      // Assíncrono sem aguardar para não travar a UI
      logActivity({
        action: `escreveu no diário de bordo sobre o jogo`,
        game: gameId,
      }).catch(console.warn)

      return normalizeCheckpoint(payload, reference.id)
    } catch {
      return saveLocalCheckpoint(clubId, gameId, payload)
    }
  }

  return saveLocalCheckpoint(clubId, gameId, payload)
}

function readLocalCheckpoints(clubId, gameId) {
  try {
    return JSON.parse(window.localStorage.getItem(localKey(clubId, gameId)) || '[]')
  } catch {
    return []
  }
}

function saveLocalCheckpoint(clubId, gameId, payload) {
  const checkpoint = normalizeCheckpoint({ ...payload, createdAt: new Date().toISOString() }, crypto.randomUUID())
  const checkpoints = readLocalCheckpoints(clubId, gameId)
  window.localStorage.setItem(localKey(clubId, gameId), JSON.stringify([checkpoint, ...checkpoints]))
  return checkpoint
}
