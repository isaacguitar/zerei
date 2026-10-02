import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore'
import { firestore } from '../../firebaseClient'
import { getCurrentUser } from '../auth/authService'
import { logActivity } from '../feed/activityService'
import { awardXp } from '../gamification/xpService'

// Local storage keys for social features
const FOLLOWS_STORAGE_KEY = 'zerei_social_follows'
const FRIEND_REQUESTS_STORAGE_KEY = 'zerei_friend_requests'
const BLOCKS_STORAGE_KEY = 'zerei_social_blocks'
const REPORTS_STORAGE_KEY = 'zerei_social_reports'

export const INITIAL_MOCK_USERS = []

function getLocalData(key, fallback = []) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function setLocalData(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {}
}

function getLocalFriendRequests() {
  return getLocalData(FRIEND_REQUESTS_STORAGE_KEY, [])
}

function setLocalFriendRequests(requests) {
  setLocalData(FRIEND_REQUESTS_STORAGE_KEY, requests)
  window.dispatchEvent(new CustomEvent('zerei:friend_requests_updated'))
}

/**
 * Retorna todos os relacionamentos de follow locais:
 * [{ followerId, targetUserId, createdAt, isMutual }]
 */
function getLocalFollows() {
  return getLocalData(FOLLOWS_STORAGE_KEY, [])
}

/**
 * Envia uma solicitação de amizade para um jogador.
 * A amizade só é estabelecida quando o destinatário aceita!
 */
export async function sendFriendRequest(targetUser) {
  const current = getCurrentUser()
  if (!current?.id || !targetUser?.id) throw new Error('Usuário inválido')
  if (current.id === targetUser.id) throw new Error('Você não pode enviar solicitação para si mesmo')

  const requestId = `${current.id}_${targetUser.id}`

  if (firestore) {
    try {
      const requestRef = doc(firestore, 'friendRequests', requestId)
      await setDoc(requestRef, {
        senderId: current.id,
        senderName: current.displayName || 'Jogador',
        senderAvatar: current.avatarUrl || '',
        targetUserId: targetUser.id,
        targetUserName: targetUser.displayName || 'Jogador',
        targetUserAvatar: targetUser.avatarUrl || '',
        status: 'pending',
        createdAt: serverTimestamp(),
      })
      logActivity('enviou solicitação de amizade para', null, null, targetUser.displayName).catch(() => {})
      return true
    } catch (err) {
      console.warn('Fallback para friendRequest local:', err)
    }
  }

  const requests = getLocalFriendRequests()
  const existing = requests.find((r) => r.senderId === current.id && r.targetUserId === targetUser.id && r.status === 'pending')
  if (!existing) {
    requests.push({
      id: requestId,
      senderId: current.id,
      senderName: current.displayName || 'Jogador',
      senderAvatar: current.avatarUrl || '',
      targetUserId: targetUser.id,
      targetUserName: targetUser.displayName || 'Jogador',
      targetUserAvatar: targetUser.avatarUrl || '',
      status: 'pending',
      createdAt: Date.now(),
    })
    setLocalFriendRequests(requests)
  }

  return true
}

/**
 * Cancela uma solicitação de amizade pendente enviada anteriormente.
 */
export async function cancelFriendRequest(targetUserId) {
  const current = getCurrentUser()
  if (!current?.id || !targetUserId) return false

  const requestId = `${current.id}_${targetUserId}`

  if (firestore) {
    try {
      await deleteDoc(doc(firestore, 'friendRequests', requestId))
      return true
    } catch (err) {
      console.warn('Fallback cancel friend request:', err)
    }
  }

  const requests = getLocalFriendRequests().filter(
    (r) => !(r.senderId === current.id && r.targetUserId === targetUserId)
  )
  setLocalFriendRequests(requests)
  return true
}

/**
 * Aceita uma solicitação de amizade recebida.
 * Cria a conexão mútua (ambos se seguem como amigos) e concede XP!
 */
