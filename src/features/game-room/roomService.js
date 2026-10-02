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
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore'
import { firestore } from '../../firebaseClient'
import { getCurrentUser } from '../auth/authService'
import { logActivity } from '../feed/activityService'

function requireUser() {
  const user = getCurrentUser()
  if (!user?.id) throw new Error('Faça login para continuar.')
  return user
}

function mapGameRoom(snapshot) {
  const data = snapshot.data()
  const isSolo = Boolean(data.isSolo || data.roomType === 'solo')
  return {
    id: snapshot.id,
    clubId: data.clubId || null,
    clubName: data.clubName || null,
    clubTag: data.clubTag || null,
    title: data.title || data.name || data.gameTitle || (isSolo ? data.gameTitle : 'Sala de Jogo'),
    gameTitle: data.gameTitle || '',
    retroAchievementsId: data.retroAchievementsId || null,
    gameCoverUrl: data.gameCoverUrl || null,
    gameConsole: data.gameConsole || null,
    roundDurationDays: isSolo ? null : Number(data.roundDurationDays || 14),
    roundEndsAt: isSolo ? null : (data.roundEndsAt || null),
    noTimeLimit: Boolean(data.noTimeLimit || isSolo),
    phase: data.phase || (data.gameTitle ? 'playing' : 'voting'),
    votingMode: data.votingMode || 'owner',
    roundGoal: data.roundGoal || 'campaign',
    hardcoreMode: Boolean(data.hardcoreMode),
    spoilerControl: Boolean(data.spoilerControl),
    accessMode: data.accessMode || 'public',
    isSolo,
    roomType: isSolo ? 'solo' : (data.roomType || 'group'),
    allowSpectators: data.allowSpectators !== undefined ? Boolean(data.allowSpectators) : true,
    allowSpectatorChat: data.allowSpectatorChat !== undefined ? Boolean(data.allowSpectatorChat) : true,
    ownerId: data.ownerId,
    memberIds: Array.isArray(data.memberIds) ? data.memberIds : [],
    memberCount: Number(data.memberCount || data.memberIds?.length || 0),
    status: data.status || 'active', // 'active' | 'completed' | 'archived'
    isStandalone: !data.clubId && !isSolo, // Sala avulsa / esporádica sem clube
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  }
}

/**
 * Cria uma nova Sala de Jogo (vinculada a um clube permanente OU avulsa/esporádica OU Quartinho Gamer Solo)
 */
