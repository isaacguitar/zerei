import Sidebar from '../navigation/Sidebar'
import GlobalAnnouncementBanner from './GlobalAnnouncementBanner'

/**
 * AppShell — invólucro de layout comum a todas as views.
 * Responsável pelo deslocamento lateral quando o chat está expandido.
 */
export default function AppShell({
  activeView,
  onNavigate,
  onSignOut,
  children,
  collapsed,
  onToggleCollapse,
  userProfile,
  onOpenFriendsModal,
  isChatExpanded,
  onOpenAuth,
}) {
  return (
    <div className="min-h-screen bg-crtVoid text-slate-200">
      <GlobalAnnouncementBanner />
      <div
        className={`flex min-h-screen flex-col lg:flex-row transition-[margin] duration-300 ease-in-out ${
          isChatExpanded ? 'mr-0 sm:mr-80 xl:mr-88' : ''
        }`}
      >
        <Sidebar
          activeView={activeView}
          onNavigate={onNavigate}
          onSignOut={onSignOut}
          collapsed={collapsed}
          onToggleCollapse={onToggleCollapse}
          userProfile={userProfile}
          onOpenFriendsModal={onOpenFriendsModal}
          onOpenAuth={onOpenAuth}
        />
        <main className="min-w-0 flex-1 px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
          {children}
        </main>
      </div>
    </div>
  )
}