export async function acceptFriendRequest(requestOrSenderId) {
  const current = getCurrentUser()
  if (!current?.id) return false

  let senderId = typeof requestOrSenderId === 'string' ? requestOrSenderId : requestOrSenderId.senderId
  let senderUser = typeof requestOrSenderId === 'object' ? requestOrSenderId : null

  if (!senderUser) {
    const mock = INITIAL_MOCK_USERS.find((u) => u.id === senderId)
    senderUser = {
      id: senderId,
      displayName: mock?.displayName || 'Jogador',
      avatarUrl: mock?.avatarUrl || '',
    }
  }

  const requestId = `${senderId}_${current.id}`

  // 1. Atualiza status da solicitação
  if (firestore) {
    try {
      await deleteDoc(doc(firestore, 'friendRequests', requestId))
      // Cria follows mútuos
      await Promise.all([
        setDoc(doc(firestore, 'follows', `${current.id}_${senderId}`), {
          followerId: current.id,
          followerName: current.displayName || 'Jogador',
          followerAvatar: current.avatarUrl || '',
          targetUserId: senderId,
          targetUserName: senderUser.displayName || 'Jogador',
          targetUserAvatar: senderUser.avatarUrl || '',
          createdAt: serverTimestamp(),
        }),
        setDoc(doc(firestore, 'follows', `${senderId}_${current.id}`), {
          followerId: senderId,
          followerName: senderUser.displayName || 'Jogador',
          followerAvatar: senderUser.avatarUrl || '',
          targetUserId: current.id,
          targetUserName: current.displayName || 'Jogador',
          targetUserAvatar: current.avatarUrl || '',
          createdAt: serverTimestamp(),
        }),
      ])
    } catch (err) {
      console.warn('Fallback accept friend request:', err)
    }
  }

  // Local fallback / sync
  const requests = getLocalFriendRequests().filter(
    (r) => !(r.senderId === senderId && r.targetUserId === current.id)
  )
  setLocalFriendRequests(requests)

  const follows = getLocalFollows()
  // Add A -> B
  if (!follows.some((f) => f.followerId === current.id && f.targetUserId === senderId)) {
    follows.push({
      followerId: current.id,
      followerName: current.displayName || 'Jogador',
      followerAvatar: current.avatarUrl || '',
      targetUserId: senderId,
      targetUserName: senderUser.displayName || 'Jogador',
      targetUserAvatar: senderUser.avatarUrl || '',
      createdAt: Date.now(),
    })
  }
  // Add B -> A
  if (!follows.some((f) => f.followerId === senderId && f.targetUserId === current.id)) {
    follows.push({
      followerId: senderId,
      followerName: senderUser.displayName || 'Jogador',
      followerAvatar: senderUser.avatarUrl || '',
      targetUserId: current.id,
      targetUserName: current.displayName || 'Jogador',
      targetUserAvatar: current.avatarUrl || '',
      createdAt: Date.now(),
    })
  }
  setLocalData(FOLLOWS_STORAGE_KEY, follows)

  // Dá XP para quem aceitou
  awardXp(current.id, 30, 'Novo amigo adicionado! 🤝').catch(() => {})
  logActivity('aceitou o pedido de amizade de', null, null, senderUser.displayName).catch(() => {})
  return true
}

/**
 * Rejeita ou ignora uma solicitação de amizade recebida.
 */
export async function rejectFriendRequest(senderId) {
  const current = getCurrentUser()
  if (!current?.id || !senderId) return false

  const requestId = `${senderId}_${current.id}`

  if (firestore) {
    try {
      await deleteDoc(doc(firestore, 'friendRequests', requestId))
      return true
    } catch (err) {
      console.warn('Fallback reject friend request:', err)
    }
  }

  const requests = getLocalFriendRequests().filter(
    (r) => !(r.senderId === senderId && r.targetUserId === current.id)
  )
  setLocalFriendRequests(requests)
  return true
}

/**
 * Lista as solicitações de amizade pendentes recebidas pelo usuário
 */
