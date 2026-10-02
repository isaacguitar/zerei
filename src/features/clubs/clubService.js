import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  runTransaction,
} from 'firebase/firestore'
import { firestore, firebaseAuth } from '../../firebaseClient'
import { getCurrentUser } from '../auth/authService'
import { logActivity } from '../feed/activityService'

const fallbackClubs = []

function requireUser() {
  const user = getCurrentUser()
  if (!user?.id) throw new Error('Faça login para acessar os clubes.')
  return user
}

function mapClub(snapshot) {
  const data = snapshot.data()
  const cleanTag = data.tag ? data.tag.trim().toUpperCase() : (data.name ? data.name.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase() : 'ZR')

  return {
    id: snapshot.id,
    name: data.name,
    tag: cleanTag,
    description: data.description || '',
    avatarUrl: data.avatarUrl || null,
    bannerUrl: data.bannerUrl || null,
    gameTitle: data.gameTitle || data.activeRoomSummary?.gameTitle || '',
    gameCoverUrl: data.gameCoverUrl || data.activeRoomSummary?.gameCoverUrl || null,
    gameConsole: data.gameConsole || data.activeRoomSummary?.gameConsole || null,
    retroAchievementsId: data.retroAchievementsId || data.activeRoomSummary?.retroAchievementsId || null,
    activeRoomId: data.activeRoomId || null,
    activeRoomSummary: data.activeRoomSummary || null,
    history: Array.isArray(data.history) ? data.history : [],
    status: data.status || 'Ativo',
    accent: data.accent,
    icon: data.icon || '✦',
    members: data.memberCount || data.memberIds?.length || 0,
    memberIds: data.memberIds || [],
    ownerId: data.ownerId,
    roundDurationDays: data.roundDurationDays || 14,
    roundEndsAt: data.roundEndsAt || data.activeRoomSummary?.roundEndsAt || null,
    votingMode: data.votingMode || 'vote',
    accessMode: data.accessMode || 'public',
    chatEnabled: data.chatEnabled ?? true,
    roundGoal: data.roundGoal || 'campaign',
    hardcoreMode: data.hardcoreMode ?? false,
    memberLimit: data.memberLimit || null,
    spoilerControl: data.spoilerControl ?? false,
    accentColor: data.accentColor || 'electric',
    consoleFilter: data.consoleFilter || 'free',
    phase: data.phase || data.activeRoomSummary?.phase || (data.retroAchievementsId || data.gameTitle ? 'playing' : 'voting'),
    inviteCode: data.inviteCode || null,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  }
}

export async function listMyClubs() {
  const user = requireUser()
  if (!firestore) return fallbackClubs

  const clubsQuery = query(collection(firestore, 'clubs'), where('memberIds', 'array-contains', user.id))
  const result = await getDocs(clubsQuery)
  return result.docs.map(mapClub).sort((first, second) => first.name.localeCompare(second.name, 'pt-BR'))
}

export async function listClubs() {
  if (!firestore) return fallbackClubs
  try {
    const clubsSnap = await getDocs(collection(firestore, 'clubs'))
    if (!clubsSnap.empty) {
      return clubsSnap.docs.map(mapClub).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
    }
  } catch (err) {
    console.warn('Erro ao listar todos os clubes:', err)
  }
  return fallbackClubs
}

export async function getClubById(clubId) {
  if (!clubId || !firestore) return null
  try {
    const docSnap = await getDoc(doc(firestore, 'clubs', clubId))
    if (docSnap.exists()) {
      return mapClub(docSnap)
    }
  } catch (err) {
    console.warn('Erro ao buscar clube por ID:', err)
  }
  return null
}

const ACCENT_COLORS = {
  electric: 'border-cyan-400/40',
  neon: 'border-purple-500/40',
  gold: 'border-amber-400/40',
  emerald: 'border-emerald-400/40',
  rose: 'border-rose-400/40',
}

