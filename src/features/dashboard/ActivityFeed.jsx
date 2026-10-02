import {
  Camera,
  ChevronRight,
  Gamepad2,
  Globe,
  Heart,
  Lightbulb,
  Lock,
  Maximize2,
  MessageSquare,
  Sparkles,
  Trophy,
  Users,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import {
  isPostVisibleToUser,
  subscribeToFeed,
  toggleFeedLike,
} from '../feed/activityService'
import { getCurrentUser, openAuthModal } from '../auth/authService'
import { listMutualFriends } from '../social/friendService'
import { listMyClubs } from '../clubs/clubService'

export default function ActivityFeed({
  onAction,
  onOpenDirectChat,
  onOpenUserProfile,
  onOpenGameRoom,
  onNavigate,
}) {
  const [feed, setFeed] = useState([])
  const [filter, setFilter] = useState('all') // 'all' | 'screenshots' | 'achievements' | 'invites'
  const [friendIds, setFriendIds] = useState([])
  const [clubIds, setClubIds] = useState([])

  const currentUser = getCurrentUser()

  useEffect(() => {
    const unsub = subscribeToFeed(setFeed, { maxItems: 50 })

    if (currentUser?.id) {
      listMutualFriends(currentUser.id)
        .then((friends) => setFriendIds(friends.map((f) => f.id)))
        .catch(() => {})

      listMyClubs()
        .then((clubs) => setClubIds(clubs.map((c) => c.id)))
        .catch(() => {})
    }

    return () => unsub()
  }, [currentUser?.id])

  // Filtra por privacidade e pela aba selecionada
  const filteredFeed = useMemo(() => {
    return feed
      .filter((item) => isPostVisibleToUser(item, currentUser?.id, friendIds, clubIds))
      .filter((item) => {
        if (filter === 'screenshots') return item.type === 'screenshot' || Boolean(item.imageUrl)
        if (filter === 'achievements') return item.type === 'achievement' || item.type === 'game_beaten'
        if (filter === 'invites') return item.type === 'room_invite' || item.type === 'club_invite'
        return true
      })
  }, [feed, filter, currentUser?.id, friendIds, clubIds])

  const handleLike = async (activityId) => {
    if (!currentUser?.id) {
      openAuthModal()
      return
    }

    setFeed((prevFeed) =>
      prevFeed.map((post) => {
        if (post.id !== activityId) return post
        const currentLikes = Array.isArray(post.likes)
          ? [...post.likes]
          : Array.isArray(post.reactions?.['❤️'])
          ? [...post.reactions['❤️']]
          : []
        const alreadyLiked = currentLikes.includes(currentUser.id)
        const newLikes = alreadyLiked
          ? currentLikes.filter((uid) => uid !== currentUser.id)
          : [...currentLikes, currentUser.id]
        return {
          ...post,
          likes: newLikes,
          reactions: { ...(post.reactions || {}), '❤️': newLikes },
        }
      })
    )

    try {
      await toggleFeedLike(activityId)
    } catch (err) {
      console.warn('Erro ao curtir post:', err)
    }
  }

  const formatRelativeTime = (date) => {
    if (!date) return ''
    const diff = Date.now() - new Date(date).getTime()
    const minutes = Math.floor(diff / 60000)
    if (minutes < 1) return 'agora'
    if (minutes < 60) return `${minutes}m`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h`
    const days = Math.floor(hours / 24)
    return `${days}d`
  }

  return (
    <section id="activity-feed" className="flex min-h-0 flex-1 flex-col rounded-3xl border border-white/8 bg-panel p-4 sm:p-5 shadow-pixel">
      {/* Cabeçalho do Feed Compacto */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5">
            <h2 className="font-pixel text-xs text-white">Feed</h2>
            <span className="rounded bg-electric/15 px-1.5 py-0.5 font-pixel text-[8px] text-electric">
              AO VIVO
            </span>
          </div>
          <p className="mt-0.5 text-[10px] text-slate-500">Atividades e capturas da comunidade</p>
        </div>

        {/* Botão Abrir Feed Expandido */}
        <button
          type="button"
          onClick={() => onNavigate?.('feed')}
          className="flex items-center gap-1.5 rounded-xl bg-electric/15 border border-electric/40 px-3 py-1.5 text-[10px] font-bold text-electric transition hover:bg-electric/25 shadow-neon shrink-0"
          title="Abrir feed expandido"
        >
          <Maximize2 size={12} />
          <span>Abrir feed</span>
        </button>
      </div>

      {/* Filtros de Categoria (grid perfeito sem scrollbar) */}
      <div className="mt-3.5 grid grid-cols-4 gap-1 text-[10px] font-bold">
        <button
          type="button"
          onClick={() => setFilter('all')}
          className={`rounded-lg py-1 px-1 text-center transition truncate ${
            filter === 'all'
              ? 'bg-white/10 text-white font-bold'
              : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          Todos
        </button>
        <button
          type="button"
          onClick={() => setFilter('screenshots')}
          className={`flex items-center justify-center gap-1 rounded-lg py-1 px-1 text-center transition truncate ${
            filter === 'screenshots'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
              : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <Camera size={11} /> Fotos
        </button>
        <button
          type="button"
          onClick={() => setFilter('achievements')}
          className={`flex items-center justify-center gap-1 rounded-lg py-1 px-1 text-center transition truncate ${
            filter === 'achievements'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <Trophy size={11} /> Conquistas
        </button>
        <button
          type="button"
          onClick={() => setFilter('invites')}
          className={`flex items-center justify-center gap-1 rounded-lg py-1 px-1 text-center transition truncate ${
            filter === 'invites'
              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
              : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <Gamepad2 size={11} /> Convites
        </button>
      </div>

      {/* Lista de Postagens Compacta com Rolagem Infinita */}
      <div className="mt-3.5 flex-1 space-y-3 overflow-y-auto pr-1 max-h-[calc(100vh-230px)]">
        {filteredFeed.length === 0 ? (
          <div className="py-10 text-center text-slate-500">
            <p className="font-pixel text-[10px]">Nenhuma atividade por enquanto</p>
            <p className="mt-1 text-[10px] text-slate-600">
              Desbloqueie conquistas, jogue partidas ou abra o feed para postar!
            </p>
            <button
              type="button"
              onClick={() => onNavigate?.('feed')}
              className="mt-3 text-[10px] font-bold text-electric hover:underline inline-flex items-center gap-1"
            >
              <span>Abrir feed completo</span>
              <ChevronRight size={12} />
            </button>
          </div>
        ) : (
          filteredFeed.map((item) => {
            const openProfile = () =>
              onOpenUserProfile?.({
                id: item.authorId || item.author,
                displayName: item.author,
                avatarUrl: item.avatarUrl,
              })

            const isLiked = Array.isArray(item.likes)
              ? item.likes.includes(currentUser?.id)
              : Array.isArray(item.reactions?.['❤️'])
              ? item.reactions['❤️'].includes(currentUser?.id)
              : false

            const likeCount = (Array.isArray(item.likes) ? item.likes.length : 0) ||
              (Array.isArray(item.reactions?.['❤️']) ? item.reactions['❤️'].length : 0)

            // Descrição da ação formatada para modo texto
            const actionText = item.type === 'screenshot' || item.imageUrl
              ? 'postou uma foto'
              : item.type === 'achievement'
              ? 'desbloqueou uma conquista'
              : item.type === 'room_invite'
              ? 'convidou para jogar'
              : item.type === 'club_invite'
              ? 'convidou para o clube'
              : item.action || 'publicou'

            return (
              <article
                key={item.id}
                className="rounded-2xl border border-white/8 bg-slate-950/40 p-3 transition hover:border-white/15"
              >
                {/* Header do Card Compacto */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <img
                      onClick={openProfile}
                      className="h-7 w-7 shrink-0 cursor-pointer rounded-lg bg-slate-950 object-cover ring-1 ring-white/10 transition hover:ring-electric"
                      src={item.avatarUrl}
                      alt=""
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1 flex-wrap">
                        <strong
                          onClick={openProfile}
                          className="cursor-pointer font-bold text-xs text-slate-200 transition hover:text-electric truncate"
                        >
                          {item.author}
                        </strong>
                        <span className="text-[10px] text-slate-500 truncate">{actionText}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[9px] text-slate-500">
                        <span>{formatRelativeTime(item.createdAt)}</span>
                        {item.visibility === 'restricted' && (
                          <span className="flex items-center gap-0.5 text-slate-400" title="Restrito (Amigos e Clubes)">
                            <Users size={9} />
                          </span>
                        )}
                        {item.visibility === 'friends' && (
                          <span className="flex items-center gap-0.5 text-slate-400" title="Apenas Amigos">
                            <Lock size={9} />
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {item.gameTitle && (
                    <span className="rounded bg-slate-900 border border-white/10 px-1.5 py-0.5 font-pixel text-[7.5px] uppercase tracking-wider text-slate-400 truncate max-w-[100px]">
                      {item.gameTitle}
                    </span>
                  )}
                </div>

                {/* Texto da publicação (se houver e não for foto) */}
                {item.text && !item.imageUrl && (
                  <p className="mt-2 text-xs text-slate-300 leading-relaxed break-words line-clamp-3">
                    {item.text}
                  </p>
                )}

                {/* Indicativo de Foto (Sem renderizar imagem pesada no modo compacto) */}
                {item.imageUrl && (
                  <div
                    onClick={() => onNavigate?.('feed')}
                    className="mt-2 flex items-center gap-2 rounded-xl border border-cyan-500/25 bg-cyan-500/10 p-2 cursor-pointer hover:bg-cyan-500/15 transition group"
                    title="Ver foto no feed expandido"
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-500/20 text-cyan-300 shrink-0 group-hover:scale-105 transition">
                      <Camera size={14} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-bold text-slate-200 group-hover:text-cyan-300 transition truncate">
                        {item.text || 'Foto capturada no emulador'}
                      </p>
                      <p className="text-[9px] text-cyan-400/80">Toque para ver a foto no Feed</p>
                    </div>
                    <ChevronRight size={14} className="text-slate-500 group-hover:text-cyan-300 transition shrink-0" />
                  </div>
                )}

                {/* Conquista Desbloqueada (Modo Compacto) */}
                {item.type === 'achievement' && (
                  <div className="mt-2 flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/20 text-gold shrink-0">
                      <Trophy size={14} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-pixel text-[9px] text-gold truncate">
                        {item.achievement || 'Conquista'}
                      </p>
                      {item.gameTitle && (
                        <p className="text-[9px] text-slate-400 truncate">
                          em <strong className="text-white">{item.gameTitle}</strong>
                        </p>
                      )}
                    </div>
                    {item.points > 0 && (
                      <span className="font-pixel text-[8px] text-amber-300 shrink-0">
                        +{item.points} pts
                      </span>
                    )}
                  </div>
                )}

                {/* Convite de Sala (Modo Compacto) */}
                {item.type === 'room_invite' && (
                  <div className="mt-2 flex items-center justify-between gap-2 rounded-xl border border-electric/30 bg-electric/10 p-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Gamepad2 size={16} className="text-electric shrink-0" />
                      <p className="text-[11px] font-bold text-white truncate">
                        {item.gameTitle || item.roomName || 'Sala de Jogo'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onOpenGameRoom?.({ id: item.roomId, gameTitle: item.gameTitle })}
                      className="rounded-lg bg-electric px-2.5 py-1 font-pixel text-[8px] font-bold text-slate-950 hover:bg-electric/90 transition shrink-0"
                    >
                      Entrar
                    </button>
                  </div>
                )}

                {/* Convite de Clube (Modo Compacto) */}
                {item.type === 'club_invite' && (
                  <div className="mt-2 flex items-center justify-between gap-2 rounded-xl border border-purple-500/30 bg-purple-500/10 p-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Users size={16} className="text-purple-300 shrink-0" />
                      <p className="text-[11px] font-bold text-white truncate">
                        [{item.clubTag || 'CLUBE'}] {item.clubName || 'Clube'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onNavigate?.('clubs')}
                      className="rounded-lg border border-purple-400/40 bg-purple-500/20 px-2.5 py-1 font-pixel text-[8px] font-bold text-purple-200 hover:bg-purple-500/30 transition shrink-0"
                    >
                      Ver
                    </button>
                  </div>
                )}

                {/* Rodapé: Apenas Coração (❤️) e Comentários (💬) */}
                <div className="mt-2.5 flex items-center gap-4 pt-2 border-t border-white/5 text-[11px]">
                  {/* Curtir (❤️) */}
                  <button
                    type="button"
                    onClick={() => handleLike(item.id)}
                    className={`flex items-center gap-1 transition ${
                      isLiked ? 'text-rose-500' : 'text-slate-400 hover:text-rose-400'
                    }`}
                    title={isLiked ? 'Descurtir' : 'Curtir'}
                  >
                    <Heart
                      size={14}
                      className={`transition-transform duration-150 active:scale-125 ${
                        isLiked ? 'fill-rose-500 text-rose-500' : ''
                      }`}
                    />
                    {likeCount > 0 && <span className="text-[10px] font-bold">{likeCount}</span>}
                  </button>

                  {/* Comentar (💬) -> abre o feed expandido */}
                  <button
                    type="button"
                    onClick={() => onNavigate?.('feed')}
                    className="flex items-center gap-1 text-slate-400 hover:text-electric transition"
                    title="Abrir no feed para ver comentários"
                  >
                    <MessageSquare size={14} />
                    {item.commentCount > 0 && (
                      <span className="text-[10px] font-bold">{item.commentCount}</span>
                    )}
                  </button>
                </div>
              </article>
            )
          })
        )}
      </div>
    </section>
  )
}
