import { doc, getDoc, increment, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore'
import { firestore } from '../../firebaseClient'
import { getCurrentUser } from '../auth/authService'
import { logActivity } from '../feed/activityService'

// Títulos honorários por faixa de nível (1 a 50)
const LEVEL_RANKS = [
  { minLevel: 1, maxLevel: 4, rank: 'Novato 8-bit', icon: '🌱' },
  { minLevel: 5, maxLevel: 9, rank: 'Jogador Casual', icon: '🎮' },
  { minLevel: 10, maxLevel: 14, rank: 'Colecionador de Fitas', icon: '📼' },
  { minLevel: 15, maxLevel: 19, rank: 'Explorador de Masmorras', icon: '🗺️' },
  { minLevel: 20, maxLevel: 24, rank: 'Veterano dos 16-bits', icon: '⚔️' },
  { minLevel: 25, maxLevel: 29, rank: 'Mestre dos Combos', icon: '🔥' },
  { minLevel: 30, maxLevel: 34, rank: 'Caçador de Conquistas', icon: '💎' },
  { minLevel: 35, maxLevel: 39, rank: 'Speedrunner Lendário', icon: '⚡' },
  { minLevel: 40, maxLevel: 44, rank: 'Campeão dos Fliperamas', icon: '🕹️' },
  { minLevel: 45, maxLevel: 49, rank: 'Lenda dos 32-bits', icon: '🌟' },
  { minLevel: 50, maxLevel: 999, rank: 'Mestre Retrô 👑', icon: '👑' },
]

/**
 * Retorna o XP cumulativo necessário para atingir o nível L.
 * Nível 1: 0 XP
 * Nível 2: 100 XP
 * Nível 3: 250 XP (+150)
 * Nível 4: 450 XP (+200)
 * ...
 */
export function getCumulativeXpForLevel(level) {
  if (level <= 1) return 0
  let total = 0
  for (let lvl = 1; lvl < level; lvl++) {
    total += 100 + (lvl - 1) * 50
  }
  return total
}

/**
 * Retorna quanto XP é necessário dentro do nível atual para subir para o próximo.
 */
export function getXpRequiredForNextLevel(level) {
  return 100 + (level - 1) * 50
}

/**
 * Calcula todas as métricas de nível a partir do XP total acumulado
 */
export function getLevelInfo(totalXp = 0) {
  const safeXp = Math.max(0, Number(totalXp) || 0)

  let level = 1
  while (level < 50 && safeXp >= getCumulativeXpForLevel(level + 1)) {
    level++
  }

  const baseForCurrent = getCumulativeXpForLevel(level)
  const baseForNext = getCumulativeXpForLevel(level + 1)
  const xpNeededThisLevel = level >= 50 ? 1 : (baseForNext - baseForCurrent)
  const currentLevelProgressXp = level >= 50 ? xpNeededThisLevel : (safeXp - baseForCurrent)
  const xpToNextLevel = level >= 50 ? 0 : Math.max(0, baseForNext - safeXp)
  const progressPercent = level >= 50 ? 100 : Math.min(100, Math.round((currentLevelProgressXp / xpNeededThisLevel) * 100))

  const rankObj = LEVEL_RANKS.find((r) => level >= r.minLevel && level <= r.maxLevel) || LEVEL_RANKS[0]

  return {
    level,
    totalXp: safeXp,
    currentLevelProgressXp,
    xpNeededThisLevel,
    xpToNextLevel,
    progressPercent,
    rank: rankObj.rank,
    icon: rankObj.icon,
    isMaxLevel: level >= 50,
  }
}

// Listeners globais para disparar notificações de XP na UI
const xpListeners = new Set()

export function subscribeToXpEvents(callback) {
  xpListeners.add(callback)
  return () => xpListeners.delete(callback)
}

function notifyXpEvent(event) {
  xpListeners.forEach((cb) => {
    try {
      cb(event)
    } catch (e) {
      console.warn('Erro no listener de XP:', e)
    }
  })
}

/**
 * Concede XP ao usuário, atualiza o Firestore e dispara o Toast
 */
export async function awardXp(userId, amount, reason, metadata = {}) {
  const current = userId || getCurrentUser()?.id
  if (!current) return null

  const numAmount = Number(amount) || 0
  if (numAmount === 0) return null

  let oldXp = 0
  let newXp = Math.max(0, numAmount)
  let oldLevel = 1
  let newLevel = 1

  if (firestore) {
    try {
      const userRef = doc(firestore, 'users', current)
      const userSnap = await getDoc(userRef)
      const currentData = userSnap.data() || {}

      oldXp = Number(currentData.xp || 0)
      newXp = Math.max(0, oldXp + numAmount)

      const oldInfo = getLevelInfo(oldXp)
      const newInfo = getLevelInfo(newXp)

      oldLevel = oldInfo.level
      newLevel = newInfo.level

      const updates = {
        xp: newXp,
        level: newInfo.level,
        rank: newInfo.rank,
        updatedAt: serverTimestamp(),
      }

      // Metadata adicional opcional (ex: contador de checkpoints ou votos)
      if (metadata.isCheckpoint) {
        updates.checkpointCount = increment(1)
      }
      if (metadata.isVote) {
        updates.totalVotes = increment(1)
      }

      await setDoc(userRef, updates, { merge: true })
    } catch (err) {
      console.warn('Erro ao atualizar XP no Firestore:', err)
    }
  } else {
    // Local fallback
    const storedSession = window.localStorage.getItem('zerei.session')
    if (storedSession) {
      try {
        const parsed = JSON.parse(storedSession)
        oldXp = Number(parsed.user?.xp || 0)
        newXp = Math.max(0, oldXp + numAmount)
      } catch {}
    }
  }

  // Atualiza sessão local se existir
  const storedSession = window.localStorage.getItem('zerei.session')
  if (storedSession) {
    try {
      const parsed = JSON.parse(storedSession)
      parsed.user.xp = newXp
      const info = getLevelInfo(newXp)
      parsed.user.level = info.level
      parsed.user.rank = info.rank
      window.localStorage.setItem('zerei.session', JSON.stringify(parsed))
    } catch {}
  }

  const leveledUp = newLevel > oldLevel
  const newLevelInfo = getLevelInfo(newXp)

  // Dispara evento para Toast flutuante
  notifyXpEvent({
    userId: current,
    amount: numAmount,
    reason,
    isPenalty: numAmount < 0,
    leveledUp,
    newLevel: newLevelInfo.level,
    newRank: newLevelInfo.rank,
    totalXp: newXp,
  })

  // Só registra marcos raros e expressivos no Feed (ex: Nível 20, 30, 40...)
  if (leveledUp && newLevelInfo.level >= 20 && newLevelInfo.level % 10 === 0) {
    logActivity({
      action: `alcançou o marco épico do Nível ${newLevelInfo.level} (${newLevelInfo.rank})! 🌟`,
    }).catch(() => {})
  }

  return {
    amount: numAmount,
    newXp,
    isPenalty: numAmount < 0,
    leveledUp,
    levelInfo: newLevelInfo,
  }
}

