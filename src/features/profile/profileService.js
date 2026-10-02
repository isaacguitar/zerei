import { doc, getDoc, onSnapshot, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore'
import { updateProfile } from 'firebase/auth'
import { firebaseAuth, firestore } from '../../firebaseClient'
import { getCurrentUser } from '../auth/authService'
import { logActivity } from '../feed/activityService'

const THREE_MONTHS_MS = 90 * 24 * 60 * 60 * 1000

export function getDaysUntilNameChangeAllowed(lastNameChangeAt) {
  if (!lastNameChangeAt) return 0
  const lastDate = lastNameChangeAt.toDate ? lastNameChangeAt.toDate() : new Date(lastNameChangeAt)
  const elapsed = Date.now() - lastDate.getTime()
  if (elapsed >= THREE_MONTHS_MS) return 0
  return Math.ceil((THREE_MONTHS_MS - elapsed) / (24 * 60 * 60 * 1000))
}

export function subscribeToUserProfile(userId, onUpdate) {
  if (!firestore || !userId) {
    onUpdate(null)
    return () => {}
  }

  const userRef = doc(firestore, 'users', userId)

  const unsubscribe = onSnapshot(userRef, async (snapshot) => {
    if (snapshot.exists()) {
      onUpdate({ id: snapshot.id, ...snapshot.data() })
    } else {
      // Create initial profile
      const authUser = firebaseAuth?.currentUser || getCurrentUser()
      const initialProfile = {
        displayName: authUser?.displayName || 'Jogador',
        email: authUser?.email || '',
        avatarUrl: authUser?.avatarUrl || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(authUser?.displayName || 'Jogador')}`,
        level: 1,
        xp: 0,
        rank: 'Novato',
        lastNameChangeAt: null,
        createdAt: serverTimestamp(),
      }
      try {
        await setDoc(userRef, initialProfile)
        onUpdate({ id: userId, ...initialProfile })
      } catch (err) {
        console.warn('Erro ao criar perfil inicial:', err)
        onUpdate({ id: userId, ...initialProfile })
      }
    }
  }, (error) => {
    console.warn('Erro ao monitorar perfil:', error)
    const currentUser = getCurrentUser()
    onUpdate(currentUser)
  })

  return unsubscribe
}

export async function updateUserNick(userId, newNick) {
  const trimmed = newNick?.trim()
  if (!trimmed || trimmed.length < 3 || trimmed.length > 25) {
    throw new Error('O nome de usuário deve ter entre 3 e 25 caracteres.')
  }

  if (!firestore) {
    throw new Error('Banco de dados não disponível.')
  }

  const userRef = doc(firestore, 'users', userId)
  const snapshot = await getDoc(userRef)
  const currentData = snapshot.data()

  if (currentData?.lastNameChangeAt) {
    const daysRemaining = getDaysUntilNameChangeAllowed(currentData.lastNameChangeAt)
    if (daysRemaining > 0) {
      throw new Error(`O nome só pode ser alterado a cada 3 meses. Próxima alteração disponível em ${daysRemaining} ${daysRemaining === 1 ? 'dia' : 'dias'}.`)
    }
  }

  const newAvatarUrl = `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(trimmed)}`

  // Update in Firestore
  await setDoc(userRef, {
    displayName: trimmed,
    avatarUrl: newAvatarUrl,
    lastNameChangeAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }, { merge: true })

  // Update in Firebase Auth if signed in
  if (firebaseAuth?.currentUser) {
    await updateProfile(firebaseAuth.currentUser, {
      displayName: trimmed,
      photoURL: newAvatarUrl,
    })
  }

  // Update in local session cache if present
  const storedSession = window.localStorage.getItem('zerei.session')
  if (storedSession) {
    try {
      const parsed = JSON.parse(storedSession)
      parsed.user.displayName = trimmed
      parsed.user.avatarUrl = newAvatarUrl
      window.localStorage.setItem('zerei.session', JSON.stringify(parsed))
    } catch {}
  }

  // Log activity
  logActivity({
    action: `alterou seu nome de usuário para ${trimmed}`,
  }).catch(() => {})

  return { displayName: trimmed, avatarUrl: newAvatarUrl }
}

export async function connectRetroAchievements(userId, { username, points = 0, rank = 'Retro Player' }) {
  const trimmed = username?.trim()
  if (!trimmed) throw new Error('Nome de usuário do RetroAchievements inválido.')

  const userRef = doc(firestore, 'users', userId)
  const raData = {
    retroAchievementsUsername: trimmed,
    retroAchievementsPoints: points,
    retroAchievementsRank: rank,
    retroAchievementsConnectedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }

  await setDoc(userRef, raData, { merge: true })

  // Update session storage if needed
  const storedSession = window.localStorage.getItem('zerei.session')
  if (storedSession) {
    try {
      const parsed = JSON.parse(storedSession)
      parsed.user.retroAchievementsUsername = trimmed
      window.localStorage.setItem('zerei.session', JSON.stringify(parsed))
    } catch {}
  }

  return raData
}

export async function disconnectRetroAchievements(userId, username = '') {
  const userRef = doc(firestore, 'users', userId)
  const raData = {
    retroAchievementsUsername: null,
    retroAchievementsPoints: null,
    retroAchievementsRank: null,
    retroAchievementsConnectedAt: null,
    updatedAt: serverTimestamp(),
  }

  await setDoc(userRef, raData, { merge: true })

  await window.zereiNative?.disconnectRetroAchievements?.(username)

  const storedSession = window.localStorage.getItem('zerei.session')
  if (storedSession) {
    try {
      const parsed = JSON.parse(storedSession)
      delete parsed.user.retroAchievementsUsername
      window.localStorage.setItem('zerei.session', JSON.stringify(parsed))
    } catch {}
  }

  return raData
}