export async function createGameRoom({
  clubId = null,
  clubName = null,
  clubTag = null,
  title = '',
  gameTitle = '',
  retroAchievementsId = null,
  gameCoverUrl = null,
  gameConsole = null,
  roundDurationDays = 14,
  votingMode = 'owner',
  roundGoal = 'campaign',
  hardcoreMode = false,
  spoilerControl = false,
  accessMode = 'public',
  isSolo = false,
  roomType = 'group',
  allowSpectators = true,
  allowSpectatorChat = true,
  noTimeLimit = false,
}) {
  const user = requireUser()
  if (!firestore) throw new Error('O Firestore não está configurado.')

  const soloMode = Boolean(isSolo || roomType === 'solo')
  const duration = soloMode ? null : (Number(roundDurationDays) || 14)
  const roundEndsAt = soloMode ? null : new Date(Date.now() + duration * 24 * 60 * 60 * 1000).toISOString()
  const isVoting = !soloMode && votingMode !== 'owner' && !gameTitle.trim()
  const initialPhase = isVoting ? 'voting' : 'playing'

  // Para sala individual, a identificação é o próprio nome do jogo
  const cleanGame = gameTitle.trim()
  const finalTitle = soloMode
    ? cleanGame || 'Quartinho Gamer'
    : (title.trim() || (cleanGame ? `Jogatina: ${cleanGame}` : 'Nova Sala de Jogo'))

  const roomData = {
    clubId: soloMode ? null : (clubId || null),
    clubName: soloMode ? null : (clubName || null),
    clubTag: soloMode ? null : (clubTag || null),
    title: finalTitle,
    name: finalTitle,
    gameTitle: cleanGame,
    retroAchievementsId: retroAchievementsId ? Number(retroAchievementsId) : null,
    gameCoverUrl: gameCoverUrl || null,
    gameConsole: gameConsole || null,
    roundDurationDays: duration,
    roundEndsAt,
    noTimeLimit: soloMode || Boolean(noTimeLimit),
    phase: initialPhase,
    votingMode: soloMode ? 'owner' : votingMode,
    roundGoal,
    hardcoreMode: Boolean(hardcoreMode),
    spoilerControl: Boolean(spoilerControl),
    accessMode,
    isSolo: soloMode,
    roomType: soloMode ? 'solo' : 'group',
    allowSpectators: Boolean(allowSpectators),
    allowSpectatorChat: Boolean(allowSpectatorChat),
    ownerId: user.id,
    memberIds: [user.id],
    memberCount: 1,
    status: 'active',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }

  // 1. Cria o documento da sala na coleção game_rooms
  const roomRef = await addDoc(collection(firestore, 'game_rooms'), roomData)

  // 2. Adiciona o criador como membro da sala
  await setDoc(doc(firestore, 'game_rooms', roomRef.id, 'members', user.id), {
    userId: user.id,
    displayName: user.displayName || 'Jogador',
    email: user.email || '',
    avatarUrl: user.avatarUrl || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(user.displayName || user.id)}`,
    role: 'owner',
    progress: 0,
    points: 0,
    isCompleted: false,
    achievementsUnlocked: 0,
    achievementsTotal: 0,
    joinedAt: serverTimestamp(),
  })

  // 3. Se estiver vinculada a um clube, atualiza o clube com a sala ativa
  if (clubId) {
    try {
      const clubRef = doc(firestore, 'clubs', clubId)
      await updateDoc(clubRef, {
        activeRoomId: roomRef.id,
        activeRoomSummary: {
          id: roomRef.id,
          title: finalTitle,
          gameTitle: gameTitle.trim(),
          retroAchievementsId: retroAchievementsId ? Number(retroAchievementsId) : null,
          gameCoverUrl: gameCoverUrl || null,
          gameConsole: gameConsole || null,
          roundEndsAt,
          phase: initialPhase,
        },
        // Sincroniza também atributos legados para telas secundárias
        gameTitle: gameTitle.trim(),
        retroAchievementsId: retroAchievementsId ? Number(retroAchievementsId) : null,
        gameCoverUrl: gameCoverUrl || null,
        gameConsole: gameConsole || null,
        roundEndsAt,
        phase: initialPhase,
        updatedAt: serverTimestamp(),
      })
    } catch (err) {
      console.warn('Erro ao associar sala ativa ao clube:', err)
    }
  }

  if (clubId && clubName) {
    await logActivity({
      type: 'room_created',
      action: `abriu uma nova sala de jogo no clube ${clubName}`,
      target: finalTitle,
      icon: '🎮',
    }).catch(() => {})
  }

  return { id: roomRef.id, ...roomData }
}

/**
 * Retorna as salas de jogo ativas das quais o usuário participa
 */
export async function listMyGameRooms() {
  const user = requireUser()
  if (!firestore) return []

  try {
    const q = query(
      collection(firestore, 'game_rooms'),
      where('memberIds', 'array-contains', user.id),
      where('status', '==', 'active')
    )
    const snap = await getDocs(q)
    return snap.docs.map(mapGameRoom)
  } catch (err) {
    console.warn('Erro ao listar minhas salas de jogo:', err)
    return []
  }
}

/**
 * Busca uma sala de jogo por ID
 */
export async function getGameRoomById(roomId) {
  if (!roomId || !firestore) return null

  try {
    const docSnap = await getDoc(doc(firestore, 'game_rooms', roomId))
    if (docSnap.exists()) {
      return mapGameRoom(docSnap)
    }

    // Fallback: pode ser um clube legado que funciona como sala de jogo direta
    const clubSnap = await getDoc(doc(firestore, 'clubs', roomId))
    if (clubSnap.exists()) {
      return mapGameRoom(clubSnap)
    }
  } catch (err) {
    console.warn('Erro ao buscar sala de jogo:', err)
  }
  return null
}

/**
 * Permite a um jogador entrar em uma sala de jogo (seja de clube ou avulsa)
 */
export async function joinGameRoom(roomId) {
  const user = requireUser()
  if (!firestore || !roomId) return

  const roomRef = doc(firestore, 'game_rooms', roomId)
  const memberRef = doc(firestore, 'game_rooms', roomId, 'members', user.id)

  await runTransaction(firestore, async (transaction) => {
    const roomSnap = await transaction.get(roomRef)
    if (!roomSnap.exists()) {
      // Tenta fallback para coleção clubs se for legado
      return
    }

    const data = roomSnap.data()
    const memberIds = Array.isArray(data.memberIds) ? data.memberIds : []

    if (!memberIds.includes(user.id)) {
      transaction.update(roomRef, {
        memberIds: arrayUnion(user.id),
        memberCount: increment(1),
        updatedAt: serverTimestamp(),
      })

      transaction.set(memberRef, {
        userId: user.id,
        displayName: user.displayName || 'Jogador',
        email: user.email || '',
        avatarUrl: user.avatarUrl || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(user.displayName || user.id)}`,
        role: 'member',
        progress: 0,
        points: 0,
        isCompleted: false,
        achievementsUnlocked: 0,
        achievementsTotal: 0,
        joinedAt: serverTimestamp(),
      })
    }
  })
}

