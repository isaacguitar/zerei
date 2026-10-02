import { addDoc, collection, doc, getDoc, limit, onSnapshot, orderBy, query, serverTimestamp } from 'firebase/firestore'
import { firebaseAuth, firestore } from '../../firebaseClient'
import { getCurrentUser } from '../auth/authService'

function canUseCloudChat() {
  return Boolean(firestore && firebaseAuth?.currentUser)
}

const localChatKey = (clubId) => `zerei-chat:${clubId}`

function sanitizeText(value, maxLength = 500) {
  return String(value ?? '')
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength)
}

function normalizeMessage(docSnapshot) {
  const data = docSnapshot.data ? docSnapshot.data() : docSnapshot
  return {
    id: docSnapshot.id || crypto.randomUUID(),
    author: sanitizeText(data.author || 'Jogador', 40),
    authorId: sanitizeText(data.authorId || '', 80),
    text: sanitizeText(data.text || '', 500),
    type: data.type || 'user',
    avatarUrl: data.avatarUrl || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(data.author || 'Jogador')}`,
    createdAt: data.createdAt?.toDate?.() || (data.createdAt ? new Date(data.createdAt) : new Date()),
  }
}

function getLocalMessages(clubId) {
  try {
    return JSON.parse(window.localStorage.getItem(localChatKey(clubId)) || '[]').map(normalizeMessage)
  } catch {
    return []
  }
}

function saveLocalMessage(clubId, message) {
  const list = getLocalMessages(clubId)
  const updated = [...list, message].slice(-50)
  try {
    window.localStorage.setItem(localChatKey(clubId), JSON.stringify(updated))
  } catch {}
  return updated
}

export function subscribeToChat(clubId, onUpdate) {
  if (!canUseCloudChat()) {
    onUpdate(getLocalMessages(clubId))
    return () => {}
  }

  let unsub = null
  let active = true

  const startListener = async () => {
    let col = 'clubs'
    try {
      const roomSnap = await getDoc(doc(firestore, 'game_rooms', clubId))
      if (roomSnap.exists()) {
        col = 'game_rooms'
      }
    } catch {}

    if (!active) return

    const messagesRef = collection(firestore, col, clubId, 'messages')
    const q = query(messagesRef, orderBy('createdAt', 'desc'), limit(50))

    unsub = onSnapshot(q, (snapshot) => {
      const messages = snapshot.docs.map(normalizeMessage)
      onUpdate(messages.reverse())
    }, (error) => {
      console.warn('Fallback para chat local:', error.message)
      onUpdate(getLocalMessages(clubId))
    })
  }

  startListener()

  return () => {
    active = false
    unsub?.()
  }
}

export async function sendMessage(clubId, text, type = 'user') {
  const cleanText = sanitizeText(text, 500)
  if (!cleanText) return

  const user = getCurrentUser()
  const payload = {
    text: cleanText,
    authorId: sanitizeText(user?.id || 'local-user', 80),
    author: sanitizeText(user?.displayName || 'Jogador', 40),
    avatarUrl: user?.avatarUrl || '',
    type,
    createdAt: serverTimestamp(),
  }

  if (canUseCloudChat()) {
    try {
      let col = 'clubs'
      try {
        const roomSnap = await getDoc(doc(firestore, 'game_rooms', clubId))
        if (roomSnap.exists()) {
          col = 'game_rooms'
        }
      } catch {}

      const messagesRef = collection(firestore, col, clubId, 'messages')
      await addDoc(messagesRef, payload)
      return
    } catch (cloudError) {
      console.warn('Erro ao enviar mensagem para a nuvem, salvando localmente:', cloudError)
    }
  }

  // Local fallback
  const localMsg = normalizeMessage({
    ...payload,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  })
  saveLocalMessage(clubId, localMsg)
}

export async function sendSystemMessage(clubId, text) {
  return sendMessage(clubId, text, 'system')
}

