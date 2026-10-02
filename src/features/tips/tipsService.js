import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  where,
} from 'firebase/firestore'
import { firestore } from '../../firebaseClient'
import { getCurrentUser } from '../auth/authService'
import { logActivity } from '../feed/activityService'

function normalizeTip(snap) {
  const data = snap.data()
  return {
    id: snap.id,
    gameTitle: data.gameTitle || 'Jogo Retrô',
    gameId: data.gameId || null,
    title: data.title || 'Dica da Comunidade',
    content: data.content || '',
    screenshotUrl: data.screenshotUrl || null,
    authorId: data.authorId,
    authorName: data.authorName || 'Jogador',
    authorAvatar: data.authorAvatar || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(data.authorName || 'Jogador')}`,
    likes: Array.isArray(data.likes) ? data.likes : [],
    likesCount: Number(data.likesCount || data.likes?.length || 0),
    createdAt: data.createdAt?.toDate?.() || new Date(),
  }
}

/**
 * Cria uma nova dica (com texto e screenshot do emulador)
 */
export async function createTip({ gameTitle, gameId = null, title, content, screenshotUrl = null }) {
  const user = getCurrentUser()
  if (!user?.id) throw new Error('Faça login para publicar uma dica.')
  if (!firestore) throw new Error('Firestore não inicializado.')

  if (!gameTitle?.trim()) throw new Error('O título do jogo é obrigatório.')
  if (!title?.trim() && !content?.trim()) throw new Error('A dica deve conter título ou conteúdo.')

  const tipPayload = {
    gameTitle: gameTitle.trim(),
    gameId: gameId || null,
    title: title.trim() || `Dica de ${gameTitle.trim()}`,
    content: content.trim(),
    screenshotUrl: screenshotUrl || null,
    authorId: user.id,
    authorName: user.displayName || 'Jogador',
    authorAvatar: user.avatarUrl || '',
    likes: [],
    likesCount: 0,
    createdAt: serverTimestamp(),
  }

  const docRef = await addDoc(collection(firestore, 'game_tips'), tipPayload)

  // Loga no Feed que uma dica foi compartilhada
  await logActivity({
    type: 'tip',
    action: `compartilhou uma dica para`,
    game: gameTitle.trim(),
    achievement: title.trim() || 'DICA ÚTIL',
    imageUrl: screenshotUrl || null,
    visibility: 'public',
  }).catch(() => {})

  return { id: docRef.id, ...tipPayload }
}

/**
 * Lista dicas específicas de um determinado jogo (usado no Mural da Sala de Jogos)
 */
export async function listTipsByGame(gameTitle) {
  if (!firestore || !gameTitle?.trim()) return []
  try {
    const q = query(
      collection(firestore, 'game_tips'),
      where('gameTitle', '==', gameTitle.trim()),
      orderBy('createdAt', 'desc'),
      limit(40)
    )
    const snap = await getDocs(q)
    return snap.docs.map(normalizeTip)
  } catch (err) {
    console.warn('Erro ao listar dicas por jogo:', err)
    return []
  }
}

/**
 * Monitora em tempo real as dicas de um jogo
 */
export function subscribeToGameTips(gameTitle, callback) {
  if (!firestore || !gameTitle?.trim()) {
    callback([])
    return () => {}
  }

  const q = query(
    collection(firestore, 'game_tips'),
    where('gameTitle', '==', gameTitle.trim()),
    orderBy('createdAt', 'desc'),
    limit(40)
  )

  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(normalizeTip))
  }, (err) => {
    console.warn('Erro no listener de dicas:', err)
    callback([])
  })
}

/**
 * Lista todas as dicas da plataforma (com filtro opcional por jogo e busca textual)
 */
export async function listAllTips({ search = '', selectedGame = null, maxCount = 50 } = {}) {
  if (!firestore) return []
  try {
    let q = query(collection(firestore, 'game_tips'), orderBy('createdAt', 'desc'), limit(maxCount))
    if (selectedGame) {
      q = query(collection(firestore, 'game_tips'), where('gameTitle', '==', selectedGame), orderBy('createdAt', 'desc'), limit(maxCount))
    }

    const snap = await getDocs(q)
    let tips = snap.docs.map(normalizeTip)

    if (search.trim()) {
      const lower = search.toLowerCase()
      tips = tips.filter((t) =>
        t.title.toLowerCase().includes(lower) ||
        t.content.toLowerCase().includes(lower) ||
        t.gameTitle.toLowerCase().includes(lower) ||
        t.authorName.toLowerCase().includes(lower)
      )
    }

    return tips
  } catch (err) {
    console.warn('Erro ao listar mural geral de dicas:', err)
    return []
  }
}

/**
 * Alterna curtida em uma dica
 */
export async function toggleTipLike(tipId) {
  const user = getCurrentUser()
  if (!user?.id || !firestore || !tipId) return

  const tipRef = doc(firestore, 'game_tips', tipId)

  await runTransaction(firestore, async (transaction) => {
    const snap = await transaction.get(tipRef)
    if (!snap.exists()) return

    const data = snap.data()
    const likes = Array.isArray(data.likes) ? data.likes : []
    const alreadyLiked = likes.includes(user.id)

    const nextLikes = alreadyLiked
      ? likes.filter((uid) => uid !== user.id)
      : [...likes, user.id]

    transaction.update(tipRef, {
      likes: nextLikes,
      likesCount: nextLikes.length,
    })
  })
}

/**
 * Deleta uma dica (apenas autor)
 */
export async function deleteTip(tipId) {
  const user = getCurrentUser()
  if (!user?.id || !firestore || !tipId) return
  const tipRef = doc(firestore, 'game_tips', tipId)
  await deleteDoc(tipRef)
}