export function generateInviteCode() {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'
  let random5 = ''
  for (let i = 0; i < 5; i++) {
    random5 += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return `ZR-${random5}`
}

export async function createClub({
  name,
  tag = '',
  description = '',
  gameTitle = '',
  retroAchievementsId = null,
  gameCoverUrl = null,
  gameConsole = null,
  roundDurationDays = 14,
  votingMode = 'vote',
  accessMode = 'public',
  chatEnabled = true,
  roundGoal = 'campaign',
  hardcoreMode = false,
  memberLimit = null,
  spoilerControl = false,
  accentColor = 'electric',
  consoleFilter = 'free',
  avatarUrl = null,
  bannerUrl = null,
}) {
  const user = requireUser()
  if (!firestore) throw new Error('O Firestore não está configurado.')

  const duration = Number(roundDurationDays) || 14
  const roundEndsAt = new Date(Date.now() + duration * 24 * 60 * 60 * 1000).toISOString()

  const cleanTag = tag.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6) || name.slice(0, 4).toUpperCase()
  const isCollectiveVoting = votingMode !== 'owner'
  const initialPhase = (isCollectiveVoting && !gameTitle.trim()) ? 'voting' : (gameTitle.trim() ? 'playing' : 'idle')
  const initialStatus = initialPhase === 'voting' ? 'Votação aberta' : (initialPhase === 'playing' ? 'Rodada ativa' : 'Aguardando rodada')
  const chosenAccent = ACCENT_COLORS[accentColor] || ACCENT_COLORS.electric
  const inviteCode = generateInviteCode()

  const clubReference = await addDoc(collection(firestore, 'clubs'), {
    name: name.trim(),
    tag: cleanTag,
    description: description.trim(),
    avatarUrl: avatarUrl || null,
    bannerUrl: bannerUrl || null,
    gameTitle: gameTitle.trim(),
    retroAchievementsId: retroAchievementsId || null,
    gameCoverUrl: gameCoverUrl || null,
    gameConsole: gameConsole || null,
    roundDurationDays: duration,
    roundEndsAt: gameTitle.trim() ? roundEndsAt : null,
    votingMode,
    accessMode,
    chatEnabled,
    roundGoal,
    hardcoreMode,
    memberLimit: memberLimit ? Number(memberLimit) : null,
    spoilerControl,
    accentColor,
    consoleFilter,
    phase: initialPhase,
    inviteCode,
    activeRoomId: null,
    activeRoomSummary: null,
    history: [],
    ownerId: user.id,
    memberIds: [user.id],
    memberCount: 1,
    status: initialStatus,
    accent: chosenAccent,
    icon: '✦',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  await setDoc(doc(firestore, 'clubs', clubReference.id, 'members', user.id), {
    userId: user.id,
    displayName: user.displayName || 'Jogador',
    email: user.email || '',
    avatarUrl: user.avatarUrl || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(user.displayName || user.id)}`,
    role: 'owner',
    joinedAt: serverTimestamp(),
  })

  return {
    id: clubReference.id,
    name: name.trim(),
    description: description.trim(),
    gameTitle: gameTitle.trim(),
    retroAchievementsId,
    gameCoverUrl,
    gameConsole,
    roundDurationDays: duration,
    roundEndsAt,
    votingMode,
    accessMode,
    chatEnabled,
    roundGoal,
    hardcoreMode,
    memberLimit: memberLimit ? Number(memberLimit) : null,
    spoilerControl,
    accentColor,
    consoleFilter,
    phase: initialPhase,
    inviteCode,
    members: 1,
    status: initialStatus,
    accent: chosenAccent,
    icon: '✦',
    memberIds: [user.id],
    ownerId: user.id,
  }
}

export async function findClubByCode(codeOrId) {
  if (!codeOrId || !firestore) return null
  const clean = codeOrId.trim()
  const upper = clean.toUpperCase()

  // 1. Tenta buscar pelo campo inviteCode
  try {
    const q = query(collection(firestore, 'clubs'), where('inviteCode', '==', upper))
    const snap = await getDocs(q)
    if (!snap.empty) {
      const docSnap = snap.docs[0]
      return { id: docSnap.id, ...docSnap.data() }
    }
  } catch (err) {
    console.warn('Erro ao buscar clube por inviteCode:', err)
  }

  // 2. Tenta buscar direto pelo ID do documento
  try {
    const docRef = doc(firestore, 'clubs', clean)
    const docSnap = await getDoc(docRef)
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() }
    }
  } catch {
    // Ignora formato inválido de ID
  }

  return null
}

export async function joinClub(codeOrClubId) {
  const user = requireUser()
  if (!firestore) throw new Error('O Firestore não está configurado.')

  let clubId = codeOrClubId?.trim()
  let targetClub = null

  // Se o código começa com ZR- ou não é ID puro, busca primeiro
  if (clubId.toUpperCase().startsWith('ZR-')) {
    targetClub = await findClubByCode(clubId)
    if (!targetClub) throw new Error('Nenhum clube encontrado com este código de convite.')
    clubId = targetClub.id
  }

  const clubReference = doc(firestore, 'clubs', clubId)
  const memberReference = doc(firestore, 'clubs', clubId, 'members', user.id)

  await runTransaction(firestore, async (transaction) => {
    const clubSnapshot = await transaction.get(clubReference)
    if (!clubSnapshot.exists()) throw new Error('Clube não encontrado.')
    
    const data = clubSnapshot.data()
    targetClub = { id: clubSnapshot.id, ...data }

    if (data.memberIds && data.memberIds.includes(user.id)) {
      return // Usuário já é membro
    }

    // Valida limite de membros
    const currentCount = data.memberCount || data.memberIds?.length || 0
    if (data.memberLimit && currentCount >= data.memberLimit) {
      throw new Error(`Este clube já atingiu a capacidade máxima de ${data.memberLimit} membros.`)
    }

    // Se exige aprovação, não entra direto
    if (data.accessMode === 'approval' && data.ownerId !== user.id) {
      throw new Error('Este clube exige aprovação do líder. Envie uma solicitação de entrada.')
    }

    transaction.update(clubReference, {
      memberIds: arrayUnion(user.id),
      memberCount: increment(1),
      updatedAt: serverTimestamp()
    })

    transaction.set(memberReference, {
      userId: user.id,
      displayName: user.displayName || 'Jogador',
      email: user.email || '',
      avatarUrl: user.avatarUrl || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${user.displayName || user.id}`,
      role: 'member',
      joinedAt: serverTimestamp(),
    })
  })

  await logActivity({
    type: 'member_joined',
    action: `entrou no clube ${targetClub?.name || ''}`,
    author: user.displayName || 'Jogador',
    avatarUrl: user.avatarUrl,
  }).catch(() => {})

  return targetClub || { id: clubId }
}

