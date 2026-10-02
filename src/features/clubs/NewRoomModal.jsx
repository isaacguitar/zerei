import {
  Clock3,
  Flame,
  Gamepad2,
  LoaderCircle,
  Search,
  Sparkles,
  Trophy,
  Users,
  X,
  Zap,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { listMyClubs } from './clubService'
import { createGameRoom } from '../game-room/roomService'
import { searchRetroAchievementsGames } from '../retro-achievements/retroAchievementsService'

const PRESET_DURATIONS = [
  { days: 1, label: '1 dia (Speedrun)' },
  { days: 3, label: '3 dias' },
  { days: 7, label: '7 dias (1 semana)' },
  { days: 14, label: '14 dias (2 semanas)' },
  { days: 30, label: '30 dias (1 mês)' },
]

const ROUND_GOALS = [
  { id: 'campaign', label: 'Zerar Campanha', desc: 'Chegar aos créditos finais ou final oficial.' },
  { id: 'mastery', label: '100% Mastery', desc: 'Desbloquear todas as conquistas do RetroAchievements.' },
  { id: 'casual', label: 'Jogatina Casual', desc: 'Jogar juntos sem cobrança de zeramento.' },
]

export default function NewRoomModal({
  isOpen,
  onClose,
  defaultClub = null,
  onRoomCreated,
}) {
  const [myClubs, setMyClubs] = useState([])
  const [selectedClubId, setSelectedClubId] = useState(defaultClub?.id || 'standalone')
  const [title, setTitle] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [gameResults, setGameResults] = useState([])
  const [selectedGame, setSelectedGame] = useState(null)
  const [isSearching, setIsSearching] = useState(false)
  const [durationDays, setDurationDays] = useState(14)
  const [roundGoal, setRoundGoal] = useState('campaign')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const searchTimerRef = useRef(null)

  useEffect(() => {
    if (isOpen) {
      listMyClubs().then((clubs) => setMyClubs(clubs || []))
      if (defaultClub) {
        setSelectedClubId(defaultClub.id)
      } else {
        setSelectedClubId('standalone')
      }
      setSelectedGame(null)
      setSearchQuery('')
      setGameResults([])
      setError('')
      setDurationDays(14)
      setRoundGoal('campaign')
    }
  }, [isOpen, defaultClub])

  const selectedClub = selectedClubId !== 'standalone' ? myClubs.find((c) => c.id === selectedClubId) || defaultClub : defaultClub
  const activeConsoleFilter = selectedClub?.consoleFilter || null

  // Busca em tempo real no RetroAchievements
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
        const results = await searchRetroAchievementsGames(clean, activeConsoleFilter)
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
  }, [searchQuery, activeConsoleFilter])

  if (!isOpen) return null

  const handleSelectGame = (game) => {
    setSelectedGame(game)
    if (!title.trim()) {
      setTitle(`Jogatina: ${game.title}`)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!selectedGame) {
      setError('Selecione um jogo para a sala.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const isLinkedToClub = selectedClubId !== 'standalone'
      const targetClub = isLinkedToClub ? myClubs.find((c) => c.id === selectedClubId) || defaultClub : null

      const newRoom = await createGameRoom({
        clubId: targetClub ? targetClub.id : null,
        clubName: targetClub ? targetClub.name : null,
        clubTag: targetClub ? targetClub.tag : null,
        title: title.trim() || `Jogatina: ${selectedGame.title}`,
        gameTitle: selectedGame.title,
        retroAchievementsId: selectedGame.id,
        gameCoverUrl: selectedGame.imageBoxArt || selectedGame.imageIcon,
        gameConsole: selectedGame.consoleName || 'Retro',
        roundDurationDays: durationDays,
        roundGoal,
      })

      onRoomCreated?.(newRoom)
      onClose?.()
    } catch (err) {
      setError(err.message || 'Erro ao criar sala de jogo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-white/10 bg-panel shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 bg-slate-950/50 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-electric/30 bg-electric/10 text-electric">
              <Gamepad2 size={18} />
            </span>
            <div>
              <h3 className="font-pixel text-xs text-white">Abrir Sala de Jogo</h3>
              <p className="text-[10px] text-slate-400">
                {defaultClub ? `Vinculada ao clube ${defaultClub.name}` : 'Jogatina de rodada em grupo ou avulsa'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-white transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
              {error}
            </div>
          )}

          {/* Vínculo de Clube */}
          {!defaultClub && (
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Vincular a um Clube
              </label>
              <select
                value={selectedClubId}
                onChange={(e) => setSelectedClubId(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-slate-950 px-3.5 py-2.5 text-xs text-white outline-none focus:border-electric/50"
              >
                <option value="standalone">⭐ Sala Avulsa / Esporádica (Sem clube)</option>
                {myClubs.map((club) => (
                  <option key={club.id} value={club.id}>
                    🏰 [{club.tag}] {club.name}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[10px] text-slate-500">
                Salas avulsas são perfeitas para jogatinas rápidas entre amigos sem interferir nas rodadas do clube.
              </p>
            </div>
          )}

          {/* Busca do Jogo no RetroAchievements */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Escolher Jogo (RetroAchievements) *
            </label>

            {activeConsoleFilter && activeConsoleFilter !== 'free' && (
              <div className="mb-2.5 flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
                <Zap size={14} className="shrink-0 text-amber-400" />
                <span>
                  Filtro de Geração do Clube: <strong>{activeConsoleFilter === '8bit' ? '8-Bit (NES, Master System, Game Boy)' : activeConsoleFilter === '16bit' ? '16-Bit (SNES, Mega Drive, GBA)' : activeConsoleFilter === '32bit' ? '32-Bit (PS1, Saturn, N64)' : activeConsoleFilter}</strong> (apenas jogos compatíveis serão exibidos).
                </span>
              </div>
            )}

            {selectedGame ? (
              <div className="flex items-center justify-between rounded-xl border border-electric/40 bg-electric/10 p-3">
                <div className="flex items-center gap-3">
                  <img
                    src={selectedGame.imageIcon || selectedGame.imageBoxArt}
                    alt={selectedGame.title}
                    className="h-12 w-12 rounded-lg object-cover border border-white/10 bg-black"
                  />
                  <div>
                    <h4 className="font-bold text-xs text-white">{selectedGame.title}</h4>
                    <span className="inline-block mt-0.5 rounded bg-black/40 px-2 py-0.5 font-pixel text-[8px] uppercase text-electric">
                      {selectedGame.consoleName || 'Retro'}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedGame(null)}
                  className="rounded-lg border border-white/10 bg-black/30 px-3 py-1 text-xs text-slate-300 hover:bg-rose-500/20 hover:text-rose-300 transition"
                >
                  Trocar
                </button>
              </div>
            ) : (
              <div>
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Digite o nome do jogo (ex: Super Mario World, Sonic 2, Chrono Trigger)..."
                    className="w-full rounded-xl border border-white/10 bg-slate-950 pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-electric/50"
                  />
                  <Search size={16} className="absolute left-3.5 top-3 text-slate-500" />
                  {isSearching && (
                    <LoaderCircle size={16} className="absolute right-3.5 top-3 animate-spin text-electric" />
                  )}
                </div>

                {/* Resultados da busca */}
                {gameResults.length > 0 && (
                  <div className="mt-2 max-h-48 overflow-y-auto rounded-xl border border-white/10 bg-slate-950 divide-y divide-white/5">
                    {gameResults.map((game) => (
                      <div
                        key={game.id}
                        onClick={() => handleSelectGame(game)}
                        className="flex items-center gap-3 p-2.5 transition hover:bg-white/5 cursor-pointer"
                      >
                        <img
                          src={game.imageIcon || game.imageBoxArt}
                          alt=""
                          className="h-9 w-9 rounded-lg object-cover bg-black"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-bold text-white">{game.title}</p>
                          <span className="text-[10px] text-slate-400">{game.consoleName}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Título opcional da Sala */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Título da Sala
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Rodada #1, Jogatina de Fim de Semana..."
              className="w-full rounded-xl border border-white/10 bg-slate-950 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-electric/50"
            />
          </div>

          {/* Duração da Rodada */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Duração da Rodada
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {PRESET_DURATIONS.map((p) => (
                <button
                  key={p.days}
                  type="button"
                  onClick={() => setDurationDays(p.days)}
                  className={`rounded-xl border p-2 text-center text-xs font-bold transition ${
                    durationDays === p.days
                      ? 'border-electric bg-electric/20 text-electric shadow-neon'
                      : 'border-white/10 bg-slate-950/60 text-slate-400 hover:text-white'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Objetivo da Rodada */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Objetivo
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {ROUND_GOALS.map((goal) => (
                <button
                  key={goal.id}
                  type="button"
                  onClick={() => setRoundGoal(goal.id)}
                  className={`flex flex-col p-2.5 rounded-xl border text-left transition ${
                    roundGoal === goal.id
                      ? 'border-gold bg-gold/15 text-gold shadow-neon'
                      : 'border-white/10 bg-slate-950/60 text-slate-400 hover:text-white'
                  }`}
                >
                  <span className="font-bold text-xs">{goal.label}</span>
                  <span className="text-[9px] text-slate-400 mt-1">{goal.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Footer com botão de criar */}
          <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-xs font-bold text-slate-400 hover:text-white transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !selectedGame}
              className="flex items-center gap-2 rounded-xl bg-electric px-5 py-2.5 text-xs font-pixel font-bold text-slate-950 hover:bg-electric/90 disabled:opacity-50 transition shadow-neon"
            >
              {loading ? (
                <>
                  <LoaderCircle size={14} className="animate-spin" />
                  <span>Abrindo Sala...</span>
                </>
              ) : (
                <>
                  <Flame size={14} />
                  <span>Abrir Sala de Jogo</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

