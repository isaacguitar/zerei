import {
  addDoc,
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
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore'
import { firestore } from '../../firebaseClient'
import { getCurrentUser } from '../auth/authService'
import { getLevelInfo } from '../gamification/xpService'

const MASTER_ADMIN_EMAIL = 'isaacfernandoguitar@gmail.com'

/**
 * Valida se um usuário é administrador da plataforma
 */
export function isAdminUser(user) {
  if (!user) return false
  if (user.role === 'admin') return true
  if (user.email && user.email.toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase()) return true
  return false
}

/**
 * Registra uma ação administrativa no log de auditoria
 */
export async function logAdminAction(action, details = {}) {
  const admin = getCurrentUser()
  if (!firestore || !admin?.id) return

  try {
    await addDoc(collection(firestore, 'audit_logs'), {
      adminId: admin.id,
      adminName: admin.displayName || 'Administrador',
      adminEmail: admin.email || '',
      action,
      details,
      createdAt: serverTimestamp(),
    })
  } catch (err) {
    console.warn('Falha ao registrar audit_log:', err)
  }
}

/**
 * Escuta os logs de auditoria em tempo real
 */
export function subscribeToAuditLogs(onUpdate) {
  if (!firestore) {
    onUpdate([])
    return () => {}
  }

  const q = query(collection(firestore, 'audit_logs'), orderBy('createdAt', 'desc'), limit(30))
  return onSnapshot(
    q,
    (snapshot) => {
      const logs = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        createdAt: d.data().createdAt?.toDate?.() || new Date(),
      }))
      onUpdate(logs)
    },
    (err) => {
      console.warn('Erro ao carregar audit_logs:', err)
      onUpdate([])
    }
  )
}

/* ==========================================================================
   DESAFIO GLOBAL DA COMUNIDADE
   ========================================================================== */

export function subscribeToGlobalChallenge(onUpdate) {
  if (!firestore) {
    onUpdate(null)
    return () => {}
  }

  const challengeRef = doc(firestore, 'admin_config', 'global_challenge')
  return onSnapshot(
    challengeRef,
    (snap) => {
      if (snap.exists()) {
        onUpdate({ id: snap.id, ...snap.data() })
      } else {
        onUpdate(null)
      }
    },
    (err) => {
      console.warn('Erro ao escutar desafio global:', err)
      onUpdate(null)
    }
  )
}

export async function saveGlobalChallenge(challengeData) {
  if (!firestore) throw new Error('Firestore indisponível.')
  const challengeRef = doc(firestore, 'admin_config', 'global_challenge')

  const payload = {
    title: challengeData.title?.trim() || 'Desafio Comunitário',
    gameTitle: challengeData.gameTitle?.trim() || 'Super Mario World',
    description: challengeData.description?.trim() || 'Junte-se à comunidade para batermos esta meta histórica!',
    currentValue: Number(challengeData.currentValue || 0),
    targetValue: Math.max(1, Number(challengeData.targetValue || 10000)),
    unit: challengeData.unit?.trim() || 'moedas',
    rewardXp: Number(challengeData.rewardXp || 500),
    active: Boolean(challengeData.active),
    updatedAt: serverTimestamp(),
  }

  await setDoc(challengeRef, payload, { merge: true })
  await logAdminAction('update_global_challenge', payload)
  return payload
}

/* ==========================================================================
   AVISO GLOBAL NO TOPO DO SITE (ANNOUNCEMENT BANNER)
   ========================================================================== */

export function subscribeToTopAnnouncement(onUpdate) {
  if (!firestore) {
    onUpdate(null)
    return () => {}
  }

  const announcementRef = doc(firestore, 'admin_config', 'announcement')
  return onSnapshot(
    announcementRef,
    (snap) => {
      if (snap.exists()) {
        onUpdate({ id: snap.id, ...snap.data() })
      } else {
        onUpdate(null)
      }
    },
    (err) => {
      console.warn('Erro ao escutar aviso global:', err)
      onUpdate(null)
    }
  )
}

export async function saveTopAnnouncement(announcementData) {
  if (!firestore) throw new Error('Firestore indisponível.')
  const announcementRef = doc(firestore, 'admin_config', 'announcement')

  const payload = {
    message: announcementData.message?.trim() || '',
    type: announcementData.type || 'info', // 'info' | 'warning' | 'celebration' | 'alert'
    linkUrl: announcementData.linkUrl?.trim() || null,
    linkLabel: announcementData.linkLabel?.trim() || null,
    active: Boolean(announcementData.active),
    updatedAt: serverTimestamp(),
  }

  await setDoc(announcementRef, payload, { merge: true })
  await logAdminAction('update_top_announcement', payload)
  return payload
}

/* ==========================================================================
   CONFIGURAÇÕES GERAIS DO SISTEMA (2X XP & MODO MANUTENÇÃO)
   ========================================================================== */