export async function listPendingReceivedRequests(userId) {
  const current = getCurrentUser()
  const uid = userId || current?.id
  if (!uid) return []

  if (firestore) {
    try {
      const q = query(
        collection(firestore, 'friendRequests'),
        where('targetUserId', '==', uid),
        where('status', '==', 'pending')
      )
      const snap = await getDocs(q)
      if (!snap.empty) {
        return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      }
    } catch (err) {
      console.warn('Fallback list received friend requests:', err)
    }
  }

  const requests = getLocalFriendRequests()
  return requests.filter((r) => r.targetUserId === uid && r.status === 'pending')
}

/**
 * Seguir ou solicitar amizade (para compatibilidade)
 */
export async function followUser(targetUser) {
  return sendFriendRequest(targetUser)
}

/**
 * Desfazer amizade / deixar de seguir
 */
export async function unfollowUser(targetUserId) {
  const current = getCurrentUser()
  if (!current?.id || !targetUserId) return false

  if (firestore) {
    try {
      const myFollowId = `${current.id}_${targetUserId}`
      const theirFollowId = `${targetUserId}_${current.id}`
      await Promise.all([
        deleteDoc(doc(firestore, 'follows', myFollowId)),
        deleteDoc(doc(firestore, 'follows', theirFollowId)),
      ])
      return true
    } catch (err) {
      console.warn('Fallback para unfollow local:', err)
    }
  }

  // Remove ambos os sentidos (amizade desfeita)
  const follows = getLocalFollows().filter(
    (f) =>
      !(
        (f.followerId === current.id && f.targetUserId === targetUserId) ||
        (f.followerId === targetUserId && f.targetUserId === current.id)
      )
  )
  setLocalData(FOLLOWS_STORAGE_KEY, follows)
  return true
}

/**
 * Verifica o status de amizade entre dois usuários:
 * { isFollowing, isFollower, isMutual, isPendingSent, isPendingReceived, isBlocked, isSelf }
 */
export async function getFriendshipStatus(currentUserId, targetUserId) {
  if (!currentUserId || !targetUserId || currentUserId === targetUserId) {
    return {
      isFollowing: false,
      isFollower: false,
      isMutual: false,
      isPendingSent: false,
      isPendingReceived: false,
      isBlocked: false,
      isSelf: currentUserId === targetUserId,
    }
  }

  const blockedList = getLocalData(BLOCKS_STORAGE_KEY, [])
  const isBlocked = blockedList.some(
    (b) => b.blockerId === currentUserId && b.blockedId === targetUserId
  )

  if (firestore) {
    try {
      const myFollowSnap = await getDoc(doc(firestore, 'follows', `${currentUserId}_${targetUserId}`))
      const theirFollowSnap = await getDoc(doc(firestore, 'follows', `${targetUserId}_${currentUserId}`))
      const sentReqSnap = await getDoc(doc(firestore, 'friendRequests', `${currentUserId}_${targetUserId}`))
      const receivedReqSnap = await getDoc(doc(firestore, 'friendRequests', `${targetUserId}_${currentUserId}`))

      const isFollowing = myFollowSnap.exists()
      const isFollower = theirFollowSnap.exists()
      const isMutual = isFollowing && isFollower
      const isPendingSent = sentReqSnap.exists() && sentReqSnap.data().status === 'pending'
      const isPendingReceived = receivedReqSnap.exists() && receivedReqSnap.data().status === 'pending'

      return { isFollowing, isFollower, isMutual, isPendingSent, isPendingReceived, isBlocked, isSelf: false }
    } catch (err) {
      console.warn('Erro ao consultar Firestore follows, usando local:', err)
    }
  }

  const follows = getLocalFollows()
  const isFollowing = follows.some((f) => f.followerId === currentUserId && f.targetUserId === targetUserId)
  const isFollower = follows.some((f) => f.followerId === targetUserId && f.targetUserId === currentUserId)
  const isMutual = isFollowing && isFollower

  const requests = getLocalFriendRequests()
  const isPendingSent = requests.some(
    (r) => r.senderId === currentUserId && r.targetUserId === targetUserId && r.status === 'pending'
  )
  const isPendingReceived = requests.some(
    (r) => r.senderId === targetUserId && r.targetUserId === currentUserId && r.status === 'pending'
  )

  return { isFollowing, isFollower, isMutual, isPendingSent, isPendingReceived, isBlocked, isSelf: false }
}

