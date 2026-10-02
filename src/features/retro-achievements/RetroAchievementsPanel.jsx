import {
  Activity,
  Award,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Flame,
  Gamepad2,
  ListFilter,
  LoaderCircle,
  Lock,
  RefreshCw,
  Sparkles,
  Trophy,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { firebaseAuth } from '../../firebaseClient'
import { logActivity } from '../feed/activityService'
import { fetchGameAchievementsAndProgress, playAchievementSound, resolveGameIdFromTitle } from './retroAchievementsService'
import { getMemberRoomData, updateMemberRoomProgress } from '../game-room/roomService'

function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return '0 min'
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  if (hours > 0) {
    return `${hours}h ${minutes.toString().padStart(2, '0')}m`
  }
  return `${minutes} min`
}

export default function RetroAchievementsPanel({
  gameTitle,
  currentUser,
  gameId: explicitGameId,
  roomId = null,
  roundGoal = 'campaign',
  onGameMetadata,
  onProgressSync,
  onStatsUpdate,
  inModal = false,
  onCloseModal,
}) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [filter, setFilter] = useState('all') // 'all', 'unlocked', 'locked'
  const [sessionSeconds, setSessionSeconds] = useState(0)
  const [unlockedToast, setUnlockedToast] = useState(null)
  const [localUnlockedIds, setLocalUnlockedIds] = useState(new Set())
  const [telemetry, setTelemetry] = useState({
    gameplaySeconds: 0,
    deaths: 0,
    score: 0,
    isBeaten: false,
  })
  const [gameBeatenModal, setGameBeatenModal] = useState(null)

  const isCasual = roundGoal === 'casual'
  const raUsername = currentUser?.retroAchievementsUsername || 'Jogador'
  const gameId = useMemo(() => {
    if (explicitGameId) return Number(explicitGameId)
    return resolveGameIdFromTitle(gameTitle)
  }, [explicitGameId, gameTitle])

  // Só reutiliza IDs gravados por eventos oficiais do rcheevos.
  useEffect(() => {
    const storageKey = `zerei:official-unlocked:${roomId || gameId}:${currentUser?.id || 'guest'}`
    const cached = localStorage.getItem(storageKey)
    let initialSet = new Set()
    if (cached) {
      try {
        const parsed = JSON.parse(cached)
        if (Array.isArray(parsed)) initialSet = new Set(parsed)
      } catch {}
    }

    if (roomId && currentUser?.id) {
      getMemberRoomData(roomId, currentUser.id).then((memberData) => {
        setLocalUnlockedIds(initialSet)
        if (memberData?.gameplaySeconds || memberData?.deaths || memberData?.score) {
          setTelemetry((prev) => ({
            ...prev,
            gameplaySeconds: Number(memberData.gameplaySeconds || prev.gameplaySeconds),
            deaths: Number(memberData.deaths || prev.deaths),
            score: Number(memberData.score || prev.score),
            isBeaten: Boolean(memberData.isCompleted || prev.isBeaten),
          }))
        }
      })
    } else if (initialSet.size > 0) {
      setLocalUnlockedIds(initialSet)
    } else {
      setLocalUnlockedIds(new Set())
    }
  }, [roomId, gameId, currentUser?.id])

  // Escuta telemetria e conquistas automáticas emitidas pelo liveTelemetryService
  useEffect(() => {
    function handleTelemetryUpdate(e) {
      if (!e.detail) return
      setTelemetry((prev) => ({
        ...prev,
        gameplaySeconds: e.detail.gameplaySeconds ?? prev.gameplaySeconds,
        deaths: e.detail.deaths ?? prev.deaths,
        score: e.detail.score ?? prev.score,
        isBeaten: Boolean(e.detail.isBeaten || prev.isBeaten),
      }))
    }

    function handleAchievementUnlocked(e) {
      if (e.detail?.source !== 'retroachievements') return
      const ach = e.detail?.achievement
      if (ach) {
        unlockAchievementLocally(ach)
      }
    }

    function handleGameBeaten(e) {
      setGameBeatenModal(e.detail)
    }

    window.addEventListener('zerei:telemetry_update', handleTelemetryUpdate)
    window.addEventListener('zerei:achievement_unlocked', handleAchievementUnlocked)
    window.addEventListener('zerei:game_beaten', handleGameBeaten)

    return () => {
      window.removeEventListener('zerei:telemetry_update', handleTelemetryUpdate)
      window.removeEventListener('zerei:achievement_unlocked', handleAchievementUnlocked)
      window.removeEventListener('zerei:game_beaten', handleGameBeaten)
    }
  }, [roomId, gameId, data?.gameTitle, gameTitle, currentUser?.id])

  // Live session timer while in room
  useEffect(() => {
    const timer = setInterval(() => {
      setSessionSeconds((prev) => prev + 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  async function loadAchievements() {
    setLoading(true)
    setLoadError('')
    try {
      const idToken = await firebaseAuth?.currentUser?.getIdToken()
      const result = await fetchGameAchievementsAndProgress({
        username: raUsername,
        gameId,
        gameTitle,
        idToken,
      })
      setData(result)

      if (result?.images) {
        onGameMetadata?.(result.images, result.gameTitle)
      }

    } catch (err) {
      console.warn('Falha ao carregar conquistas do jogo:', err)
      setLoadError(err.message || 'Não foi possível consultar as conquistas oficiais.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAchievements()
  }, [gameTitle, raUsername, gameId])

  // Mescla conquistas oficiais da API com conquistas desbloqueadas na sessão atual
  const achievements = useMemo(() => {
    const raw = data?.achievements || []
    return raw.map((ach) => {
      const isLocallyUnlocked = localUnlockedIds.has(Number(ach.id)) || localUnlockedIds.has(String(ach.id))
      return {
        ...ach,
        unlocked: Boolean(ach.unlocked || ach.dateEarned || isLocallyUnlocked),
        dateEarned: ach.dateEarned || (isLocallyUnlocked ? 'Nesta sessão' : null),
      }
    })
  }, [data?.achievements, localUnlockedIds])

  const unlockedCount = achievements.filter((a) => a.unlocked).length
  const totalCount = achievements.length
  const percent = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0
  const isCompleted = isCasual
    ? false
    : Boolean(data?.completed || telemetry.isBeaten || (totalCount > 0 && unlockedCount >= totalCount) || achievements.some((a) => a.isBeatenTrigger && a.unlocked))
  const totalPoints = achievements.filter((a) => a.unlocked).reduce((sum, a) => sum + (Number(a.points) || 0), 0)

  useEffect(() => {
    onStatsUpdate?.({
      unlockedCount,
      totalCount,
      percent,
      totalPoints,
      isCompleted,
      gameplaySeconds: telemetry.gameplaySeconds || sessionSeconds,
      deaths: telemetry.deaths,
      score: telemetry.score,
    })
  }, [unlockedCount, totalCount, percent, totalPoints, isCompleted, telemetry.gameplaySeconds, sessionSeconds, telemetry.deaths, telemetry.score, onStatsUpdate])

  function unlockAchievementLocally(ach) {
    const idKey = Number(ach.id) || ach.id
    if (localUnlockedIds.has(idKey)) return

    const newSet = new Set(localUnlockedIds)
    newSet.add(idKey)
    setLocalUnlockedIds(newSet)

    playAchievementSound()
    setUnlockedToast(ach)
    setTimeout(() => setUnlockedToast(null), 6000)

    logActivity({
      type: 'achievement',
      action: 'desbloqueou a conquista',
      game: data?.gameTitle || gameTitle,
      gameTitle: data?.gameTitle || gameTitle,
      achievement: ach.title,
      points: ach.points,
      badgeUrl: ach.badgeUrl,
      visibility: 'restricted',
    }).catch(() => {})

    const storageKey = `zerei:official-unlocked:${roomId || gameId}:${currentUser?.id || 'guest'}`
    localStorage.setItem(storageKey, JSON.stringify([...newSet]))

    const updatedUnlocked = achievements.map(a => a.id === ach.id ? { ...a, unlocked: true } : a)
    const newUnlockedCount = updatedUnlocked.filter(a => a.unlocked).length
    const newPercent = totalCount > 0 ? Math.round((newUnlockedCount / totalCount) * 100) : 0
    const newPoints = updatedUnlocked.filter(a => a.unlocked).reduce((s, a) => s + (Number(a.points) || 0), 0)
    const newCompleted = isCasual ? false : (newUnlockedCount >= totalCount || ach.isBeatenTrigger || telemetry.isBeaten)

    onProgressSync?.({
      percent: isCasual ? 0 : newPercent,
      isCompleted: newCompleted,
      achievementsUnlocked: newUnlockedCount,
      achievementsTotal: totalCount,
      points: newPoints,
      gameplaySeconds: telemetry.gameplaySeconds,
      deaths: telemetry.deaths,
      score: telemetry.score,
    })

    if (roomId && currentUser?.id) {
      updateMemberRoomProgress(roomId, currentUser.id, {
        progress: isCasual ? 0 : newPercent,
        isCompleted: newCompleted,
        achievementsUnlocked: newUnlockedCount,
        achievementsTotal: totalCount,
        points: newPoints,
        unlockedAchievementIds: [...newSet],
        gameplaySeconds: telemetry.gameplaySeconds,
        deaths: telemetry.deaths,
        score: telemetry.score,
      }).catch(() => {})
    }
  }

  // Sincroniza progresso com o componente pai (GameRoom)
  useEffect(() => {
    if (!data) return
    onProgressSync?.({
      percent: isCasual ? 0 : percent,
      isCompleted: isCasual ? false : isCompleted,
      achievementsUnlocked: unlockedCount,
      achievementsTotal: totalCount,
      points: totalPoints,
    })
  }, [unlockedCount, totalCount, isCasual, isCompleted, totalPoints])

  const filteredAchievements = useMemo(() => {
    if (filter === 'unlocked') return achievements.filter((a) => a.unlocked)
    if (filter === 'locked') return achievements.filter((a) => !a.unlocked)
    return achievements
  }, [achievements, filter])

  return (
    <section className={inModal ? 'space-y-4' : 'rounded-2xl border border-white/10 bg-panel p-5 shadow-pixel sm:p-6'}>
      {/* Header with Title and Game info */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gold/40 bg-gold/15 text-gold">
            <Trophy size={20} />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gold">RetroAchievements</p>
              {isCompleted && (
                <span className="flex items-center gap-1 rounded bg-gold/20 px-2 py-0.5 text-[9px] font-pixel text-gold border border-gold/40 animate-pulse">
                  <Sparkles size={10} /> ZERADO!
                </span>
              )}
            </div>
            <h2 className="mt-0.5 font-pixel text-xs text-white">Conquistas & Telemetria</h2>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={loadAchievements}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-300 hover:text-white transition disabled:opacity-50 cursor-pointer"
            title="Atualizar conquistas"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Atualizar</span>
          </button>
          {gameId && (
            <a
              href={`https://retroachievements.org/game/${gameId}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-[10px] font-bold text-slate-300 hover:text-electric hover:border-electric/30 transition max-w-[180px] sm:max-w-[260px]"
              title={`Ver página oficial no RetroAchievements: ${data?.gameTitle || gameTitle}`}
            >
              <span className="truncate">{data?.gameTitle || gameTitle}</span>
              <ExternalLink size={12} className="shrink-0 text-slate-500" />
            </a>
          )}
          {inModal && onCloseModal && (
            <button
              type="button"
              onClick={onCloseModal}
              className="rounded-lg border border-white/10 bg-slate-900 p-2 text-slate-400 hover:text-white transition cursor-pointer ml-1"
              title="Fechar Janela"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Telemetry Bar */}
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-white/5 bg-slate-950/40 p-3">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider">Conquistas</p>
          <p className="mt-1 font-pixel text-xs text-white">
            {unlockedCount} <span className="text-[10px] text-slate-500 font-sans">/ {totalCount}</span>
          </p>
        </div>

        <div className="rounded-xl border border-white/5 bg-slate-950/40 p-3">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider">Conclusão</p>
          {isCasual ? (
            <div className="mt-1 flex items-baseline gap-2">
              <p className="font-pixel text-xs text-cyan-300">Casual</p>
              <span className="text-[9px] text-slate-500">Sem meta</span>
            </div>
          ) : (
            <div className="mt-1 flex items-baseline gap-2">
              <p className="font-pixel text-xs text-electric">{percent}%</p>
              <div className="flex-1 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className={`h-full rounded-full ${isCompleted ? 'bg-gold' : 'bg-gradient-to-r from-electric to-neon'}`}
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-white/5 bg-slate-950/40 p-3">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider">Tempo de Gameplay</p>
          <p className="mt-1 font-pixel text-xs text-slate-200">
            {formatDuration(telemetry.gameplaySeconds || sessionSeconds)}
          </p>
        </div>

        <div className="rounded-xl border border-white/5 bg-slate-950/40 p-3">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider flex items-center gap-1">
            <span>Mortes</span>
          </p>
          <p className="mt-1 font-pixel text-xs text-rose-400">
            {telemetry.deaths} <span className="text-[9px] text-slate-500 font-sans">{telemetry.deaths === 1 ? 'morte' : 'mortes'}</span>
          </p>
        </div>

        <div className="rounded-xl border border-white/5 bg-slate-950/40 p-3">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">Status RetroAchievements</p>
          <p className={`mt-1 font-pixel text-xs ${isCasual ? 'text-cyan-300' : (isCompleted || telemetry.isBeaten) ? 'text-gold animate-pulse' : 'text-emerald-300'}`}>
            {isCasual ? 'Casual / Livre' : data?.completed ? 'Concluído oficialmente' : data ? 'Em andamento' : 'Indisponível'}
          </p>
        </div>
      </div>

      {/* Guia de Conquistas Automáticas */}
      <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 text-xs text-slate-300 flex items-start gap-2.5">
        <Gamepad2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
        <div className="text-[11px] leading-relaxed">
          <strong className="text-white">Validação oficial:</strong> Com sua conta autenticada neste dispositivo e um core compatível, o runtime RetroAchievements verifica os triggers durante cada frame. Tempo de jogo, mortes e zeramento continuam sendo acompanhados separadamente pelo ZEREI!.
        </div>
      </div>

      {isCasual && (
        <div className="mt-2.5 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-[11px] text-cyan-300 flex items-center gap-2">
          <Sparkles size={14} className="shrink-0 text-cyan-400" />
          <span>
            <strong>Modo Casual:</strong> Nesta sala o progresso não é contabilizado como requisito de zeramento. As conquistas somam pontos para seu perfil, mas sinta-se livre para jogar no seu ritmo!
          </span>
        </div>
      )}

      {/* Filter / Counter Bar */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-t border-white/10 pt-4">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`rounded-lg px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition ${filter === 'all' ? 'border border-electric/40 bg-electric/20 text-electric' : 'border border-transparent text-slate-400 hover:text-white'}`}
          >
            Todas ({totalCount})
          </button>
          <button
            type="button"
            onClick={() => setFilter('unlocked')}
            className={`rounded-lg px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition ${filter === 'unlocked' ? 'border border-emerald-500/40 bg-emerald-500/20 text-emerald-300' : 'border border-transparent text-slate-400 hover:text-white'}`}
          >
            Conquistadas ({unlockedCount})
          </button>
          <button
            type="button"
            onClick={() => setFilter('locked')}
            className={`rounded-lg px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition ${filter === 'locked' ? 'border border-white/20 bg-slate-900 text-slate-200' : 'border border-transparent text-slate-400 hover:text-white'}`}
          >
            Bloqueadas ({totalCount - unlockedCount})
          </button>
        </div>

        <span className="text-[10px] font-pixel text-gold">
          {totalPoints} pontos acumulados
        </span>
      </div>

      {/* Achievements List */}
      <div className="mt-4 max-h-[380px] space-y-2.5 overflow-y-auto pr-1">
        {loading && achievements.length === 0 ? (
          <div className="flex items-center justify-center p-8 text-xs text-slate-500">
            <LoaderCircle className="mr-2 animate-spin text-electric" size={16} />
            Consultando conquistas do jogo...
          </div>
        ) : loadError ? (
          <p role="alert" className="rounded-xl border border-rose-500/20 bg-rose-500/5 px-4 py-6 text-center text-xs text-rose-300">
            {loadError}
          </p>
        ) : filteredAchievements.length === 0 ? (
          <p className="text-center py-8 text-xs text-slate-500">
            Nenhuma conquista encontrada para este filtro.
          </p>
        ) : (
          filteredAchievements.map((ach) => (
            <div
              key={ach.id}
              className={`flex items-start gap-3.5 rounded-xl border p-3 transition ${ach.unlocked ? 'border-emerald-500/30 bg-emerald-500/5 shadow-sm' : 'border-white/5 bg-slate-950/25 opacity-75'}`}
            >
              <div className="relative shrink-0">
                <img
                  src={ach.badgeUrl}
                  alt={ach.title}
                  className={`h-11 w-11 rounded-lg border object-cover shadow-pixel transition ${ach.unlocked ? 'border-emerald-400/50' : 'border-white/10 grayscale opacity-60'}`}
                />
                {ach.unlocked ? (
                  <span className="absolute -bottom-1 -right-1 rounded-full bg-emerald-400 p-0.5 text-slate-950 shadow">
                    <CheckCircle2 size={12} />
                  </span>
                ) : (
                  <span className="absolute -bottom-1 -right-1 rounded-full bg-slate-800 p-0.5 text-slate-400 shadow">
                    <Lock size={12} />
                  </span>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className={`text-xs font-bold ${ach.unlocked ? 'text-white' : 'text-slate-400'}`}>
                    {ach.title}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="rounded-md border border-gold/30 bg-gold/10 px-2 py-0.5 text-[9px] font-bold text-gold shrink-0">
                      +{ach.points} pts
                    </span>

                    {ach.unlocked ? (
                      <span className="flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-pixel text-emerald-300">
                        <CheckCircle2 size={11} />
                        <span>CONQUISTADA</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 rounded-md border border-white/5 bg-slate-900/60 px-2 py-0.5 text-[9px] font-pixel text-slate-500">
                        <Lock size={10} />
                        <span>BLOQUEADA</span>
                      </span>
                    )}
                  </div>
                </div>

                <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
                  {ach.description}
                </p>

                {ach.unlocked && ach.dateEarned && (
                  <p className="mt-1.5 text-[9px] text-emerald-400/80 font-mono">
                    Desbloqueado: {ach.dateEarned}
                  </p>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal / Card Comemorativo de Jogo Zerado */}
      {gameBeatenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md rounded-2xl border-2 border-gold/60 bg-slate-900 p-6 shadow-[0_0_50px_rgba(255,215,0,0.3)] text-center">
            <button
              type="button"
              onClick={() => setGameBeatenModal(null)}
              className="absolute top-4 right-4 rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition"
            >
              <X size={18} />
            </button>

            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-gold bg-gold/20 text-gold shadow-lg mb-4 animate-bounce">
              <Trophy size={32} />
            </span>

            <span className="rounded bg-gold/20 px-2.5 py-1 font-pixel text-[10px] text-gold uppercase tracking-wider border border-gold/40">
              Vitória Épica · Jogo Zerado!
            </span>

            <h3 className="mt-2 font-pixel text-lg text-white">
              {gameBeatenModal.gameTitle || gameTitle}
            </h3>

            <p className="mt-2 text-xs text-slate-300">
              Parabéns! O ZEREI! detectou que você concluiu o objetivo final do jogo!
            </p>

            {/* Painel de Estatísticas da Gameplay */}
            <div className="mt-5 grid grid-cols-3 gap-2 rounded-xl border border-white/10 bg-slate-950/60 p-3 text-left">
              <div>
                <p className="text-[9px] uppercase tracking-wider text-slate-500">Tempo de Jogo</p>
                <p className="mt-0.5 font-pixel text-xs text-white">
                  {formatDuration(gameBeatenModal.gameplaySeconds || telemetry.gameplaySeconds)}
                </p>
              </div>
              <div>
                <p className="text-[9px] uppercase tracking-wider text-slate-500">Mortes</p>
                <p className="mt-0.5 font-pixel text-xs text-rose-400">
                  {gameBeatenModal.deaths ?? telemetry.deaths}
                </p>
              </div>
              <div>
                <p className="text-[9px] uppercase tracking-wider text-slate-500">Conquistas</p>
                <p className="mt-0.5 font-pixel text-xs text-gold">
                  {unlockedCount} / {totalCount}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setGameBeatenModal(null)}
              className="mt-6 w-full rounded-xl border border-gold/50 bg-gradient-to-r from-amber-500 via-gold to-yellow-400 py-3 font-pixel text-xs uppercase tracking-wider text-slate-950 shadow-lg hover:brightness-110 active:scale-98 transition"
            >
              Celebrar Vitória! 🎮
            </button>
          </div>
        </div>
      )}

      {/* RetroAchievements / Steam style unlock toast popup */}
      {unlockedToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3.5 rounded-2xl border-2 border-gold bg-slate-950/95 p-4 shadow-[0_0_30px_rgba(255,215,0,0.35)] backdrop-blur-md transition-all duration-300 animate-in fade-in slide-in-from-bottom-5 max-w-sm">
          <div className="relative shrink-0">
            <img
              src={unlockedToast.badgeUrl}
              alt=""
              className="h-12 w-12 rounded-xl border border-gold/60 object-cover shadow-pixel"
            />
            <span className="absolute -top-1.5 -right-1.5 rounded-full bg-gold p-1 text-slate-950 shadow-md">
              <Trophy size={12} />
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <p className="font-pixel text-[9px] uppercase tracking-wider text-gold flex items-center gap-1.5">
              <Sparkles size={10} /> Conquista Desbloqueada!
            </p>
            <p className="mt-1 font-bold text-white text-xs truncate">{unlockedToast.title}</p>
            <p className="mt-0.5 text-[10px] text-slate-400 line-clamp-1">{unlockedToast.description}</p>
            <p className="mt-1 text-[9px] font-mono text-emerald-400">+{unlockedToast.points} pontos RetroAchievements</p>
          </div>

          <button
            type="button"
            onClick={() => setUnlockedToast(null)}
            className="text-slate-500 hover:text-white p-1 transition"
            aria-label="Fechar notificação"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </section>
  )
}