export async function requestToJoinClub(clubId) {
  const user = requireUser()
  if (!firestore) throw new Error('O Firestore não está configurado.')

  const clubRef = doc(firestore, 'clubs', clubId)
  const clubSnap = await getDoc(clubRef)
  if (!clubSnap.exists()) throw new Error('Clube não encontrado.')

  const data = clubSnap.data()
  if (data.memberIds && data.memberIds.includes(user.id)) {
    throw new Error('Você já participa deste clube.')
  }

  const currentCount = data.memberCount || data.memberIds?.length || 0
  if (data.memberLimit && currentCount >= data.memberLimit) {
    throw new Error(`Este clube já atingiu o limite de ${data.memberLimit} membros.`)
  }

  const requestRef = doc(firestore, 'clubs', clubId, 'requests', user.id)
  await setDoc(requestRef, {
    userId: user.id,
    displayName: user.displayName || 'Jogador',
    email: user.email || '',
    avatarUrl: user.avatarUrl || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${user.displayName || user.id}`,
    requestedAt: serverTimestamp(),
  })
}

export function subscribeToJoinRequests(clubId, callback) {
  if (!clubId || !firestore) return () => {}
  const requestsRef = collection(firestore, 'clubs', clubId, 'requests')
  return onSnapshot(requestsRef, (snapshot) => {
    const list = snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }))
    callback(list)
  }, (err) => {
    console.warn('Erro ao escutar solicitações de entrada:', err)
  })
}

export async function approveJoinRequest(clubId, requestUser) {
  const user = requireUser()
  if (!firestore) throw new Error('O Firestore não está configurado.')

  const targetUserId = requestUser.userId || requestUser.id
  const clubRef = doc(firestore, 'clubs', clubId)
  const memberRef = doc(firestore, 'clubs', clubId, 'members', targetUserId)
  const requestRef = doc(firestore, 'clubs', clubId, 'requests', targetUserId)

  await runTransaction(firestore, async (transaction) => {
    const clubSnap = await transaction.get(clubRef)
    if (!clubSnap.exists()) throw new Error('Clube não encontrado.')

    const data = clubSnap.data()
    if (data.ownerId !== user.id) throw new Error('Apenas o líder do clube pode aprovar solicitações.')

    const currentCount = data.memberCount || data.memberIds?.length || 0
    if (data.memberLimit && currentCount >= data.memberLimit) {
      throw new Error(`O clube atingiu o limite máximo de ${data.memberLimit} membros.`)
    }

    transaction.update(clubRef, {
      memberIds: arrayUnion(targetUserId),
      memberCount: increment(1),
      updatedAt: serverTimestamp(),
    })

    transaction.set(memberRef, {
      userId: targetUserId,
      displayName: requestUser.displayName || 'Jogador',
      email: requestUser.email || '',
      avatarUrl: requestUser.avatarUrl || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${requestUser.displayName || targetUserId}`,
      role: 'member',
      joinedAt: serverTimestamp(),
    })

    transaction.delete(requestRef)
  })

  await logActivity({
    type: 'member_joined',
    action: `foi aprovado e entrou no clube`,
    author: requestUser.displayName || 'Jogador',
    avatarUrl: requestUser.avatarUrl,
  }).catch(() => {})
}