/**
 * Estatísticas sociais de um usuário:
 * { followersCount, followingCount, friendsCount }
 */
export async function getUserSocialStats(userId) {
  if (!userId) return { followersCount: 0, followingCount: 0, friendsCount: 0 }

  if (firestore) {
    try {
      const followersQuery = query(collection(firestore, 'follows'), where('targetUserId', '==', userId))
      const followingQuery = query(collection(firestore, 'follows'), where('followerId', '==', userId))

      const [followersSnap, followingSnap] = await Promise.all([
        getDocs(followersQuery),
        getDocs(followingQuery),
      ])

      const followersIds = new Set(followersSnap.docs.map((d) => d.data().followerId))
      const followingIds = new Set(followingSnap.docs.map((d) => d.data().targetUserId))

      let mutualCount = 0
      for (const id of followersIds) {
        if (followingIds.has(id)) mutualCount++
      }

      return {
        followersCount: followersSnap.size,
        followingCount: followingSnap.size,
        friendsCount: mutualCount,
      }
    } catch (err) {
      console.warn('Erro ao carregar stats do Firestore, fallback local:', err)
    }
  }

  const follows = getLocalFollows()
  const followers = follows.filter((f) => f.targetUserId === userId)
  const following = follows.filter((f) => f.followerId === userId)

  const followerSet = new Set(followers.map((f) => f.followerId))
  let mutualCount = 0
  for (const f of following) {
    if (followerSet.has(f.targetUserId)) mutualCount++
  }

  return {
    followersCount: followers.length,
    followingCount: following.length,
    friendsCount: mutualCount,
  }
}

/**
 * Lista todos os amigos mútuos do usuário
 */
