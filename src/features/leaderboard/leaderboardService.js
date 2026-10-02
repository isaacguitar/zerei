import { collection, doc, getDoc, getDocs, limit, onSnapshot, orderBy, query, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore'
import { firestore } from '../../firebaseClient'
import { getCurrentUser } from '../auth/authService'
import { listClubMembers } from '../clubs/clubService'

// Leaderboard service conectado ao Firestore / RetroAchievements

export function subscribeClubLeaderboard(clubId, callback) {
  if (!firestore || !clubId) {
    listClubMembers(clubId).then((members) => {
      callback(sortClubMembers(members))
    })
    return () => {}
  }

  const membersRef = collection(firestore, 'clubs', clubId, 'members')

  return onSnapshot(membersRef, (snapshot) => {
    const members = snapshot.docs.map((d) => {
      const data = d.data()
      const dName = data.displayName || 'Jogador'
      const fallbackSeed = encodeURIComponent(dName || d.id)
      return {
        id: d.id,
        userId: data.userId || d.id,
        ...data,
        displayName: dName,
        avatarUrl: data.avatarUrl || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${fallbackSeed}`,
      }
    })

    callback(sortClubMembers(members))
  }, (err) => {
    console.warn('Erro ao escutar leaderboard do clube:', err)
    callback([])
  })
}

/**
 * Ordena os membros de um clube por mérito e pontos
 */
export function sortClubMembers(members = []) {
  return [...members].sort((a, b) => {
    // 1º Quem zerou tem prioridade
    const aCompleted = Boolean(a.isCompleted || a.progress >= 100)
    const bCompleted = Boolean(b.isCompleted || b.progress >= 100)
    if (aCompleted !== bCompleted) {
      return aCompleted ? -1 : 1
    }

    // 2º Mais pontos RA acumulados na rodada
    const aPoints = Number(a.points || a.raPoints || 0)
    const bPoints = Number(b.points || b.raPoints || 0)
    if (bPoints !== aPoints) {
      return bPoints - aPoints
    }

    // 3º Maior progresso (%)
    const aProg = Number(a.progress || 0)
    const bProg = Number(b.progress || 0)
    if (bProg !== aProg) {
      return bProg - aProg
    }

    // 4º Mais conquistas desbloqueadas
    return (Number(b.achievementsUnlocked || 0)) - (Number(a.achievementsUnlocked || 0))
  })
}

/**
 * Escuta em tempo real o leaderboard da Temporada Geral (Global)
 * Filtros suportados: 'beaten' (quem mais zerou) ou 'points' (pontos acumulados)
 */
export function subscribeSeasonLeaderboard(callback, sortBy = 'beaten') {
  if (!firestore) {
    callback([])
    return () => {}
  }

  const usersRef = collection(firestore, 'users')

  return onSnapshot(usersRef, (snapshot) => {
    const realUsers = snapshot.docs.map((d) => {
      const data = d.data()
      return {
        id: d.id,
        userId: d.id,
        displayName: data.displayName || 'Jogador',
        avatarUrl: data.avatarUrl || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(data.displayName || d.id)}`,
        gamesBeatenCount: Number(data.gamesBeatenCount || 0),
        seasonPoints: Number(data.seasonPoints || data.retroAchievementsPoints || 0),
        rank: data.rank || 'Jogador Retrô',
        level: Number(data.level || 1),
      }
    })

    callback(sortSeasonUsers(realUsers, sortBy))
  }, (err) => {
    console.warn('Erro ao escutar ranking da temporada:', err)
    callback([])
  })
}

/**
 * Ordena lista de jogadores da temporada
 */
export function sortSeasonUsers(users = [], sortBy = 'beaten') {
  return [...users].sort((a, b) => {
    if (sortBy === 'points') {
      const pDiff = (Number(b.seasonPoints) || 0) - (Number(a.seasonPoints) || 0)
      if (pDiff !== 0) return pDiff
      return (Number(b.gamesBeatenCount) || 0) - (Number(a.gamesBeatenCount) || 0)
    }

    // Default: 'beaten' (quem mais zerou)
    const bDiff = (Number(b.gamesBeatenCount) || 0) - (Number(a.gamesBeatenCount) || 0)
    if (bDiff !== 0) return bDiff
    return (Number(b.seasonPoints) || 0) - (Number(a.seasonPoints) || 0)
  })
}

/**
 * Registra que um usuário zerou um jogo e atualiza seus pontos na temporada
 */
export async function recordGameBeaten({ userId, clubId, gameTitle, points = 0 }) {
  if (!firestore || !userId) return

  try {
    const userRef = doc(firestore, 'users', userId)
    const userSnap = await getDoc(userRef)
    const currentData = userSnap.data() || {}

    const currentBeaten = Number(currentData.gamesBeatenCount || 0)
    const currentPoints = Number(currentData.seasonPoints || 0)

    // Se já havia zerado este jogo específico nesta sessão/histórico
    const beatenGames = Array.isArray(currentData.beatenGames) ? currentData.beatenGames : []
    const alreadyCounted = beatenGames.some((g) => g.gameTitle === gameTitle && g.clubId === clubId)

    const updates = {
      seasonPoints: currentPoints + Number(points || 0),
      updatedAt: serverTimestamp(),
    }

    if (!alreadyCounted) {
      updates.gamesBeatenCount = currentBeaten + 1
      updates.beatenGames = [
        ...beatenGames,
        {
          gameTitle,
          clubId,
          beatenAt: new Date().toISOString(),
          points: Number(points || 0),
        },
      ]
    }

    await setDoc(userRef, updates, { merge: true })
  } catch (err) {
    console.warn('Erro ao atualizar estatísticas de zeramento do usuário:', err)
  }
}

