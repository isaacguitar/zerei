import {
  GoogleAuthProvider,
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut as firebaseSignOut,
  updateProfile,
} from 'firebase/auth'
import { firebaseAuth, hasFirebaseConfig } from '../../firebaseClient'

const sessionStorageKey = 'zerei.session'

export const authProvider = hasFirebaseConfig ? 'firebase' : 'demo'
export const isFirebaseReady = Boolean(firebaseAuth)

if (firebaseAuth) {
  setPersistence(firebaseAuth, browserLocalPersistence).catch(() => {})
}

function ensureFirebaseReady() {
  if (!firebaseAuth) {
    throw Object.assign(new Error('Firebase não configurado. Use o modo de demonstração.'), {
      code: 'auth/config-not-set',
    })
  }
}

function mapFirebaseUser(user) {
  if (!user) return null

  return {
    user: {
      id: user.uid,
      displayName: user.displayName || user.email?.split('@')[0] || 'Jogador',
      email: user.email || '',
      avatarUrl: user.photoURL || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(user.displayName || user.email || 'Jogador')}`,
    },
    provider: 'firebase',
  }
}

export function openAuthModal(options = {}) {
  window.dispatchEvent(new CustomEvent('zerei:open_auth', { detail: options }))
}

export function requireAuth(actionCallback, options = {}) {
  const user = getCurrentUser()
  if (user?.id) {
    if (typeof actionCallback === 'function') actionCallback(user)
    return true
  }
  openAuthModal({ onAuthenticated: actionCallback, ...options })
  return false
}

export function subscribeToAuth(onSessionChange) {
  const handleLocalChange = () => {
    onSessionChange(getCurrentUser() ? { user: getCurrentUser(), provider: isCloudUser() ? 'firebase' : 'demo' } : null)
  }

  window.addEventListener('zerei:auth_state_changed', handleLocalChange)

  let unsubscribeFirebase = () => {}
  if (firebaseAuth) {
    unsubscribeFirebase = onAuthStateChanged(firebaseAuth, (user) => {
      const mapped = mapFirebaseUser(user)
      if (mapped) {
        onSessionChange(mapped)
      } else {
        const stored = getStoredSession()
        onSessionChange(stored)
      }
    })
  } else {
    onSessionChange(getStoredSession())
  }

  return () => {
    window.removeEventListener('zerei:auth_state_changed', handleLocalChange)
    unsubscribeFirebase()
  }
}

export function getCurrentUser() {
  const firebaseUser = firebaseAuth?.currentUser
  return firebaseUser ? mapFirebaseUser(firebaseUser).user : getStoredSession()?.user ?? null
}

export function isCloudUser() {
  return Boolean(firebaseAuth?.currentUser)
}

export async function signInWithEmail(email, password) {
  ensureFirebaseReady()
  const result = await signInWithEmailAndPassword(firebaseAuth, email, password)
  const mapped = mapFirebaseUser(result.user)
  window.dispatchEvent(new CustomEvent('zerei:auth_state_changed', { detail: mapped }))
  return mapped.user
}

export async function signUpWithEmail(displayName, email, password) {
  ensureFirebaseReady()
  const result = await createUserWithEmailAndPassword(firebaseAuth, email, password)
  await updateProfile(result.user, { displayName })
  const mapped = mapFirebaseUser({ ...result.user, displayName })
  window.dispatchEvent(new CustomEvent('zerei:auth_state_changed', { detail: mapped }))
  return mapped.user
}

export async function signInWithGoogle() {
  ensureFirebaseReady()
  const provider = new GoogleAuthProvider()
  try {
    const result = await signInWithPopup(firebaseAuth, provider)
    const mapped = mapFirebaseUser(result.user)
    window.dispatchEvent(new CustomEvent('zerei:auth_state_changed', { detail: mapped }))
    return mapped.user
  } catch (err) {
    if (err.code === 'auth/popup-blocked') {
      // Se popup estiver bloqueado ou no ambiente nativo webview, tenta redirecionamento
      await signInWithRedirect(firebaseAuth, provider)
      return null
    }
    throw err
  }
}

// Verifica se retornou de um fluxo de redirecionamento (Redirect)
if (firebaseAuth) {
  getRedirectResult(firebaseAuth)
    .then((result) => {
      if (result?.user) {
        const mapped = mapFirebaseUser(result.user)
        window.dispatchEvent(new CustomEvent('zerei:auth_state_changed', { detail: mapped }))
      }
    })
    .catch(() => {})
}

export function getStoredSession() {
  const storedSession = window.localStorage.getItem(sessionStorageKey)

  if (!storedSession) return null

  try {
    const parsedSession = JSON.parse(storedSession)

    if (!parsedSession?.user || !parsedSession.user.id) {
      window.localStorage.removeItem(sessionStorageKey)
      return null
    }

    return {
      ...parsedSession,
      user: {
        ...parsedSession.user,
        displayName: parsedSession.user.displayName || parsedSession.user.email?.split('@')[0] || 'Jogador',
        avatarUrl: parsedSession.user.avatarUrl || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(parsedSession.user.displayName || parsedSession.user.email || 'Jogador')}`,
      },
    }
  } catch {
    window.localStorage.removeItem(sessionStorageKey)
    return null
  }
}

export function signInDemo() {
  const session = {
    user: {
      id: 'user-isaac',
      displayName: 'Isaac',
      email: 'isaac@zerei.local',
      avatarUrl: 'https://api.dicebear.com/7.x/pixel-art/svg?seed=Isaac',
    },
    provider: 'demo',
  }

  window.localStorage.setItem(sessionStorageKey, JSON.stringify(session))
  window.dispatchEvent(new CustomEvent('zerei:auth_state_changed', { detail: session }))
  return session
}

export async function signOut() {
  if (firebaseAuth) {
    await firebaseSignOut(firebaseAuth)
  }
  window.localStorage.removeItem(sessionStorageKey)
  window.dispatchEvent(new CustomEvent('zerei:auth_state_changed', { detail: null }))
}