/**
 * Lista membros de uma sala de jogos (com progresso e zeramentos)
 */
export async function listRoomMembers(roomId) {
  if (!firestore || !roomId) return []
  try {
    const snap = await getDocs(collection(firestore, 'game_rooms', roomId, 'members'))
    if (!snap.empty) {
      return snap.docs.map((d) => {
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
          points: Number(data.points || 0),
          updatedAt: data.updatedAt || null,
        }
      })
    }
  } catch (err) {
    console.warn('Erro ao carregar membros da sala:', err)
  }
  return []
}

/**
 * Atualiza o progresso de um membro dentro de uma Sala de Jogo
 */
export async function updateMemberRoomProgress(roomId, userId, {
  progress = 0,
  isCompleted = false,
  achievementsUnlocked = 0,
  achievementsTotal = 0,
  points = 0,
  unlockedAchievementIds = null,
  gameplaySeconds = null,
  deaths = null,
  score = null,
}) {
  if (!firestore || !roomId || !userId) return
  const cleanProgress = Math.min(100, Math.max(0, Math.round(Number(progress) || 0)))
  const cleanCompleted = Boolean(isCompleted || cleanProgress >= 100)

  try {
    const memberRef = doc(firestore, 'game_rooms', roomId, 'members', userId)
    const payload = {
      userId,
      progress: cleanProgress,
      isCompleted: cleanCompleted,
      achievementsUnlocked: Number(achievementsUnlocked || 0),
      achievementsTotal: Number(achievementsTotal || 0),
      points: Number(points || 0),
      updatedAt: serverTimestamp(),
    }
    if (Array.isArray(unlockedAchievementIds)) {
      payload.unlockedAchievementIds = unlockedAchievementIds
    }
    if (gameplaySeconds !== null && gameplaySeconds !== undefined) {
      payload.gameplaySeconds = Number(gameplaySeconds)
    }
    if (deaths !== null && deaths !== undefined) {
      payload.deaths = Number(deaths)
    }
    if (score !== null && score !== undefined) {
      payload.score = Number(score)
    }
    await setDoc(memberRef, payload, { merge: true })
  } catch (err) {
    console.warn('Erro ao sincronizar progresso na sala:', err)
  }
}

export async function getMemberRoomData(roomId, userId) {
  if (!firestore || !roomId || !userId) return null
  try {
    const snap = await getDoc(doc(firestore, 'game_rooms', roomId, 'members', userId))
    if (snap.exists()) return snap.data()
  } catch (err) {
    console.warn('Erro ao carregar dados do membro na sala:', err)
  }
  return null
}

/**
 * Finaliza e arquiva uma Sala de Jogo (calcula vencedores e salva no Histórico Permanente do Clube)
 */
