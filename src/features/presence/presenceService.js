import { collection, deleteDoc, doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore'
import { firestore } from '../../firebaseClient'

export function joinPresence(clubOrRoomId, user, options = {}) {
  if (!firestore || !clubOrRoomId || !user?.id) return () => {}

  const isRoom = options.isRoom || options.isSolo || clubOrRoomId.length > 15
  const collectionName = isRoom ? 'game_rooms' : 'clubs'
  const presenceRef = doc(firestore, collectionName, clubOrRoomId, 'presence', user.id)
  const userRef = doc(firestore, 'users', user.id)

  const heartbeat = async () => {
    try {
      const presenceData = {
        id: user.id,
        userId: user.id,
        displayName: user.displayName || 'Jogador',
        avatarUrl: user.avatarUrl || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(user.displayName || 'Jogador')}`,
        lastSeen: serverTimestamp(),
        updatedAt: Date.now(),
        online: true,
        role: options.role || 'player',
      }
      await setDoc(presenceRef, presenceData, { merge: true })

      // Se o usuário estiver jogando ativamente, marca no perfil para os amigos verem
      if (options.gameTitle) {
        await setDoc(
          userRef,
          {
            currentActivity: {
              status: 'playing',
              gameTitle: options.gameTitle,
              gameConsole: options.gameConsole || '',
              roomId: clubOrRoomId,
              isSolo: Boolean(options.isSolo),
              allowSpectators: options.allowSpectators !== undefined ? Boolean(options.allowSpectators) : true,
              role: options.role || 'player',
              updatedAt: Date.now(),
            },
          },
          { merge: true }
        )
      }
    } catch (err) {
      console.warn('joinPresence heartbeat error:', err)
    }
  }

  heartbeat()
  const intervalId = window.setInterval(heartbeat, 15000)

  const clearActivity = () => {
    deleteDoc(presenceRef).catch(() => {})
    if (options.gameTitle) {
      setDoc(userRef, { currentActivity: null }, { merge: true }).catch(() => {})
    }
  }

  const handleUnload = () => {
    clearActivity()
  }
  window.addEventListener('beforeunload', handleUnload)

  return () => {
    window.clearInterval(intervalId)
    window.removeEventListener('beforeunload', handleUnload)
    clearActivity()
  }
}

export function subscribeToPresence(clubOrRoomId, onUpdate, options = {}) {
  if (!firestore || !clubOrRoomId) {
    onUpdate([])
    return () => {}
  }

  const isRoom = options.isRoom || options.isSolo || clubOrRoomId.length > 15
  const collectionName = isRoom ? 'game_rooms' : 'clubs'
  const presenceCollection = collection(firestore, collectionName, clubOrRoomId, 'presence')

  return onSnapshot(
    presenceCollection,
    (snapshot) => {
      const now = Date.now()
      const activeMembers = snapshot.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((member) => {
          if (member.online === false) return false
          if (!member.lastSeen && !member.updatedAt) return true

          let lastSeenMs = typeof member.updatedAt === 'number' ? member.updatedAt : null
          if (!lastSeenMs && member.lastSeen) {
            lastSeenMs = member.lastSeen.toDate ? member.lastSeen.toDate().getTime() : new Date(member.lastSeen).getTime()
          }
          if (!lastSeenMs || isNaN(lastSeenMs)) return true

          // Allow up to 3 minutes of inactivity, tolerate any future clock skew
          const diff = now - lastSeenMs
          return diff < 180000
        })

      onUpdate(activeMembers)
    },
    (err) => {
      console.warn('subscribeToPresence snapshot error:', err)
      onUpdate([])
    }
  )
}