export function subscribeToSystemSettings(onUpdate) {
  if (!firestore) {
    onUpdate({ doubleXpActive: false, maintenanceMode: false })
    return () => {}
  }

  const systemRef = doc(firestore, 'admin_config', 'system')
  return onSnapshot(
    systemRef,
    (snap) => {
      if (snap.exists()) {
        onUpdate({ id: snap.id, ...snap.data() })
      } else {
        onUpdate({ doubleXpActive: false, maintenanceMode: false })
      }
    },
    (err) => {
      console.warn('Erro ao escutar configurações do sistema:', err)
      onUpdate({ doubleXpActive: false, maintenanceMode: false })
    }
  )
}

export async function saveSystemSettings(settings) {
  if (!firestore) throw new Error('Firestore indisponível.')
  const systemRef = doc(firestore, 'admin_config', 'system')

  const payload = {
    doubleXpActive: Boolean(settings.doubleXpActive),
    doubleXpLabel: settings.doubleXpLabel?.trim() || 'Fim de Semana 2x XP Ativo!',
    maintenanceMode: Boolean(settings.maintenanceMode),
    maintenanceMessage: settings.maintenanceMessage?.trim() || 'Estamos realizando melhorias na plataforma. Voltamos em instantes!',
    updatedAt: serverTimestamp(),
  }

  await setDoc(systemRef, payload, { merge: true })
  await logAdminAction('update_system_settings', payload)
  return payload
}

/* ==========================================================================
   JOGO EM DESTAQUE DA SEMANA
   ========================================================================== */

export function subscribeToFeaturedGame(onUpdate) {
  if (!firestore) {
    onUpdate(null)
    return () => {}
  }

  const featuredRef = doc(firestore, 'admin_config', 'featured_game')
  return onSnapshot(
    featuredRef,
    (snap) => {
      if (snap.exists()) {
        onUpdate({ id: snap.id, ...snap.data() })
      } else {
        onUpdate(null)
      }
    },
    (err) => {
      console.warn('Erro ao escutar jogo destaque:', err)
      onUpdate(null)
    }
  )
}

export async function saveFeaturedGame(gameData) {
  if (!firestore) throw new Error('Firestore indisponível.')
  const featuredRef = doc(firestore, 'admin_config', 'featured_game')

  const payload = {
    gameTitle: gameData.gameTitle?.trim() || '',
    gameConsole: gameData.gameConsole?.trim() || 'SNES',
    description: gameData.description?.trim() || '',
    coverUrl: gameData.coverUrl?.trim() || null,
    active: Boolean(gameData.active),
    updatedAt: serverTimestamp(),
  }

  await setDoc(featuredRef, payload, { merge: true })
  await logAdminAction('update_featured_game', payload)
  return payload
}

/* ==========================================================================
   GESTÃO DE JOGADORES / USUÁRIOS
   ========================================================================== */

export async function listAllUsers({ search = '', roleFilter = 'all', max = 50 } = {}) {
  if (!firestore) return []

  const usersCol = collection(firestore, 'users')
  const q = query(usersCol, limit(100))
  const snapshot = await getDocs(q)

  let list = snapshot.docs.map((d) => ({
    id: d.id,
    ...d.data(),
    createdAt: d.data().createdAt?.toDate?.() || new Date(),
  }))

  // Filtro de busca
  if (search.trim()) {
    const term = search.trim().toLowerCase()
    list = list.filter(
      (u) =>
        u.displayName?.toLowerCase().includes(term) ||
        u.email?.toLowerCase().includes(term)
    )
  }

  // Filtro de cargo
  if (roleFilter !== 'all') {
    list = list.filter((u) => (roleFilter === 'admin' ? u.role === 'admin' : u.role !== 'admin'))
  }

  return list.slice(0, max)
}

export async function setUserRole(userId, newRole) {
  if (!firestore || !userId) throw new Error('Dados inválidos.')
  const userRef = doc(firestore, 'users', userId)
  await updateDoc(userRef, {
    role: newRole,
    updatedAt: serverTimestamp(),
  })
  await logAdminAction('set_user_role', { userId, newRole })
}

export async function toggleUserBan(userId, { banned, reason = '' }) {
  if (!firestore || !userId) throw new Error('Dados inválidos.')
  const userRef = doc(firestore, 'users', userId)
  await updateDoc(userRef, {
    isBanned: Boolean(banned),
    bannedReason: banned ? (reason.trim() || 'Violação das diretrizes da comunidade') : null,
    bannedAt: banned ? serverTimestamp() : null,
  })
  await logAdminAction(banned ? 'ban_user' : 'unban_user', { userId, reason })
}

export async function awardUserBonusXp(userId, amount, reason = 'Bonificação da Administração') {
  if (!firestore || !userId || !amount) throw new Error('Dados inválidos.')
  const userRef = doc(firestore, 'users', userId)

  await runTransaction(firestore, async (transaction) => {
    const snap = await transaction.get(userRef)
    if (!snap.exists()) return

    const curXp = Number(snap.data().xp || 0)
    const newXp = Math.max(0, curXp + Number(amount))
    const levelInfo = getLevelInfo(newXp)

    transaction.update(userRef, {
      xp: newXp,
      level: levelInfo.level,
      rank: levelInfo.rank,
    })
  })

  await logAdminAction('award_bonus_xp', { userId, amount, reason })
}