export async function rejectJoinRequest(clubId, userId) {
  const user = requireUser()
  if (!firestore) throw new Error('O Firestore não está configurado.')
  const requestRef = doc(firestore, 'clubs', clubId, 'requests', userId)
  await deleteDoc(requestRef)
}

export async function leaveClub(clubId) {
  const user = requireUser()
  if (!firestore) throw new Error('O Firestore não está configurado.')

  const clubReference = doc(firestore, 'clubs', clubId)
  const memberReference = doc(firestore, 'clubs', clubId, 'members', user.id)

  await runTransaction(firestore, async (transaction) => {
    const clubSnapshot = await transaction.get(clubReference)
    if (!clubSnapshot.exists()) return

    const data = clubSnapshot.data()
    if (!data.memberIds || !data.memberIds.includes(user.id)) {
      return // User is not a member
    }

    transaction.update(clubReference, {
      memberIds: arrayRemove(user.id),
      memberCount: increment(-1),
      updatedAt: serverTimestamp(),
    })
    
    transaction.delete(memberReference)
  })
}

export async function updateClub(clubId, { name, description, gameTitle, retroAchievementsId = null, gameCoverUrl = null, gameConsole = null }) {
  const user = requireUser()
  if (!firestore) throw new Error('O Firestore não está configurado.')

  const clubRef = doc(firestore, 'clubs', clubId)
  const updates = {
    name: name.trim(),
    description: description.trim(),
    gameTitle: gameTitle.trim(),
    updatedAt: serverTimestamp(),
  }
  if (retroAchievementsId !== undefined) updates.retroAchievementsId = retroAchievementsId
  if (gameCoverUrl !== undefined) updates.gameCoverUrl = gameCoverUrl
  if (gameConsole !== undefined) updates.gameConsole = gameConsole

  await updateDoc(clubRef, updates)

  return { id: clubId, name: name.trim(), description: description.trim(), gameTitle: gameTitle.trim(), retroAchievementsId, gameCoverUrl, gameConsole }
}

export async function deleteClub(clubId) {
  const user = requireUser()
  if (!firestore || !clubId) throw new Error('Dados inválidos.')

  const clubRef = doc(firestore, 'clubs', clubId)
  const clubSnap = await getDoc(clubRef)
  if (!clubSnap.exists()) return true

  const clubData = clubSnap.data()
  if (clubData.ownerId !== user.id) {
    throw new Error('Apenas o dono do clube tem permissão para excluí-lo.')
  }

  await deleteDoc(clubRef)
  return true
}

export async function removeMemberFromClub(clubId, memberId) {
  const user = requireUser()
  if (!firestore) throw new Error('O Firestore não está configurado.')

  const clubReference = doc(firestore, 'clubs', clubId)
  const memberReference = doc(firestore, 'clubs', clubId, 'members', memberId)

  await runTransaction(firestore, async (transaction) => {
    const clubSnapshot = await transaction.get(clubReference)
    if (!clubSnapshot.exists()) return

    transaction.update(clubReference, {
      memberIds: arrayRemove(memberId),
      memberCount: increment(-1),
      updatedAt: serverTimestamp(),
    })
    transaction.delete(memberReference)
  })
}

export async function updateMemberRole(clubId, memberId, newRole) {
  const user = requireUser()
  if (!firestore) throw new Error('O Firestore não está configurado.')

  const memberReference = doc(firestore, 'clubs', clubId, 'members', memberId)
  await updateDoc(memberReference, {
    role: newRole,
    updatedAt: serverTimestamp(),
  })
}

