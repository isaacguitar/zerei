import { Activity, Archive, ChevronLeft, ChevronRight, Download, FolderSearch, Gamepad2, LayoutDashboard, Lightbulb, LogOut, ShieldCheck, Trophy, Users } from 'lucide-react'
import { getCurrentUser } from '../../features/auth/authService'
import { getLevelInfo } from '../../features/gamification/xpService'
import { isAdminUser } from '../../features/admin/adminService'
import { isNativeEnvironment } from '../../features/emulator/romLibraryService'
import ProgressBar from '../ui/ProgressBar'

const navigationItems = [
  { label: 'Visão geral', icon: LayoutDashboard },
  { label: 'Salão de jogos', icon: Gamepad2 },
  { label: 'Biblioteca de ROMs', icon: FolderSearch, nativeOnly: true },
  { label: 'Minha estante', icon: Archive },
  { label: 'Ranking', icon: Trophy },
  { label: 'Feed', icon: Activity },
  { label: 'Mural de dicas', icon: Lightbulb },
  { label: 'Baixar App', icon: Download, webOnly: true },
]

/**
 * Sidebar de navegação lateral.
 * Interface pública mínima — toda a lógica de nível/XP está encapsulada aqui.
 */
export default function Sidebar({
  activeView = 'dashboard',
  onNavigate,
  onSignOut,
  onAction,
  collapsed,
  onToggleCollapse,
  userProfile,
  onOpenFriendsModal,
  onOpenAuth,
}) {
  const profile = userProfile || getCurrentUser()
  const isAuthenticated = Boolean(profile?.id)
  const effectiveProfile = profile || { displayName: 'Visitante' }
  const levelInfo = getLevelInfo(effectiveProfile.xp || 0)

  const handleNavClick = (label) => {
    if (label !== 'Visão geral' && label !== 'Baixar App' && !isAuthenticated) {
      onOpenAuth?.()
      return
    }

    if (label === 'Salão de jogos' || label === 'Clubes') return onNavigate?.('clubs')
    if (label === 'Biblioteca de ROMs') return onNavigate?.('rom-library')
    if (label === 'Sala de jogo') return onNavigate?.('game-room')
    if (label === 'Minha estante') return onNavigate?.('shelf')
    if (label === 'Ranking') return onNavigate?.('ranking')
    if (label === 'Mural de dicas') return onNavigate?.('tips')
    if (label === 'Feed') return onNavigate?.('feed')
    if (label === 'Painel ADM') return onNavigate?.('admin')
    if (label === 'Baixar App') return onNavigate?.('landing')
    if (label === 'Visão geral') return onNavigate?.('dashboard')
    onAction?.(`${label} estará disponível na próxima etapa.`)
  }

  const isActive = (label) =>
    ((label === 'Salão de jogos' || label === 'Clubes') && activeView === 'clubs') ||
    (label === 'Sala de jogo' && activeView === 'game-room') ||
    (label === 'Minha estante' && activeView === 'shelf') ||
    (label === 'Ranking' && activeView === 'ranking') ||
    (label === 'Mural de dicas' && activeView === 'tips') ||
    (label === 'Feed' && activeView === 'feed') ||
    (label === 'Painel ADM' && activeView === 'admin') ||
    (label === 'Baixar App' && activeView === 'landing') ||
    (label === 'Visão geral' && activeView === 'dashboard')

  return (
    <aside
      className={`flex shrink-0 flex-col border-b border-white/8 bg-panel px-4 py-5 transition-all duration-200 lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto scrollbar-none lg:border-b-0 lg:border-r ${
        collapsed ? 'lg:w-[86px] lg:px-3' : 'lg:w-[252px] lg:px-6 lg:py-7'
      }`}
    >
      {/* Logo / colapso */}
      <div className="flex items-center justify-between">
        {!collapsed && (
          <div>
            <p className="font-pixel text-[8px] tracking-[0.12em] text-electric/70">Clube de retrogaming</p>
            <h1 className="mt-3 font-pixel text-[22px] tracking-tight text-white text-shadow">
              ZEREI<span className="text-gold">!</span>
            </h1>
          </div>
        )}
        <button
          onClick={onToggleCollapse}
          className="icon-button ml-auto"
          aria-label={collapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'}
          title={collapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Avatar / perfil ou Botão Conectar Conta */}
      {isAuthenticated ? (
        <div
          onClick={() => onNavigate?.('profile')}
          className={`mt-7 flex cursor-pointer items-center gap-3 rounded-xl border border-white/8 bg-panelDeep/60 p-3 transition hover:border-electric/30 hover:bg-slate-900/70 ${
            collapsed ? 'lg:justify-center' : ''
          }`}
          title="Ver e alterar meu perfil"
        >
          <img
            className="h-10 w-10 rounded-lg border-2 border-synthwave/60 bg-purple-950/50 object-cover"
            src={effectiveProfile.avatarUrl || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(effectiveProfile.displayName || 'Jogador')}`}
            alt={`Avatar de ${effectiveProfile.displayName || 'Jogador'}`}
          />
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-white">{effectiveProfile.displayName}</p>
              <p className="mt-0.5 text-[10px] text-slate-400">
                Nv {levelInfo.level} <span className="mx-1 text-electric/60">·</span> {levelInfo.rank}
              </p>
            </div>
          )}
          {!collapsed && (
            <button
              onClick={(e) => { e.stopPropagation(); onSignOut?.() }}
              className="ml-auto text-slate-600 transition hover:text-white"
              aria-label="Sair da conta"
              title="Sair da conta"
            >
              <LogOut size={14} />
            </button>
          )}
        </div>
      ) : (
        <div
          onClick={() => onOpenAuth?.()}
          className={`mt-7 flex cursor-pointer items-center gap-3 rounded-xl border border-electric/30 bg-gradient-to-r from-electric/10 to-panelDeep/70 p-3 transition hover:border-electric hover:shadow-lg hover:shadow-electric/10 active:scale-95 ${
            collapsed ? 'lg:justify-center' : ''
          }`}
          title="Conectar uma conta"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-electric/40 bg-electric/10 text-electric">
            <Gamepad2 size={20} />
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold text-white flex items-center gap-1.5">
                Conectar Conta <span className="h-1.5 w-1.5 rounded-full bg-electric animate-pulse" />
              </p>
              <p className="mt-0.5 text-[10px] text-slate-400">Entre para jogar e salvar</p>
            </div>
          )}
        </div>
      )}

      {/* Bloco de XP / nível */}
      {!collapsed && (
        <div className="mt-3 overflow-hidden rounded-xl border border-synthwave/20 bg-gradient-to-br from-purple-950/50 to-panelDeep/90 p-4">
          <div className="mb-2.5 flex items-center justify-between">
            <span className="rounded-md bg-gold/12 p-1.5 text-gold">
              <Trophy size={15} />
            </span>
            <span className="font-pixel text-[8px] text-gold">
              {isAuthenticated ? (levelInfo.isMaxLevel ? 'Nível Máx!' : `+${levelInfo.xpToNextLevel} XP`) : 'Suba de Nível'}
            </span>
          </div>
          <p className="font-pixel text-[8px] leading-5 text-white">
            {isAuthenticated ? (
              levelInfo.isMaxLevel ? 'Mestre Retrô!' : <>Rumo ao Nível {levelInfo.level + 1}:<br /><span className="text-electric">{levelInfo.rank}</span></>
            ) : (
              <>Conquiste Troféus<br /><span className="text-electric">Ganhe XP ao Zerar</span></>
            )}
          </p>
          <div className="mt-3">
            <ProgressBar value={isAuthenticated ? levelInfo.progressPercent : 0} color="bg-gold" segmented />
            <div className="mt-1.5 flex items-center justify-between text-[9px] text-slate-500">
              {isAuthenticated ? (
                <>
                  <span>{levelInfo.currentLevelProgressXp} / {levelInfo.xpNeededThisLevel} XP</span>
                  <span>{levelInfo.progressPercent}%</span>
                </>
              ) : (
                <span className="italic text-slate-400">Faça login para acumular XP</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Links de navegação */}
      <div className={`mt-5 ${collapsed ? 'lg:mt-7' : ''}`}>
        {!collapsed && (
          <p className="mb-2.5 px-2 text-[9px] font-bold tracking-[0.16em] text-slate-600 uppercase">
            Menu
          </p>
        )}
        <div className={`grid gap-1.5 ${collapsed ? 'grid-cols-1' : 'grid-cols-2 lg:block lg:space-y-1.5'}`}>
          {(isAdminUser(profile)
            ? [...navigationItems, { label: 'Painel ADM', icon: ShieldCheck, badge: 'ADM' }]
            : navigationItems
          )
            .filter((item) => {
              if (item.nativeOnly && !isNativeEnvironment()) return false
              if (item.webOnly && isNativeEnvironment()) return false
              return true
            })
            .map(({ label, icon: Icon, active, badge }) => (
            <button
              key={label}
              onClick={() => handleNavClick(label)}
              className={`nav-link ${collapsed ? 'justify-center' : 'w-full text-left'} ${
                isActive(label) ? 'nav-link-active' : ''
              }`}
              title={collapsed ? label : undefined}
            >
              <Icon size={17} strokeWidth={active ? 2.5 : 2} />
              {!collapsed && <span className="truncate">{label}</span>}
              {!collapsed && badge && (
                <span className="ml-auto rounded-md bg-synthwave/18 px-1.5 py-0.5 text-[10px] font-bold text-purple-200">
                  {badge}
                </span>
              )}
            </button>
          ))}

          {/* Botão Amigos */}
          <button
            onClick={() => {
              if (!isAuthenticated) {
                onOpenAuth?.()
                return
              }
              onOpenFriendsModal?.()
            }}
            className={`nav-link mt-1 ${collapsed ? 'justify-center' : 'w-full text-left'} text-slate-400 hover:text-white`}
            title={collapsed ? 'Amigos' : undefined}
          >
            <Users size={17} />
            {!collapsed && <span className="truncate">Amigos</span>}
          </button>
        </div>
      </div>
    </aside>
  )
}

