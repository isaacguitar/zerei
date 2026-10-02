import {
  ArrowLeft,
  Crown,
  Flame,
  Gamepad2,
  Medal,
  RefreshCw,
  Sparkles,
  Trophy,
  Users,
  Zap,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { subscribeClubLeaderboard, subscribeSeasonLeaderboard } from './leaderboardService'
import { RankBadge, Top3Podium, getPlayerAvatar } from './LeaderboardBadges'
import { listClubs } from '../clubs/clubService'

export default function LeaderboardPage({ onBack, defaultClubId = null, currentUser }) {
  const [tab, setTab] = useState(defaultClubId ? 'club' : 'season') // 'season' | 'club'
  const [seasonSortBy, setSeasonSortBy] = useState('beaten') // 'beaten' | 'points'

  // Dados da Temporada Geral
  const [seasonPlayers, setSeasonPlayers] = useState([])
  const [loadingSeason, setLoadingSeason] = useState(true)

  // Dados por Clube
  const [clubs, setClubs] = useState([])
  const [selectedClubId, setSelectedClubId] = useState(defaultClubId)
  const [clubPlayers, setClubPlayers] = useState([])
  const [loadingClub, setLoadingClub] = useState(false)

  // Carregar ranking da temporada
  useEffect(() => {
    setLoadingSeason(true)
    const unsub = subscribeSeasonLeaderboard((players) => {
      setSeasonPlayers(players)
      setLoadingSeason(false)
    }, seasonSortBy)
    return () => unsub()
  }, [seasonSortBy])

  // Carregar lista de clubes disponíveis para o seletor
  useEffect(() => {
    listClubs().then((allClubs) => {
      setClubs(allClubs || [])
      if (!selectedClubId && allClubs.length > 0) {
        setSelectedClubId(allClubs[0].id)
      }
    })
  }, [selectedClubId])

  // Carregar ranking do clube selecionado
  useEffect(() => {
    if (!selectedClubId) return
    setLoadingClub(true)
    const unsub = subscribeClubLeaderboard(selectedClubId, (members) => {
      setClubPlayers(members)
      setLoadingClub(false)
    })
    return () => unsub()
  }, [selectedClubId])

  const activeClub = clubs.find((c) => c.id === selectedClubId)

  return (
    <div className="mx-auto max-w-5xl pb-16 text-slate-200">
      {/* Botão de Voltar */}
      <button
        onClick={onBack}
        className="mb-4 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 transition hover:text-electric"
      >
        <ArrowLeft size={14} />
        Voltar ao início
      </button>

      {/* Header do Ranking */}
      <header className="mb-6 rounded-2xl border border-white/10 bg-panel p-5 sm:p-6 shadow-pixel">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3.5">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-gold/40 bg-gold/15 text-gold shadow-neon">
              <Trophy size={24} />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-pixel text-sm sm:text-base text-white">Ranking da Comunidade</h1>
                <span className="rounded bg-gold/20 px-2 py-0.5 font-pixel text-[8px] uppercase tracking-wider text-gold border border-gold/40">
                  TEMPORADA ATUAL
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-400">
                Acompanhe quem mais zerou jogos e os maiores pontuadores de RetroAchievements.
              </p>
            </div>
          </div>

          {/* Seletor de Aba: Geral vs Por Clube */}
          <div className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-slate-950/60 p-1 self-start sm:self-auto">
            <button
              onClick={() => setTab('season')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                tab === 'season'
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-neon'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Trophy size={13} />
              Temporada Geral
            </button>
            <button
              onClick={() => setTab('club')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                tab === 'club'
                  ? 'bg-electric text-slate-950 shadow-neon'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Gamepad2 size={13} />
              Por Clube
            </button>
          </div>
        </div>
      </header>

      {/* Visão 1: Temporada Geral (Global) */}
      {tab === 'season' && (
        <section className="space-y-6">
          {/* Barra de Filtros da Temporada */}
          <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-panel px-5 py-4 sm:flex-row sm:items-center sm:justify-between shadow-pixel">
            <div className="flex items-center gap-2">
              <Sparkles className="text-gold" size={16} />
              <span className="text-xs font-bold text-white">Critério de Classificação:</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setSeasonSortBy('beaten')}
                className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition ${
                  seasonSortBy === 'beaten'
                    ? 'border-gold/50 bg-gold/20 text-gold shadow-neon'
                    : 'border-white/10 bg-slate-950/40 text-slate-400 hover:text-white'
                }`}
              >
                <Crown size={13} />
                Quem Mais Zerou 🏆
              </button>
              <button
                onClick={() => setSeasonSortBy('points')}
                className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition ${
                  seasonSortBy === 'points'
                    ? 'border-electric/50 bg-electric/20 text-electric shadow-neon'
                    : 'border-white/10 bg-slate-950/40 text-slate-400 hover:text-white'
                }`}
              >
                <Zap size={13} />
                Pontos RetroAchievements ⚡
              </button>
            </div>
          </div>

          {/* Pódio Olímpico dos 3 Primeiros */}
          {seasonPlayers.length >= 3 && (
            <Top3Podium
              players={seasonPlayers}
              metricLabel={seasonSortBy === 'beaten' ? 'jogos zerados' : 'pts RA'}
              metricKey={seasonSortBy === 'beaten' ? 'gamesBeatenCount' : 'seasonPoints'}
              pointsKey={seasonSortBy === 'beaten' ? 'seasonPoints' : 'gamesBeatenCount'}
            />
          )}

          {/* Tabela Completa de Classificação */}
          <div className="rounded-2xl border border-white/10 bg-panel p-4 sm:p-6 shadow-pixel">
            <div className="mb-4 flex items-center justify-between border-b border-white/5 pb-3">
              <h2 className="font-pixel text-xs text-white">Quadro de Líderes da Temporada</h2>
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                {seasonPlayers.length} Jogadores Registrados
              </span>
            </div>

            <div className="space-y-2">
              {seasonPlayers.map((player, index) => {
                const isMe = currentUser && (player.userId === currentUser.id || player.userId === currentUser.uid)

                return (
                  <div
                    key={player.userId || player.id}
                    className={`flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border p-3 sm:p-4 transition ${
                      isMe
                        ? 'border-electric/50 bg-electric/10 shadow-neon'
                        : index === 0
                        ? 'border-gold/40 bg-gradient-to-r from-amber-500/10 via-slate-900/40 to-slate-950/60'
                        : 'border-white/5 bg-slate-950/30 hover:bg-slate-900/40'
                    }`}
                  >
                    {/* Posição + Avatar + Nome */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 shrink-0 flex items-center justify-center">
                        <RankBadge position={index + 1} />
                      </div>

                      <img
                        src={getPlayerAvatar(player)}
                        alt={player.displayName}
                        onError={(e) => {
                          e.currentTarget.onerror = null
                          e.currentTarget.src = `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(player.displayName || 'Jogador')}`
                        }}
                        className="h-10 w-10 shrink-0 rounded-xl bg-slate-950 object-cover border border-white/10"
                      />

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="font-bold text-xs sm:text-sm text-white truncate">
                            {player.displayName}
                          </p>
                          {isMe && (
                            <span className="rounded bg-electric/20 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-electric border border-electric/40">
                              VOCÊ
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 truncate">
                          {player.rank || 'Jogador Retrô'} • Nível {player.level || 1}
                        </p>
                      </div>
                    </div>

                    {/* Métricas do Jogador */}
                    <div className="flex items-center justify-between sm:justify-end gap-5 pl-14 sm:pl-0">
                      <div className="text-left sm:text-right">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Zeramentos</p>
                        <p className="font-pixel text-xs sm:text-sm text-gold">
                          {player.gamesBeatenCount || 0} <span className="font-sans text-[10px] text-slate-300">zerados</span>
                        </p>
                      </div>

                      <div className="text-left sm:text-right">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Pontos RA</p>
                        <p className="font-pixel text-xs sm:text-sm text-electric">
                          {player.seasonPoints || 0} <span className="font-sans text-[10px] text-slate-400">pts</span>
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {/* Visão 2: Por Clube Específico */}
      {tab === 'club' && (
        <section className="space-y-6">
          {/* Seletor de Clube */}
          <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-panel px-5 py-4 sm:flex-row sm:items-center sm:justify-between shadow-pixel">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-electric">Clube Selecionado</p>
              <h2 className="font-pixel text-xs text-white mt-1">
                {activeClub ? activeClub.name : 'Selecione um clube'}
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-400">Trocar clube:</label>
              <select
                value={selectedClubId || ''}
                onChange={(e) => setSelectedClubId(e.target.value)}
                className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-xs font-bold text-white outline-none focus:border-electric/50"
              >
                {clubs.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.gameTitle || 'Em votação'})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Jogo e Detalhes da Rodada do Clube */}
          {activeClub && (
            <div className="flex items-center justify-between rounded-xl border border-white/10 bg-panel/70 p-4">
              <div className="flex items-center gap-3">
                {activeClub.gameCoverUrl ? (
                  <img
                    src={activeClub.gameCoverUrl}
                    alt={activeClub.gameTitle}
                    className="h-12 w-12 rounded-lg object-cover border border-white/10"
                  />
                ) : (
                  <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-950 text-electric border border-electric/30">
                    <Gamepad2 size={20} />
                  </span>
                )}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Jogo Atual da Rodada</p>
                  <p className="font-pixel text-xs text-white">{activeClub.gameTitle || 'Ainda em votação'}</p>
                </div>
              </div>

              <span className="rounded-md border border-purple-500/40 bg-purple-500/10 px-2.5 py-1 text-[10px] font-bold uppercase text-purple-300">
                {activeClub.gameConsole || activeClub.consoleFilter || 'Retrô'}
              </span>
            </div>
          )}

          {/* Pódio Top 3 do Clube */}
          {clubPlayers.length >= 3 && (
            <Top3Podium
              players={clubPlayers}
              metricLabel="progresso"
              metricKey="progress"
              pointsKey="points"
            />
          )}

          {/* Lista de Membros do Clube com Ranking */}
          <div className="rounded-2xl border border-white/10 bg-panel p-4 sm:p-6 shadow-pixel">
            <div className="mb-4 flex items-center justify-between border-b border-white/5 pb-3">
              <h2 className="font-pixel text-xs text-white">Líderes deste Clube</h2>
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                {clubPlayers.length} Participantes
              </span>
            </div>

            {loadingClub ? (
              <p className="py-8 text-center text-xs text-slate-500">Carregando classificação do clube...</p>
            ) : clubPlayers.length === 0 ? (
              <p className="py-8 text-center text-xs text-slate-500">Nenhum membro registrado neste clube.</p>
            ) : (
              <div className="space-y-2">
                {clubPlayers.map((player, index) => {
                  const isCompleted = Boolean(player.isCompleted || Number(player.progress) >= 100)
                  const isMe = currentUser && (player.userId === currentUser.id || player.userId === currentUser.uid)

                  return (
                    <div
                      key={player.userId || player.id}
                      className={`flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border p-3 sm:p-4 transition ${
                        isMe
                          ? 'border-electric/50 bg-electric/10 shadow-neon'
                          : isCompleted
                          ? 'border-gold/40 bg-gradient-to-r from-amber-500/10 via-slate-900/40 to-slate-950/60'
                          : 'border-white/5 bg-slate-950/30'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-12 shrink-0 flex items-center justify-center">
                          <RankBadge position={index + 1} />
                        </div>

                        <img
                          src={getPlayerAvatar(player)}
                          alt={player.displayName}
                          onError={(e) => {
                            e.currentTarget.onerror = null
                            e.currentTarget.src = `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(player.displayName || 'Jogador')}`
                          }}
                          className="h-10 w-10 shrink-0 rounded-xl bg-slate-950 object-cover border border-white/10"
                        />

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="font-bold text-xs sm:text-sm text-white truncate">
                              {player.displayName}
                            </p>
                            {isCompleted && (
                              <span className="rounded bg-gold/20 px-1.5 py-0.5 text-[8px] font-pixel text-gold border border-gold/40">
                                🏆 ZEROU!
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400">
                            {player.achievementsUnlocked || 0} conquistas desbloqueadas
                          </p>
                        </div>
                      </div>

                      {/* Progresso & Pontos no Clube */}
                      <div className="flex items-center justify-between sm:justify-end gap-5 pl-14 sm:pl-0">
                        <div className="w-28 space-y-1">
                          <div className="flex items-center justify-between text-[10px] text-slate-400">
                            <span>Progresso</span>
                            <span className="font-bold text-white">{player.progress || 0}%</span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-slate-900 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                isCompleted ? 'bg-gold' : 'bg-gradient-to-r from-electric to-neon'
                              }`}
                              style={{ width: `${Math.min(100, Math.max(0, player.progress || 0))}%` }}
                            />
                          </div>
                        </div>

                        <div className="text-right min-w-[70px]">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Pontos RA</p>
                          <p className="font-pixel text-xs sm:text-sm text-electric">
                            {player.points || player.raPoints || 0} <span className="font-sans text-[10px] text-slate-400">pts</span>
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  )
}