export async function listClubMembers(clubId) {
  if (!firestore || !clubId) {
    return []
  }

  try {
    const membersSnap = await getDocs(collection(firestore, 'clubs', clubId, 'members'))
    if (!membersSnap.empty) {
      return membersSnap.docs.map((d) => {
        const data = d.data()
        return {
          id: d.id,
          userId: data.userId || d.id,
          displayName: data.displayName || 'Jogador',
          role: data.role || 'member',
          avatarUrl: data.avatarUrl || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(data.displayName || d.id)}`,
          progress: Number(data.progress || 0),
          isCompleted: Boolean(data.isCompleted || (data.progress && Number(data.progress) >= 100)),
          achievementsUnlocked: Number(data.achievementsUnlocked || 0),
          achievementsTotal: Number(data.achievementsTotal || 0),
          updatedAt: data.updatedAt || null,
        }
      })
    }

    const clubDoc = await getDoc(doc(firestore, 'clubs', clubId))
    if (clubDoc.exists() && clubDoc.data().memberIds?.length) {
      return clubDoc.data().memberIds.map((uid) => ({
        id: uid,
        userId: uid,
        displayName: 'Membro do Clube',
        role: uid === clubDoc.data().ownerId ? 'owner' : 'member',
        avatarUrl: `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(uid)}`,
        progress: 0,
        isCompleted: false,
        achievementsUnlocked: 0,
        achievementsTotal: 0,
      }))
    }
  } catch (err) {
    console.warn('Erro ao carregar membros do clube:', err)
  }

  return []
}

export async function updateMemberClubProgress(clubId, userId, { progress = 0, isCompleted = false, achievementsUnlocked = 0, achievementsTotal = 0, points = 0 }) {
  if (!firestore || !clubId || !userId) return

  try {
    const memberRef = doc(firestore, 'clubs', clubId, 'members', userId)
    await updateDoc(memberRef, {
      progress: Math.min(100, Math.max(0, Math.round(Number(progress) || 0))),
      isCompleted: Boolean(isCompleted || Number(progress) >= 100),
      achievementsUnlocked: Number(achievementsUnlocked || 0),
      achievementsTotal: Number(achievementsTotal || 0),
      points: Number(points || 0),
      updatedAt: serverTimestamp(),
    })
  } catch (err) {
    console.warn('Erro ao sincronizar progresso do membro no clube:', err)
  }
}

export function subscribeToClub(clubId, callback) {
  if (!firestore || !clubId) return () => {}
  const clubRef = doc(firestore, 'clubs', clubId)
  return onSnapshot(clubRef, (snapshot) => {
    if (snapshot.exists()) {
      callback(mapClub(snapshot))
    }
  }, (err) => {
    console.warn('Erro na escuta do clube:', err)
  })
}

export function subscribeToVotes(clubId, callback) {
  if (!firestore || !clubId) return () => {}
  const votesRef = collection(firestore, 'clubs', clubId, 'votes')
  return onSnapshot(votesRef, (snapshot) => {
    const votes = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
    callback(votes)
  }, (err) => {
    console.warn('Erro na escuta dos votos:', err)
  })
}

export async function castVote(clubId, user, game) {
  const uid = user?.id || user?.uid || firebaseAuth?.currentUser?.uid
  if (!firestore || !clubId || !uid) throw new Error('Usuário ou clube inválido.')
  const voteRef = doc(firestore, 'clubs', clubId, 'votes', uid)
  await setDoc(voteRef, {
    userId: uid,
    displayName: user.displayName || 'Jogador',
    avatarUrl: user.avatarUrl || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(user.displayName || uid)}`,
    gameId: game.id || null,
    gameTitle: game.title,
    gameCoverUrl: game.imageBoxArt || game.imageIcon || null,
    gameConsole: game.consoleName || null,
    votedAt: serverTimestamp(),
  })
}

export async function removeVote(clubId, userId) {
  const uid = userId || firebaseAuth?.currentUser?.uid
  if (!firestore || !clubId || !uid) return
  const voteRef = doc(firestore, 'clubs', clubId, 'votes', uid)
  await deleteDoc(voteRef)
}

export async function resolveVoting(clubId, winningGame) {
  if (!firestore || !clubId || !winningGame) throw new Error('Dados inválidos para finalizar a votação.')
  const clubRef = doc(firestore, 'clubs', clubId)
  const clubSnap = await getDoc(clubRef)
  if (!clubSnap.exists()) throw new Error('Clube não encontrado.')

  const data = clubSnap.data()
  const duration = data.roundDurationDays || 14
  const roundEndsAt = new Date(Date.now() + duration * 24 * 60 * 60 * 1000).toISOString()

  await updateDoc(clubRef, {
    gameTitle: winningGame.gameTitle || winningGame.title,
    retroAchievementsId: winningGame.gameId || winningGame.id || null,
    gameCoverUrl: winningGame.gameCoverUrl || winningGame.imageBoxArt || winningGame.imageIcon || null,
    gameConsole: winningGame.gameConsole || winningGame.consoleName || null,
    phase: 'playing',
    status: 'Rodada ativa',
    roundEndsAt,
    updatedAt: serverTimestamp(),
  })
}