export async function finishGameRoomAndArchive(roomId) {
  const user = requireUser()
  if (!firestore || !roomId) throw new Error('ID da sala inválido.')

  const roomRef = doc(firestore, 'game_rooms', roomId)
  const roomSnap = await getDoc(roomRef)
  if (!roomSnap.exists()) throw new Error('Sala não encontrada.')

  const roomData = roomSnap.data()
  if (roomData.ownerId !== user.id) {
    throw new Error('Apenas o anfitrião da sala pode finalizar a rodada.')
  }

  // 1. Obter membros e verificar quem zerou
  const membersSnap = await getDocs(collection(firestore, 'game_rooms', roomId, 'members'))
  const playersBeaten = []
  const allMembers = []

  membersSnap.forEach((d) => {
    const m = d.data()
    allMembers.push(m)
    if (m.isCompleted || Number(m.progress) >= 100) {
      playersBeaten.push({
        userId: m.userId || d.id,
        displayName: m.displayName || 'Jogador',
        avatarUrl: m.avatarUrl || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(m.displayName || d.id)}`,
      })
    }
  })

  // 2. Marcar a sala como finalizada
  await updateDoc(roomRef, {
    status: 'completed',
    phase: 'completed',
    completedAt: new Date().toISOString(),
    updatedAt: serverTimestamp(),
  })

  // 3. Se a sala pertencia a um Clube Permanente, registrar no Histórico do Clube
  if (roomData.clubId) {
    try {
      const clubRef = doc(firestore, 'clubs', roomData.clubId)
      const historyItem = {
        roomId,
        gameTitle: roomData.gameTitle || 'Jogo Retrô',
        retroAchievementsId: roomData.retroAchievementsId || null,
        gameCoverUrl: roomData.gameCoverUrl || null,
        gameConsole: roomData.gameConsole || null,
        completedAt: new Date().toISOString(),
        totalParticipants: allMembers.length,
        playersBeaten,
      }

      await updateDoc(clubRef, {
        activeRoomId: null,
        activeRoomSummary: null,
        phase: 'voting', // Clube fica livre para votar no próximo jogo
        gameTitle: '',
        history: arrayUnion(historyItem),
        updatedAt: serverTimestamp(),
      })

      await logActivity({
        type: 'round_completed',
        action: `concluiu a rodada de ${roomData.gameTitle} no clube ${roomData.clubName || ''}`,
        target: roomData.gameTitle,
        icon: '🏆',
      }).catch(() => {})
    } catch (err) {
      console.warn('Erro ao arquivar rodada no clube:', err)
    }
  }

  return { success: true, playersBeaten }
}

/**
 * Retorna todas as salas individuais (Quartinho Gamer) ativas do usuário
 */
export async function listMySoloRooms() {
  const user = requireUser()
  if (!firestore) return []

  try {
    const q = query(
      collection(firestore, 'game_rooms'),
      where('ownerId', '==', user.id),
      where('isSolo', '==', true),
      where('status', '==', 'active')
    )
    const snap = await getDocs(q)
    return snap.docs.map(mapGameRoom)
  } catch (err) {
    console.warn('Erro ao listar salas individuais:', err)
    return []
  }
}

/**
 * Atualiza configurações de espectador em tempo real
 */
export async function updateRoomSpectatorSettings(roomId, { allowSpectators, allowSpectatorChat, allowSpectatorVoice }) {
  const user = requireUser()
  if (!firestore) return
  const roomRef = doc(firestore, 'game_rooms', roomId)
  const updates = { updatedAt: serverTimestamp() }
  if (allowSpectators !== undefined) updates.allowSpectators = Boolean(allowSpectators)
  if (allowSpectatorChat !== undefined) updates.allowSpectatorChat = Boolean(allowSpectatorChat)
  if (allowSpectatorVoice !== undefined) updates.allowSpectatorVoice = Boolean(allowSpectatorVoice)
  await updateDoc(roomRef, updates)
}

/**
 * Exclui permanentemente uma sala individual (Quartinho Gamer)
 */
export async function deleteGameRoom(roomId) {
  const user = requireUser()
  if (!firestore) return
  const roomRef = doc(firestore, 'game_rooms', roomId)
  await deleteDoc(roomRef)
}

/**
 * Marca uma sala individual solo como zerada / concluída
 */
export async function completeSoloGame(roomId) {
  const user = requireUser()
  if (!firestore) return
  const roomRef = doc(firestore, 'game_rooms', roomId)
  const snap = await getDoc(roomRef)
  if (!snap.exists()) return

  const data = snap.data()
  await updateDoc(roomRef, {
    status: 'completed',
    phase: 'completed',
    completedAt: new Date().toISOString(),
    updatedAt: serverTimestamp(),
  })

  // Registra no feed
  await logActivity({
    type: 'game_beaten',
    action: `zerou ${data.gameTitle || 'um jogo retrô'} no seu Quartinho Gamer!`,
    target: data.gameTitle || 'Jogo',
    icon: '🏆',
  }).catch(() => {})
}
