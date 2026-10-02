import {
  ArrowLeft,
  BookOpenText,
  Check,
  Copy,
  Crown,
  Eye,
  Gamepad2,
  Heart,
  Lock,
  MessageSquare,
  MessageSquareText,
  Play,
  Radio,
  Share2,
  ShieldCheck,
  Trash2,
  Trophy,
  Users,
  X,
} from 'lucide-react'
import { useMemo, useState, useEffect, useRef } from 'react'
import EmulatorSurface from '../emulator/EmulatorSurface'
import RomLoader from '../emulator/RomLoader'
import SpectatorCanvas from './SpectatorCanvas'
import VoiceChatBar from './VoiceChatBar'
import RetroAchievementsPanel from '../retro-achievements/RetroAchievementsPanel'
import { sendSystemMessage } from './chatService'
import { listCheckpoints, createCheckpoint } from './checkpointService'
import { joinPresence, subscribeToPresence } from '../presence/presenceService'
import { listClubMembers, updateMemberClubProgress } from '../clubs/clubService'
import {
  completeSoloGame,
  deleteGameRoom,
  finishGameRoomAndArchive,
  listRoomMembers,
  updateMemberRoomProgress,
  updateRoomSpectatorSettings,
} from './roomService'
import { getCurrentUser } from '../auth/authService'
import InviteFriendModal from '../clubs/InviteFriendModal'
import { RankBadge } from '../leaderboard/LeaderboardBadges'
import { sortClubMembers, recordGameBeaten } from '../leaderboard/leaderboardService'
import { awardXp } from '../gamification/xpService'
import { getGameRetroMedia } from '../retro-achievements/gameMediaService'
import { subscribeToGameTips, createTip, toggleTipLike } from '../tips/tipsService'
import { publishRoomInvite } from '../feed/activityService'

