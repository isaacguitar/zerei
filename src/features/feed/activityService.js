import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore'
import { firebaseAuth, firestore } from '../../firebaseClient'
import { getCurrentUser } from '../auth/authService'

function canUseCloudActivities() {
  return Boolean(firestore && firebaseAuth?.currentUser)
}

function sanitizeText(value, maxLength = 500) {
  return String(value ?? '')
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength)
}

function normalizeActivity(docSnapshot) {
  const data = docSnapshot.data()
  return {
    id: docSnapshot.id,
    authorId: data.authorId || null,
    author: sanitizeText(data.author || 'Jogador', 40),
    avatarUrl: data.avatarUrl || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(data.author || 'Jogador')}`,
    type: data.type || 'post', // 'post' | 'screenshot' | 'achievement' | 'room_invite' | 'club_invite' | 'game_beaten' | 'tip'
    action: sanitizeText(data.action || '', 120),
    text: sanitizeText(data.text || data.caption || '', 500),
    game: sanitizeText(data.game || data.gameTitle || null, 80),
    gameTitle: sanitizeText(data.gameTitle || data.game || null, 80),
    achievement: data.achievement || null,
    badgeUrl: data.badgeUrl || null,
    points: Number(data.points || 0),
    imageUrl: data.imageUrl || null, // Screenshot do emulador do ZEREI!
    visibility: data.visibility || 'public', // 'public' | 'restricted' | 'friends' | 'club'
    clubId: data.clubId || null,
    clubName: data.clubName || null,
    clubTag: data.clubTag || null,
    inviteCode: data.inviteCode || null,
    roomId: data.roomId || null,
    roomName: data.roomName || null,
    roomCoverUrl: data.roomCoverUrl || null,
    roomConsole: data.roomConsole || null,
    reactions: data.reactions && typeof data.reactions === 'object' ? data.reactions : {},
    likes: Array.isArray(data.likes) ? data.likes : (Array.isArray(data.reactions?.['❤️']) ? data.reactions['❤️'] : []),
    commentCount: Number(data.commentCount || 0),
    createdAt: data.createdAt?.toDate?.() || new Date(),
  }
}

/**
 * Cria uma nova publicação interativa no Feed
 */
export async function createFeedPost({
  text = '',
  imageUrl = null,
  gameTitle = null,
  visibility = 'public',
  clubId = null,
  clubName = null,
  type = 'post',
  metadata = {},
}) {
  const user = getCurrentUser()
  if (!user?.id) throw new Error('Faça login para publicar no Feed.')
  if (!firestore) throw new Error('Firestore indisponível.')

  const cleanText = sanitizeText(text, 500)
  if (!cleanText && !imageUrl) {
    throw new Error('A publicação deve conter um texto ou uma captura de tela.')
  }

  const payload = {
    authorId: sanitizeText(user.id, 80),
    author: sanitizeText(user.displayName || 'Jogador', 40),
    avatarUrl: user.avatarUrl || '',
    type: imageUrl && type === 'post' ? 'screenshot' : type,
    action: sanitizeText(type === 'screenshot' ? 'compartilhou uma captura de tela' : 'publicou', 120),
    text: cleanText,
    imageUrl: imageUrl || null,
    game: sanitizeText(gameTitle?.trim() || null, 80),
    gameTitle: sanitizeText(gameTitle?.trim() || null, 80),
    visibility, // 'public' | 'restricted' | 'friends' | 'club'
    clubId: clubId || null,
    clubName: clubName || null,
    reactions: {
      '❤️': [],
      '🔥': [],
      '🏆': [],
      '👾': [],
    },
    ...metadata,
    createdAt: serverTimestamp(),
  }

  const ref = await addDoc(collection(firestore, 'activities'), payload)
  return { id: ref.id, ...payload }
}

/**
 * Publica um convite direto para uma Sala de Jogos no Feed
 */
export async function publishRoomInvite(room, { message = '', visibility = 'public' } = {}) {
  const user = getCurrentUser()
  if (!user?.id) throw new Error('Faça login para compartilhar convite.')
  if (!firestore) throw new Error('Firestore indisponível.')

  const gameTitle = room.gameTitle || room.title || 'Jogo da Sala'

  return createFeedPost({
    text: message.trim() || `🎮 Venha jogar ${gameTitle} comigo nesta rodada!`,
    gameTitle,
    type: 'room_invite',
    visibility,
    clubId: room.clubId || null,
    clubName: room.clubName || null,
    metadata: {
      action: `convidou para uma sala de`,
      roomId: room.id,
      roomName: room.title || room.name || gameTitle,
      roomCoverUrl: room.gameCoverUrl || null,
      roomConsole: room.gameConsole || null,
      clubTag: room.clubTag || null,
    },
  })
}

/**
 * Publica um convite para um Clube no Feed
 */
export async function publishClubInvite(club, { message = '', visibility = 'public' } = {}) {
  const user = getCurrentUser()
  if (!user?.id) throw new Error('Faça login para compartilhar convite.')
  if (!firestore) throw new Error('Firestore indisponível.')

  return createFeedPost({
    text: message.trim() || `🛡️ Entre no clube [${club.tag || 'CLUBE'}] ${club.name}! Código: ${club.inviteCode}`,
    type: 'club_invite',
    visibility,
    clubId: club.id,
    clubName: club.name,
    metadata: {
      action: `convidou para o clube`,
      clubId: club.id,
      clubTag: club.tag || null,
      inviteCode: club.inviteCode || null,
    },
  })
}

/**
 * Alterna reação do usuário em um item do feed (❤️, 🔥, 🏆, 👾)
 */
export async function toggleFeedReaction(activityId, reactionType = '❤️') {
  const user = getCurrentUser()
  if (!user?.id || !firestore || !activityId) return

  const actRef = doc(firestore, 'activities', activityId)

  await runTransaction(firestore, async (transaction) => {
    const snap = await transaction.get(actRef)
    if (!snap.exists()) return

    const data = snap.data()
    const currentReactions = data.reactions && typeof data.reactions === 'object' ? { ...data.reactions } : {}
    const usersInReaction = Array.isArray(currentReactions[reactionType]) ? [...currentReactions[reactionType]] : []

    const alreadyReacted = usersInReaction.includes(user.id)

    if (alreadyReacted) {
      currentReactions[reactionType] = usersInReaction.filter((uid) => uid !== user.id)
    } else {
      currentReactions[reactionType] = [...usersInReaction, user.id]
    }

    transaction.update(actRef, { reactions: currentReactions })
  })
}

/**
 * Alterna curtida (coração) em um item do feed
 */
export async function toggleFeedLike(activityId) {
  const user = getCurrentUser()
  if (!user?.id || !firestore || !activityId) return

  const actRef = doc(firestore, 'activities', activityId)
  const snap = await getDoc(actRef)
  if (!snap.exists()) return

  const data = snap.data()
  const currentLikes = Array.isArray(data.likes)
    ? data.likes
    : Array.isArray(data.reactions?.['❤️'])
    ? data.reactions['❤️']
    : []

  const alreadyLiked = currentLikes.includes(user.id)
  if (alreadyLiked) {
    await updateDoc(actRef, {
      likes: arrayRemove(user.id),
      'reactions.❤️': arrayRemove(user.id),
    })
  } else {
    await updateDoc(actRef, {
      likes: arrayUnion(user.id),
      'reactions.❤️': arrayUnion(user.id),
    })
  }
}

/**
 * Adiciona um comentário em uma postagem do feed
 */
export async function addCommentToFeedPost(activityId, text) {
  const user = getCurrentUser()
  if (!user?.id) throw new Error('Faça login para comentar.')
  if (!firestore || !activityId) throw new Error('Firestore indisponível.')

  const cleanText = sanitizeText(text, 280)
  if (!cleanText) throw new Error('O comentário não pode estar vazio.')

  const commentsCol = collection(firestore, 'activities', activityId, 'comments')
  const newComment = {
    authorId: sanitizeText(user.id, 80),
    author: sanitizeText(user.displayName || 'Jogador', 40),
    avatarUrl: user.avatarUrl || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(user.displayName || 'Jogador')}`,
    text: cleanText,
    createdAt: serverTimestamp(),
  }

  const commentRef = await addDoc(commentsCol, newComment)

  // Incrementa contador de comentários na atividade pai
  const actRef = doc(firestore, 'activities', activityId)
  await runTransaction(firestore, async (transaction) => {
    const snap = await transaction.get(actRef)
    if (snap.exists()) {
      const curCount = Number(snap.data().commentCount || 0)
      transaction.update(actRef, { commentCount: curCount + 1 })
    }
  }).catch(() => {})

  return { id: commentRef.id, ...newComment }
}

