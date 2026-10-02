import {
  ArrowLeft,
  Camera,
  Check,
  ChevronRight,
  Flame,
  Gamepad2,
  Globe,
  Heart,
  Image as ImageIcon,
  Lightbulb,
  Lock,
  Maximize2,
  MessageCircle,
  MessageSquare,
  Plus,
  Send,
  Share2,
  Shield,
  Sparkles,
  Trophy,
  Users,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { getCurrentUser } from '../auth/authService'
import {
  addCommentToFeedPost,
  createFeedPost,
  isPostVisibleToUser,
  subscribeToFeed,
  subscribeToFeedPostComments,
  toggleFeedLike,
} from './activityService'
import { listMutualFriends } from '../social/friendService'
import { listMyClubs } from '../clubs/clubService'
import { listMyScreenshots } from '../emulator/screenshotStorage'

/**
 * Componente individual de Comentários de um Post
 */
function PostCommentsSection({ activityId, currentUser, onOpenUserProfile }) {
  const [comments, setComments] = useState([])
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!activityId) return
    const unsub = subscribeToFeedPostComments(activityId, setComments)
    return () => unsub()
  }, [activityId])

  const handleSend = async (e) => {
    e.preventDefault()
    if (!text.trim() || submitting) return
    setSubmitting(true)
    try {
      await addCommentToFeedPost(activityId, text)
      setText('')
    } catch (err) {
      alert(err.message || 'Erro ao enviar comentário.')
    } finally {
      setSubmitting(false)
    }
  }

  const formatCommentTime = (date) => {
    if (!date) return ''
    const diff = Date.now() - new Date(date).getTime()
    const minutes = Math.floor(diff / 60000)
    if (minutes < 1) return 'agora'
    if (minutes < 60) return `${minutes}m`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h`
    return `${Math.floor(hours / 24)}d`
  }

  return (
    <div className="mt-4 border-t border-white/5 pt-3 space-y-3">
      {/* Lista de comentários */}
      <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
        {comments.length === 0 ? (
          <p className="text-[11px] text-slate-500 py-1 italic">
            Nenhum comentário ainda. Seja o primeiro a comentar!
          </p>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="flex items-start gap-2 text-xs">
              <img
                onClick={() => onOpenUserProfile?.({ id: comment.authorId, displayName: comment.author })}
                src={comment.avatarUrl || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(comment.author || 'Jogador')}`}
                alt=""
                className="h-6 w-6 shrink-0 rounded-full bg-slate-950 object-cover cursor-pointer hover:ring-1 hover:ring-electric"
              />
              <div className="min-w-0 flex-1 rounded-xl bg-slate-900/60 p-2 border border-white/5">
                <div className="flex items-baseline justify-between gap-1">
                  <span
                    onClick={() => onOpenUserProfile?.({ id: comment.authorId, displayName: comment.author })}
                    className="font-bold text-[11px] text-slate-200 cursor-pointer hover:text-electric truncate"
                  >
                    {comment.author}
                  </span>
                  <span className="text-[9px] text-slate-500">
                    {formatCommentTime(comment.createdAt)}
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 mt-0.5 break-words whitespace-pre-line">
                  {comment.text}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Input de novo comentário */}
      {currentUser?.id ? (
        <form onSubmit={handleSend} className="flex items-center gap-2 pt-1">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Escreva um comentário..."
            className="flex-1 rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:border-electric focus:outline-none"
          />
          <button
            type="submit"
            disabled={!text.trim() || submitting}
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-electric text-slate-950 transition hover:bg-electric/90 disabled:opacity-40 disabled:cursor-not-allowed shadow-neon shrink-0"
            title="Enviar comentário"
          >
            <Send size={13} />
          </button>
        </form>
      ) : (
        <p className="text-[10px] text-slate-500">Faça login para comentar.</p>
      )}
    </div>
  )
}

