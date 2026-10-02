import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore'
import { firestore } from '../../firebaseClient'
import { getCurrentUser } from '../auth/authService'
import { sendMessage, subscribeToChat } from '../game-room/chatService'
import { listMyClubs } from '../clubs/clubService'
import { getFriendshipStatus } from './friendService'

const CONVERSATIONS_STORAGE_KEY = 'zerei_direct_conversations'
const MESSAGES_STORAGE_PREFIX = 'zerei_direct_msgs_'

const MOCK_CHAT_USER_IDS = new Set([
  'user-alana',
  'user-victor',
  'user-lais',
  'user-brenda',
  'user-livinha',
  'user-ingrid',
])

function isMockConversation(conv) {
  if (!conv) return false
  if (
    conv.id &&
    (conv.id.startsWith('conv-alana') ||
      conv.id.startsWith('conv-victor') ||
      conv.id.startsWith('conv-lais') ||
      conv.id.startsWith('conv-brenda') ||
      conv.id.startsWith('conv-livinha') ||
      conv.id.startsWith('conv-ingrid'))
  ) {
    return true
  }

  if (Array.isArray(conv.participantIds) && conv.participantIds.some((id) => MOCK_CHAT_USER_IDS.has(id))) {
    return true
  }
  return false
}

// Limpa dados fictícios persistidos no LocalStorage em sessões anteriores
try {
  const stored = localStorage.getItem(CONVERSATIONS_STORAGE_KEY)
  if (stored) {
    const list = JSON.parse(stored)
    if (Array.isArray(list)) {
      const clean = list.filter((c) => !isMockConversation(c))
      localStorage.setItem(CONVERSATIONS_STORAGE_KEY, JSON.stringify(clean))
    }
  }
  const mockKeys = [
    'zerei_direct_msgs_conv-alana',
    'zerei_direct_msgs_conv-victor',
    'zerei_direct_msgs_conv-lais',
    'zerei_direct_msgs_conv-brenda',
    'zerei_direct_msgs_conv-livinha',
    'zerei_direct_msgs_conv-ingrid',
  ]
  mockKeys.forEach((k) => localStorage.removeItem(k))
} catch {}

/**
 * Retorna lista vazia para conversas (sem mockups fictícios)
 */
function getDefaultMockConversations() {
  return []
}

function getLocalConversations() {
  try {
    const raw = localStorage.getItem(CONVERSATIONS_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((c) => !isMockConversation(c))
  } catch {
    return []
  }
}

function saveLocalConversations(list) {
  try {
    const cleanList = Array.isArray(list) ? list.filter((c) => !isMockConversation(c)) : []
    localStorage.setItem(CONVERSATIONS_STORAGE_KEY, JSON.stringify(cleanList))
    window.dispatchEvent(new CustomEvent('zerei:conversations_updated'))
  } catch {}
}

function getLocalMessages(convId) {
  try {
    const raw = localStorage.getItem(`${MESSAGES_STORAGE_PREFIX}${convId}`)
    if (!raw) return []
    return JSON.parse(raw)
  } catch {
    return []
  }
}

function saveLocalMessages(convId, msgs) {
  try {
    localStorage.setItem(`${MESSAGES_STORAGE_PREFIX}${convId}`, JSON.stringify(msgs))
    window.dispatchEvent(new CustomEvent(`zerei:messages_updated_${convId}`))
  } catch {}
}

/**
 * Formata timestamp relativo estilo Instagram (4 min, 18 min, 1h, 2d)
 */
export function formatRelativeTime(timestamp) {
  if (!timestamp) return ''
  const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp)
  const diffMs = Date.now() - date.getTime()
  const diffMin = Math.floor(diffMs / (60 * 1000))

  if (diffMin < 1) return 'agora'
  if (diffMin < 60) return `${diffMin} min`
  const diffHours = Math.floor(diffMin / 60)
  if (diffHours < 24) return `${diffHours} h`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays} d`
  return `${Math.floor(diffDays / 7)} sem`
}

export function mapClubToConversation(club) {
  return {
    id: `club_${club.id}`,
    clubId: club.id,
    type: 'club',
    title: club.name || 'Clube',
    subtitle: club.gameTitle ? `Rodada: ${club.gameTitle}` : 'Clube da comunidade',
    avatarUrl: club.gameCoverUrl || club.avatarUrl || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(club.name || 'Clube')}`,
    online: true,
    unreadCount: 0,
    updatedAt: club.updatedAt || club.createdAt || Date.now(),
    memberCount: club.memberCount || 1,
  }
}