/**
 * Monitora os comentários de uma postagem em tempo real
 */
export function subscribeToFeedPostComments(activityId, onUpdate) {
  if (!firestore || !activityId) {
    onUpdate([])
    return () => {}
  }

  const q = query(
    collection(firestore, 'activities', activityId, 'comments'),
    orderBy('createdAt', 'asc'),
    limit(50)
  )

  return onSnapshot(
    q,
    (snapshot) => {
      const list = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        createdAt: d.data().createdAt?.toDate?.() || new Date(),
      }))
      onUpdate(list)
    },
    (err) => {
      console.warn('Erro ao escutar comentários:', err)
      onUpdate([])
    }
  )
}

/**
 * Verifica se a postagem deve ser exibida ao usuário com base na visibilidade
 */
export function isPostVisibleToUser(post, currentUserId, userFriendIds = [], userClubIds = []) {
  if (!post) return false
  if (post.visibility === 'public') return true
  if (post.authorId === currentUserId) return true

  // 'friends'
  if (post.visibility === 'friends') {
    return userFriendIds.includes(post.authorId)
  }

  // 'club'
  if (post.visibility === 'club') {
    return post.clubId && userClubIds.includes(post.clubId)
  }

  // 'restricted' (Amigos ou Membros do Clube)
  if (post.visibility === 'restricted') {
    const isFriend = userFriendIds.includes(post.authorId)
    const isInClub = post.clubId && userClubIds.includes(post.clubId)
    return isFriend || isInClub
  }

  return true
}

