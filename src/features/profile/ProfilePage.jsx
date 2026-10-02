import { ArrowLeft, Check, Clock3, Edit3, ExternalLink, LoaderCircle, MessageCircle, ShieldAlert, Sparkles, Trophy, Unlink, User, UserMinus, UserPlus, Users, Zap } from 'lucide-react'
import { useEffect, useState } from 'react'
import { disconnectRetroAchievements, getDaysUntilNameChangeAllowed, updateUserNick } from './profileService'
import RetroAchievementsConnectModal from '../retro-achievements/RetroAchievementsConnectModal'
import { getLevelInfo } from '../gamification/xpService'
import { getUserSocialStats, listUserConnections, unfollowUser } from '../social/friendService'

export default function ProfilePage({ userProfile, onBack, onProfileUpdated, onOpenDirectChat }) {
  const [newNick, setNewNick] = useState(userProfile?.displayName || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isRaModalOpen, setIsRaModalOpen] = useState(false)
  const [disconnectingRa, setDisconnectingRa] = useState(false)
  const [socialStats, setSocialStats] = useState({ followersCount: 0, followingCount: 0, friendsCount: 0 })
  const [connections, setConnections] = useState({ following: [], followers: [] })
  const [connectionTab, setConnectionTab] = useState('following')

  useEffect(() => {
    if (!userProfile?.id) return
    getUserSocialStats(userProfile.id).then(setSocialStats)
    listUserConnections(userProfile.id).then(setConnections)
  }, [userProfile?.id])

  const levelInfo = getLevelInfo(userProfile?.xp || 0)
  async function handleDisconnectRa() {
    if (!userProfile?.id || disconnectingRa) return
    setDisconnectingRa(true)
    try {
      await disconnectRetroAchievements(userProfile.id, userProfile.retroAchievementsUsername)
      onProfileUpdated?.({
        ...userProfile,
        retroAchievementsUsername: null,
        retroAchievementsPoints: null,
        retroAchievementsRank: null,
        retroAchievementsConnectedAt: null,
      })
    } catch (err) {
      console.warn('Erro ao desconectar RA:', err)
    } finally {
      setDisconnectingRa(false)
    }
  }

  const daysRemaining = getDaysUntilNameChangeAllowed(userProfile?.lastNameChangeAt)
  const canChangeName = daysRemaining === 0

  async function handleSubmit(e) {
    e.preventDefault()
    if (!canChangeName || saving) return
    setError('')
    setSuccess('')
    setSaving(true)

    try {
      const updated = await updateUserNick(userProfile.id || userProfile.uid, newNick)
      setSuccess('Nome de usuário atualizado com sucesso!')
      onProfileUpdated?.(updated)
    } catch (err) {
      setError(err.message || 'Não foi possível atualizar o nome de usuário.')
    } finally {
      setSaving(false)
    }
  }

  const avatarUrl = userProfile?.avatarUrl || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(userProfile?.displayName || 'Jogador')}`

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:py-8">
      <button onClick={onBack} className="mb-6 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 transition hover:text-electric">
        <ArrowLeft size={14} /> Voltar para o início
      </button>

      <header className="mb-8 rounded-3xl border border-white/10 bg-panel p-6 shadow-neon sm:p-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
          <div className="relative">
            <img
              className="h-24 w-24 rounded-2xl border-4 border-neon bg-purple-950/60 shadow-pixel object-cover"
              src={avatarUrl}
              alt={`Avatar de ${userProfile?.displayName || 'Jogador'}`}
            />
            <span className="absolute -bottom-2 -right-2 rounded-lg border border-gold/40 bg-gold/20 p-1.5 text-gold backdrop-blur">
              <Sparkles size={14} />
            </span>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-pixel text-xl sm:text-2xl text-white truncate">
                {userProfile?.displayName || 'Jogador'}
              </h1>
              <span className="rounded-full border border-electric/30 bg-electric/10 px-3 py-1 text-[9px] font-bold uppercase tracking-wider text-electric">
                Nível {levelInfo.level}
              </span>
              <span className="rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-[9px] font-bold uppercase tracking-wider text-gold">
                {levelInfo.icon} {levelInfo.rank}
              </span>
            </div>

            <p className="mt-2 text-xs text-slate-400 truncate">
              {userProfile?.email || 'Acesso local / Demo'}
            </p>

            {/* Barra de Progresso de Nível e XP */}
            <div className="mt-4 max-w-md space-y-1.5">
              <div className="flex items-center justify-between text-[10px] text-slate-400">
                <span className="font-pixel text-white">Nível {levelInfo.level}</span>
                <span className="font-pixel text-gold">
                  {levelInfo.isMaxLevel ? 'Nível Máximo!' : `${levelInfo.currentLevelProgressXp} / ${levelInfo.xpNeededThisLevel} XP`}
                </span>
                {!levelInfo.isMaxLevel && (
                  <span className="font-pixel text-slate-400">Nível {levelInfo.level + 1}</span>
                )}
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-slate-950/80 border border-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-electric via-neon to-gold transition-all duration-500 shadow-neon"
                  style={{ width: `${levelInfo.progressPercent}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-500">
                <span>{levelInfo.totalXp} XP Total</span>
                {!levelInfo.isMaxLevel && (
                  <span>
                    Faltam <strong className="text-electric font-pixel">{levelInfo.xpToNextLevel} XP</strong> para subir
                  </span>
                )}
              </div>
            </div>

            {/* Contadores Sociais */}
            <div className="mt-4 flex items-center gap-6 border-t border-white/5 pt-3.5 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-pixel text-sm text-white">{socialStats.followersCount}</span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Seguidores</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-pixel text-sm text-white">{socialStats.followingCount}</span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Seguindo</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-pixel text-sm text-emerald-400">{socialStats.friendsCount}</span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Amigos Mútuos 🤝</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          {/* Conexões e Amizades */}
          <section className="rounded-3xl border border-white/10 bg-panel p-6 sm:p-7 shadow-pixel">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="rounded-xl border border-purple-400/30 bg-purple-500/10 p-2.5 text-purple-300">
                  <Users size={18} />
                </span>
                <div>
                  <h3 className="font-pixel text-xs text-white">Conexões & Amizades</h3>
                  <p className="mt-1 text-[11px] text-slate-400">Jogadores que você segue e seus seguidores</p>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex rounded-xl border border-white/10 bg-slate-950/40 p-1 text-xs">
                <button
                  type="button"
                  onClick={() => setConnectionTab('following')}
                  className={`rounded-lg px-3 py-1.5 font-bold transition text-[10px] uppercase tracking-wider ${
                    connectionTab === 'following'
                      ? 'bg-purple-500/20 text-purple-200 border border-purple-500/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Seguindo ({connections.following.length})
                </button>
                <button
                  type="button"
                  onClick={() => setConnectionTab('followers')}
                  className={`rounded-lg px-3 py-1.5 font-bold transition text-[10px] uppercase tracking-wider ${
                    connectionTab === 'followers'
                      ? 'bg-purple-500/20 text-purple-200 border border-purple-500/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Seguidores ({connections.followers.length})
                </button>
              </div>
            </div>

            <div className="mt-6 divide-y divide-white/5">
              {(connectionTab === 'following' ? connections.following : connections.followers).length === 0 ? (
                <p className="py-6 text-center text-xs text-slate-500">
                  {connectionTab === 'following'
                    ? 'Você ainda não está seguindo nenhum jogador.'
                    : 'Nenhum seguidor até o momento.'}
                </p>
              ) : (
                (connectionTab === 'following' ? connections.following : connections.followers).map((user) => (
                  <div key={user.id} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={user.avatarUrl}
                        alt=""
                        className="h-10 w-10 rounded-xl bg-slate-900 border border-white/10 object-cover shrink-0"
                      />
                      <div className="min-w-0 truncate">
                        <p className="text-xs font-bold text-white truncate">{user.displayName}</p>
                        <p className="text-[10px] text-slate-500">Nível {user.level || 1} • {user.rank || 'Jogador'}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => onOpenDirectChat?.(user)}
                        className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-slate-900 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-200 hover:bg-white/10 hover:text-white transition"
                      >
                        <MessageCircle size={12} className="text-electric" />
                        Conversar
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          await unfollowUser(user.id)
                          setConnections((prev) => ({
                            following: prev.following.filter((f) => f.id !== user.id),
                            followers: prev.followers.filter((f) => f.id !== user.id),
                          }))
                          setSocialStats((prev) => ({
                            ...prev,
                            friendsCount: Math.max(0, prev.friendsCount - 1),
                            followingCount: Math.max(0, prev.followingCount - 1),
                          }))
                        }}
                        className="rounded-lg border border-rose-500/20 bg-rose-500/10 p-1.5 text-rose-300 hover:bg-rose-500/20 transition"
                        title="Desfazer amizade"
                      >
                        <UserMinus size={13} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-panel p-6 sm:p-7 shadow-pixel">
          <div className="flex items-center gap-3">
            <span className="rounded-xl border border-electric/30 bg-electric/10 p-2.5 text-electric">
              <Edit3 size={18} />
            </span>
            <div>
              <h2 className="font-pixel text-xs text-white">Identidade no Clube</h2>
              <p className="mt-1 text-[11px] text-slate-400">Personalize seu Nickname na comunidade</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Nome de Usuário (Nick)
              </label>
              <input
                type="text"
                value={newNick}
                onChange={(e) => setNewNick(e.target.value)}
                disabled={!canChangeName || saving}
                minLength={3}
                maxLength={25}
                required
                className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm font-bold text-white outline-none focus:border-electric/50 disabled:opacity-60 disabled:cursor-not-allowed"
                placeholder="Seu nick aqui"
              />
            </div>

            <div className={`rounded-2xl border p-4 ${canChangeName ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-amber-500/20 bg-amber-500/5'}`}>
              <div className="flex items-start gap-3">
                {canChangeName ? (
                  <Check size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <Clock3 size={16} className="text-amber-400 shrink-0 mt-0.5" />
                )}
                <div>
                  <p className={`text-xs font-bold ${canChangeName ? 'text-emerald-300' : 'text-amber-300'}`}>
                    {canChangeName ? 'Alteração permitida' : `Bloqueado por mais ${daysRemaining} ${daysRemaining === 1 ? 'dia' : 'dias'}`}
                  </p>
                  <p className="mt-1 text-[11px] leading-5 text-slate-400">
                    {canChangeName
                      ? 'Você pode alterar seu nick agora. Após salvar, uma nova alteração só será permitida após 3 meses.'
                      : 'Para manter a integridade da comunidade e o reconhecimento entre membros, o nome de usuário só pode ser alterado a cada 90 dias.'}
                  </p>
                </div>
              </div>
            </div>

            {error && (
              <p className="rounded-xl border border-rose-300/20 bg-rose-300/10 px-4 py-3 text-xs text-rose-200">
                {error}
              </p>
            )}

            {success && (
              <p className="rounded-xl border border-emerald-300/20 bg-emerald-300/10 px-4 py-3 text-xs text-emerald-200">
                {success}
              </p>
            )}

            <button
              type="submit"
              disabled={!canChangeName || saving || newNick.trim() === userProfile?.displayName}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-electric/40 bg-electric/15 px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-electric transition hover:bg-electric/25 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {saving && <LoaderCircle size={15} className="animate-spin" />}
              {saving ? 'Atualizando...' : 'Salvar Alteração'}
            </button>
          </form>
        </section>

      </div>

      <aside className="space-y-6">
          {/* RetroAchievements Integration Card */}
          <section className="rounded-3xl border border-gold/30 bg-panel p-6 shadow-pixel relative overflow-hidden">
            <div className="flex items-center gap-3">
              <span className="rounded-xl border border-gold/40 bg-gold/15 p-2.5 text-gold">
                <Trophy size={18} />
              </span>
              <div>
                <h3 className="font-pixel text-xs text-white">RetroAchievements</h3>
                <p className="mt-1 text-[10px] text-slate-400">Sincronização de Conquistas</p>
              </div>
            </div>

            {userProfile?.retroAchievementsUsername ? (
              <div className="mt-5 space-y-4">
                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Conectado</p>
                      <p className="mt-1 text-sm font-bold text-white font-mono">
                        {userProfile.retroAchievementsUsername}
                      </p>
                    </div>
                    <span className="rounded-full bg-emerald-400/10 px-2.5 py-1 text-[9px] font-bold uppercase text-emerald-300 border border-emerald-400/20">
                      Ativo
                    </span>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-3 text-[10px] text-slate-400 border-t border-white/5 pt-2.5">
                    <div className="flex items-center gap-2">
                      <span>Pontos: <strong className="text-gold">{userProfile.retroAchievementsPoints || 0}</strong></span>
                      <span>•</span>
                      <span>{userProfile.retroAchievementsRank || 'Jogador'}</span>
                    </div>
                    <a
                      href={`https://retroachievements.org/user/${userProfile.retroAchievementsUsername}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 text-electric hover:underline text-[9px] shrink-0"
                      title="Abrir perfil oficial no RetroAchievements"
                    >
                      <span>Perfil RA</span>
                      <ExternalLink size={10} />
                    </a>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsRaModalOpen(true)}
                    className="flex-1 rounded-xl border border-white/10 bg-slate-900 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-300 hover:bg-slate-800 transition"
                  >
                    Trocar Conta
                  </button>
                  <button
                    type="button"
                    onClick={handleDisconnectRa}
                    disabled={disconnectingRa}
                    className="flex items-center justify-center rounded-xl border border-rose-400/30 bg-rose-400/10 px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-rose-300 hover:bg-rose-400/20 transition disabled:opacity-40"
                    title="Desconectar conta do RetroAchievements"
                  >
                    {disconnectingRa ? <LoaderCircle size={14} className="animate-spin" /> : <Unlink size={14} />}
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                <p className="text-[11px] leading-5 text-slate-400">
                  Vincule sua conta para desbloquear conquistas em tempo real enquanto joga e marcar automaticamente quando zerar.
                </p>
                <button
                  type="button"
                  onClick={() => setIsRaModalOpen(true)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-gold/40 bg-gold/15 py-3 text-[10px] font-bold uppercase tracking-wider text-gold hover:bg-gold/25 transition"
                >
                  <Sparkles size={14} /> Conectar RetroAchievements
                </button>
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-white/10 bg-panel p-6 shadow-pixel">
            <h3 className="font-pixel text-[10px] uppercase tracking-wider text-slate-400">Regras de Comunidade</h3>
            <ul className="mt-4 space-y-3 text-[11px] leading-5 text-slate-400">
              <li className="flex items-start gap-2">
                <span className="text-neon">•</span>
                <span>Seu nick é usado nas mensagens de chat, checkpoints, desafios e feed da comunidade.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-neon">•</span>
                <span>O avatar pixel-art em estilo retro é atualizado automaticamente combinando com o seu novo nick.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-neon">•</span>
                <span>Nicks ofensivos podem levar à suspensão do clube pelos administradores.</span>
              </li>
            </ul>
          </section>
        </aside>
      </div>

      <RetroAchievementsConnectModal
        isOpen={isRaModalOpen}
        onClose={() => setIsRaModalOpen(false)}
        userProfile={userProfile}
        onConnected={(data) => {
          onProfileUpdated?.({ ...userProfile, ...data })
        }}
      />
    </div>
  )
}