export async function resetUserNick(userId, fallbackNick = 'Jogador') {
  if (!firestore || !userId) throw new Error('Dados inválidos.')
  const userRef = doc(firestore, 'users', userId)
  await updateDoc(userRef, {
    displayName: fallbackNick,
    lastNameChangeAt: null,
  })
  await logAdminAction('reset_user_nick', { userId, fallbackNick })
}

/* ==========================================================================
   CENTRAL DE MODERAÇÃO & DENÚNCIAS
   ========================================================================== */

export function subscribeToReports(onUpdate) {
  if (!firestore) {
    onUpdate([])
    return () => {}
  }

  const q = query(collection(firestore, 'reports'), orderBy('createdAt', 'desc'), limit(40))
  return onSnapshot(
    q,
    (snapshot) => {
      const reports = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        createdAt: d.data().createdAt?.toDate?.() || new Date(),
      }))
      onUpdate(reports)
    },
    (err) => {
      console.warn('Erro ao escutar denúncias:', err)
      onUpdate([])
    }
  )
}

export async function resolveReport(reportId, actionTaken = 'resolved') {
  if (!firestore || !reportId) return
  const reportRef = doc(firestore, 'reports', reportId)
  await updateDoc(reportRef, {
    status: actionTaken, // 'resolved' | 'dismissed'
    resolvedAt: serverTimestamp(),
  })
  await logAdminAction('resolve_report', { reportId, actionTaken })
}

export async function adminDeletePost(activityId) {
  if (!firestore || !activityId) return
  await deleteDoc(doc(firestore, 'activities', activityId))
  await logAdminAction('delete_activity', { activityId })
}

export async function adminDeleteTip(tipId) {
  if (!firestore || !tipId) return
  await deleteDoc(doc(firestore, 'game_tips', tipId))
  await logAdminAction('delete_tip', { tipId })
}

/* ==========================================================================
   TEMPORADAS DO RANKING
   ========================================================================== */

export function subscribeToSeasonInfo(onUpdate) {
  if (!firestore) {
    onUpdate({ seasonNumber: 1, title: 'Temporada Retrô 1', active: true })
    return () => {}
  }

  const seasonRef = doc(firestore, 'admin_config', 'season')
  return onSnapshot(
    seasonRef,
    (snap) => {
      if (snap.exists()) {
        onUpdate({ id: snap.id, ...snap.data() })
      } else {
        onUpdate({ seasonNumber: 1, title: 'Temporada Retrô 1', active: true })
      }
    },
    (err) => {
      console.warn('Erro ao escutar temporada:', err)
      onUpdate({ seasonNumber: 1, title: 'Temporada Retrô 1', active: true })
    }
  )
}

export async function saveSeasonInfo(seasonData) {
  if (!firestore) throw new Error('Firestore indisponível.')
  const seasonRef = doc(firestore, 'admin_config', 'season')

  const payload = {
    seasonNumber: Number(seasonData.seasonNumber || 1),
    title: seasonData.title?.trim() || `Temporada ${seasonData.seasonNumber || 1}`,
    description: seasonData.description?.trim() || 'Disputa de maiores zeradores e pontos RetroAchievements.',
    endsAt: seasonData.endsAt || null,
    active: Boolean(seasonData.active),
    updatedAt: serverTimestamp(),
  }

  await setDoc(seasonRef, payload, { merge: true })
  await logAdminAction('update_season', payload)
  return payload
}

/* ==========================================================================
   MÉTRICAS DA PLATAFORMA (ANALYTICS)
   ========================================================================== */

export async function fetchPlatformMetrics() {
  if (!firestore) {
    return { users: 0, clubs: 0, rooms: 0, activities: 0, tips: 0 }
  }

  try {
    const [usersSnap, clubsSnap, activitiesSnap, tipsSnap] = await Promise.all([
      getDocs(query(collection(firestore, 'users'), limit(500))).catch(() => ({ size: 0 })),
      getDocs(query(collection(firestore, 'clubs'), limit(500))).catch(() => ({ size: 0 })),
      getDocs(query(collection(firestore, 'activities'), limit(500))).catch(() => ({ size: 0 })),
      getDocs(query(collection(firestore, 'game_tips'), limit(500))).catch(() => ({ size: 0 })),
    ])

    return {
      users: usersSnap.size || 0,
      clubs: clubsSnap.size || 0,
      activities: activitiesSnap.size || 0,
      tips: tipsSnap.size || 0,
    }
  } catch (err) {
    console.warn('Erro ao carregar métricas:', err)
    return { users: 0, clubs: 0, activities: 0, tips: 0 }
  }
}