export default function FeedPage({
  onBack,
  onOpenGameRoom,
  onOpenDirectChat,
  onOpenUserProfile,
  onNavigate,
}) {
  const [feed, setFeed] = useState([])
  const [filter, setFilter] = useState('all') // 'all' | 'screenshots' | 'achievements' | 'invites'
  const [friendIds, setFriendIds] = useState([])
  const [clubIds, setClubIds] = useState([])
  const [myClubs, setMyClubs] = useState([])

  // Modal de visualização de foto em alta definição
  const [previewImage, setPreviewImage] = useState(null)

  // Controle de expansão de comentários por post
  const [expandedComments, setExpandedComments] = useState({})

  // Post Composer
  const [postText, setPostText] = useState('')
  const [selectedScreenshot, setSelectedScreenshot] = useState(null)
  const [selectedVisibility, setSelectedVisibility] = useState('public')
  const [selectedClubId, setSelectedClubId] = useState('')
  const [isGalleryOpen, setIsGalleryOpen] = useState(false)
  const [myScreenshots, setMyScreenshots] = useState([])
  const [submittingPost, setSubmittingPost] = useState(false)
  const [postSuccessNotice, setPostSuccessNotice] = useState(false)

  const currentUser = getCurrentUser()

  useEffect(() => {
    const unsub = subscribeToFeed(setFeed, { maxItems: 60 })

    if (currentUser?.id) {
      listMutualFriends(currentUser.id)
        .then((friends) => setFriendIds(friends.map((f) => f.id)))
        .catch(() => {})

      listMyClubs()
        .then((clubs) => {
          setClubIds(clubs.map((c) => c.id))
          setMyClubs(clubs)
          if (clubs.length > 0) {
            setSelectedClubId(clubs[0].id)
          }
        })
        .catch(() => {})
    }

    return () => unsub()
  }, [currentUser?.id])

  const loadGallery = async () => {
    try {
      const items = await listMyScreenshots()
      setMyScreenshots(items)
      setIsGalleryOpen(true)
    } catch (err) {
      console.warn('Erro ao carregar galeria de fotos:', err)
    }
  }

  const handleCreatePost = async (e) => {
    e.preventDefault()
    if (!postText.trim() && !selectedScreenshot) return

    setSubmittingPost(true)
    try {
      const clubObj = myClubs.find((c) => c.id === selectedClubId)
      await createFeedPost({
        text: postText.trim(),
        imageUrl: selectedScreenshot?.dataUrl || null,
        gameTitle: selectedScreenshot?.gameTitle || null,
        visibility: selectedVisibility,
        clubId: selectedVisibility === 'club' ? selectedClubId : null,
        clubName: selectedVisibility === 'club' ? clubObj?.name : null,
      })

      setPostText('')
      setSelectedScreenshot(null)
      setPostSuccessNotice(true)
      setTimeout(() => setPostSuccessNotice(false), 3000)
    } catch (err) {
      alert(err.message || 'Erro ao publicar no feed.')
    } finally {
      setSubmittingPost(false)
    }
  }

  const handleLike = async (activityId) => {
    if (!currentUser?.id) {
      alert('Faça login para curtir postagens.')
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

  const toggleComments = (postId) => {
    setExpandedComments((prev) => ({
      ...prev,
      [postId]: !prev[postId],
    }))
  }

  const formatRelativeTime = (date) => {
    if (!date) return ''
    const diff = Date.now() - new Date(date).getTime()
    const minutes = Math.floor(diff / 60000)
    if (minutes < 1) return 'agora há pouco'
    if (minutes < 60) return `${minutes}m`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h`
    const days = Math.floor(hours / 24)
    return `${days}d`
  }

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

  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-20 text-slate-200">
      {/* Topo / Voltar */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-500 transition hover:text-electric"
        >
          <ArrowLeft size={15} />
          Voltar à Visão Geral
        </button>

        <div className="flex items-center gap-1.5 rounded-full border border-electric/30 bg-electric/10 px-3 py-1 text-[10px] font-bold text-electric">
          <Sparkles size={12} className="animate-pulse" />
          <span>Feed da Comunidade</span>
        </div>
      </div>

      {/* Caixa de Criação de Post (Estilo Twitter / X / Instagram) */}
      <div className="rounded-3xl border border-white/10 bg-panel p-5 sm:p-6 shadow-pixel">
        <form onSubmit={handleCreatePost} className="space-y-4">
          <div className="flex gap-3">
            <img
              src={currentUser?.avatarUrl || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(currentUser?.displayName || 'Jogador')}`}
              alt=""
              className="h-10 w-10 shrink-0 rounded-2xl border border-electric/30 bg-slate-950 object-cover"
            />
            <div className="min-w-0 flex-1">
              <textarea
                value={postText}
                onChange={(e) => setPostText(e.target.value)}
                placeholder="No que você está jogando ou pensando agora?"
                rows={3}
                className="w-full resize-none rounded-2xl border border-white/8 bg-slate-950/60 p-3 text-xs text-white placeholder:text-slate-500 focus:border-electric focus:outline-none"
              />

              {/* Pré-visualização de Screenshot anexada */}
              {selectedScreenshot && (
                <div className="relative mt-2 inline-block overflow-hidden rounded-2xl border border-electric/40 bg-black">
                  <img
                    src={selectedScreenshot.dataUrl}
                    alt="Foto anexada"
                    className="max-h-44 rounded-2xl object-contain"
                  />
                  <button
                    type="button"
                    onClick={() => setSelectedScreenshot(null)}
                    className="absolute right-2 top-2 rounded-full bg-black/80 p-1 text-white hover:bg-rose-500 transition"
                    title="Remover foto"
                  >
                    <X size={14} />
                  </button>
                  {selectedScreenshot.gameTitle && (
                    <span className="absolute bottom-2 left-2 rounded bg-black/80 px-2 py-0.5 font-pixel text-[8px] text-electric">
                      {selectedScreenshot.gameTitle}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Barra de Ferramentas do Post */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/5 pt-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={loadGallery}
                className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-slate-300 transition hover:border-electric/40 hover:text-white"
                title="Escolher captura autêntica do emulador"
              >
                <Camera size={14} className="text-electric" />
                <span>Foto do Emulador</span>
              </button>

              {/* Seletor de Privacidade */}
              <select
                value={selectedVisibility}
                onChange={(e) => setSelectedVisibility(e.target.value)}
                className="rounded-xl border border-white/10 bg-slate-950 px-2.5 py-1.5 text-xs font-bold text-slate-300 focus:border-electric focus:outline-none"
              >
                <option value="public">🌐 Público (Todos)</option>
                <option value="restricted">👥 Restrito (Amigos & Clubes)</option>
                <option value="friends">🤝 Apenas Amigos</option>
                {myClubs.length > 0 && <option value="club">🛡️ Apenas Clube</option>}
              </select>

              {selectedVisibility === 'club' && myClubs.length > 0 && (
                <select
                  value={selectedClubId}
                  onChange={(e) => setSelectedClubId(e.target.value)}
                  className="rounded-xl border border-purple-500/40 bg-slate-950 px-2.5 py-1.5 text-xs font-bold text-purple-300 focus:border-purple-400 focus:outline-none"
                >
                  {myClubs.map((club) => (
                    <option key={club.id} value={club.id}>
                      [{club.tag || 'CLUBE'}] {club.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <button
              type="submit"
              disabled={(!postText.trim() && !selectedScreenshot) || submittingPost}
              className="flex items-center gap-1.5 rounded-xl bg-electric px-5 py-2 font-pixel text-xs font-bold text-slate-950 transition hover:bg-electric/90 disabled:opacity-30 disabled:cursor-not-allowed shadow-neon"
            >
              <span>{submittingPost ? 'Postando...' : 'Publicar'}</span>
            </button>
          </div>

          {postSuccessNotice && (
            <p className="text-xs text-emerald-400 font-bold flex items-center gap-1">
              <Check size={14} /> Publicado com sucesso no feed!
            </p>
          )}
        </form>
      </div>

      {/* Abas de Filtros (Todos, Fotos, Conquistas, Convites) */}
      <div className="grid grid-cols-4 gap-2 text-xs font-bold">
        <button
          type="button"
          onClick={() => setFilter('all')}
          className={`rounded-2xl py-2.5 px-2 text-center transition ${
            filter === 'all'
              ? 'bg-white/10 text-white font-bold shadow-sm'
              : 'bg-panel/40 text-slate-400 hover:text-white border border-white/5'
          }`}
        >
          Todos
        </button>
        <button
          type="button"
          onClick={() => setFilter('screenshots')}
          className={`flex items-center justify-center gap-1.5 rounded-2xl py-2.5 px-2 text-center transition ${
            filter === 'screenshots'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
              : 'bg-panel/40 text-slate-400 hover:text-white border border-white/5'
          }`}
        >
          <Camera size={13} /> Fotos
        </button>
        <button
          type="button"
          onClick={() => setFilter('achievements')}
          className={`flex items-center justify-center gap-1.5 rounded-2xl py-2.5 px-2 text-center transition ${
            filter === 'achievements'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
              : 'bg-panel/40 text-slate-400 hover:text-white border border-white/5'
          }`}
        >
          <Trophy size={13} /> Conquistas
        </button>
        <button
          type="button"
          onClick={() => setFilter('invites')}
          className={`flex items-center justify-center gap-1.5 rounded-2xl py-2.5 px-2 text-center transition ${
            filter === 'invites'
              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 font-bold'
              : 'bg-panel/40 text-slate-400 hover:text-white border border-white/5'
          }`}
        >
          <Gamepad2 size={13} /> Convites
        </button>
      </div>

      {/* Stream Principal do Feed (Rolagem Infinita de Posts) */}
      <div className="space-y-5">
        {filteredFeed.length === 0 ? (
          <div className="rounded-3xl border border-white/5 bg-panel p-12 text-center text-slate-500">
            <Sparkles size={36} className="mx-auto text-slate-600 mb-2" />
            <p className="font-pixel text-xs text-white">Nenhuma publicação nesta categoria</p>
            <p className="mt-1 text-xs">Compartilhe um momento do seu jogo ou desbloqueie conquistas para movimentar o feed!</p>
          </div>
        ) : (
          filteredFeed.map((item) => {
            const isLiked = Array.isArray(item.likes)
              ? item.likes.includes(currentUser?.id)
              : Array.isArray(item.reactions?.['❤️'])
              ? item.reactions['❤️'].includes(currentUser?.id)
              : false

            const likeCount = (Array.isArray(item.likes) ? item.likes.length : 0) ||
              (Array.isArray(item.reactions?.['❤️']) ? item.reactions['❤️'].length : 0)

            const commentsOpen = Boolean(expandedComments[item.id])

            return (
              <article
                key={item.id}
                className="rounded-3xl border border-white/10 bg-panel p-5 sm:p-6 shadow-pixel transition hover:border-white/20"
              >
                {/* Header do Post: Avatar, Nome, Tempo, Privacidade */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      onClick={() => onOpenUserProfile?.({ id: item.authorId, displayName: item.author, avatarUrl: item.avatarUrl })}
                      src={item.avatarUrl}
                      alt=""
                      className="h-10 w-10 shrink-0 rounded-2xl bg-slate-950 object-cover ring-2 ring-white/10 cursor-pointer hover:ring-electric transition"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <strong
                          onClick={() => onOpenUserProfile?.({ id: item.authorId, displayName: item.author, avatarUrl: item.avatarUrl })}
                          className="cursor-pointer font-bold text-sm text-white hover:text-electric transition truncate"
                        >
                          {item.author}
                        </strong>
                        <span className="text-xs text-slate-400">{item.action}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                        <span>{formatRelativeTime(item.createdAt)}</span>
                        <span>·</span>
                        {item.visibility === 'public' && (
                          <span className="flex items-center gap-0.5 text-slate-400" title="Público">
                            <Globe size={11} /> Público
                          </span>
                        )}
                        {item.visibility === 'restricted' && (
                          <span className="flex items-center gap-0.5 text-cyan-400" title="Restrito a Amigos e Clubes">
                            <Users size={11} /> Amigos & Clubes
                          </span>
                        )}
                        {item.visibility === 'friends' && (
                          <span className="flex items-center gap-0.5 text-purple-400" title="Apenas Amigos">
                            <Lock size={11} /> Amigos
                          </span>
                        )}
                        {item.visibility === 'club' && (
                          <span className="flex items-center gap-0.5 text-amber-400" title={`Clube ${item.clubName || ''}`}>
                            <Shield size={11} /> {item.clubName || 'Clube'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {item.gameTitle && (
                    <span className="shrink-0 rounded-xl bg-slate-950 border border-white/10 px-2.5 py-1 font-pixel text-[8px] uppercase tracking-wider text-slate-300">
                      {item.gameTitle}
                    </span>
                  )}
                </div>

                {/* Texto do Post */}
                {item.text && (
                  <p className="mt-4 text-xs sm:text-sm text-slate-200 leading-relaxed break-words whitespace-pre-line">
                    {item.text}
                  </p>
                )}

                {/* Imagem do Post (Screenshot do Emulador) */}
                {item.imageUrl && (
                  <div
                    onClick={() => setPreviewImage(item.imageUrl)}
                    className="mt-4 relative cursor-pointer overflow-hidden rounded-2xl border border-white/10 bg-black group"
                  >
                    <img
                      src={item.imageUrl}
                      alt="Captura de jogo"
                      className="w-full max-h-[500px] object-contain transition group-hover:scale-[1.01]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition flex items-end justify-between p-3">
                      <span className="font-pixel text-[9px] text-white flex items-center gap-1">
                        <Maximize2 size={12} /> Clique para expandir foto
                      </span>
                    </div>
                  </div>
                )}

                {/* Conquista Desbloqueada Oficial RetroAchievements */}
                {item.type === 'achievement' && (
                  <div className="mt-4 flex items-center gap-4 rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-slate-950/70 to-slate-950 p-3.5 shadow-pixel">
                    {item.badgeUrl ? (
                      <img
                        src={item.badgeUrl}
                        alt=""
                        className="h-12 w-12 shrink-0 rounded-xl border border-amber-400/40 bg-slate-950 object-contain p-1 shadow-neon"
                      />
                    ) : (
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-amber-400/40 bg-amber-500/20 text-gold">
                        <Trophy size={24} />
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-pixel text-xs text-gold truncate">
                          {item.achievement || 'Conquista Desbloqueada'}
                        </p>
                        {item.points > 0 && (
                          <span className="font-pixel text-[9px] text-amber-300 shrink-0">
                            +{item.points} pts
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        Conquista oficial RetroAchievements em <strong className="text-white">{item.gameTitle || 'Jogo Retrô'}</strong>
                      </p>
                    </div>
                  </div>
                )}

                {/* Convite para Sala de Jogo */}
                {item.type === 'room_invite' && (
                  <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl border border-electric/30 bg-gradient-to-r from-electric/10 via-slate-950 to-slate-950 p-4 shadow-neon">
                    <div className="flex items-center gap-3">
                      {item.roomCoverUrl ? (
                        <img
                          src={item.roomCoverUrl}
                          alt=""
                          className="h-12 w-12 rounded-xl object-cover border border-white/10"
                        />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-electric/20 text-electric">
                          <Gamepad2 size={24} />
                        </div>
                      )}
                      <div>
                        <p className="font-pixel text-xs text-white">{item.roomName || item.gameTitle || 'Sala de Jogo'}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Participe da jogatina em grupo agora!</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onOpenGameRoom?.({ id: item.roomId, gameTitle: item.gameTitle, gameCoverUrl: item.roomCoverUrl })}
                      className="flex items-center gap-1.5 rounded-xl bg-electric px-4 py-2 font-pixel text-[10px] text-slate-950 hover:bg-electric/90 transition shadow-neon shrink-0"
                    >
                      <Gamepad2 size={13} />
                      <span>Entrar na Sala</span>
                    </button>
                  </div>
                )}

                {/* Convite para Clube */}
                {item.type === 'club_invite' && (
                  <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl border border-purple-500/30 bg-gradient-to-r from-purple-500/10 via-slate-950 to-slate-950 p-4 shadow-pixel">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-purple-400/40 bg-purple-500/20 text-purple-300 font-pixel text-sm">
                        [{item.clubTag || 'CLUBE'}]
                      </div>
                      <div>
                        <p className="font-pixel text-xs text-white">{item.clubName || 'Clube Permanente'}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Código de convite: <strong className="font-pixel text-gold">{item.inviteCode || 'ZR-RETRO'}</strong>
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onNavigate?.('clubs')}
                      className="flex items-center gap-1.5 rounded-xl border border-purple-400/40 bg-purple-500/20 px-4 py-2 font-pixel text-[10px] text-purple-200 hover:bg-purple-500/30 transition shrink-0"
                    >
                      <Users size={13} />
                      <span>Ver Clube</span>
                    </button>
                  </div>
                )}

                {/* Rodapé de Ações: Curtir (❤️) e Comentar (💬) */}
                <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3">
                  <div className="flex items-center gap-4">
                    {/* Botão Curtir */}
                    <button
                      type="button"
                      onClick={() => handleLike(item.id)}
                      className={`flex items-center gap-1.5 text-xs font-bold transition ${
                        isLiked ? 'text-rose-500' : 'text-slate-400 hover:text-rose-400'
                      }`}
                      title={isLiked ? 'Descurtir' : 'Curtir'}
                    >
                      <Heart
                        size={17}
                        className={`transition-transform duration-200 active:scale-125 ${
                          isLiked ? 'fill-rose-500 text-rose-500' : ''
                        }`}
                      />
                      <span>{likeCount > 0 ? likeCount : 'Curtir'}</span>
                    </button>

                    {/* Botão Comentários */}
                    <button
                      type="button"
                      onClick={() => toggleComments(item.id)}
                      className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-electric transition"
                      title="Ver e adicionar comentários"
                    >
                      <MessageSquare size={17} />
                      <span>{item.commentCount > 0 ? `${item.commentCount} comentários` : 'Comentar'}</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(window.location.href)
                      alert('Link da publicação copiado para a área de transferência!')
                    }}
                    className="p-1.5 text-slate-500 hover:text-white transition"
                    title="Compartilhar"
                  >
                    <Share2 size={15} />
                  </button>
                </div>

                {/* Seção Expansível de Comentários */}
                {commentsOpen && (
                  <PostCommentsSection
                    activityId={item.id}
                    currentUser={currentUser}
                    onOpenUserProfile={onOpenUserProfile}
                  />
                )}
              </article>
            )
          })
        )}
      </div>

      {/* Modal de Galeria Interna do Emulador (Anti-Upload Externo) */}
      {isGalleryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Camera size={16} className="text-electric" />
                <h3 className="font-pixel text-xs text-white">Suas Capturas do Emulador</h3>
              </div>
              <button
                onClick={() => setIsGalleryOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:text-white transition"
              >
                <X size={16} />
              </button>
            </div>

            <p className="mt-2 text-[11px] text-slate-400">
              Escolha um frame capturado pelo emulador do ZEREI! para anexar à sua publicação. Fotos externas não são permitidas.
            </p>

            <div className="mt-4 max-h-72 overflow-y-auto pr-1">
              {myScreenshots.length === 0 ? (
                <div className="py-8 text-center text-slate-500">
                  <Camera size={32} className="mx-auto mb-2 text-slate-600" />
                  <p className="text-xs">Nenhuma foto salva no emulador ainda.</p>
                  <p className="text-[10px] mt-1">Jogue qualquer título e aperte "📸 Capturar Tela" no painel do emulador!</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2.5">
                  {myScreenshots.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => {
                        setSelectedScreenshot(item)
                        setIsGalleryOpen(false)
                      }}
                      className="group relative cursor-pointer overflow-hidden rounded-xl border border-white/10 bg-black aspect-[4/3] hover:border-electric transition"
                    >
                      <img src={item.dataUrl} alt="" className="h-full w-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                        <span className="font-pixel text-[9px] text-electric">Selecionar</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Lightbox / Zoom da Foto */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md cursor-pointer animate-fadeIn"
        >
          <div className="relative max-w-4xl max-h-[90vh] overflow-hidden rounded-3xl border border-white/20 bg-black">
            <img src={previewImage} alt="Zoom" className="max-h-[85vh] w-auto object-contain" />
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute right-3 top-3 rounded-full bg-black/70 p-2 text-white hover:bg-white/20 transition"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
