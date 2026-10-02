import {
  ArrowLeft,
  Camera,
  Heart,
  Lightbulb,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Users,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { createTip, deleteTip, listAllTips, toggleTipLike } from './tipsService'
import { getCurrentUser } from '../auth/authService'
import { listMyScreenshots } from '../emulator/screenshotStorage'

export default function TipsHubPage({ onBack, defaultGameTitle = null }) {
  const [tips, setTips] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedGameFilter, setSelectedGameFilter] = useState(defaultGameTitle || '')
  const [isPublishOpen, setIsPublishOpen] = useState(false)
  const [previewScreenshot, setPreviewScreenshot] = useState(null)

  // Campos do formulário de nova dica
  const [newGameTitle, setNewGameTitle] = useState(defaultGameTitle || '')
  const [newTipTitle, setNewTipTitle] = useState('')
  const [newContent, setNewContent] = useState('')
  const [newScreenshot, setNewScreenshot] = useState(null)
  const [isGalleryOpen, setIsGalleryOpen] = useState(false)
  const [myScreenshots, setMyScreenshots] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const currentUser = getCurrentUser()

  const loadTips = async () => {
    setLoading(true)
    try {
      const data = await listAllTips({
        search,
        selectedGame: selectedGameFilter || null,
      })
      setTips(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTips()
  }, [search, selectedGameFilter])

  useEffect(() => {
    if (isPublishOpen) {
      listMyScreenshots().then(setMyScreenshots)
    }
  }, [isPublishOpen])

  // Lista única de jogos para a barra de filtros
  const availableGames = useMemo(() => {
    const set = new Set()
    tips.forEach((t) => {
      if (t.gameTitle) set.add(t.gameTitle)
    })
    return Array.from(set)
  }, [tips])

  const handleCreateTip = async (e) => {
    e.preventDefault()
    if (!newGameTitle.trim()) {
      setError('Informe o jogo específico da dica.')
      return
    }
    if (!newTipTitle.trim() && !newContent.trim()) {
      setError('Preencha o título ou conteúdo da dica.')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      await createTip({
        gameTitle: newGameTitle.trim(),
        title: newTipTitle.trim(),
        content: newContent.trim(),
        screenshotUrl: newScreenshot?.dataUrl || null,
      })

      setNewTipTitle('')
      setNewContent('')
      setNewScreenshot(null)
      setIsPublishOpen(false)
      loadTips()
    } catch (err) {
      setError(err.message || 'Erro ao publicar dica.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleLike = async (tipId) => {
    if (!currentUser?.id) return
    await toggleTipLike(tipId)
    loadTips()
  }

  const handleDelete = async (tipId) => {
    if (!window.confirm('Tem certeza que deseja excluir esta dica?')) return
    await deleteTip(tipId)
    loadTips()
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-16 text-slate-200">
      {/* Header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <button
            onClick={onBack}
            className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 transition hover:text-electric"
          >
            <ArrowLeft size={14} /> Voltar para o Dashboard
          </button>
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-amber-400/40 bg-amber-500/15 text-gold shadow-arcade-gold">
              <Lightbulb size={18} />
            </span>
            <div>
              <h1 className="font-pixel text-base sm:text-lg text-white">Mural de Dicas</h1>
              <p className="text-xs text-slate-400">
                Estratégias, segredos e passagens secretas compartilhados pela comunidade.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setError('')
            setIsPublishOpen(true)
          }}
          className="flex items-center justify-center gap-2 rounded-xl border border-amber-400/40 bg-amber-500/15 px-4 py-2.5 text-xs font-pixel text-amber-300 hover:bg-amber-500/25 transition shadow-arcade-gold shrink-0"
        >
          <Plus size={14} />
          <span>Publicar Dica</span>
        </button>
      </header>

      {/* Barra de Filtros e Busca */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por jogo, título da dica ou truque..."
            className="w-full rounded-2xl border border-white/10 bg-panel px-4 py-2.5 pl-10 text-xs text-white placeholder-slate-500 outline-none focus:border-amber-400/50"
          />
        </div>

        {availableGames.length > 0 && (
          <select
            value={selectedGameFilter}
            onChange={(e) => setSelectedGameFilter(e.target.value)}
            className="w-full sm:w-64 rounded-2xl border border-white/10 bg-panel px-3.5 py-2.5 text-xs text-white outline-none focus:border-amber-400/50"
          >
            <option value="">Todos os Jogos ({tips.length} dicas)</option>
            {availableGames.map((game) => (
              <option key={game} value={game}>
                {game}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Grid de Dicas */}
      {loading ? (
        <div className="flex min-h-[300px] items-center justify-center text-xs text-slate-500 font-pixel">
          Carregando dicas...
        </div>
      ) : tips.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-white/5 bg-panel/40 py-16 px-4 text-center">
          <Lightbulb size={32} className="text-slate-600 mb-3" />
          <p className="font-pixel text-xs text-white">Nenhuma dica encontrada</p>
          <p className="mt-1 text-xs text-slate-500 max-w-sm">
            {selectedGameFilter
              ? `Ainda não há dicas cadastradas para "${selectedGameFilter}". Seja o primeiro!`
              : 'Compartilhe truques e estratégias dos seus jogos favoritos com a comunidade.'}
          </p>
          <button
            type="button"
            onClick={() => setIsPublishOpen(true)}
            className="mt-4 rounded-xl bg-amber-500/20 border border-amber-400/40 px-4 py-2 text-xs font-bold text-amber-300 hover:bg-amber-500/30"
          >
            + Publicar Primeira Dica
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tips.map((tip) => {
            const isAuthor = currentUser?.id && tip.authorId === currentUser.id
            const isLiked = currentUser?.id && tip.likes?.includes(currentUser.id)

            return (
              <article
                key={tip.id}
                className="flex flex-col justify-between rounded-3xl border border-white/10 bg-panel p-5 shadow-pixel transition hover:border-amber-400/40"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <span className="rounded-lg border border-amber-400/30 bg-amber-500/10 px-2 py-0.5 font-pixel text-[8.5px] text-amber-300 uppercase truncate max-w-[170px]">
                      {tip.gameTitle}
                    </span>

                    {isAuthor && (
                      <button
                        type="button"
                        onClick={() => handleDelete(tip.id)}
                        className="text-slate-500 hover:text-rose-400 transition p-1"
                        title="Excluir minha dica"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>

                  <h3 className="font-pixel text-xs text-white leading-snug">{tip.title}</h3>

                  {tip.screenshotUrl && (
                    <div
                      onClick={() => setPreviewScreenshot(tip.screenshotUrl)}
                      className="mt-3 relative cursor-pointer overflow-hidden rounded-xl border border-white/10 bg-black group"
                    >
                      <img
                        src={tip.screenshotUrl}
                        alt=""
                        className="w-full aspect-[4/3] object-contain transition group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-[10px] font-bold text-white">
                        Ampliar captura
                      </div>
                    </div>
                  )}

                  {tip.content && (
                    <p className="mt-3 text-xs text-slate-300 leading-relaxed whitespace-pre-line">
                      {tip.content}
                    </p>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[10px] text-slate-400">
                  <div className="flex items-center gap-2 min-w-0">
                    <img
                      src={tip.authorAvatar}
                      alt=""
                      className="h-6 w-6 rounded-lg bg-slate-950 object-cover"
                    />
                    <span className="font-bold text-slate-300 truncate max-w-[110px]">
                      {tip.authorName}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleLike(tip.id)}
                    className={`flex items-center gap-1.5 rounded-lg px-2 py-1 transition ${
                      isLiked
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        : 'text-slate-400 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <Heart size={12} fill={isLiked ? 'currentColor' : 'none'} />
                    <span>{tip.likesCount || 0}</span>
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      )}

      {/* Modal de Publicar Dica */}
      {isPublishOpen && (
        <div
          onClick={() => setIsPublishOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative flex w-full max-w-lg flex-col rounded-3xl border border-white/10 bg-panel shadow-2xl p-6 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Lightbulb size={18} className="text-gold" />
                <h3 className="font-pixel text-xs text-white">Publicar Dica da Comunidade</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsPublishOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateTip} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Jogo Específico *
                </label>
                <input
                  type="text"
                  value={newGameTitle}
                  onChange={(e) => setNewGameTitle(e.target.value)}
                  placeholder="Ex: Super Mario World, Sonic 2, Chrono Trigger..."
                  className="w-full rounded-xl border border-white/10 bg-slate-950 px-3.5 py-2.5 text-xs text-white outline-none focus:border-amber-400/50"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Título da Dica ou Segredo *
                </label>
                <input
                  type="text"
                  value={newTipTitle}
                  onChange={(e) => setNewTipTitle(e.target.value)}
                  placeholder="Ex: Como encontrar a Star Road secreta"
                  className="w-full rounded-xl border border-white/10 bg-slate-950 px-3.5 py-2.5 text-xs text-white outline-none focus:border-amber-400/50"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Explicação do Truque / Instruções
                </label>
                <textarea
                  rows={4}
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="Descreva exatamente o que fazer no jogo..."
                  className="w-full rounded-xl border border-white/10 bg-slate-950 p-3 text-xs text-white outline-none focus:border-amber-400/50 resize-none"
                />
              </div>

              {/* Anexo de Imagem (Apenas da Galeria Interna do Emulador) */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Foto da Dica (Opcional):
                </label>
                {newScreenshot ? (
                  <div className="relative overflow-hidden rounded-xl border border-white/10 bg-slate-950 p-2">
                    <img src={newScreenshot.dataUrl} alt="" className="w-full aspect-[4/3] object-contain rounded-lg" />
                    <button
                      type="button"
                      onClick={() => setNewScreenshot(null)}
                      className="mt-2 text-[10px] font-bold text-rose-400 hover:text-rose-300 flex items-center gap-1"
                    >
                      <Trash2 size={12} /> Remover foto
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsGalleryOpen(true)}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-white/20 bg-slate-950/40 py-2.5 text-xs text-slate-300 hover:border-amber-400/50 hover:bg-slate-900/60 transition"
                  >
                    <Camera size={14} className="text-gold" />
                    <span>Anexar da Galeria de Prints do Zerei</span>
                  </button>
                )}
                <p className="mt-1 text-[9px] text-slate-500 text-center">
                  🛡️ Apenas capturas tiradas dentro do emulador do ZEREI! podem ser anexadas.
                </p>
              </div>

              {error && <p className="text-xs text-rose-300">{error}</p>}

              <div className="flex items-center justify-between pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsPublishOpen(false)}
                  className="text-xs font-bold uppercase text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-amber-400 px-5 py-2.5 font-pixel text-xs text-slate-950 hover:bg-amber-300 disabled:opacity-50 transition shadow-arcade-gold font-bold"
                >
                  {submitting ? 'Publicando...' : 'Publicar Dica 🚀'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal da Galeria de Capturas Interna */}
      {isGalleryOpen && (
        <div
          onClick={() => setIsGalleryOpen(false)}
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative flex w-full max-w-2xl flex-col rounded-3xl border border-white/10 bg-panel shadow-2xl p-6 max-h-[85vh] overflow-hidden"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Camera size={18} className="text-gold" />
                <h4 className="font-pixel text-xs text-white">Galeria de Capturas do Emulador</h4>
              </div>
              <button
                type="button"
                onClick={() => setIsGalleryOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {myScreenshots.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {myScreenshots.map((sc) => (
                    <div
                      key={sc.id}
                      onClick={() => {
                        setNewScreenshot(sc)
                        if (sc.gameTitle && !newGameTitle) {
                          setNewGameTitle(sc.gameTitle)
                        }
                        setIsGalleryOpen(false)
                      }}
                      className="group cursor-pointer overflow-hidden rounded-xl border border-white/10 bg-slate-950 transition hover:border-amber-400 hover:scale-[1.02]"
                    >
                      <img src={sc.dataUrl} alt="" className="w-full aspect-[4/3] object-cover" />
                      <div className="p-2">
                        <p className="font-pixel text-[9px] text-white truncate">{sc.gameTitle}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center text-slate-500">
                  <Camera size={28} className="mx-auto text-slate-600 mb-2" />
                  <p className="font-pixel text-xs text-white">Nenhum print salvo no emulador</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Use o botão "Capturar Tela" durante a jogatina no emulador para criar prints.
                  </p>
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-white/10 text-right">
              <button
                type="button"
                onClick={() => setIsGalleryOpen(false)}
                className="rounded-xl border border-white/10 bg-slate-900 px-4 py-2 text-xs font-bold uppercase text-slate-300 hover:text-white"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox de Visualização Ampliada */}
      {previewScreenshot && (
        <div
          onClick={() => setPreviewScreenshot(null)}
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-4xl max-h-[90vh] overflow-hidden rounded-3xl border border-white/20 bg-slate-950 p-2 shadow-2xl"
          >
            <button
              type="button"
              onClick={() => setPreviewScreenshot(null)}
              className="absolute top-4 right-4 z-10 rounded-full bg-black/70 p-2 text-white hover:bg-black"
            >
              <X size={18} />
            </button>
            <img src={previewScreenshot} alt="" className="w-full max-h-[85vh] object-contain rounded-2xl" />
          </div>
        </div>
      )}
    </div>
  )
}

