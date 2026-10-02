import {
  Archive,
  Ban,
  Check,
  Eye,
  Flag,
  Gamepad2,
  LoaderCircle,
  MessageCircle,
  MoreVertical,
  Shield,
  Sparkles,
  Trophy,
  UserCheck,
  UserPlus,
  Users,
  X,
  Zap,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { getCurrentUser } from '../auth/authService'
import { getLevelInfo } from '../gamification/xpService'
import {
  acceptFriendRequest,
  blockUser,
  cancelFriendRequest,
  followUser,
  getFriendshipStatus,
  getUserSocialStats,
  rejectFriendRequest,
  sendFriendRequest,
  unblockUser,
  unfollowUser,
} from './friendService'
import ReportUserModal from './ReportUserModal'

export default function UserProfileModal({ isOpen, onClose, targetUser, onOpenDirectChat, onOpenShelf, onWatchGame }) {
  const [status, setStatus] = useState({
    isFollowing: false,
    isFollower: false,
    isMutual: false,
    isBlocked: false,
    isSelf: false,
  })
  const [stats, setStats] = useState({ followersCount: 0, followingCount: 0, friendsCount: 0 })
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [isReportOpen, setIsReportOpen] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [hoveringFollow, setHoveringFollow] = useState(false)

  const currentUser = getCurrentUser()

  useEffect(() => {
    if (!isOpen || !targetUser?.id) return

    let cancelled = false
    setLoading(true)

    const load = async () => {
      try {
        const [friendship, userStats] = await Promise.all([
          getFriendshipStatus(currentUser?.id, targetUser.id),
          getUserSocialStats(targetUser.id),
        ])
        if (!cancelled) {
          setStatus(friendship)
          setStats({
            followersCount: targetUser.followersCount || userStats.followersCount,
            followingCount: targetUser.followingCount || userStats.followingCount,
            friendsCount: userStats.friendsCount,
          })
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [isOpen, targetUser?.id, currentUser?.id])

  if (!isOpen || !targetUser) return null

  const levelInfo = getLevelInfo(targetUser.xp || 0)
  const isSelf = currentUser?.id === targetUser.id || status.isSelf

  async function handleToggleFollow() {
    if (actionLoading || isSelf) return
    setActionLoading(true)

    try {
      if (status.isFollowing) {
        await unfollowUser(targetUser.id)
        setStatus((prev) => ({ ...prev, isFollowing: false, isMutual: false }))
        setStats((prev) => ({ ...prev, followersCount: Math.max(0, prev.followersCount - 1) }))
      } else {
        await followUser(targetUser)
        const isNowMutual = status.isFollower
        setStatus((prev) => ({ ...prev, isFollowing: true, isMutual: isNowMutual }))
        setStats((prev) => ({
          ...prev,
          followersCount: prev.followersCount + 1,
          friendsCount: isNowMutual ? prev.friendsCount + 1 : prev.friendsCount,
        }))
      }
    } finally {
      setActionLoading(false)
    }
  }

  async function handleToggleBlock() {
    setIsMenuOpen(false)
    setActionLoading(true)
    try {
      if (status.isBlocked) {
        await unblockUser(targetUser.id)
        setStatus((prev) => ({ ...prev, isBlocked: false }))
      } else {
        await blockUser(targetUser.id, targetUser.displayName)
        setStatus((prev) => ({ ...prev, isBlocked: true, isFollowing: false, isMutual: false }))
      }
    } finally {
      setActionLoading(false)
    }
  }

  function handleStartChat() {
    onClose?.()
    onOpenDirectChat?.(targetUser)
  }

  const avatarSrc = targetUser.avatarUrl || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${targetUser.id}`

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-panel shadow-2xl">
          {/* Top Banner retro */}
          <div className="h-28 w-full bg-gradient-to-r from-purple-900/60 via-slate-900 to-electric/20 p-4 relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:16px_16px]" />
            <div className="flex justify-between items-center relative z-10">
              <span className="font-pixel text-[9px] uppercase tracking-wider text-electric/80">
                Perfil da Comunidade
              </span>
              <div className="flex items-center gap-1.5">
                {!isSelf && (
                  <div className="relative">
                    <button
                      onClick={() => setIsMenuOpen((prev) => !prev)}
                      className="rounded-lg bg-black/40 p-1.5 text-slate-300 transition hover:bg-black/60 hover:text-white"
                      title="Opções"
                    >
                      <MoreVertical size={16} />
                    </button>

                    {isMenuOpen && (
                      <div className="absolute right-0 top-8 z-30 w-44 rounded-xl border border-white/10 bg-slate-900 p-1.5 shadow-xl">
                        <button
                          onClick={handleToggleBlock}
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-500/10 transition text-left"
                        >
                          <Ban size={14} />
                          {status.isBlocked ? 'Desbloquear' : 'Bloquear usuário'}
                        </button>
                        <button
                          onClick={() => {
                            setIsMenuOpen(false)
                            setIsReportOpen(true)
                          }}
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-amber-300 hover:bg-amber-500/10 transition text-left"
                        >
                          <Flag size={14} />
                          Denunciar
                        </button>
                      </div>
                    )}
                  </div>
                )}
                <button
                  onClick={onClose}
                  className="rounded-lg bg-black/40 p-1.5 text-slate-300 transition hover:bg-black/60 hover:text-white"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* Conteúdo principal */}
          <div className="px-6 pb-6 pt-0">
            {/* Avatar & Identificação */}
            <div className="relative -mt-14 mb-4 flex items-end justify-between gap-3">
              <div className="relative">
                <img
                  src={avatarSrc}
                  alt=""
                  className="h-24 w-24 rounded-2xl border-4 border-slate-950 bg-slate-900 object-cover shadow-pixel"
                />
                {targetUser.online && (
                  <span className="absolute bottom-1 right-1 h-4 w-4 rounded-full border-2 border-slate-950 bg-emerald-400 shadow-neon" title="Online agora" />
                )}
              </div>

              {/* Badges de Nível & Rank */}
              <div className="flex flex-col items-end gap-1.5 pb-1">
                <span className="rounded-full border border-electric/30 bg-electric/10 px-3 py-1 text-[9px] font-bold uppercase tracking-wider text-electric">
                  Nível {levelInfo.level}
                </span>
                <span className="rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-[9px] font-bold uppercase tracking-wider text-gold">
                  {levelInfo.icon} {levelInfo.rank}
                </span>
              </div>
            </div>

            {/* Nome e status de amizade */}
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-pixel text-lg text-white">{targetUser.displayName || 'Jogador'}</h2>
                {status.isMutual && (
                  <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-bold text-emerald-300 border border-emerald-500/30">
                    Amigos 🤝
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {targetUser.bio || 'Membro do clube retrô ZEREI!'}
              </p>
            </div>

            {/* Indicação Ao Vivo: Jogando Agora */}
            {targetUser?.currentActivity?.status === 'playing' && (
              <div className="mt-3.5 flex items-center justify-between gap-3 p-3 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 shadow-pixel">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 shrink-0">
                    <Gamepad2 size={16} className="animate-pulse" />
                  </div>
                  <div className="min-w-0">
                    <span className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider text-emerald-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                      Jogando Agora
                    </span>
                    <p className="font-pixel text-[11px] text-white truncate">
                      {targetUser.currentActivity.gameTitle}
                    </p>
                  </div>
                </div>

                {targetUser.currentActivity.allowSpectators && onWatchGame && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose()
                      onWatchGame({
                        id: targetUser.currentActivity.roomId,
                        gameTitle: targetUser.currentActivity.gameTitle,
                        isSolo: targetUser.currentActivity.isSolo,
                        allowSpectators: targetUser.currentActivity.allowSpectators,
                      })
                    }}
                    className="flex items-center gap-1.5 rounded-xl bg-cyan-400 px-3 py-1.5 font-pixel text-[9px] font-bold text-slate-950 hover:bg-cyan-300 transition shadow-neon shrink-0"
                  >
                    <Eye size={12} />
                    <span>Assistir</span>
                  </button>
                )}
              </div>
            )}

            {/* Contadores sociais (Seguidores, Seguindo, Amigos Mútuos) */}
            <div className="my-5 grid grid-cols-3 gap-2 rounded-2xl border border-white/5 bg-slate-950/40 p-3 text-center">
              <div className="p-1">
                <span className="block font-pixel text-sm text-white">{stats.followersCount}</span>
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Seguidores</span>
              </div>
              <div className="p-1 border-x border-white/5">
                <span className="block font-pixel text-sm text-white">{stats.followingCount}</span>
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Seguindo</span>
              </div>
              <div className="p-1">
                <span className="block font-pixel text-sm text-emerald-400">{stats.friendsCount}</span>
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Amigos</span>
              </div>
            </div>

            {/* Stats adicionais retrô */}
            <div className="mb-5 flex items-center justify-between rounded-xl border border-white/5 bg-white/5 p-3 text-xs">
              <div className="flex items-center gap-2 text-slate-300">
                <Trophy size={16} className="text-gold" />
                <span>Pontos RetroAchievements:</span>
              </div>
              <span className="font-pixel text-gold">
                {targetUser.retroAchievementsPoints || targetUser.points || 0} pts
              </span>
            </div>

            {/* Botões de Ação */}
            {!isSelf ? (
              <div className="space-y-2.5">
                <div className="flex items-center gap-2.5">
                  {/* Botão de Amizade / Solicitação */}
                  {status.isMutual ? (
                    <button
                      onClick={async () => {
                        if (actionLoading) return
                        setActionLoading(true)
                        try {
                          await unfollowUser(targetUser.id)
                          setStatus((prev) => ({ ...prev, isFollowing: false, isMutual: false }))
                          setStats((prev) => ({
                            ...prev,
                            friendsCount: Math.max(0, prev.friendsCount - 1),
                          }))
                        } finally {
                          setActionLoading(false)
                        }
                      }}
                      disabled={actionLoading || status.isBlocked}
                      onMouseEnter={() => setHoveringFollow(true)}
                      onMouseLeave={() => setHoveringFollow(false)}
                      className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 px-4 text-xs font-bold uppercase tracking-wider transition ${
                        hoveringFollow
                          ? 'border border-rose-500/40 bg-rose-500/15 text-rose-300'
                          : 'border border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                      }`}
                    >
                      {actionLoading ? (
                        <LoaderCircle size={14} className="animate-spin" />
                      ) : hoveringFollow ? (
                        'Desfazer amizade'
                      ) : (
                        <>
                          <UserCheck size={14} />
                          Amigos 🤝
                        </>
                      )}
                    </button>
                  ) : status.isPendingSent ? (
                    <button
                      onClick={async () => {
                        if (actionLoading) return
                        setActionLoading(true)
                        try {
                          await cancelFriendRequest(targetUser.id)
                          setStatus((prev) => ({ ...prev, isPendingSent: false }))
                        } finally {
                          setActionLoading(false)
                        }
                      }}
                      disabled={actionLoading}
                      className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 py-2.5 px-4 text-xs font-bold uppercase tracking-wider text-amber-300 hover:bg-rose-500/15 hover:text-rose-300 hover:border-rose-500/30 transition"
                      title="Clique para cancelar solicitação"
                    >
                      {actionLoading ? (
                        <LoaderCircle size={14} className="animate-spin" />
                      ) : (
                        'Solicitação Enviada ⏳'
                      )}
                    </button>
                  ) : status.isPendingReceived ? (
                    <div className="flex-1 flex items-center gap-1.5">
                      <button
                        onClick={async () => {
                          if (actionLoading) return
                          setActionLoading(true)
                          try {
                            await acceptFriendRequest(targetUser)
                            setStatus((prev) => ({
                              ...prev,
                              isFollowing: true,
                              isFollower: true,
                              isMutual: true,
                              isPendingReceived: false,
                            }))
                            setStats((prev) => ({
                              ...prev,
                              friendsCount: prev.friendsCount + 1,
                            }))
                          } finally {
                            setActionLoading(false)
                          }
                        }}
                        disabled={actionLoading}
                        className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500 py-2.5 px-3 text-xs font-bold uppercase tracking-wider text-slate-950 hover:bg-emerald-400 transition"
                      >
                        {actionLoading ? <LoaderCircle size={14} className="animate-spin" /> : 'Aceitar Amizade'}
                      </button>
                      <button
                        onClick={async () => {
                          if (actionLoading) return
                          setActionLoading(true)
                          try {
                            await rejectFriendRequest(targetUser.id)
                            setStatus((prev) => ({ ...prev, isPendingReceived: false }))
                          } finally {
                            setActionLoading(false)
                          }
                        }}
                        disabled={actionLoading}
                        className="rounded-xl border border-white/10 bg-slate-800 p-2.5 text-slate-400 hover:text-white transition"
                        title="Ignorar pedido"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={async () => {
                        if (actionLoading) return
                        setActionLoading(true)
                        try {
                          await sendFriendRequest(targetUser)
                          setStatus((prev) => ({ ...prev, isPendingSent: true }))
                        } finally {
                          setActionLoading(false)
                        }
                      }}
                      disabled={actionLoading || status.isBlocked}
                      className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-electric/40 bg-electric py-2.5 px-4 text-xs font-bold uppercase tracking-wider text-slate-950 hover:bg-electric/90 transition shadow-neon"
                    >
                      {actionLoading ? (
                        <LoaderCircle size={14} className="animate-spin" />
                      ) : (
                        <>
                          <UserPlus size={14} />
                          Adicionar Amigo
                        </>
                      )}
                    </button>
                  )}

                  {/* Enviar Mensagem Direta */}
                  <button
                    onClick={handleStartChat}
                    disabled={status.isBlocked}
                    className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition ${
                      status.isMutual
                        ? 'border-white/10 bg-slate-900 text-slate-200 hover:border-electric/30 hover:bg-slate-800 hover:text-white'
                        : 'border-white/5 bg-slate-950/50 text-slate-500 hover:border-amber-400/30 hover:text-slate-300'
                    }`}
                    title={
                      status.isMutual
                        ? 'Enviar mensagem direta'
                        : 'DM bloqueada: vocês precisam ser amigos mútuos'
                    }
                  >
                    <MessageCircle size={15} className={status.isMutual ? 'text-electric' : 'text-slate-500'} />
                    <span>Mensagem</span>
                  </button>
                </div>

                {/* Botão Ver Estante de Jogos */}
                <button
                  type="button"
                  onClick={() => {
                    onClose?.()
                    onOpenShelf?.(targetUser)
                  }}
                  className="w-full flex items-center justify-center gap-2 rounded-xl border border-gold/30 bg-gold/10 py-2.5 px-4 text-xs font-bold uppercase tracking-wider text-gold hover:bg-gold/20 transition"
                >
                  <Archive size={15} />
                  <span>Ver Estante de Jogos 🎮</span>
                </button>

                {!status.isMutual && (
                  <p className="text-center text-[10px] text-slate-500">
                    🔒 Mensagens diretas são liberadas quando ambos se adicionam como amigos.
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => {
                    onClose?.()
                    onOpenShelf?.(null)
                  }}
                  className="w-full flex items-center justify-center gap-2 rounded-xl border border-gold/30 bg-gold/10 py-2.5 px-4 text-xs font-bold uppercase tracking-wider text-gold hover:bg-gold/20 transition"
                >
                  <Archive size={15} />
                  <span>Abrir Minha Estante 🎮</span>
                </button>
                <p className="text-center text-xs text-slate-500 py-1">Este é o seu próprio perfil público.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de Denúncia */}
      <ReportUserModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        targetUser={targetUser}
      />
    </>
  )
}

