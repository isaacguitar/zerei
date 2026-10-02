import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  Check,
  ChevronRight,
  Crown,
  Dices,
  Flame,
  Gamepad2,
  Mic,
  Monitor,
  Radio,
  Sparkles,
  Trophy,
  Users,
  Vote,
  Share2,
  X,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { getCurrentUser } from '../auth/authService'
import {
  castVote,
  removeVote,
  resolveVoting,
  subscribeToClub,
  subscribeToVotes,
} from './clubService'
import { searchRetroAchievementsGames } from '../retro-achievements/retroAchievementsService'
import { joinPresence, subscribeToPresence } from '../presence/presenceService'
import InviteFriendModal from './InviteFriendModal'
import { awardXp } from '../gamification/xpService'

export default function VotingRoom({ club, currentUser, onBack, onGameSelected }) {
  const user = currentUser || getCurrentUser()
  const isOwner = club?.ownerId && user && (club.ownerId === user.id || club.ownerId === user.uid)

  const [clubData, setClubData] = useState(club)
  const [votes, setVotes] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [resolving, setResolving] = useState(false)
  const [error, setError] = useState('')
  const [successToast, setSuccessToast] = useState('')
  const [chatMode, setChatMode] = useState('expanded')
  const isChatExpanded = chatMode === 'expanded'
  const [isInviteOpen, setIsInviteOpen] = useState(false)

  // Sorteio animado
  const [isRaffling, setIsRaffling] = useState(false)
  const [raffleIndex, setRaffleIndex] = useState(0)

  // Presença online
  const [onlineMembers, setOnlineMembers] = useState([])

  const searchRequestId = useRef(0)

  // Escutar atualizações do clube (se o dono finalizar, todos são redirecionados)
  useEffect(() => {
    if (!club?.id) return
    const unsubscribe = subscribeToClub(club.id, (updatedClub) => {
      setClubData(updatedClub)
      if (updatedClub.phase === 'playing' && (updatedClub.gameTitle || updatedClub.retroAchievementsId)) {
        setSuccessToast(`O jogo "${updatedClub.gameTitle}" foi escolhido! Entrando na sala...`)
        setTimeout(() => {
          onGameSelected?.(updatedClub)
        }, 1200)
      }
    })
    return () => unsubscribe()
  }, [club?.id, onGameSelected])

  // Escutar votos em tempo real
  useEffect(() => {
    if (!club?.id) return
    const unsubscribe = subscribeToVotes(club.id, (voteList) => {
      setVotes(voteList)
    })
    return () => unsubscribe()
  }, [club?.id])

  // Presença online
  useEffect(() => {
    if (!club?.id || !user?.id) return
    const leavePresence = joinPresence(club.id, user)
    const unsubscribePresence = subscribeToPresence(club.id, setOnlineMembers)
    return () => {
      leavePresence()
      unsubscribePresence()
    }
  }, [club?.id, user])

  // Busca de jogos RA para indicação
  async function handleSearch(query) {
    setSearchQuery(query)
    const trimmed = query.trim()
    if (trimmed.length < 2) {
      searchRequestId.current += 1
      setSuggestions([])
      return
    }

    const reqId = ++searchRequestId.current
    setIsSearching(true)
    try {
      const results = await searchRetroAchievementsGames(trimmed, club?.consoleFilter)
      if (reqId === searchRequestId.current) {
        setSuggestions(results || [])
      }
    } catch {
      if (reqId === searchRequestId.current) {
        setSuggestions([])
      }
    } finally {
      if (reqId === searchRequestId.current) {
        setIsSearching(false)
      }
    }
  }

  // Agrupar votos por jogo
  const groupedGamesMap = {}
  votes.forEach((v) => {
    const key = (v.gameId ? `id_${v.gameId}` : v.gameTitle.toLowerCase().trim())
    if (!groupedGamesMap[key]) {
      groupedGamesMap[key] = {
        key,
        id: v.gameId,
        title: v.gameTitle,
        coverUrl: v.gameCoverUrl,
        consoleName: v.gameConsole,
        voters: [],
      }
    }
    groupedGamesMap[key].voters.push({
      userId: v.userId,
      displayName: v.displayName,
      avatarUrl: v.avatarUrl,
    })
  })

  const nominatedGames = Object.values(groupedGamesMap).sort(
    (a, b) => b.voters.length - a.voters.length
  )

  // Identificar se o usuário já votou
  const myVote = votes.find((v) => v.userId === (user?.id || user?.uid))
  const leaderGame = nominatedGames.length > 0 && nominatedGames[0].voters.length > 0 ? nominatedGames[0] : null

  async function handleVoteForGame(game) {
    if (!user?.id && !user?.uid) return
    setError('')
    try {
      await castVote(club.id, user, {
        id: game.id,
        title: game.title,
        imageBoxArt: game.coverUrl || game.imageBoxArt,
        imageIcon: game.coverUrl || game.imageIcon,
        consoleName: game.consoleName,
      })
      awardXp(user?.id || user?.uid, 50, 'Votação na rodada', { isVote: true }).catch(() => {})
      setSearchQuery('')
      setSuggestions([])
    } catch (err) {
      setError(err.message || 'Erro ao registrar seu voto.')
    }
  }

  async function handleRemoveVote() {
    const uid = user?.id || user?.uid
    if (!uid) return
    try {
      await removeVote(club.id, uid)
    } catch (err) {
      setError(err.message || 'Erro ao remover voto.')
    }
  }

  // Confirmar vencedor
  async function handleConfirmWinner(chosenGame) {
    if (!chosenGame) return
    setResolving(true)
    setError('')
    try {
      await resolveVoting(club.id, chosenGame)
    } catch (err) {
      setError(err.message || 'Erro ao finalizar a votação.')
      setResolving(false)
    }
  }

  // Sortear jogo aleatório
  function handleRaffle() {
    if (nominatedGames.length === 0) return
    setIsRaffling(true)
    let count = 0
    const totalFlips = 20
    const interval = setInterval(() => {
      setRaffleIndex(Math.floor(Math.random() * nominatedGames.length))
      count++
      if (count >= totalFlips) {
        clearInterval(interval)
        setIsRaffling(false)
        const winner = nominatedGames[Math.floor(Math.random() * nominatedGames.length)]
        handleConfirmWinner(winner)
      }
    }, 120)
  }

  const isRaffleMode = clubData?.votingMode === 'random'

  return (
    <div className="relative pb-24 text-slate-200 mx-auto max-w-6xl">
      {/* Toast de Sucesso */}
      {successToast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-2xl border border-emerald-400 bg-emerald-950/95 px-6 py-3 text-sm font-bold text-white shadow-neon animate-bounce">
          <Sparkles className="text-gold" size={20} />
          <span>{successToast}</span>
        </div>
      )}

      {/* Header Superior da Sala de Votação */}
      <header className="mb-6 flex flex-col gap-4 rounded-2xl border border-white/10 bg-panel p-4 sm:flex-row sm:items-center sm:justify-between shadow-pixel">
        <div className="flex items-center gap-4 min-w-0">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2 text-xs font-bold uppercase tracking-wider text-slate-400 transition hover:border-white/20 hover:text-white shrink-0"
          >
            <ArrowLeft size={14} /> Clubes
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="font-pixel text-sm text-electric sm:text-base truncate">{clubData?.name}</h1>
              <span className="rounded-md border border-gold/30 bg-gold/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-gold shrink-0">
                {isRaffleMode ? 'Sorteio da Rodada' : 'Votação Aberta'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 truncate mt-0.5">
              Geração: <strong className="text-slate-200 uppercase">{clubData?.consoleFilter || 'Livre'}</strong> • Duração da rodada: <strong className="text-slate-200">{clubData?.roundDurationDays || 14} dias</strong>
            </p>
          </div>
        </div>

        {/* Voz e Presença + Ação do Dono */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Bolinhas de presença online */}
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-slate-950/40 px-3 py-1.5">
            <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              {onlineMembers.length} na sala
            </span>
            <div className="flex items-center -space-x-1.5 overflow-hidden pl-1">
              {onlineMembers.slice(0, 4).map((member, i) => (
                <img
                  key={member.id || member.userId || i}
                  src={member.avatarUrl}
                  alt={member.displayName}
                  title={member.displayName}
                  className="h-6 w-6 rounded-full border border-slate-900 bg-slate-800 object-cover"
                />
              ))}
            </div>
          </div>

          {/* Botão de Convidar Amigo */}
          <button
            type="button"
            onClick={() => setIsInviteOpen(true)}
            className="flex items-center gap-1.5 rounded-xl border border-electric/40 bg-electric/10 px-3 py-2 text-xs font-bold uppercase tracking-wider text-electric transition hover:bg-electric/20 shrink-0"
          >
            <Share2 size={13} />
            <span className="hidden sm:inline">Convidar</span>
          </button>

          {/* Botão de Sortear / Encerrar para o Dono */}
          {isOwner && nominatedGames.length > 0 && (
            <div>
              {isRaffleMode ? (
                <button
                  disabled={isRaffling || resolving}
                  onClick={handleRaffle}
                  className="flex items-center gap-2 rounded-xl border border-gold/50 bg-gradient-to-r from-amber-500/20 to-amber-600/30 px-4 py-2 text-xs font-bold uppercase tracking-wider text-gold transition hover:border-gold hover:shadow-neon disabled:opacity-50 shadow-pixel"
                >
                  <Dices size={16} className={isRaffling ? 'animate-spin' : ''} />
                  <span>{isRaffling ? 'Sorteando...' : 'Sortear Jogo 🎲'}</span>
                </button>
              ) : (
                leaderGame && (
                  <button
                    disabled={resolving}
                    onClick={() => handleConfirmWinner(leaderGame)}
                    className="flex items-center gap-2 rounded-xl border border-emerald-400/50 bg-emerald-500/20 px-4 py-2 text-xs font-bold uppercase tracking-wider text-emerald-300 transition hover:border-emerald-400 hover:shadow-neon disabled:opacity-50 shadow-pixel"
                  >
                    <Check size={16} />
                    <span>{resolving ? 'Finalizando...' : 'Confirmar Vencedor'}</span>
                  </button>
                )
              )}
            </div>
          )}
        </div>
      </header>

      {/* Mensagem de Erro se houver */}
      {error && (
        <div className="mb-6 flex items-center justify-between rounded-xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-xs text-rose-200">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
          <button onClick={() => setError('')}><X size={14} /></button>
        </div>
      )}

      {/* Barra de Pesquisa de Indicação (Conforme Mockup) */}
      <div className="relative mb-6 rounded-2xl border border-electric/30 bg-slate-950/60 p-4 shadow-neon">
        <div className="flex items-center justify-between gap-3 mb-2">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <Vote size={16} className="text-electric" />
            {myVote ? 'Você já votou! Deseja trocar sua indicação?' : 'Pesquise seu jogo clássico para indicação'}
          </label>

          {myVote && (
            <button
              onClick={handleRemoveVote}
              className="text-[10px] font-bold uppercase tracking-wider text-rose-400 hover:text-rose-300 transition"
            >
              Remover meu voto
            </button>
          )}
        </div>

        <div className="relative">
          <input
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Digite o título do jogo clássico no RetroAchievements (Ex: Castlevania, Pokémon, Sonic, Metal Slug...)"
            className="w-full rounded-xl border border-white/15 bg-slate-900/90 px-4 py-3 text-sm text-white placeholder-slate-500 outline-none focus:border-electric transition shadow-inner"
          />
          {isSearching && (
            <span className="absolute right-4 top-3.5 text-xs text-electric animate-pulse">Buscando...</span>
          )}
        </div>

        {/* Dropdown de sugestões do RA */}
        {suggestions.length > 0 && (
          <div className="absolute left-4 right-4 top-[102px] z-30 max-h-64 overflow-y-auto rounded-xl border border-electric/40 bg-slate-950 shadow-2xl divide-y divide-white/5">
            {suggestions.map((item) => (
              <button
                key={item.id || item.title}
                type="button"
                onClick={() => handleVoteForGame(item)}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-white/10 transition group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {item.imageIcon ? (
                    <img src={item.imageIcon} alt="" className="h-8 w-8 rounded object-cover border border-white/10 shrink-0" />
                  ) : (
                    <Gamepad2 size={20} className="text-electric shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-white group-hover:text-electric">{item.title}</p>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider">{item.consoleName || 'RetroAchievements'}</p>
                  </div>
                </div>
                <span className="flex items-center gap-1 rounded-lg border border-electric/30 bg-electric/15 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-electric shrink-0">
                  Indicar e Votar <ChevronRight size={12} />
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Banner de Status da Votação / Vencedor Atual */}
      {leaderGame && (
        <div className="mb-6 rounded-2xl border border-gold/40 bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-slate-950 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-pixel">
          <div className="flex items-center gap-4">
            <div className="relative shrink-0">
              {leaderGame.coverUrl ? (
                <img
                  src={leaderGame.coverUrl}
                  alt={leaderGame.title}
                  className="h-16 w-16 rounded-xl object-cover border-2 border-gold shadow-neon"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-xl border-2 border-gold bg-gold/15 text-gold">
                  <Trophy size={28} />
                </div>
              )}
              <span className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-gold text-slate-950 font-pixel text-[10px] shadow">
                ★
              </span>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <Crown size={14} className="text-gold" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-gold">
                  {isRaffleMode ? 'Jogo em Destaque' : 'Líder da Votação'}
                </span>
              </div>
              <h3 className="font-pixel text-sm text-white sm:text-base mt-0.5">{leaderGame.title}</h3>
              <p className="text-xs text-slate-400">
                {leaderGame.voters.length} {leaderGame.voters.length === 1 ? 'voto recebido' : 'votos recebidos'} • {leaderGame.consoleName || 'Clássico'}
              </p>
            </div>
          </div>

          {isOwner && !isRaffleMode && (
            <button
              onClick={() => handleConfirmWinner(leaderGame)}
              disabled={resolving}
              className="rounded-xl border border-gold bg-gold/20 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-gold transition hover:bg-gold/30 disabled:opacity-50"
            >
              Confirmar Este Jogo
            </button>
          )}
        </div>
      )}

      {/* Grid de Jogos Indicados (Conforme Mockup) */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-pixel text-xs text-white uppercase tracking-wider">
            Jogos Indicados ({nominatedGames.length})
          </h3>
          <span className="text-[11px] text-slate-400">
            {votes.length} {votes.length === 1 ? 'voto total' : 'votos no total'}
          </span>
        </div>

        {nominatedGames.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-slate-950/40 p-12 text-center">
            <Gamepad2 size={40} className="text-slate-600 mb-3" />
            <p className="font-bold text-sm text-slate-300">Nenhum jogo foi indicado ainda.</p>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">
              Utilize a barra de pesquisa acima para indicar o primeiro jogo da rodada!
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {nominatedGames.map((game, index) => {
              const isCurrentLeader = index === 0
              const hasMyVote = game.voters.some((v) => v.userId === (user?.id || user?.uid))
              const isRaffleTarget = isRaffling && raffleIndex === index

              return (
                <article
                  key={game.key}
                  className={`relative flex flex-col justify-between rounded-2xl border p-4 transition duration-200 ${
                    isRaffleTarget
                      ? 'border-gold bg-gold/30 scale-105 shadow-2xl'
                      : hasMyVote
                      ? 'border-electric bg-electric/15 shadow-neon'
                      : isCurrentLeader
                      ? 'border-gold/50 bg-slate-900/80'
                      : 'border-white/10 bg-slate-950/60 hover:border-white/20'
                  }`}
                >
                  <div>
                    {/* Imagem do Jogo */}
                    <div className="relative mb-3 aspect-[16/10] overflow-hidden rounded-xl border border-white/10 bg-slate-950">
                      {game.coverUrl ? (
                        <img
                          src={game.coverUrl}
                          alt={game.title}
                          className="h-full w-full object-cover transition group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-slate-700">
                          <Gamepad2 size={40} />
                        </div>
                      )}

                      {isCurrentLeader && (
                        <span className="absolute top-2 left-2 rounded-md bg-gold px-2 py-0.5 text-[9px] font-bold text-slate-950 uppercase shadow">
                          Mais votado
                        </span>
                      )}

                      <span className="absolute top-2 right-2 rounded-md bg-slate-950/80 px-2 py-0.5 text-[9px] font-bold text-white border border-white/10">
                        {game.voters.length} {game.voters.length === 1 ? 'voto' : 'votos'}
                      </span>
                    </div>

                    <h4 className="font-bold text-sm text-white line-clamp-1">{game.title}</h4>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider mt-0.5">
                      {game.consoleName || 'Retrogaming'}
                    </p>

                    {/* Avatares de quem votou (Conforme Mockup) */}
                    <div className="mt-3">
                      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                        Votado por:
                      </p>
                      <div className="flex items-center -space-x-2 overflow-hidden py-0.5">
                        {game.voters.map((voter) => (
                          <img
                            key={voter.userId}
                            title={voter.displayName}
                            src={voter.avatarUrl}
                            alt={voter.displayName}
                            className="inline-block h-7 w-7 rounded-full border-2 border-slate-900 bg-slate-800 object-cover"
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Botão de Ação */}
                  <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
                    {hasMyVote ? (
                      <span className="flex items-center gap-1.5 text-xs font-bold text-electric">
                        <Check size={14} /> Seu voto atual
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleVoteForGame(game)}
                        className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-electric transition"
                      >
                        Votar neste <ChevronRight size={13} />
                      </button>
                    )}

                    {isOwner && (
                      <button
                        type="button"
                        onClick={() => handleConfirmWinner(game)}
                        className="text-[10px] font-bold uppercase tracking-wider text-gold hover:underline"
                      >
                        Escolher
                      </button>
                    )}
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal de Convidar Amigo */}
      {isInviteOpen && (
        <InviteFriendModal
          club={clubData || club}
          onClose={() => setIsInviteOpen(false)}
        />
      )}
    </div>
  )
}
