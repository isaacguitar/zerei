import { Suspense, lazy, useEffect, useState } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { firestore } from './firebaseClient'
import { getCurrentUser, openAuthModal, signOut, subscribeToAuth } from './features/auth/authService'
import { subscribeToUserProfile } from './features/profile/profileService'
import { subscribeToConversations } from './features/social/directChatService'
import { getLevelInfo } from './features/gamification/xpService'

// Layout
import AppShell from './components/layout/AppShell'

// Features
import Dashboard from './features/dashboard/Dashboard'
import ProfilePage from './features/profile/ProfilePage'
import RetroAchievementsConnectModal from './features/retro-achievements/RetroAchievementsConnectModal'
import XpToast from './features/gamification/XpToast'
import DirectChatDrawer from './features/social/DirectChatDrawer'
import UserProfileModal from './features/social/UserProfileModal'
import FriendSearchModal from './features/social/FriendSearchModal'
import AuthModal from './features/auth/AuthModal'
import LandingPage from './features/landing/LandingPage'
import RomLibraryModal from './features/emulator/RomLibraryModal'
import AppUpdateManager from './features/updater/AppUpdateManager'

// Lazy views
const ClubHub     = lazy(() => import('./features/clubs/ClubHub'))
const GameRoom    = lazy(() => import('./features/game-room/GameRoom'))
const VotingRoom  = lazy(() => import('./features/clubs/VotingRoom'))
const Leaderboard = lazy(() => import('./features/leaderboard/LeaderboardPage'))
const ShelfPage   = lazy(() => import('./features/shelf/ShelfPage'))
const TipsHubPage = lazy(() => import('./features/tips/TipsHubPage'))
const FeedPage    = lazy(() => import('./features/feed/FeedPage'))
const AdminDashboard = lazy(() => import('./features/admin/AdminDashboard'))
import MaintenanceScreen from './features/admin/MaintenanceScreen'
import { isAdminUser, subscribeToSystemSettings } from './features/admin/adminService'

const Loader = ({ label }) => (
  <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-white/8 bg-panel text-sm text-slate-500">
    {label}
  </div>
)

