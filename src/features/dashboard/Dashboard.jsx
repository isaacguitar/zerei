import { Bell, ChevronLeft, ChevronRight, MessageCircle, Zap, Trophy, Plus, Gamepad2, Users } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { getCurrentUser } from '../../features/auth/authService'
import { listMyClubs } from '../clubs/clubService'
import { listMyGameRooms } from '../game-room/roomService'
import Sidebar from '../../components/navigation/Sidebar'
import GameCard from './GameCard'
import ActivityFeed from './ActivityFeed'
import GlobalChallenge from './GlobalChallenge'
import GlobalAnnouncementBanner from '../../components/layout/GlobalAnnouncementBanner'

/**
 * Dashboard — view principal do ZEREI!
 * Contém o header de boas-vindas, desafio global, cards de jogos,
 * ranking shortcut, sala de voz e feed de atividade.
 */
function getGenerationBadge(filter) {
  switch (filter) {
    case '8bit':
      return '8-Bit'
    case '16bit':
      return '16-Bit'
    case '32bit':
      return '32-Bit'
    case 'free':
    default:
      return 'Livre'
  }
}

export default function Dashboard({
  onNavigate,
  onOpenGameRoom,
  onSignOut,
  userProfile,
  onOpenDirectChat,
  unreadDirectCount = 0,
  onOpenUserProfile,
  onOpenFriendsModal,
  isChatExpanded,
  onOpenAuth,
}) {
  const [notice, setNotice] = useState('')
  const [myClubs, setMyClubs] = useState([])
  const [myRooms, setMyRooms] = useState([])
  const [loading, setLoading] = useState(true)
  const noticeTimeoutRef = useRef(null)
  const carouselRef = useRef(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const checkScroll = () => {
    const el = carouselRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 10)
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 10)
  }

  useEffect(() => {
    let mounted = true
    Promise.all([
      listMyGameRooms().catch(() => []),
      listMyClubs().catch(() => []),
    ]).then(([rooms, clubs]) => {
      if (mounted) {
        setMyRooms(rooms || [])
        setMyClubs(clubs || [])
        setLoading(false)
        setTimeout(checkScroll, 100)
      }
    }).catch(() => {
      if (mounted) setLoading(false)
    })

    return () => {
      mounted = false
      if (noticeTimeoutRef.current) window.clearTimeout(noticeTimeoutRef.current)
    }
  }, [])

  useEffect(() => {
    checkScroll()
    const el = carouselRef.current
    if (!el) return
    el.addEventListener('scroll', checkScroll, { passive: true })
    window.addEventListener('resize', checkScroll)
    return () => {
      el.removeEventListener('scroll', checkScroll)
      window.removeEventListener('resize', checkScroll)
    }
  }, [myRooms, myClubs, loading])

  const scrollCarousel = (direction) => {
    if (!carouselRef.current) return
    const amount = direction === 'left' ? -310 : 310
    carouselRef.current.scrollBy({ left: amount, behavior: 'smooth' })
  }

  const showNotice = (message) => {
    if (noticeTimeoutRef.current) window.clearTimeout(noticeTimeoutRef.current)
    setNotice(message)
    noticeTimeoutRef.current = window.setTimeout(() => setNotice(''), 3500)
  }

  const todayFormatted = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
  const capitalizedDate = todayFormatted.charAt(0).toUpperCase() + todayFormatted.slice(1)

  const profile = userProfile || getCurrentUser()
  const isAuthenticated = Boolean(profile?.id)

  // Combina salas ativas com clubes que estejam em rodada ativa
  const activeRoomsList = myRooms.length > 0
    ? myRooms
    : myClubs.filter((c) => c.gameTitle || c.activeRoomId)

  return (
    <div className="min-h-screen bg-crtVoid text-slate-200">
      <GlobalAnnouncementBanner />
      <div
        className={`flex min-h-screen flex-col lg:flex-row transition-[margin] duration-300 ease-in-out ${
          isChatExpanded ? 'mr-0 sm:mr-80 xl:mr-88' : ''
        }`}
      >
        <Sidebar
          activeView="dashboard"
          onNavigate={onNavigate}
          onSignOut={onSignOut}
          onAction={showNotice}
          userProfile={profile}
          onOpenFriendsModal={onOpenFriendsModal}
          onOpenAuth={onOpenAuth}
        />

        <main className="min-w-0 flex-1 px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
          {/* Header */}
          <header className="mb-7 flex items-start justify-between">
            <div>
              <div className="mb-3 flex items-center gap-2 text-[10px] text-slate-500">
                <span className="h-1.5 w-1.5 rounded-full bg-oneUp" />
                {capitalizedDate}
              </div>
              <h2 className="font-pixel text-sm leading-6 text-white sm:text-base">
                {isAuthenticated ? (
                  <>Olá, {profile.displayName || 'Jogador'} <span className="text-gold">★</span></>
                ) : (
                  <>Bem-vindo ao ZEREI<span className="text-gold">!</span> ★</>
                )}
              </h2>
              <p className="mt-2 text-sm text-slate-400">
                {isAuthenticated ? 'Pronto para mais uma fase?' : 'O clube definitivo de retrogaming e jogatina compartilhada.'}
              </p>
            </div>
            <div className="hidden items-center gap-2.5 sm:flex">
              {!isAuthenticated && (
                <button
                  type="button"
                  onClick={() => onOpenAuth?.()}
                  className="mr-2 flex items-center gap-2 rounded-xl border border-electric/50 bg-electric/15 px-3.5 py-2 text-xs font-bold text-electric transition hover:bg-electric hover:text-slate-950 active:scale-95 shadow-neon"
                >
                  <Gamepad2 size={15} />
                  <span>Conectar Conta</span>
                </button>
              )}
              <button
                onClick={() => showNotice('A busca será habilitada junto com o feed persistente.')}
                className="icon-button"
                aria-label="Buscar"
              >
                <Zap size={17} />
              </button>
              <button
                onClick={() => {
                  if (!isAuthenticated) {
                    onOpenAuth?.()
                    return
                  }
                  onOpenDirectChat?.()
                }}
                className="icon-button relative"
                aria-label="Mensagens & Clubes"
                title="Mensagens & Clubes"
              >
                <MessageCircle size={17} />
                {unreadDirectCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-pixelRed px-1 text-[9px] font-bold text-white">
                    {unreadDirectCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => showNotice('Você não tem novas notificações.')}
                className="icon-button relative"
                aria-label="Notificações"
              >
                <Bell size={17} />
                <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-gold ring-2 ring-crtVoid" />
              </button>
            </div>
          </header>

          <div className="mt-4 max-w-6xl space-y-8">
            {/* Desafio Global Comunitário em Tempo Real */}
            <GlobalChallenge onAction={showNotice} />

            {/* Carrossel de Salas de Jogo — Rodada atual estilo Netflix */}
            <div>
              <div className="mb-3 flex items-end justify-between">
                <div>
                  <h2 className="mt-1 font-pixel text-[11px] text-white">Salas de Jogo</h2>
                </div>
                <div className="flex items-center gap-2.5">
                  {/* Botões de rolagem suave com setas */}
                  <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-slate-950/60 p-1">
                    <button
                      type="button"
                      onClick={() => scrollCarousel('left')}
                      disabled={!canScrollLeft}
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-300 transition hover:bg-white/10 hover:text-white disabled:pointer-events-none disabled:opacity-25"
                      aria-label="Rolar para esquerda"
                      title="Anterior"
                    >
                      <ChevronLeft size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => scrollCarousel('right')}
                      disabled={!canScrollRight}
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-300 transition hover:bg-white/10 hover:text-white disabled:pointer-events-none disabled:opacity-25"
                      aria-label="Rolar para direita"
                      title="Próximo"
                    >
                      <ChevronRight size={15} />
                    </button>
                  </div>

                  <button
                    onClick={() => onNavigate('clubs')}
                    className="flex items-center gap-1 text-[10px] font-bold text-slate-500 transition hover:text-electric"
                  >
                    Salão de Jogos <ChevronRight size={12} />
                  </button>
                </div>
              </div>

              {loading ? (
                <div className="flex h-40 items-center justify-center rounded-2xl border border-white/10 bg-panel text-xs text-slate-500">
                  Carregando salas e rodadas ativas...
                </div>
              ) : (
                <div className="relative group">
                  {/* Indicador de rolagem à direita */}
                  {canScrollRight && (
                    <button
                      type="button"
                      onClick={() => scrollCarousel('right')}
                      className="absolute -right-2 top-1/2 -translate-y-1/2 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-electric/40 bg-slate-950/90 text-electric shadow-neon backdrop-blur-sm transition hover:scale-110 hover:bg-electric/20"
                      title="Mais conteúdo"
                      aria-label="Mais conteúdo à direita"
                    >
                      <ChevronRight size={20} className="animate-pulse" />
                    </button>
                  )}

                  {/* Indicador de rolagem à esquerda */}
                  {canScrollLeft && (
                    <button
                      type="button"
                      onClick={() => scrollCarousel('left')}
                      className="absolute -left-2 top-1/2 -translate-y-1/2 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-electric/40 bg-slate-950/90 text-electric shadow-neon backdrop-blur-sm transition hover:scale-110 hover:bg-electric/20"
                      title="Conteúdo anterior"
                      aria-label="Conteúdo anterior à esquerda"
                    >
                      <ChevronLeft size={20} />
                    </button>
                  )}

                  {/* Contêiner de rolagem horizontal fluida (Netflix style) */}
                  <div
                    ref={carouselRef}
                    className="flex gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory scrollbar-none pb-2 pt-1 px-1"
                  >
                    {activeRoomsList.length > 0 ? (
                      activeRoomsList.map((item, idx) => {
                        const gameTitle = item.gameTitle || item.title || 'Jogo da Rodada'
                        const isStandalone = Boolean(item.isStandalone || (!item.clubId && !item.clubTag && !item.tag))
                        const clubName = isStandalone ? 'Sala Avulsa' : (item.clubName || item.name)
                        const tagBadge = item.clubTag || item.tag ? `[${item.clubTag || item.tag}] ` : ''
                        const subtitle = item.gameConsole ? `Console: ${item.gameConsole}` : (isStandalone ? '⭐ Jogatina Avulsa' : `${tagBadge}${clubName}`.trim())
                        const timeRemaining = item.roundEndsAt
                          ? `${Math.max(0, Math.ceil((new Date(item.roundEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))}d restantes`
                          : (item.status?.split(' ').slice(-2).join(' ') || 'Ativo')

                        return (
                          <GameCard
                            key={item.id}
                            title={gameTitle}
                            subtitle={subtitle}
                            clubName={clubName}
                            image={item.gameCoverUrl}
                            progress={item.progress || 0}
                            members={`${item.memberCount || item.members || 1} jogadores`}
                            time={timeRemaining}
                            accent={idx % 2 === 0 ? 'border-cyan-400/55 bg-cyan-500/8 text-cyan-200' : 'border-fuchsia-400/55 bg-fuchsia-500/8 text-fuchsia-200'}
                            onOpen={() => onOpenGameRoom ? onOpenGameRoom(item) : onNavigate('game-room')}
                          />
                        )
                      })
                    ) : (
                      <div className="flex w-full flex-col items-center justify-center rounded-2xl border border-white/5 bg-panel/60 py-10 px-4 text-center">
                        <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-slate-950 text-slate-500">
                          <Gamepad2 size={24} />
                        </span>
                        <p className="mt-3 font-pixel text-xs text-white">Nenhuma sala de jogo ativa</p>
                        <p className="mt-1 max-w-sm text-xs text-slate-500">
                          Abra uma sala de jogo para o seu clube ou inicie uma jogatina avulsa com amigos.
                        </p>
                        <button
                          onClick={() => onNavigate('clubs')}
                          className="btn-arcade-cyan mt-4 text-[10px]"
                        >
                          <Plus size={13} /> Abrir Salão de Jogos
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Meus Clubes — Guildas Fixas e Comunidades Permanentes */}
            <div>
              <div className="mb-3 flex items-end justify-between">
                <div>
                  <h2 className="mt-1 font-pixel text-[11px] text-white">Meus Clubes</h2>
                </div>
                <button
                  onClick={() => onNavigate('clubs')}
                  className="flex items-center gap-1 text-[10px] font-bold text-slate-500 transition hover:text-purple-400"
                >
                  Ver todos <ChevronRight size={12} />
                </button>
              </div>

              {myClubs.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {myClubs.map((club) => {
                    const hasActiveRound = Boolean(club.activeRoomId || club.gameTitle)
                    return (
                      <div
                        key={club.id}
                        onClick={() => onNavigate('clubs', club)}
                        className="group cursor-pointer rounded-2xl border border-white/10 bg-panel/80 p-4 transition-all hover:-translate-y-0.5 hover:border-purple-500/40 hover:bg-panel hover:shadow-lg hover:shadow-purple-500/5"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                            <span className="rounded border border-purple-500/30 bg-purple-500/15 px-2 py-0.5 font-pixel text-[9px] text-purple-300 shrink-0">
                              [{club.tag || 'CLUBE'}]
                            </span>
                            <span className="rounded border border-cyan-500/30 bg-cyan-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase text-cyan-300 shrink-0">
                              {getGenerationBadge(club.consoleFilter)}
                            </span>
                            <h3 className="font-pixel text-xs text-white truncate" title={club.name}>
                              {club.name}
                            </h3>
                          </div>
                          <span className="flex items-center gap-1 text-[10px] text-slate-400 shrink-0">
                            <Users size={12} />
                            {club.memberCount || club.members || 1}
                          </span>
                        </div>

                        {club.description && (
                          <p className="mt-2 text-xs text-slate-400 line-clamp-2">
                            {club.description}
                          </p>
                        )}

                        <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3 text-[10px]">
                          {hasActiveRound ? (
                            <span className="flex items-center gap-1.5 font-bold text-emerald-400 truncate max-w-[170px]">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                              Rodada: {club.gameTitle || 'Ativa'}
                            </span>
                          ) : (
                            <span className="text-slate-500">
                              Aguardando rodada
                            </span>
                          )}

                          <span className="flex items-center gap-1 text-gold font-pixel text-[9px] shrink-0">
                            <Trophy size={11} />
                            {club.history?.length || 0} zerados
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-white/5 bg-panel/40 py-8 px-4 text-center">
                  <Users size={24} className="text-slate-600 mb-2" />
                  <p className="font-pixel text-xs text-white">Nenhum clube ainda</p>
                  <p className="mt-1 text-xs text-slate-500 max-w-sm">
                    Participe de um clube para votar em jogos, participar de rodadas coletivas e guardar zeramentos no Hall da Fama.
                  </p>
                  <button
                    onClick={() => onNavigate('clubs')}
                    className="mt-3.5 rounded-xl border border-purple-500/30 bg-purple-500/10 px-4 py-2 text-[10px] font-bold text-purple-300 transition hover:bg-purple-500/20"
                  >
                    + Explorar ou Criar Clube
                  </button>
                </div>
              )}
            </div>

            {/* Banner Ranking da Temporada com Botão Moderno e Legível */}
            <div className="flex flex-col gap-4 rounded-2xl border border-gold/25 bg-gradient-to-r from-amber-500/10 via-panelDeep/90 to-crtVoid p-5 sm:flex-row sm:items-center sm:justify-between shadow-pixel">
              <div className="flex items-center gap-3.5">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-gold/45 bg-gold/15 text-gold shadow-sm">
                  <Trophy size={20} />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-pixel text-xs text-white">Ranking da Temporada</p>
                    <span className="rounded bg-gold/20 border border-gold/30 px-1.5 py-0.5 font-pixel text-[8px] text-gold uppercase">
                      TOP 10
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">
                    Veja quem mais zerou jogos e os líderes de pontos RetroAchievements da comunidade.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('ranking')}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-gold/50 bg-gradient-to-r from-amber-500/20 via-gold/20 to-yellow-400/20 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-gold hover:border-gold hover:bg-gold/30 hover:scale-[1.02] active:scale-[0.98] transition shadow-md shrink-0 cursor-pointer"
              >
                <span>Ver Placar Geral</span>
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        </main>
      </div>

      {/* Notice toast */}
      {notice && (
        <div
          role="status"
          className="fixed bottom-5 right-5 z-30 max-w-sm rounded-xl border border-electric/25 bg-panel px-4 py-3 text-xs text-slate-200 shadow-arcade-cyan"
        >
          {notice}
        </div>
      )}
    </div>
  )
}