/**
 * Retorna uma conversa formatada para um clube específico
 */
export async function getClubConversation(clubId, defaultName = 'Chat da Sala') {
  if (!clubId) return null
  try {
    if (firestore) {
      const roomSnap = await getDoc(doc(firestore, 'game_rooms', clubId))
      if (roomSnap.exists()) {
        const roomData = roomSnap.data()
        return {
          id: `club_${clubId}`,
          clubId,
          type: 'club',
          title: roomData.title || defaultName,
          subtitle: roomData.isSolo ? `Quartinho Gamer · ${roomData.gameTitle || ''}` : (roomData.gameTitle ? `Sala: ${roomData.gameTitle}` : 'Chat da Sala'),
          avatarUrl: roomData.gameCoverUrl || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(clubId)}`,
          online: true,
          unreadCount: 0,
          updatedAt: Date.now(),
        }
      }
    }
    const myClubs = await listMyClubs()
    const found = myClubs.find((c) => c.id === clubId)
    if (found) return mapClubToConversation(found)
  } catch (err) {
    console.warn('Erro ao obter dados do clube/sala para o chat:', err)
  }
  return {
    id: `club_${clubId}`,
    clubId,
    type: 'club',
    title: defaultName,
    subtitle: 'Chat da comunidade',
    avatarUrl: `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(clubId)}`,
    online: true,
    unreadCount: 0,
    updatedAt: Date.now(),
  }
}

/**
 * Escuta todas as conversas do usuário (Directs, Grupos e Clubes)
 */
export function subscribeToConversations(userId, onUpdate) {
  if (!userId) return () => {}

  let cachedClubs = []
  listMyClubs()
    .then((clubs) => {
      cachedClubs = (clubs || []).map(mapClubToConversation)
      notify()
    })
    .catch(() => {})

  let currentDirects = []

  function notify() {
    // Unifica clubes e mensagens diretas
    const combined = [...cachedClubs, ...currentDirects]
    onUpdate(combined)
  }

  // Firestore
  if (firestore) {
    try {
      const q = query(
        collection(firestore, 'conversations'),
        where('participantIds', 'array-contains', userId),
        orderBy('updatedAt', 'desc'),
        limit(50)
      )

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          if (snapshot.empty) {
            currentDirects = getLocalConversations()
            notify()
            return
          }
          currentDirects = snapshot.docs
            .map((d) => {
              const data = d.data()
              const otherUser = data.participants?.find((p) => p.id !== userId)
              return {
                id: d.id,
                ...data,
                title: data.type === 'group' ? data.title : otherUser?.displayName || data.title,
                avatarUrl: data.type === 'group' ? data.avatarUrl : otherUser?.avatarUrl || data.avatarUrl,
                online: otherUser?.online ?? false,
                unreadCount: data.unreadCounts?.[userId] || 0,
              }
            })
            .filter((c) => !isMockConversation(c))
          notify()
        },
        (err) => {
          console.warn('Fallback para conversas locais:', err)
          currentDirects = getLocalConversations()
          notify()
        }
      )
      return unsubscribe
    } catch (e) {
      console.warn('Erro ao configurar snapshot de conversas:', e)
    }
  }

  // Local fallback
  const syncLocal = () => {
    const list = getLocalConversations()
    currentDirects = list
      .filter((c) => !isMockConversation(c))
      .map((c) => {
        const otherUser = c.participants?.find((p) => p.id !== userId)
        return {
          ...c,
          title: c.type === 'group' ? c.title : otherUser?.displayName || c.title,
          avatarUrl: c.type === 'group' ? c.avatarUrl : otherUser?.avatarUrl || c.avatarUrl,
          online: otherUser?.online ?? false,
          unreadCount: c.unreadCounts?.[userId] || 0,
        }
      })
    notify()
  }

  syncLocal()
  window.addEventListener('zerei:conversations_updated', syncLocal)
  return () => window.removeEventListener('zerei:conversations_updated', syncLocal)
}

/**
 * Escuta as mensagens de uma conversa específica (Direct ou Clube)
 */
export function subscribeToConversationMessages(convId, onUpdate) {
  if (!convId) return () => {}

  // Se for chat de clube, direciona para o chatService do clube
  if (convId.startsWith('club_')) {
    const clubId = convId.replace('club_', '')
    return subscribeToChat(clubId, onUpdate)
  }

  if (firestore) {
    try {
      const q = query(
        collection(firestore, 'conversations', convId, 'messages'),
        orderBy('createdAt', 'asc'),
        limit(100)
      )

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const msgs = snapshot.docs.map((d) => ({
            id: d.id,
            ...d.data(),
            createdAt: d.data().createdAt?.toDate ? d.data().createdAt.toDate() : new Date(d.data().createdAt),
          }))
          onUpdate(msgs)
        },
        () => {
          onUpdate(getLocalMessages(convId))
        }
      )
      return unsubscribe
    } catch {}
  }

  const syncLocal = () => {
    onUpdate(getLocalMessages(convId))
  }

  syncLocal()
  const eventName = `zerei:messages_updated_${convId}`
  window.addEventListener(eventName, syncLocal)
  return () => window.removeEventListener(eventName, syncLocal)
}

/**
 * Envia uma mensagem direta, de grupo ou de clube
 */
export async function sendDirectMessage(convId, text) {
  const current = getCurrentUser()
  if (!current?.id || !convId || !text?.trim()) return

  // Se for conversa de clube ou sala de jogo (Quartinho Gamer / Salas em Grupo)
  if (convId.startsWith('club_')) {
    const clubId = convId.replace('club_', '')
    return sendMessage(clubId, text)
  }

  // Se for mensagem direta 1x1, valida se são amigos mútuos
  const localConvs = getLocalConversations()
  const conv = localConvs.find((c) => c.id === convId)
  if (conv && conv.type === 'direct') {
    const otherUser = conv.participants?.find((p) => p.id !== current.id)
    if (otherUser?.id) {
      const friendship = await getFriendshipStatus(current.id, otherUser.id)
      if (!friendship.isMutual) {
        throw new Error('Vocês só podem trocar mensagens em DM se ambos forem amigos!')
      }
    }
  }

  const messagePayload = {
    conversationId: convId,
    authorId: current.id,
    author: current.displayName || 'Jogador',
    avatarUrl: current.avatarUrl || '',
    text: text.trim(),
    createdAt: Date.now(),
  }

  // Firestore
  if (firestore) {
    try {
      const convRef = doc(firestore, 'conversations', convId)
      const msgsRef = collection(firestore, 'conversations', convId, 'messages')

      await addDoc(msgsRef, {
        ...messagePayload,
        createdAt: serverTimestamp(),
      })

      const convSnap = await getDoc(convRef)
      if (convSnap.exists()) {
        const convData = convSnap.data()
        const unreadCounts = { ...(convData.unreadCounts || {}) }
        convData.participantIds?.forEach((pid) => {
          if (pid !== current.id) {
            unreadCounts[pid] = (unreadCounts[pid] || 0) + 1
          }
        })

        await updateDoc(convRef, {
          lastMessage: {
            text: text.trim(),
            authorId: current.id,
            authorName: current.displayName || 'Jogador',
            createdAt: serverTimestamp(),
          },
          unreadCounts,
          updatedAt: serverTimestamp(),
        })
      }
      return
    } catch (err) {
      console.warn('Erro ao enviar mensagem para Firestore, fallback local:', err)
    }
  }

  // Local fallback
  const msgs = getLocalMessages(convId)
  msgs.push({
    ...messagePayload,
    id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
  })
  saveLocalMessages(convId, msgs)

  const convs = getLocalConversations()
  const targetConv = convs.find((c) => c.id === convId)
  if (targetConv) {
    targetConv.lastMessage = {
      text: text.trim(),
      authorId: current.id,
      authorName: current.displayName || 'Jogador',
      createdAt: Date.now(),
    }
    targetConv.updatedAt = Date.now()
    targetConv.participantIds?.forEach((pid) => {
      if (pid !== current.id) {
        targetConv.unreadCounts[pid] = (targetConv.unreadCounts[pid] || 0) + 1
      }
    })
    saveLocalConversations(convs)
  }
}

/**
 * Cria ou recupera uma conversa direta existente com um usuário
 */
export async function createOrGetDirectConversation(targetUser) {
  const current = getCurrentUser()
  if (!current?.id || !targetUser?.id) return null

  // Check local first or Firestore
  const convs = getLocalConversations()
  const existing = convs.find(
    (c) =>
      c.type === 'direct' &&
      c.participantIds.includes(current.id) &&
      c.participantIds.includes(targetUser.id)
  )

  if (existing) return existing

  const newConvId = `conv-${current.id}-${targetUser.id}`
  const newConv = {
    id: newConvId,
    type: 'direct',
    participantIds: [current.id, targetUser.id],
    participants: [
      { id: current.id, displayName: current.displayName || 'Jogador', avatarUrl: current.avatarUrl, online: true },
      { id: targetUser.id, displayName: targetUser.displayName || 'Jogador', avatarUrl: targetUser.avatarUrl, online: targetUser.online ?? false },
    ],
    title: targetUser.displayName || 'Jogador',
    avatarUrl: targetUser.avatarUrl || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${targetUser.id}`,
    online: targetUser.online ?? false,
    lastMessage: {
      text: 'Conversa iniciada',
      authorId: current.id,
      authorName: current.displayName || 'Jogador',
      createdAt: Date.now(),
    },
    unreadCounts: {
      [current.id]: 0,
      [targetUser.id]: 0,
    },
    updatedAt: Date.now(),
  }

  if (firestore) {
    try {
      await setDoc(doc(firestore, 'conversations', newConvId), {
        ...newConv,
        updatedAt: serverTimestamp(),
      })
    } catch {}
  }

  convs.unshift(newConv)
  saveLocalConversations(convs)
  return newConv
}

/**
 * Cria uma conversa em grupo
 */
export async function createGroupConversation(title, selectedUsers) {
  const current = getCurrentUser()
  if (!current?.id || !selectedUsers?.length) return null

  const groupId = `group-${Date.now()}`
  const participants = [
    { id: current.id, displayName: current.displayName || 'Jogador', avatarUrl: current.avatarUrl, online: true },
    ...selectedUsers.map((u) => ({
      id: u.id,
      displayName: u.displayName || 'Jogador',
      avatarUrl: u.avatarUrl,
      online: u.online ?? false,
    })),
  ]

  const newGroup = {
    id: groupId,
    type: 'group',
    title: title.trim() || 'Grupo de Amigos',
    avatarUrl: `https://api.dicebear.com/7.x/shapes/svg?seed=${encodeURIComponent(title)}`,
    participantIds: participants.map((p) => p.id),
    participants,
    lastMessage: {
      text: `${current.displayName || 'Jogador'} criou o grupo "${title.trim()}".`,
      authorId: current.id,
      authorName: current.displayName || 'Jogador',
      createdAt: Date.now(),
    },
    unreadCounts: {},
    updatedAt: Date.now(),
  }

  if (firestore) {
    try {
      await setDoc(doc(firestore, 'conversations', groupId), {
        ...newGroup,
        updatedAt: serverTimestamp(),
      })
    } catch {}
  }

  const convs = getLocalConversations()
  convs.unshift(newGroup)
  saveLocalConversations(convs)
  return newGroup
}

/**
 * Marca uma conversa como lida pelo usuário
 */
export function markConversationAsRead(convId, userId) {
  if (!convId || !userId) return

  if (firestore) {
    try {
      const convRef = doc(firestore, 'conversations', convId)
      updateDoc(convRef, {
        [`unreadCounts.${userId}`]: 0,
      }).catch(() => {})
    } catch {}
  }

  const convs = getLocalConversations()
  const target = convs.find((c) => c.id === convId)
  if (target && target.unreadCounts?.[userId] > 0) {
    target.unreadCounts[userId] = 0
    saveLocalConversations(convs)
  }
}