export default function App() {
  // ── Navegação ─────────────────────────────────────────────────────────────
  const [activeView, setActiveView] = useState(() => {
    try {
      // Se for o aplicativo nativo instalado (PC/Android), vai direto para o dashboard/login
      if (typeof window !== 'undefined' && window.zereiNative?.isNativeApp) {
        return 'dashboard'
      }
      const params = new URLSearchParams(window.location.search)
      if (params.get('room') || params.get('spectate')) return 'game-room'
      const user = getCurrentUser()
      if (user?.id) return 'dashboard'
    } catch {}
    return 'landing'
  })
  const [authModalTab, setAuthModalTab]   = useState('email')
  const [selectedClub, setSelectedClub]   = useState({ id: 'nintendo' })
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [shelfTargetUser, setShelfTargetUser]   = useState(null)

  // ── Perfil & Autenticação ──────────────────────────────────────────────────
  const [userProfile, setUserProfile]     = useState(null)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [isRomLibraryOpen, setIsRomLibraryOpen] = useState(false)
  const [pendingAuthAction, setPendingAuthAction] = useState(null)

  // ── Social / chat (padrão expandido conforme solicitado) ───────────────────
  const [isDirectChatOpen, setIsDirectChatOpen] = useState(() => {
    try {
      const saved = localStorage.getItem('zerei_chat_open')
      return saved !== null ? JSON.parse(saved) : true
    } catch {
      return true
    }
  })
  const [directChatTargetUser, setDirectChatTargetUser] = useState(null)
  const [selectedUserProfile, setSelectedUserProfile]   = useState(null)
  const [isFriendsModalOpen, setIsFriendsModalOpen]     = useState(false)
  const [isChatExpanded, setIsChatExpanded]             = useState(() => {
    try {
      const saved = localStorage.getItem('zerei_chat_expanded')
      return saved !== null ? JSON.parse(saved) : true
    } catch {
      return true
    }
  })
  const [unreadDirectCount, setUnreadDirectCount]       = useState(0)
  const [selectedClubForHub, setSelectedClubForHub]     = useState(null)
  const [systemSettings, setSystemSettings]             = useState(null)

  // Salvar preferências do chat no localStorage sempre que mudarem
  useEffect(() => {
    try {
      localStorage.setItem('zerei_chat_open', JSON.stringify(isDirectChatOpen))
    } catch {}
  }, [isDirectChatOpen])

  useEffect(() => {
    try {
      localStorage.setItem('zerei_chat_expanded', JSON.stringify(isChatExpanded))
    } catch {}
  }, [isChatExpanded])

  // ── Efeitos de inicialização ───────────────────────────────────────────────
  useEffect(() => {
    return subscribeToSystemSettings(setSystemSettings)
  }, [])

  // Escuta reativa de autenticação (Google, Email e Convidado)
  useEffect(() => {
    let unsubscribeProfile = () => {}
    const unsubscribeAuth = subscribeToAuth((session) => {
      unsubscribeProfile()
      const user = session?.user || null
      if (user?.id) {
        unsubscribeProfile = subscribeToUserProfile(user.id, (p) => {
          // Garante cargo de admin para o e-mail do dono da plataforma
          if (p && user.email?.toLowerCase() === 'isaacfernandoguitar@gmail.com' && p.role !== 'admin') {
            setUserProfile({ ...p, role: 'admin' })
          } else {
            setUserProfile(p)
          }
        })
      } else {
        setUserProfile(null)
      }
    })

    return () => {
      unsubscribeAuth()
      unsubscribeProfile()
    }
  }, [])

  // Escutar evento global de abertura do popup de autenticação
  useEffect(() => {
    const handleOpenAuth = (e) => {
      if (e?.detail?.onAuthenticated) {
        setPendingAuthAction(() => e.detail.onAuthenticated)
      }
      setIsAuthModalOpen(true)
    }
    window.addEventListener('zerei:open_auth', handleOpenAuth)
    return () => window.removeEventListener('zerei:open_auth', handleOpenAuth)
  }, [])

  useEffect(() => {
    const user = getCurrentUser()
    if (!user?.id) return
    return subscribeToConversations(user.id, (convs) => {
      setUnreadDirectCount(convs.reduce((acc, c) => acc + (c.unreadCount || 0), 0))
    })
  }, [userProfile])

  // Detectar sala ou espectador via query param (?room=XYZ ou ?spectate=XYZ)
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search)
      const roomId = params.get('room') || params.get('spectate')
      if (roomId && firestore) {
        getDoc(doc(firestore, 'game_rooms', roomId)).then((snap) => {
          if (snap.exists()) {
            const data = snap.data()
            openGameRoom({ id: snap.id, ...data })
          }
        }).catch(() => {})
      }
    } catch {}
  }, [])

  useEffect(() => {
    const inRoom = activeView === 'game-room' || activeView === 'voting-room'
    setSidebarCollapsed(inRoom)
    // Se entrar em salas de jogo/votação, garante abertura e expansão
    if (inRoom) {
      setIsDirectChatOpen(true)
      setIsChatExpanded(true)
    }
  }, [activeView, selectedClub?.id])

  useEffect(() => {
    const handleOpenChat = () => {
      setIsDirectChatOpen(true)
      setIsChatExpanded(true)
    }
    window.addEventListener('zerei:open_chat', handleOpenChat)
    return () => window.removeEventListener('zerei:open_chat', handleOpenChat)
  }, [])

  const effectiveUser = userProfile || getCurrentUser()

  // ── Handlers Protegidos ────────────────────────────────────────────────────
  const handleSignOut    = () => {
    signOut().catch(() => {})
    setActiveView('landing')
  }
  const openUserProfile  = (user) => setSelectedUserProfile(user)
  
  const openShelf        = (user = null) => {
    if (!effectiveUser?.id) {
      setPendingAuthAction(() => () => openShelf(user))
      setIsAuthModalOpen(true)
      return
    }
    setShelfTargetUser(user)
    setActiveView('shelf')
  }

  const openDirectChat   = (user = null) => {
    if (!effectiveUser?.id) {
      setPendingAuthAction(() => () => openDirectChat(user))
      setIsAuthModalOpen(true)
      return
    }
    if (user) setDirectChatTargetUser(user)
    setIsDirectChatOpen(true)
  }

  const handleNavigate = (view, payload = null) => {
    // Permite navegar livremente pelo Dashboard e Landing
    if (view !== 'dashboard' && view !== 'landing' && !effectiveUser?.id) {
      setPendingAuthAction(() => () => {
        if (view === 'clubs') setSelectedClubForHub(payload || null)
        setActiveView(view)
      })
      setIsAuthModalOpen(true)
      return
    }

    if (view === 'rom-library') {
      setIsRomLibraryOpen(true)
      return
    }

    if (view === 'clubs') {
      setSelectedClubForHub(payload || null)
    }
    setActiveView(view)
  }

  const openGameRoom = (club) => {
    if (!effectiveUser?.id) {
      setPendingAuthAction(() => () => openGameRoom(club))
      setIsAuthModalOpen(true)
      return
    }

    const target = club || { id: 'nintendo' }
    setSelectedClub(target)
    const isVoting = target.phase === 'voting' || (target.votingMode && target.votingMode !== 'owner' && !target.gameTitle)
    setActiveView(isVoting ? 'voting-room' : 'game-room')
    setIsDirectChatOpen(true)
    setIsChatExpanded(true)
  }

  const isRaMissing   = Boolean(effectiveUser?.id && !effectiveUser?.retroAchievementsUsername)
  const isMaintenance = Boolean(systemSettings?.maintenanceMode && !isAdminUser(effectiveUser))

  if (isMaintenance) {
    return <MaintenanceScreen message={systemSettings?.maintenanceMessage} />
  }

  const shellProps = {
    activeView,
    onNavigate: handleNavigate,
    onSignOut: handleSignOut,
    collapsed: sidebarCollapsed,
    onToggleCollapse: () => setSidebarCollapsed((v) => !v),
    userProfile,
    onOpenFriendsModal: () => setIsFriendsModalOpen(true),
    isChatExpanded,
    onOpenAuth: () => setIsAuthModalOpen(true),
  }

  // Elementos globais presentes em todas as views
  const globalElements = (
    <>
      <AuthModal
        isOpen={isAuthModalOpen}
        initialTab={authModalTab}
        onClose={() => {
          setIsAuthModalOpen(false)
          setPendingAuthAction(null)
        }}
        onSuccess={(user) => {
          setIsAuthModalOpen(false)
          if (pendingAuthAction) {
            const act = pendingAuthAction
            setPendingAuthAction(null)
            act(user)
          } else if (activeView === 'landing') {
            setActiveView('dashboard')
          }
        }}
      />

      <RetroAchievementsConnectModal
        isOpen={isRaMissing && activeView !== 'landing'}
        userProfile={effectiveUser}
        forceMandatory
        onConnected={(data) => setUserProfile((prev) => ({ ...prev, ...data }))}
      />
      <XpToast />

      {/* Gatilho flutuante do chat apenas fora da landing */}
      {activeView !== 'landing' && !isDirectChatOpen && (
        <button
          onClick={() => openDirectChat()}
          className="fixed bottom-5 right-5 z-30 flex items-center gap-2.5 rounded-full border border-white/12 bg-slate-900/95 px-4 py-2.5 shadow-2xl backdrop-blur-md transition-all duration-200 hover:scale-105 hover:border-electric/45 hover:bg-slate-800 active:scale-95 group"
          title="Mensagens & Clubes"
        >
          <div className="relative flex items-center justify-center text-white transition group-hover:text-electric">
            <span className="text-sm">💬</span>
            {unreadDirectCount > 0 && (
              <span className="absolute -top-1.5 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white">
                {unreadDirectCount}
              </span>
            )}
          </div>
          <span className="text-xs font-bold text-white transition group-hover:text-electric">
            Chat & Clubes
          </span>
        </button>
      )}

      {activeView !== 'landing' && (
        <DirectChatDrawer
          isOpen={isDirectChatOpen}
          onClose={() => { setIsDirectChatOpen(false); setDirectChatTargetUser(null) }}
          initialTargetUser={directChatTargetUser}
          activeClubId={activeView === 'game-room' || activeView === 'voting-room' ? selectedClub?.id : null}
          activeClubName={selectedClub?.title || selectedClub?.name || (selectedClub?.isSolo ? `Quartinho: ${selectedClub?.gameTitle}` : 'Chat da Sala')}
          isExpanded={isChatExpanded}
          onToggleExpanded={() => setIsChatExpanded((prev) => !prev)}
          onExpandedChange={setIsChatExpanded}
          onOpenUserProfile={openUserProfile}
          onWatchGame={(room) => openGameRoom(room)}
        />
      )}

      <FriendSearchModal
        isOpen={isFriendsModalOpen}
        onClose={() => setIsFriendsModalOpen(false)}
        onOpenProfile={openUserProfile}
        onOpenDirectChat={openDirectChat}
      />

      <UserProfileModal
        isOpen={Boolean(selectedUserProfile)}
        targetUser={selectedUserProfile}
        onClose={() => setSelectedUserProfile(null)}
        onOpenDirectChat={openDirectChat}
        onOpenShelf={openShelf}
        onWatchGame={(room) => openGameRoom(room)}
      />

      <RomLibraryModal
        isOpen={isRomLibraryOpen}
        onClose={() => setIsRomLibraryOpen(false)}
        onSelectRom={(rom) => {
          setIsRomLibraryOpen(false)
          // Se for uma seleção geral pela sidebar, leva para o salão de jogos
          handleNavigate('clubs')
        }}
      />

      <AppUpdateManager />
    </>
  )

  // ── Views ─────────────────────────────────────────────────────────────────
  if (activeView === 'landing') {
    return (
      <>
        <LandingPage
          userProfile={effectiveUser}
          onOpenAuth={(tab = 'email') => {
            setAuthModalTab(tab)
            setIsAuthModalOpen(true)
          }}
          onExploreWeb={() => setActiveView('dashboard')}
          onNavigateToApp={() => setActiveView('dashboard')}
        />
        {globalElements}
      </>
    )
  }

  if (activeView === 'dashboard') {
    return (
      <>
        <Dashboard
          onNavigate={handleNavigate}
          onOpenGameRoom={openGameRoom}
          onSignOut={handleSignOut}
          userProfile={userProfile}
          onOpenDirectChat={openDirectChat}
          unreadDirectCount={unreadDirectCount}
          onOpenUserProfile={openUserProfile}
          onOpenFriendsModal={() => setIsFriendsModalOpen(true)}
          isChatExpanded={isChatExpanded}
          onOpenAuth={() => setIsAuthModalOpen(true)}
        />
        {globalElements}
      </>
    )
  }

  if (activeView === 'profile') {
    return (
      <AppShell {...shellProps}>
        <ProfilePage
          userProfile={effectiveUser}
          onBack={() => setActiveView('dashboard')}
          onProfileUpdated={(updated) => setUserProfile((prev) => ({ ...prev, ...updated }))}
          onOpenDirectChat={openDirectChat}
        />
        {globalElements}
      </AppShell>
    )
  }

  if (activeView === 'clubs') {
    return (
      <AppShell {...shellProps}>
        <Suspense fallback={<Loader label="Carregando salão de jogos..." />}>
          <ClubHub
            onBack={() => setActiveView('dashboard')}
            onOpenGameRoom={openGameRoom}
            initialClub={selectedClubForHub}
          />
        </Suspense>
        {globalElements}
      </AppShell>
    )
  }

  if (activeView === 'voting-room') {
    return (
      <AppShell {...shellProps}>
        <Suspense fallback={<Loader label="Carregando sala de votação..." />}>
          <VotingRoom
            club={selectedClub}
            currentUser={effectiveUser}
            onBack={() => setActiveView('clubs')}
            onGameSelected={(updatedClub) => { setSelectedClub(updatedClub); setActiveView('game-room') }}
          />
        </Suspense>
        {globalElements}
      </AppShell>
    )
  }

  if (activeView === 'game-room') {
    return (
      <AppShell {...shellProps}>
        <Suspense fallback={<Loader label="Carregando sala de jogo..." />}>
          <GameRoom club={selectedClub} currentUser={effectiveUser} onBack={() => setActiveView('dashboard')} />
        </Suspense>
        {globalElements}
      </AppShell>
    )
  }

  if (activeView === 'ranking') {
    return (
      <AppShell {...shellProps}>
        <Suspense fallback={<Loader label="Carregando ranking..." />}>
          <Leaderboard onBack={() => setActiveView('dashboard')} currentUser={effectiveUser} />
        </Suspense>
        {globalElements}
      </AppShell>
    )
  }

  if (activeView === 'shelf') {
    return (
      <AppShell {...shellProps}>
        <Suspense fallback={<Loader label="Carregando estante de jogos..." />}>
          <ShelfPage
            targetUser={shelfTargetUser}
            currentUser={effectiveUser}
            onBack={() => {
              setShelfTargetUser(null)
              setActiveView('dashboard')
            }}
            onOpenGameRoom={openGameRoom}
          />
        </Suspense>
        {globalElements}
      </AppShell>
    )
  }

  if (activeView === 'tips') {
    return (
      <AppShell {...shellProps}>
        <Suspense fallback={<Loader label="Carregando mural de dicas..." />}>
          <TipsHubPage
            onBack={() => setActiveView('dashboard')}
          />
        </Suspense>
        {globalElements}
      </AppShell>
    )
  }

  if (activeView === 'feed') {
    return (
      <AppShell {...shellProps}>
        <Suspense fallback={<Loader label="Carregando feed..." />}>
          <FeedPage
            onBack={() => setActiveView('dashboard')}
            onOpenGameRoom={openGameRoom}
            onOpenDirectChat={openDirectChat}
            onOpenUserProfile={openUserProfile}
            onNavigate={handleNavigate}
          />
        </Suspense>
        {globalElements}
      </AppShell>
    )
  }

  if (activeView === 'admin') {
    if (!isAdminUser(effectiveUser)) {
      setActiveView('dashboard')
      return null
    }
    return (
      <AppShell {...shellProps}>
        <Suspense fallback={<Loader label="Carregando painel de administração..." />}>
          <AdminDashboard onBack={() => setActiveView('dashboard')} />
        </Suspense>
        {globalElements}
      </AppShell>
    )
  }

  // Fallback
  return null
}
