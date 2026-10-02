import {
  Check,
  Eye,
  Flame,
  Gamepad2,
  Info,
  LoaderCircle,
  Lock,
  MessageSquare,
  Search,
  Sparkles,
  Trophy,
  Users,
  X,
  Zap,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { createGameRoom } from './roomService'
import { searchRetroAchievementsGames } from '../retro-achievements/retroAchievementsService'

const SOLO_GOALS = [
  { id: 'campaign', label: 'Zerar Campanha', desc: 'Chegar aos créditos finais ou final oficial.' },
  { id: 'mastery', label: '100% Conquistas (Mastery)', desc: 'Desbloquear todas as conquistas do jogo.' },
  { id: 'casual', label: 'Casual & Exploração', desc: 'Aproveitar a história e reviver a nostalgia sem pressão.' },
  { id: 'speedrun', label: 'Speedrun / Desafio', desc: 'Concluir o jogo o mais rápido possível.' },
]

export default function CreateSoloRoomModal({
  isOpen,
  onClose,
  onRoomCreated,
}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [gameResults, setGameResults] = useState([])
  const [selectedGame, setSelectedGame] = useState(null)
  const [isSearching, setIsSearching] = useState(false)
  const [roundGoal, setRoundGoal] = useState('campaign')
  const [allowSpectators, setAllowSpectators] = useState(true)
  const [allowSpectatorChat, setAllowSpectatorChat] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const searchTimerRef = useRef(null)

  useEffect(() => {
    if (isOpen) {
      setSelectedGame(null)
      setSearchQuery('')
      setGameResults([])
      setError('')
      setRoundGoal('campaign')
      setAllowSpectators(true)
      setAllowSpectatorChat(true)
    }
  }, [isOpen])

  // Busca em tempo real de jogos retrô via RetroAchievements
  useEffect(() => {
    const clean = searchQuery.trim()
    if (!clean || clean.length < 2) {
      setGameResults([])
      return
    }

    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    setIsSearching(true)

    searchTimerRef.current = setTimeout(async () => {
      try {
        const results = await searchRetroAchievementsGames(clean)
        setGameResults(results || [])
      } catch (err) {
        console.warn('Erro ao buscar jogo:', err)
      } finally {
        setIsSearching(false)
      }
    }, 300)

    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    }
  }, [searchQuery])

  if (!isOpen) return null

  const handleSelectGame = (game) => {
    setSelectedGame(game)
  }

  const handleUseSearchQuery = () => {
    const title = searchQuery.trim()
    if (!title) return

    setSelectedGame({
      id: null,
      title,
      consoleName: 'Retro',
      imageBoxArt: null,
      imageIcon: null,
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!selectedGame) {
      setError('Escolha um jogo para abrir seu Quartinho Gamer.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const newRoom = await createGameRoom({
        isSolo: true,
        roomType: 'solo',
        title: selectedGame.title,
        gameTitle: selectedGame.title,
        retroAchievementsId: selectedGame.id,
        gameCoverUrl: selectedGame.imageBoxArt || selectedGame.imageIcon,
        gameConsole: selectedGame.consoleName || 'Retro',
        roundGoal,
        allowSpectators,
        allowSpectatorChat,
        noTimeLimit: true,
      })

      onRoomCreated?.(newRoom)
      onClose?.()
    } catch (err) {
      setError(err.message || 'Erro ao criar Quartinho Gamer.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-xl overflow-hidden rounded-3xl border border-electric/30 bg-panel shadow-2xl">
        {/* Header com estilo Retrô */}
        <div className="flex items-center justify-between border-b border-white/10 bg-slate-950/70 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-electric/40 bg-electric/15 text-electric shadow-pixel">
              <Gamepad2 size={20} />
            </div>
            <div>
              <h2 className="font-pixel text-xs sm:text-sm text-white flex items-center gap-2">
                Quartinho Gamer
                <span className="rounded bg-electric/20 px-2 py-0.5 font-pixel text-[8px] uppercase tracking-wider text-electric border border-electric/30">
                  Sala Individual
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                Sua jornada solo para zerar no seu ritmo, sem limite de tempo.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="max-h-[82vh] overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
              {error}
            </div>
          )}

          {/* 1. Escolha do Jogo */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-300">
              1. Qual jogo você vai zerar? <span className="text-electric">*</span>
            </label>

            {!selectedGame ? (
              <div className="space-y-3">
                <div className="relative">
                  <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Digite o nome do jogo (Ex: Super Mario World, Chrono Trigger...)"
                    className="w-full rounded-xl border border-white/10 bg-slate-950/80 py-2.5 pl-10 pr-4 text-xs text-white placeholder-slate-500 focus:border-electric focus:outline-none"
                    autoFocus
                  />
                  {isSearching && (
                    <LoaderCircle size={15} className="absolute right-3.5 top-1/2 -translate-y-1/2 animate-spin text-electric" />
                  )}
                </div>

                {/* Lista de resultados */}
                {gameResults.length > 0 && (
                  <div className="max-h-48 overflow-y-auto rounded-xl border border-white/10 bg-slate-950/90 p-2 space-y-1">
                    {gameResults.map((game) => (
                      <button
                        key={game.id}
                        type="button"
                        onClick={() => handleSelectGame(game)}
                        className="flex w-full items-center gap-3 rounded-lg p-2 text-left transition hover:bg-white/10 group"
                      >
                        {game.imageIcon ? (
                          <img
                            src={game.imageIcon}
                            alt=""
                            className="h-9 w-9 rounded-lg object-contain bg-slate-900 border border-white/10 shrink-0"
                          />
                        ) : (
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 border border-white/10 shrink-0 text-slate-500">
                            <Gamepad2 size={16} />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="font-pixel text-[10px] text-white group-hover:text-electric truncate">
                            {game.title}
                          </p>
                          <p className="text-[9px] text-slate-400">
                            {game.consoleName || 'Retro'} {game.numAchievements ? `· ${game.numAchievements} Conquistas` : ''}
                          </p>
                        </div>
                        <span className="rounded bg-electric/10 px-2 py-0.5 text-[9px] font-bold text-electric group-hover:bg-electric group-hover:text-slate-950 transition">
                          Selecionar
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {searchQuery.trim().length >= 2 && (
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2">
                    <span className="text-[10px] text-slate-400">
                      {gameResults.length === 0 && !isSearching
                        ? 'Nenhum resultado encontrado.'
                        : 'Não encontrou o jogo?'}
                    </span>
                    <button
                      type="button"
                      onClick={handleUseSearchQuery}
                      className="text-[10px] font-bold text-electric transition hover:text-white"
                    >
                      Usar “{searchQuery.trim()}” como título
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-between rounded-2xl border border-electric/40 bg-electric/10 p-3.5">
                <div className="flex items-center gap-3 min-w-0">
                  {selectedGame.imageBoxArt || selectedGame.imageIcon ? (
                    <img
                      src={selectedGame.imageBoxArt || selectedGame.imageIcon}
                      alt={selectedGame.title}
                      className="h-12 w-12 rounded-xl object-contain bg-slate-950 border border-electric/30 shrink-0"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-950 border border-electric/30 shrink-0 text-electric">
                      <Gamepad2 size={22} />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-pixel text-xs text-white truncate">{selectedGame.title}</p>
                    <p className="text-[10px] text-electric">
                      {selectedGame.consoleName || 'Retro'} {selectedGame.numAchievements ? `· ${selectedGame.numAchievements} Conquistas RA` : ''}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedGame(null)}
                  className="text-xs font-bold text-slate-400 hover:text-white transition px-2 py-1"
                >
                  Trocar
                </button>
              </div>
            )}
          </div>

          {/* 2. Modo de Objetivo */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-300">
              2. Qual é a sua meta nesta jornada?
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {SOLO_GOALS.map((goal) => {
                const active = roundGoal === goal.id
                return (
                  <button
                    key={goal.id}
                    type="button"
                    onClick={() => setRoundGoal(goal.id)}
                    className={`rounded-2xl border p-3 text-left transition ${
                      active
                        ? 'border-gold bg-gold/10 text-white shadow-neon'
                        : 'border-white/10 bg-slate-950/40 text-slate-300 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-pixel text-[10.5px] text-white flex items-center gap-1.5">
                        <Trophy size={12} className={active ? 'text-gold' : 'text-slate-500'} />
                        {goal.label}
                      </span>
                      {active && <Check size={14} className="text-gold" />}
                    </div>
                    <p className="text-[10px] text-slate-400 leading-snug">{goal.desc}</p>
                  </button>
                )
              })}
            </div>
          </div>

          {/* 3. Permissões de Espectador & Chat */}
          <div className="space-y-3 rounded-2xl border border-white/10 bg-slate-950/50 p-4">
            <div className="flex items-center gap-2 mb-1">
              <Eye size={15} className="text-cyan-400" />
              <h3 className="font-pixel text-[10.5px] text-white">Espectadores & Chat com Amigos</h3>
            </div>
            <p className="text-[10.5px] text-slate-400 leading-relaxed">
              Amigos podem ver no perfil que você está jogando online e entrar para assistir ou bater papo.
            </p>

            <div className="space-y-2.5 pt-2 border-t border-white/5">
              <label className="flex items-center justify-between cursor-pointer">
                <div className="flex items-center gap-2">
                  <Eye size={14} className="text-slate-400" />
                  <span className="text-xs text-white">Permitir Espectadores</span>
                </div>
                <input
                  type="checkbox"
                  checked={allowSpectators}
                  onChange={(e) => setAllowSpectators(e.target.checked)}
                  className="h-4 w-4 rounded accent-electric cursor-pointer"
                />
              </label>

              {allowSpectators && (
                <label className="flex items-center justify-between cursor-pointer pl-6">
                  <div className="flex items-center gap-2">
                    <MessageSquare size={13} className="text-slate-400" />
                    <span className="text-xs text-slate-300">Permitir que espectadores enviem mensagens no chat</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={allowSpectatorChat}
                    onChange={(e) => setAllowSpectatorChat(e.target.checked)}
                    className="h-4 w-4 rounded accent-electric cursor-pointer"
                  />
                </label>
              )}
            </div>
          </div>

          {/* Rodapé / Botão de Ação */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-xl px-4 py-2.5 text-xs font-bold text-slate-400 hover:text-white transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !selectedGame}
              className="flex items-center gap-2 rounded-xl bg-electric px-6 py-2.5 font-pixel text-xs font-bold text-slate-950 transition hover:bg-electric/90 disabled:opacity-50 shadow-neon"
            >
              {loading ? (
                <>
                  <LoaderCircle size={14} className="animate-spin" />
                  <span>Criando Quartinho...</span>
                </>
              ) : (
                <>
                  <Gamepad2 size={15} />
                  <span>Abrir Quartinho Gamer</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