/**
 * Monitora o Feed em tempo real com suporte a filtros e ordenação
 */
export function subscribeToFeed(onUpdate, { maxItems = 40 } = {}) {
  if (!firestore) {
    onUpdate([])
    return () => {}
  }

  const q = query(collection(firestore, 'activities'), orderBy('createdAt', 'desc'), limit(maxItems))

  return onSnapshot(
    q,
    (snapshot) => {
      if (snapshot.empty) {
        onUpdate([])
        return
      }
      const items = snapshot.docs.map(normalizeActivity)
      onUpdate(items)
    },
    (error) => {
      console.warn('Erro ao monitorar feed:', error.message)
      onUpdate([])
    }
  )
}

/**
 * Mantém compatibilidade com chamadas legado do sistema
 */
export function subscribeToGlobalActivities(onUpdate, maxItems = 25) {
  return subscribeToFeed(onUpdate, { maxItems })
}

export async function listGlobalActivities(maxItems = 25) {
  if (!canUseCloudActivities()) return []
  try {
    const q = query(collection(firestore, 'activities'), orderBy('createdAt', 'desc'), limit(maxItems))
    const result = await getDocs(q)
    return result.empty ? [] : result.docs.map(normalizeActivity)
  } catch {
    return []
  }
}

/**
 * Loga atividades automáticas do sistema (com conquistas restritas por padrão)
 */
export async function logActivity({
  action,
  achievement,
  game,
  type = 'post',
  badgeUrl = null,
  points = 0,
  imageUrl = null,
  visibility = null,
}) {
  if (!canUseCloudActivities()) return

  const user = getCurrentUser()
  // Conquistas são restritas por padrão (amigos e membros de clubes)
  const defaultVisibility = type === 'achievement' ? 'restricted' : 'public'

  const payload = {
    authorId: user?.id || 'local-user',
    author: user?.displayName || 'Jogador',
    avatarUrl: user?.avatarUrl || '',
    type,
    action: action || '',
    achievement: achievement || null,
    badgeUrl: badgeUrl || null,
    points: Number(points || 0),
    imageUrl: imageUrl || null,
    game: game || null,
    gameTitle: game || null,
    visibility: visibility || defaultVisibility,
    reactions: {
      '❤️': [],
      '🔥': [],
      '🏆': [],
      '👾': [],
    },
    createdAt: serverTimestamp(),
  }

  try {
    await addDoc(collection(firestore, 'activities'), payload)
  } catch (error) {
    console.warn('Erro ao registrar atividade:', error)
  }
}

/**
 * Exclui uma publicação do Feed (apenas o próprio autor ou admin da plataforma)
 */
export async function deleteFeedPost(activityId) {
  if (!activityId) throw new Error('ID da atividade não especificado.')
  const user = getCurrentUser()
  if (!user?.id) throw new Error('Faça login para excluir uma publicação.')
  if (!firestore) throw new Error('Firestore indisponível.')

  const postRef = doc(firestore, 'activities', activityId)
  const snap = await getDoc(postRef)
  if (!snap.exists()) return

  const data = snap.data()
  const isAuthor = String(data.authorId) === String(user.id)
  const isAdmin = user.email?.toLowerCase() === 'isaacfernandoguitar@gmail.com'

  if (!isAuthor && !isAdmin) {
    throw new Error('Você só pode excluir suas próprias publicações.')
  }

  await deleteDoc(postRef)
}