export default function GameRoom({ onBack, club, clubId = 'club', currentUser }) {
  const activeClubId = club?.id || clubId
  const user = currentUser || getCurrentUser()
  const isSolo = Boolean(club?.isSolo || club?.roomType === 'solo')
  const isOwner = Boolean(user?.id && (club?.ownerId === user.id || !club?.ownerId || club?.createdBy === user.id))
  const isSpectator = isSolo && !isOwner

  const [copiedLink, setCopiedLink] = useState(false)
  const [spectatorChatEnabled, setSpectatorChatEnabled] = useState(club?.allowSpectatorChat !== false)
  const [spectatorVoiceEnabled, setSpectatorVoiceEnabled] = useState(club?.allowSpectatorVoice !== false)
  const [deletingRoom, setDeletingRoom] = useState(false)

  const handleToggleSpectatorVoice = async (enabled) => {
    setSpectatorVoiceEnabled(enabled)
    if (activeClubId) {
      try {
        await updateRoomSpectatorSettings(activeClubId, { allowSpectatorVoice: enabled })
      } catch {}
    }
  }
  const game = useMemo(() => {
    const title = club?.gameTitle || 'Jogo da Rodada'
    return {
      id: `game:${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      title,
      subtitle: club?.description || 'Jogo da rodada',
    }
  }, [club?.gameTitle, club?.description])

  const roomName = club?.name || 'Sala do clube'
  const romKey = useMemo(() => `club:${activeClubId}:${game.id}`, [activeClubId, game.id])
  const [romVersion, setRomVersion] = useState(0)
  const [romReady, setRomReady] = useState(false)
  const [checkpoints, setCheckpoints] = useState([])
  const [noteTitle, setNoteTitle] = useState('')
  const [noteDetail, setNoteDetail] = useState('')
  const [savingCheckpoint, setSavingCheckpoint] = useState(false)
  const [onlineMembers, setOnlineMembers] = useState([])
  const [raImages, setRaImages] = useState(null)
  const spectatorCount = useMemo(() => {
    return (onlineMembers || []).filter((m) => m.role === 'spectator').length
  }, [onlineMembers])

  const [clubMembers, setClubMembers] = useState([])
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false)
  const gameMedia = useMemo(() => getGameRetroMedia(game.title), [game.title])
  const [myProgress, setMyProgress] = useState(0)
  const [myIsCompleted, setMyIsCompleted] = useState(false)
  const [isInviteOpen, setIsInviteOpen] = useState(false)
  const [roomTips, setRoomTips] = useState([])
  const [feedSharedNotice, setFeedSharedNotice] = useState('')
  const [newTipTitle, setNewTipTitle] = useState('')
  const [newTipContent, setNewTipContent] = useState('')
  const [isAddingTip, setIsAddingTip] = useState(false)
  const [savingTip, setSavingTip] = useState(false)

  const [activeTab, setActiveTab] = useState(null)
  const [raStats, setRaStats] = useState({
    unlockedCount: 0,
    totalCount: 0,
    percent: 0,
    totalPoints: 0,
    isCompleted: false,
    gameplaySeconds: 0,
    deaths: 0,
    score: 0,
  })

  useEffect(() => {
    // Garante que o chat inicie aberto e expandido ao entrar no quarto
    window.dispatchEvent(new CustomEvent('zerei:open_chat'))
  }, [])

  useEffect(() => {
    if (!game.title) return
    return subscribeToGameTips(game.title, setRoomTips)
  }, [game.title])

  useEffect(() => {
    const current = user || getCurrentUser()
    if (!current?.id) return

    const leave = joinPresence(activeClubId, current, {
      gameTitle: game.title,
      gameConsole: club?.gameConsole,
      isSolo,
      allowSpectators: club?.allowSpectators !== false,
      role: isSpectator ? 'spectator' : 'player',
      isRoom: true,
    })
    const unsub = subscribeToPresence(activeClubId, setOnlineMembers, {
      isRoom: true,
      isSolo,
    })

    const joinKey = `zerei:joined:${activeClubId}:${current.id}`
    if (!sessionStorage.getItem(joinKey) && current.displayName) {
      sessionStorage.setItem(joinKey, 'true')
      sendSystemMessage(activeClubId, `${current.displayName} entrou na sala`).catch(() => {})
    }

    return () => {
      leave()
      unsub()
    }
  }, [activeClubId, user?.id])

  const effectiveOnlineList = useMemo(() => {
    const list = [...onlineMembers]
    const current = user || getCurrentUser()
    if (current?.id && !list.some((m) => m.userId === current.id || m.id === current.id)) {
      list.push({
        id: current.id,
        userId: current.id,
        displayName: current.displayName || 'Jogador',
        avatarUrl: current.avatarUrl,
        online: true,
      })
    }
    return list
  }, [onlineMembers, user])

  const [finishingRound, setFinishingRound] = useState(false)
  const [finishSuccess, setFinishSuccess] = useState('')

  useEffect(() => {
    listCheckpoints(activeClubId, game.id).then(setCheckpoints)
    
    // Tenta obter membros da sala de jogo e/ou do clube
    Promise.all([
      listRoomMembers(activeClubId).catch(() => []),
      listClubMembers(activeClubId).catch(() => []),
    ]).then(([roomMembers, clubMems]) => {
      const combined = roomMembers.length > 0 ? roomMembers : clubMems
      setClubMembers(combined)
      const currentId = user?.id || getCurrentUser()?.id
      const me = combined.find((m) => m.userId === currentId || m.id === currentId)
      if (me) {
        if (me.progress !== undefined) setMyProgress(me.progress)
        if (me.isCompleted !== undefined) setMyIsCompleted(me.isCompleted)
      }
    })
  }, [activeClubId, game.id, user?.id])

  async function handleFinishRound() {
    if (!window.confirm('Deseja finalizar esta rodada? Os resultados dos participantes que zeraram serão arquivados permanentemente no Hall da Fama.')) {
      return
    }
    setFinishingRound(true)
    try {
      await finishGameRoomAndArchive(activeClubId)
      setFinishSuccess('Rodada finalizada com sucesso! Zeramentos arquivados no Hall da Fama.')
      setTimeout(() => {
        onBack?.()
      }, 2000)
    } catch (err) {
      alert(err.message || 'Erro ao finalizar rodada.')
      setFinishingRound(false)
    }
  }

  function handleCopySpectatorLink() {
    const url = `${window.location.origin}?room=${activeClubId}&mode=spectator`
    navigator.clipboard.writeText(url)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2500)
  }

  async function handleToggleSpectatorChat() {
    const next = !spectatorChatEnabled
    setSpectatorChatEnabled(next)
    await updateRoomSpectatorSettings(activeClubId, { allowSpectatorChat: next })
  }

  async function handleDeleteSoloRoom() {
    if (!window.confirm('Tem certeza de que deseja excluir este Quartinho Gamer?')) {
      return
    }
    setDeletingRoom(true)
    try {
      await deleteGameRoom(activeClubId)
      onBack?.()
    } catch (err) {
      alert(err.message || 'Erro ao excluir sala.')
      setDeletingRoom(false)
    }
  }

  async function handleCompleteSoloGame() {
    if (!window.confirm(`Parabéns! Confirmar que você ZEROU ${game.title}?`)) return
    try {
      await completeSoloGame(activeClubId)
      setMyIsCompleted(true)
      setMyProgress(100)
      if (user?.id) {
        awardXp(user.id, 500, `Zerou ${game.title} no Quartinho Gamer!`).catch(() => {})
      }
      setFinishSuccess('Parabéns! Você zerou o jogo e a vitória foi registrada!')
    } catch (err) {
      alert(err.message || 'Erro ao registrar zeramento.')
    }
  }

  async function handleShareToFeed() {
    try {
      await publishRoomInvite(club || { id: activeClubId, gameTitle: game.title, title: roomName }, {
        message: `🎮 Estamos jogando ${game.title}! Venha participar da nossa rodada!`,
      })
      setFeedSharedNotice('Convite publicado no Feed com sucesso!')
      setTimeout(() => setFeedSharedNotice(''), 3000)
    } catch (err) {
      alert(err.message || 'Erro ao publicar no feed.')
    }
  }

  async function handleSaveTip(e) {
    e.preventDefault()
    if (!newTipTitle.trim() && !newTipContent.trim()) return
    setSavingTip(true)
    try {
      await createTip({
        gameTitle: game.title,
        title: newTipTitle.trim() || `Dica de ${game.title}`,
        content: newTipContent.trim(),
      })
      setNewTipTitle('')
      setNewTipContent('')
      setIsAddingTip(false)
    } catch (err) {
      alert(err.message || 'Erro ao salvar dica.')
    } finally {
      setSavingTip(false)
    }
  }

  const isCasual = club?.roundGoal === 'casual'

  async function handleProgressSync({ percent, isCompleted, achievementsUnlocked, achievementsTotal, points = 0, gameplaySeconds, deaths, score }) {
    if (!isCasual) {
      setMyProgress(percent)
      setMyIsCompleted(isCompleted)
    } else {
      setMyProgress(0)
      setMyIsCompleted(false)
    }

    const currentUserId = user?.id || getCurrentUser()?.id
    if (!currentUserId || !activeClubId) return

    setClubMembers((prev) =>
      prev.map((m) => {
        if (m.userId === currentUserId || m.id === currentUserId) {
          return {
            ...m,
            progress: isCasual ? 0 : percent,
            isCompleted: isCasual ? false : isCompleted,
            achievementsUnlocked,
            achievementsTotal,
            points,
            gameplaySeconds: gameplaySeconds ?? m.gameplaySeconds,
            deaths: deaths ?? m.deaths,
            score: score ?? m.score,
          }
        }
        return m
      })
    )

    // Sincroniza na Sala de Jogos
    updateMemberRoomProgress(activeClubId, currentUserId, {
      progress: isCasual ? 0 : percent,
      isCompleted: isCasual ? false : isCompleted,
      achievementsUnlocked,
      achievementsTotal,
      points,
      gameplaySeconds,
      deaths,
      score,
    }).catch(() => {})

    // Sincroniza no Clube vinculado se houver
    const parentClubId = club?.clubId || activeClubId
    if (parentClubId) {
      updateMemberClubProgress(parentClubId, currentUserId, {
        progress: isCasual ? 0 : percent,
        isCompleted: isCasual ? false : isCompleted,
        achievementsUnlocked,
        achievementsTotal,
        points,
      }).catch(() => {})
    }

    if (!isCasual && isCompleted && !myIsCompleted) {
      awardXp(currentUserId, 500, `Zerou ${game.title}! 🏆`).catch(() => {})
      recordGameBeaten({
        userId: currentUserId,
        gameTitle: game.title,
        retroAchievementsId: club?.retroAchievementsId || null,
        gameCoverUrl: game.coverUrl,
        clubId: activeClubId,
        clubName: roomName,
        completedAt: new Date().toISOString(),
      }).catch(() => {})
    }
  }

  // Ouvinte de evento de jogo zerado detectado pelo liveTelemetryService
  useEffect(() => {
    function handleGameBeatenDetected(e) {
      const { gameplaySeconds, deaths, score } = e.detail || {}
      setMyIsCompleted(true)
      setMyProgress(100)
      setFinishSuccess(`🏆 PARABÉNS! O ZEREI! detectou que você ZEROU ${game.title}!`)
      const currentUserId = user?.id || getCurrentUser()?.id
      if (currentUserId && activeClubId) {
        awardXp(currentUserId, 500, `Zerou ${game.title}! 🏆`).catch(() => {})
        recordGameBeaten({
          userId: currentUserId,
          gameTitle: game.title,
          retroAchievementsId: club?.retroAchievementsId || null,
          gameCoverUrl: game.coverUrl,
          clubId: activeClubId,
          clubName: roomName,
          completedAt: new Date().toISOString(),
          gameplaySeconds,
          deaths,
          score,
        }).catch(() => {})
      }
    }

    window.addEventListener('zerei:game_beaten', handleGameBeatenDetected)
    return () => window.removeEventListener('zerei:game_beaten', handleGameBeatenDetected)
  }, [game.title, user?.id, activeClubId, club?.retroAchievementsId, roomName])

  const rankedMembers = useMemo(() => {
    return sortClubMembers(clubMembers)
  }, [clubMembers])

  const finishedCount = useMemo(() => {
    return clubMembers.filter((m) => m.isCompleted || m.progress >= 100).length
  }, [clubMembers])

  const communityProgress = useMemo(() => {
    if (!clubMembers.length) return myProgress
    const sum = clubMembers.reduce((acc, m) => acc + (Number(m.progress) || 0), 0)
    return Math.round(sum / clubMembers.length)
  }, [clubMembers, myProgress])

  const daysRemaining = useMemo(() => {
    if (!club) return 12
    const endsAt = club.roundEndsAt ? new Date(club.roundEndsAt).getTime() : null
    if (endsAt) {
      const diff = Math.ceil((endsAt - Date.now()) / (1000 * 60 * 60 * 24))
      return Math.max(0, diff)
    }
    return club.roundDurationDays || 12
  }, [club])



  async function handleSaveCheckpoint(e) {
    e.preventDefault()
    if (!noteTitle.trim() || savingCheckpoint) return
    setSavingCheckpoint(true)
    try {
      const newCp = await createCheckpoint(activeClubId, game.id, { title: noteTitle, note: noteDetail })
      setCheckpoints((curr) => [newCp, ...curr])
      setNoteTitle('')
      setNoteDetail('')
    } finally {
      setSavingCheckpoint(false)
    }
  }

  function handleRomReady() {
    setRomReady(true)
    setRomVersion((version) => version + 1)
  }

  function handleRomRemoved() {
    setRomReady(false)
    setRomVersion((version) => version + 1)
  }

  return (
    <div className="mx-auto max-w-[1300px] flex flex-col gap-3">
      {/* 1. CABEÇALHO ULTRA COMPACTO (LINHA ÚNICA) */}
      <header className="relative overflow-hidden rounded-2xl border border-white/10 bg-panel px-4 py-2.5 shadow-pixel">
        {gameMedia?.bannerUrl && (
          <img
            src={gameMedia.bannerUrl}
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-10 mix-blend-luminosity"
          />
        )}
        <div className="relative flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
          {/* Lado Esquerdo: Voltar + Ícone + Título + Status */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={onBack}
              className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-slate-950/60 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-electric hover:border-electric/30 transition shrink-0 cursor-pointer"
              title="Voltar para o Salão de Jogos"
            >
              <ArrowLeft size={13} />
              <span className="hidden sm:inline">Salão</span>
            </button>

            {gameMedia?.iconUrl && (
              <img
                src={gameMedia.iconUrl}
                alt={game.title}
                className="h-9 w-9 rounded-xl border border-electric/40 bg-slate-950 p-0.5 object-contain shadow-pixel shrink-0"
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                }}
              />
            )}

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-pixel text-sm sm:text-base text-white truncate max-w-[240px] sm:max-w-[340px]">
                  {game.title}
                </h1>
                {isSolo ? (
                  <span className="rounded border border-electric/40 bg-electric/15 px-1.5 py-0.2 font-pixel text-[8px] uppercase tracking-wider text-electric shrink-0">
                    Solo
                  </span>
                ) : (
                  <span className="rounded border border-purple-500/40 bg-purple-500/20 px-1.5 py-0.2 font-pixel text-[8px] uppercase tracking-wider text-purple-300 shrink-0">
                    {club?.clubTag || club?.tag || 'CLUBE'}
                  </span>
                )}
                {club?.hardcoreMode && (
                  <span className="rounded border border-rose-500/30 bg-rose-500/10 px-1.5 py-0.2 font-pixel text-[7.5px] uppercase tracking-wider text-rose-300 shrink-0">
                    Hardcore
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-400 truncate hidden sm:block">
                {isSolo
                  ? 'Quartinho Gamer · Single Player sem limite de tempo'
                  : (club?.description || game.subtitle || 'Rodada Coletiva da Comunidade')}
              </p>
            </div>
          </div>

          {/* Lado Direito: Ações Rápidas */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {isSolo ? (
              <>
                {isOwner && (
                  <>
                    <button
                      type="button"
                      onClick={handleCopySpectatorLink}
                      className="flex items-center gap-1.5 rounded-xl border border-cyan-400/40 bg-cyan-500/15 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-cyan-300 transition hover:bg-cyan-500/25 shrink-0 cursor-pointer"
                      title="Copiar link de espectador"
                    >
                      {copiedLink ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                      <span className="hidden md:inline">{copiedLink ? 'Copiado!' : 'Espectador'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleCompleteSoloGame}
                      disabled={myIsCompleted}
                      className="flex items-center gap-1.5 rounded-xl border border-gold/50 bg-gold/20 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-gold transition hover:bg-gold/30 disabled:opacity-50 shrink-0 cursor-pointer"
                      title="Marcar jogo como Zerado"
                    >
                      <Trophy size={12} />
                      <span>{myIsCompleted ? 'Zerado!' : 'Marcar Zerado'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleDeleteSoloRoom}
                      disabled={deletingRoom}
                      className="p-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 transition cursor-pointer"
                      title="Excluir Quartinho Gamer"
                    >
                      <Trash2 size={13} />
                    </button>
                  </>
                )}
                {isSpectator && (
                  <div className="flex items-center gap-1.5 rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-3 py-1 text-cyan-300 font-pixel text-[8.5px] uppercase tracking-wider">
                    <Eye size={11} className="animate-pulse" />
                    <span>Ao Vivo</span>
                  </div>
                )}
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleShareToFeed}
                  className="flex items-center gap-1.5 rounded-xl border border-white/20 bg-slate-900 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-200 transition hover:border-electric/50 hover:text-white shrink-0 cursor-pointer"
                  title="Publicar convite no Feed"
                >
                  <Share2 size={12} className="text-electric" />
                  <span className="hidden sm:inline">Feed</span>
                </button>

                {isOwner && (
                  <button
                    type="button"
                    onClick={handleFinishRound}
                    disabled={finishingRound}
                    className="flex items-center gap-1.5 rounded-xl border border-amber-500/50 bg-amber-500/20 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-300 transition hover:bg-amber-500/30 disabled:opacity-50 shrink-0 cursor-pointer"
                  >
                    <Trophy size={12} />
                    <span>Finalizar</span>
                  </button>
                )}

                {club && (
                  <button
                    type="button"
                    onClick={() => setIsInviteOpen(true)}
                    className="flex items-center gap-1.5 rounded-xl border border-electric/40 bg-electric/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-electric transition hover:bg-electric/20 shrink-0 cursor-pointer"
                  >
                    <Share2 size={12} />
                    <span>Convidar</span>
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </header>

      {/* 2. BARRA DE NOTIFICAÇÕES (CASO OCORRA ZERAMENTO OU FEED) */}
      {finishSuccess && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-gold/40 bg-gold/15 px-4 py-2 text-gold">
          <div className="flex items-center gap-2">
            <Trophy size={16} className="shrink-0" />
            <p className="text-xs font-bold">{finishSuccess}</p>
          </div>
          <button type="button" onClick={() => setFinishSuccess('')} className="text-gold/70 hover:text-gold text-xs">✕</button>
        </div>
      )}

      {feedSharedNotice && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-4 py-2 text-emerald-300">
          <div className="flex items-center gap-2">
            <Check size={16} className="shrink-0" />
            <p className="text-xs font-bold">{feedSharedNotice}</p>
          </div>
          <button type="button" onClick={() => setFeedSharedNotice('')} className="text-emerald-300/70 hover:text-emerald-300 text-xs">✕</button>
        </div>
      )}

      {/* 3. ÁREA CENTRAL: O EMULADOR NATIVO */}
      <main className="w-full">
        {isSpectator ? (
          <SpectatorCanvas
            roomId={activeClubId}
            gameTitle={game.title}
            hostName={club?.ownerName || 'Anfitrião'}
            gameCoverUrl={club?.gameCoverUrl || gameMedia?.iconUrl}
            allowChat={spectatorChatEnabled}
            onOpenChat={() => window.dispatchEvent(new CustomEvent('zerei:open_chat'))}
          />
        ) : (
          <div className="space-y-4">
            {!romReady && (
              <RomLoader
                gameId={romKey}
                gameTitle={game.title}
                gameConsole={club?.gameConsole || club?.console || ''}
                clubId={activeClubId}
                onRomReady={handleRomReady}
                onRomRemoved={handleRomRemoved}
              />
            )}

            <div id="emulator-surface">
              <EmulatorSurface
                gameId={romKey}
                romVersion={romVersion}
                hardcoreMode={Boolean(club?.hardcoreMode)}
                gameTitle={game.title}
                gameConsole={club?.gameConsole || club?.console || ''}
                club={club}
                roomId={activeClubId}
                currentUser={user}
                onRomLoaded={handleRomReady}
              />
            </div>
          </div>
        )}
      </main>

      {/* 4. BARRA DE ABAS E TELEMETRIA CONDENSADA (LOGO ABAIXO DO EMULADOR) */}
      <section className="rounded-2xl border border-white/10 bg-panel px-4 py-3 shadow-pixel">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Status Rápido do Jogador */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Meu Progresso:</span>
              <span className="font-pixel text-xs text-gold">
                {myIsCompleted ? '🏆 100% ZERADO' : `${myProgress}%`}
              </span>
            </div>

            {raStats.totalCount > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Conquistas:</span>
                <span className="font-pixel text-xs text-emerald-400">
                  {raStats.unlockedCount} / {raStats.totalCount}
                </span>
              </div>
            )}

            {raStats.deaths > 0 && (
              <div className="flex items-center gap-1.5 text-rose-400 text-xs font-bold">
                <span>💀 {raStats.deaths} {raStats.deaths === 1 ? 'morte' : 'mortes'}</span>
              </div>
            )}

            {isSolo && spectatorCount > 0 && (
              <div className="flex items-center gap-1.5 text-cyan-300 text-xs font-bold">
                <Eye size={12} className="animate-pulse" />
                <span>{spectatorCount} assistindo</span>
              </div>
            )}
          </div>

          {/* Botões de Alternância de Abas (Toggle) */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Aba de Conquistas */}
            <button
              type="button"
              onClick={() => setActiveTab((prev) => (prev === 'achievements' ? null : 'achievements'))}
              className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition cursor-pointer ${
                activeTab === 'achievements'
                  ? 'border-gold bg-gold/25 text-gold shadow-md'
                  : 'border-gold/40 bg-gold/10 text-gold hover:bg-gold/20'
              }`}
              title="Exibir conquistas abaixo do emulador"
            >
              <Trophy size={13} />
              <span>Conquistas ({raStats.unlockedCount}/{raStats.totalCount || '?'})</span>
            </button>

            {/* Aba de Diário de Bordo */}
            <button
              type="button"
              onClick={() => setActiveTab((prev) => (prev === 'journal' ? null : 'journal'))}
              className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition cursor-pointer ${
                activeTab === 'journal'
                  ? 'border-electric bg-electric/25 text-white shadow-md'
                  : 'border-white/10 bg-slate-900 text-slate-300 hover:text-white hover:border-white/20'
              }`}
              title="Exibir Diário de Bordo abaixo do emulador"
            >
              <BookOpenText size={13} className="text-gold" />
              <span>Diário ({checkpoints.length})</span>
            </button>

            {/* Aba de Mural de Dicas */}
            <button
              type="button"
              onClick={() => setActiveTab((prev) => (prev === 'tips' ? null : 'tips'))}
              className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition cursor-pointer ${
                activeTab === 'tips'
                  ? 'border-cyan-400 bg-cyan-500/25 text-cyan-200 shadow-md'
                  : 'border-white/10 bg-slate-900 text-slate-300 hover:text-white hover:border-white/20'
              }`}
              title="Exibir Mural de Dicas abaixo do emulador"
            >
              <MessageSquareText size={13} className="text-electric" />
              <span>Dicas ({roomTips.length})</span>
            </button>

            {/* Aba de Classificação/Membros (Clube) */}
            {!isSolo && clubMembers.length > 0 && (
              <button
                type="button"
                onClick={() => setActiveTab((prev) => (prev === 'ranking' ? null : 'ranking'))}
                className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition cursor-pointer ${
                  activeTab === 'ranking'
                    ? 'border-purple-400 bg-purple-500/25 text-purple-200 shadow-md'
                    : 'border-white/10 bg-slate-900 text-slate-300 hover:text-white hover:border-white/20'
                }`}
                title="Exibir classificação e membros abaixo do emulador"
              >
                <Users size={13} className="text-purple-400" />
                <span>Classificação ({clubMembers.length})</span>
              </button>
            )}
          </div>
        </div>

        {/* ÁREA EXPANSÍVEL DA ABA SELECIONADA (FICA ABAIXO SEM COBRIR O EMULADOR) */}
        {activeTab && (
          <div className="mt-4 border-t border-white/10 pt-4 animate-in fade-in duration-200">
            {/* 1. ABA DE CONQUISTAS */}
            {activeTab === 'achievements' && (
              <div className="max-h-[300px] overflow-y-auto pr-2">
                <RetroAchievementsPanel
                  gameTitle={game.title}
                  currentUser={user}
                  gameId={club?.retroAchievementsId}
                  roomId={activeClubId}
                  roundGoal={club?.roundGoal || 'campaign'}
                  onGameMetadata={(images) => setRaImages(images)}
                  onProgressSync={handleProgressSync}
                  onStatsUpdate={setRaStats}
                  inModal={true}
                  onCloseModal={() => setActiveTab(null)}
                />
              </div>
            )}

            {/* 2. ABA DE DIÁRIO DE BORDO */}
            {activeTab === 'journal' && (
              <div className="max-h-[300px] overflow-y-auto pr-2 space-y-4">
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <div className="flex items-center gap-2">
                    <BookOpenText size={16} className="text-gold" />
                    <h3 className="font-pixel text-xs text-white">Diário de Bordo</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab(null)}
                    className="text-slate-400 hover:text-white transition cursor-pointer text-xs"
                  >
                    Fechar ✕
                  </button>
                </div>

                <form onSubmit={handleSaveCheckpoint} className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={noteTitle}
                    onChange={(e) => setNoteTitle(e.target.value)}
                    disabled={savingCheckpoint}
                    required
                    maxLength={80}
                    className="flex-1 rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-xs font-bold text-white placeholder:text-slate-600 focus:outline-none"
                    placeholder="Título da nota (Ex: Cheguei no castelo 2)"
                  />
                  <input
                    type="text"
                    value={noteDetail}
                    onChange={(e) => setNoteDetail(e.target.value)}
                    disabled={savingCheckpoint}
                    className="flex-1 rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none"
                    placeholder="Detalhes opcionais..."
                  />
                  <button
                    disabled={savingCheckpoint || !noteTitle.trim()}
                    type="submit"
                    className="rounded-xl bg-gold/20 px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-gold hover:bg-gold/30 transition disabled:opacity-50 cursor-pointer shrink-0"
                  >
                    {savingCheckpoint ? 'Salvando...' : 'Registrar'}
                  </button>
                </form>

                <div className="space-y-2">
                  {checkpoints.length === 0 ? (
                    <p className="text-center text-xs text-slate-500 py-4">Nenhum registro no diário ainda.</p>
                  ) : (
                    checkpoints.map((cp) => (
                      <div key={cp.id} className="rounded-xl border border-white/5 bg-slate-950/40 p-2.5 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-bold text-white">{cp.title}</p>
                          {cp.note && <p className="text-[11px] text-slate-300 mt-0.5">{cp.note}</p>}
                        </div>
                        <span className="text-[9px] text-slate-500 shrink-0 font-mono">
                          {new Date(cp.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* 3. ABA DE MURAL DE DICAS */}
            {activeTab === 'tips' && (
              <div className="max-h-[300px] overflow-y-auto pr-2 space-y-4">
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <div className="flex items-center gap-2">
                    <MessageSquareText size={16} className="text-cyan-400" />
                    <h3 className="font-pixel text-xs text-white">Mural de Dicas da Comunidade</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab(null)}
                    className="text-slate-400 hover:text-white transition cursor-pointer text-xs"
                  >
                    Fechar ✕
                  </button>
                </div>

                <form onSubmit={handleSaveTip} className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={newTipTitle}
                    onChange={(e) => setNewTipTitle(e.target.value)}
                    disabled={savingTip}
                    required
                    maxLength={90}
                    className="flex-1 rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-xs font-bold text-white placeholder:text-slate-600 focus:outline-none"
                    placeholder="Título da dica..."
                  />
                  <input
                    type="text"
                    value={newTipContent}
                    onChange={(e) => setNewTipContent(e.target.value)}
                    disabled={savingTip}
                    required
                    className="flex-1 rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none"
                    placeholder="Estratégia ou segredo..."
                  />
                  <button
                    disabled={savingTip || !newTipTitle.trim() || !newTipContent.trim()}
                    type="submit"
                    className="rounded-xl bg-electric/20 px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-electric hover:bg-electric/30 transition disabled:opacity-50 cursor-pointer shrink-0"
                  >
                    {savingTip ? 'Salvando...' : 'Postar Dica'}
                  </button>
                </form>

                <div className="space-y-2">
                  {roomTips.length === 0 ? (
                    <p className="text-center text-xs text-slate-500 py-4">Nenhuma dica compartilhada ainda.</p>
                  ) : (
                    roomTips.map((tip) => (
                      <div key={tip.id} className="rounded-xl border border-white/5 bg-slate-950/40 p-2.5 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white">{tip.title}</p>
                          <p className="text-[11px] text-slate-300 mt-0.5 whitespace-pre-line">{tip.content}</p>
                          <p className="text-[9px] text-slate-500 mt-1">Por {tip.authorName || 'Jogador'}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleLikeTip(tip.id)}
                          className="flex items-center gap-1 text-rose-400 hover:text-rose-300 transition text-[10px] font-bold shrink-0 cursor-pointer"
                        >
                          <Heart size={12} fill={currentUser?.id && tip.likes?.includes(currentUser.id) ? 'currentColor' : 'none'} />
                          <span>{tip.likesCount || 0}</span>
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* 4. ABA DE CLASSIFICAÇÃO / RANKING DO CLUBE */}
            {activeTab === 'ranking' && (
              <div className="max-h-[300px] overflow-y-auto pr-2 space-y-3">
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <div className="flex items-center gap-2">
                    <Users size={16} className="text-purple-400" />
                    <h3 className="font-pixel text-xs text-white">Classificação da Rodada</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab(null)}
                    className="text-slate-400 hover:text-white transition cursor-pointer text-xs"
                  >
                    Fechar ✕
                  </button>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  {rankedMembers.map((member, index) => {
                    const isCompleted = Boolean(member.isCompleted || Number(member.progress) >= 100)
                    return (
                      <div
                        key={member.id || member.userId || index}
                        className={`flex items-center justify-between rounded-xl border p-2.5 transition ${
                          index === 0 ? 'border-amber-400/40 bg-amber-500/10' : 'border-white/5 bg-slate-950/40'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <RankBadge position={index + 1} size="sm" />
                          <img className="h-7 w-7 rounded-lg bg-slate-950 object-cover shrink-0" src={member.avatarUrl} alt={member.displayName} />
                          <div className="min-w-0">
                            <p className="truncate text-xs font-bold text-white">{member.displayName}</p>
                            <p className="text-[9px] text-slate-400 font-pixel">
                              {isCompleted ? '🏆 ZEROU' : `${member.progress || 0}%`}
                            </p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-pixel text-[10px] text-electric">{member.points || member.raPoints || 0}</span>
                          <span className="block text-[8px] uppercase text-slate-500 font-bold">pts RA</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Painel invisível para manter sincronia contínua de conquistas quando a aba não estiver ativa */}
      {activeTab !== 'achievements' && (
        <div className="sr-only">
          <RetroAchievementsPanel
            gameTitle={game.title}
            currentUser={user}
            gameId={club?.retroAchievementsId}
            roomId={activeClubId}
            roundGoal={club?.roundGoal || 'campaign'}
            onGameMetadata={(images) => setRaImages(images)}
            onProgressSync={handleProgressSync}
            onStatsUpdate={setRaStats}
          />
        </div>
      )}

      {isMembersModalOpen && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/80 px-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-panel p-6 shadow-neon">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gold flex items-center gap-1.5">
                  <Trophy size={13} className="text-gold" /> Placar & Classificação
                </p>
                <h2 className="mt-1 font-pixel text-xs text-white">{roomName}</h2>
              </div>
              <button type="button" onClick={() => setIsMembersModalOpen(false)} aria-label="Fechar" className="text-slate-500 hover:text-white transition">
                <X size={18} />
              </button>
            </div>

            <p className="mt-2 text-[11px] text-slate-400">
              {rankedMembers.length} {rankedMembers.length === 1 ? 'jogador' : 'jogadores'} • Classificado por zeramento e pontos de RetroAchievements
            </p>

            <div className="mt-5 max-h-80 space-y-2 overflow-y-auto pr-1">
              {rankedMembers.map((member, index) => {
                const isOnline = effectiveOnlineList.some(
                  (m) =>
                    (m.userId && member.userId && m.userId === member.userId) ||
                    (m.id && (m.id === member.userId || m.id === member.id)) ||
                    (m.displayName && member.displayName && m.displayName.toLowerCase().trim() === member.displayName.toLowerCase().trim())
                )
                const isCompleted = Boolean(member.isCompleted || Number(member.progress) >= 100)

                return (
                  <div
                    key={member.id || member.userId || index}
                    className={`rounded-xl border p-3 space-y-2.5 transition ${
                      index === 0
                        ? 'border-amber-400/40 bg-amber-500/10'
                        : isCompleted
                        ? 'border-gold/30 bg-slate-950/40'
                        : 'border-white/5 bg-slate-950/30'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <RankBadge position={index + 1} size="sm" />
                        <div className="relative">
                          <img className="h-8 w-8 rounded-lg bg-slate-950 object-cover" src={member.avatarUrl} alt={member.displayName} />
                          {isOnline && <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-400 ring-1 ring-slate-950" />}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs font-bold text-white truncate">{member.displayName}</p>
                            {isCompleted && (
                              <span className="rounded bg-gold/20 px-1.5 py-0.5 text-[8px] font-pixel text-gold border border-gold/40 shrink-0">
                                🏆 ZEROU!
                              </span>
                            )}
                          </div>
                          <p className="text-[9px] text-slate-500">{member.role === 'owner' ? 'Criador / Líder' : 'Membro'}</p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="font-pixel text-xs text-electric">
                          {member.points || member.raPoints || 0}
                        </span>
                        <span className="block text-[8px] uppercase tracking-wider text-slate-400 font-bold">pts RA</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[9px] text-slate-400">
                        <span>Progresso: <strong className="text-slate-200 font-pixel text-[10px]">{member.progress || 0}%</strong></span>
                        {member.achievementsTotal > 0 && (
                          <span>{member.achievementsUnlocked || 0} / {member.achievementsTotal} conquistas</span>
                        )}
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-slate-900 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${isCompleted ? 'bg-gold' : 'bg-gradient-to-r from-electric to-neon'}`}
                          style={{ width: `${Math.min(100, Math.max(0, member.progress || 0))}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {isInviteOpen && club && (
        <InviteFriendModal
          club={club}
          onClose={() => setIsInviteOpen(false)}
        />
      )}
    </div>
  )
}