export async function listMutualFriends(userId) {
  if (!userId) return []

  const follows = getLocalFollows()
  const myFollowing = follows.filter((f) => f.followerId === userId)
  const myFollowers = new Set(follows.filter((f) => f.targetUserId === userId).map((f) => f.followerId))

  const mutuals = myFollowing
    .filter((f) => myFollowers.has(f.targetUserId))
    .map((f) => {
      const mock = INITIAL_MOCK_USERS.find((u) => u.id === f.targetUserId)
      return {
        id: f.targetUserId,
        displayName: f.targetUserName || mock?.displayName || 'Jogador',
        avatarUrl: f.targetUserAvatar || mock?.avatarUrl || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${f.targetUserId}`,
        level: mock?.level || 10,
        rank: mock?.rank || 'Novato',
        online: mock?.online ?? true,
      }
    })

  return mutuals
}

/**
 * Lista todos os seguidores e seguidos do usuário
 */
export async function listUserConnections(userId) {
  const follows = getLocalFollows()
  const following = follows.filter((f) => f.followerId === userId)
  const followers = follows.filter((f) => f.targetUserId === userId)

  const mapItem = (id, name, avatar) => {
    const mock = INITIAL_MOCK_USERS.find((u) => u.id === id)
    return {
      id,
      displayName: name || mock?.displayName || 'Jogador',
      avatarUrl: avatar || mock?.avatarUrl || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${id}`,
      level: mock?.level || 1,
      rank: mock?.rank || 'Novato',
      online: mock?.online ?? false,
    }
  }

  return {
    following: following.map((f) => mapItem(f.targetUserId, f.targetUserName, f.targetUserAvatar)),
    followers: followers.map((f) => mapItem(f.followerId, f.followerName, f.followerAvatar)),
  }
}

/**
 * Bloquear um usuário
 */
export async function blockUser(targetUserId, targetUserName = '') {
  const current = getCurrentUser()
  if (!current?.id || !targetUserId) return false

  // Unfollow first
  await unfollowUser(targetUserId).catch(() => {})

  const blocks = getLocalData(BLOCKS_STORAGE_KEY, [])
  if (!blocks.some((b) => b.blockerId === current.id && b.blockedId === targetUserId)) {
    blocks.push({
      blockerId: current.id,
      blockedId: targetUserId,
      targetUserName,
      createdAt: Date.now(),
    })
    setLocalData(BLOCKS_STORAGE_KEY, blocks)
  }

  if (firestore) {
    try {
      await setDoc(doc(firestore, 'blocks', `${current.id}_${targetUserId}`), {
        blockerId: current.id,
        blockedId: targetUserId,
        createdAt: serverTimestamp(),
      })
    } catch {}
  }

  return true
}

/**
 * Desbloquear um usuário
 */
export async function unblockUser(targetUserId) {
  const current = getCurrentUser()
  if (!current?.id || !targetUserId) return false

  const blocks = getLocalData(BLOCKS_STORAGE_KEY, []).filter(
    (b) => !(b.blockerId === current.id && b.blockedId === targetUserId)
  )
  setLocalData(BLOCKS_STORAGE_KEY, blocks)

  if (firestore) {
    try {
      await deleteDoc(doc(firestore, 'blocks', `${current.id}_${targetUserId}`))
    } catch {}
  }

  return true
}

/**
 * Denunciar um usuário
 */
export async function reportUser({ targetUserId, targetUserName, category, details }) {
  const current = getCurrentUser()
  const reportPayload = {
    reporterId: current?.id || 'anonymous',
    reporterName: current?.displayName || 'Jogador',
    targetUserId,
    targetUserName,
    category,
    details: details?.trim() || '',
    createdAt: new Date().toISOString(),
    status: 'pending',
  }

  if (firestore) {
    try {
      const reportsRef = collection(firestore, 'reports')
      const docRef = doc(reportsRef)
      await setDoc(docRef, { ...reportPayload, createdAt: serverTimestamp() })
      return true
    } catch (err) {
      console.warn('Erro ao enviar denúncia para a nuvem:', err)
    }
  }

  const reports = getLocalData(REPORTS_STORAGE_KEY, [])
  reports.push({ ...reportPayload, id: crypto.randomUUID() })
  setLocalData(REPORTS_STORAGE_KEY, reports)

  // Penalidade de XP para o usuário denunciado
  if (targetUserId) {
    awardXp(targetUserId, -50, 'Penalidade: Denúncia recebida ⚠️').catch(() => {})
  }

  return true
}

/**
 * Retorna jogadores que já estiveram em clubes com você
 */
export async function getClubCoMembers(userId) {
  return []
}

/**
 * Retorna sugestões de amizade (amigos de amigos / membros ativos)
 */
export async function getFriendSuggestions(userId) {
  return []
}

/**
 * Pesquisa usuários da comunidade no Firestore pelo nome, clube ou nick do RA
 */
export async function searchCommunityUsers(searchTerm = '', currentUserId = null) {
  const term = searchTerm.trim().toLowerCase()
  const uid = currentUserId || getCurrentUser()?.id

  let allUsers = []

  if (firestore) {
    try {
      const snap = await getDocs(collection(firestore, 'users'))
      if (!snap.empty) {
        allUsers = snap.docs.map((d) => {
          const data = d.data()
          return {
            id: d.id,
            displayName: data.displayName || 'Jogador',
            avatarUrl: data.avatarUrl || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(data.displayName || d.id)}`,
            level: data.level || 1,
            rank: data.rank || 'Novato',
            xp: data.xp || 0,
            retroAchievementsUsername: data.retroAchievementsUsername || null,
            retroAchievementsPoints: data.retroAchievementsPoints || 0,
            online: true,
          }
        })
      }
    } catch (err) {
      console.warn('Erro ao consultar coleção users no Firestore:', err)
    }
  }

  // Filtrar o próprio usuário
  let filtered = allUsers.filter((u) => u.id !== uid)

  // Se houver termo de busca, filtra pelo termo
  if (term) {
    filtered = filtered.filter((u) => {
      const name = (u.displayName || '').toLowerCase()
      const ra = (u.retroAchievementsUsername || '').toLowerCase()
      return name.includes(term) || ra.includes(term)
    })
  }

  // Resolver status de amizade de cada usuário
  const enriched = await Promise.all(
    filtered.map(async (u) => {
      const status = await getFriendshipStatus(uid, u.id)
      return {
        ...u,
        friendshipStatus: status,
      }
    })
  )

  return enriched
}


