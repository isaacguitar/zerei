import {
  Camera,
  Check,
  Download,
  Flame,
  Globe,
  HelpCircle,
  Lightbulb,
  Lock,
  MessageSquare,
  Send,
  Share2,
  Sparkles,
  Users,
  X,
} from 'lucide-react'
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { createFeedPost } from '../feed/activityService'
import { createTip } from '../tips/tipsService'

const VISIBILITY_OPTIONS = [
  { id: 'public', label: 'Público', desc: 'Qualquer pessoa na plataforma', icon: Globe },
  { id: 'restricted', label: 'Restrito', desc: 'Amigos e membros dos seus clubes', icon: Users },
  { id: 'friends', label: 'Apenas Amigos', desc: 'Somente amigos mútuos', icon: Lock },
  { id: 'club', label: 'Apenas Clube', desc: 'Visível apenas para o clube desta sala', icon: ShieldCheckIcon },
]

function ShieldCheckIcon(props) {
  return <Users {...props} />
}

export default function ScreenshotCaptureModal({
  isOpen,
  onClose,
  screenshot,
  gameTitle = 'Jogo Retrô',
  club = null,
}) {
  const [destination, setDestination] = useState('feed') // 'feed' | 'tips'
  const [caption, setCaption] = useState('')
  const [tipTitle, setTipTitle] = useState('')
  const [visibility, setVisibility] = useState('public')
  const [publishing, setPublishing] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [error, setError] = useState('')

  if (!isOpen || !screenshot || typeof document === 'undefined') return null

  const handleDownload = () => {
    try {
      const a = document.createElement('a')
      a.href = screenshot.dataUrl
      a.download = `zerei-${gameTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}.jpg`
      a.click()
    } catch {
      setError('Não foi possível salvar localmente.')
    }
  }

  const handlePublish = async (e) => {
    e.preventDefault()
    setPublishing(true)
    setError('')
    setSuccessMsg('')

    try {
      if (destination === 'feed') {
        await createFeedPost({
          text: caption.trim(),
          imageUrl: screenshot.dataUrl,
          gameTitle,
          visibility,
          clubId: club?.id || null,
          clubName: club?.name || null,
          type: 'screenshot',
        })
        setSuccessMsg('Captura de tela publicada no Feed com sucesso!')
      } else {
        await createTip({
          gameTitle,
          title: tipTitle.trim() || `Dica de ${gameTitle}`,
          content: caption.trim() || 'Confira esta estratégia capturada no emulador!',
          screenshotUrl: screenshot.dataUrl,
        })
        setSuccessMsg('Dica com screenshot publicada no Mural de Dicas!')
      }

      setTimeout(() => {
        onClose()
      }, 1500)
    } catch (err) {
      setError(err.message || 'Erro ao publicar.')
      setPublishing(false)
    }
  }

  return createPortal(
    <div
      onClick={onClose}
      className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/85 p-3 sm:p-5 backdrop-blur-md animate-in fade-in duration-200"
    >
      <style>{`
        .ejs_bar, .ejs_control_bar, .ejs_bottom_bar, [class*="ejs_bar"], [class*="ejs_menu"] {
          display: none !important;
          visibility: hidden !important;
          opacity: 0 !important;
          pointer-events: none !important;
        }
      `}</style>
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative flex w-full max-w-xl flex-col rounded-3xl border border-white/10 bg-panel shadow-2xl overflow-hidden max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 bg-slate-950/50 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-electric/40 bg-electric/10 text-electric">
              <Camera size={16} />
            </span>
            <div>
              <h3 className="font-pixel text-xs text-white">Captura do Emulador</h3>
              <p className="text-[10px] text-slate-400 truncate max-w-xs">{gameTitle}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 transition hover:bg-white/10 hover:text-white"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handlePublish} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {/* Pré-visualização da screenshot capturada com efeito scanline sutil */}
          <div className="relative overflow-hidden rounded-2xl border-2 border-white/15 bg-slate-950 shadow-pixel group">
            <img
              src={screenshot.dataUrl}
              alt={`Screenshot de ${gameTitle}`}
              className="w-full aspect-[4/3] object-contain bg-black/80"
            />
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-transparent via-transparent to-black/40" />

            <div className="absolute bottom-2.5 left-3 flex items-center gap-2">
              <span className="rounded bg-black/70 px-2 py-0.5 font-pixel text-[8px] uppercase tracking-wider text-electric backdrop-blur-sm border border-electric/30">
                {gameTitle}
              </span>
              <span className="rounded bg-black/70 px-1.5 py-0.5 text-[8px] font-bold text-slate-300 backdrop-blur-sm border border-white/10">
                Emulador Oficial ZEREI!
              </span>
            </div>

            <button
              type="button"
              onClick={handleDownload}
              className="absolute top-2.5 right-2.5 flex items-center gap-1.5 rounded-lg border border-white/20 bg-slate-950/80 px-2.5 py-1 text-[10px] font-bold text-slate-200 backdrop-blur-sm transition hover:bg-white/10 hover:text-white"
              title="Baixar imagem no dispositivo"
            >
              <Download size={12} />
              <span>Baixar</span>
            </button>
          </div>

          {/* Onde deseja publicar? */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
              Onde deseja publicar esta captura?
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setDestination('feed')}
                className={`flex items-center gap-2.5 rounded-2xl border p-3 text-left transition ${
                  destination === 'feed'
                    ? 'border-electric bg-electric/15 text-white shadow-neon'
                    : 'border-white/10 bg-slate-950/40 text-slate-400 hover:border-white/20'
                }`}
              >
                <Share2 size={16} className={destination === 'feed' ? 'text-electric' : 'text-slate-500'} />
                <div>
                  <p className="text-xs font-bold text-white">Publicar no Feed</p>
                  <p className="text-[9.5px] text-slate-400">Timeline da comunidade</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setDestination('tips')}
                className={`flex items-center gap-2.5 rounded-2xl border p-3 text-left transition ${
                  destination === 'tips'
                    ? 'border-amber-400 bg-amber-500/15 text-white shadow-arcade-gold'
                    : 'border-white/10 bg-slate-950/40 text-slate-400 hover:border-white/20'
                }`}
              >
                <Lightbulb size={16} className={destination === 'tips' ? 'text-gold' : 'text-slate-500'} />
                <div>
                  <p className="text-xs font-bold text-white">Mural de Dicas</p>
                  <p className="text-[9.5px] text-slate-400">Guia de {gameTitle}</p>
                </div>
              </button>
            </div>
          </div>

          {/* Se for dica, campo para título da dica */}
          {destination === 'tips' && (
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Título da Dica ou Segredo
              </label>
              <input
                type="text"
                value={tipTitle}
                onChange={(e) => setTipTitle(e.target.value)}
                placeholder="Ex: Como encontrar a passagem secreta no Castelo 3"
                className="w-full rounded-xl border border-white/10 bg-slate-950 px-3.5 py-2.5 text-xs text-white placeholder-slate-600 outline-none focus:border-amber-400/50"
              />
            </div>
          )}

          {/* Legenda / Conteúdo */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              {destination === 'feed' ? 'Legenda ou comentário:' : 'Explicação da Dica:'}
            </label>
            <textarea
              rows={3}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder={
                destination === 'feed'
                  ? 'Conte o que rolou nessa gameplay, derrotou um chefe, bateu um recorde?...'
                  : 'Descreva os passos para realizar o truque ou passar da fase...'
              }
              className="w-full rounded-xl border border-white/10 bg-slate-950 p-3 text-xs text-white placeholder-slate-600 outline-none focus:border-electric/50 resize-none"
            />
          </div>

          {/* Opções de Privacidade (apenas para o Feed) */}
          {destination === 'feed' && (
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                Quem pode ver esta postagem?
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {VISIBILITY_OPTIONS.map((opt) => {
                  const isSelected = visibility === opt.id
                  const Icon = opt.icon
                  return (
                    <button
                      type="button"
                      key={opt.id}
                      onClick={() => setVisibility(opt.id)}
                      className={`flex items-start gap-2.5 rounded-xl border p-2.5 text-left transition ${
                        isSelected
                          ? 'border-electric bg-electric/10 text-white'
                          : 'border-white/10 bg-slate-950/40 text-slate-400 hover:border-white/20'
                      }`}
                    >
                      <Icon size={14} className={isSelected ? 'text-electric' : 'text-slate-500'} />
                      <div>
                        <p className="text-xs font-bold text-white">{opt.label}</p>
                        <p className="text-[9px] text-slate-500 leading-tight">{opt.desc}</p>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {error && <p className="text-xs text-rose-300">{error}</p>}
          {successMsg && (
            <div className="flex items-center gap-2 text-xs text-emerald-300 font-bold bg-emerald-500/10 border border-emerald-500/30 p-2.5 rounded-xl">
              <Check size={14} />
              <span>{successMsg}</span>
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-white/10 bg-slate-950/50 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-white"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handlePublish}
            disabled={publishing || Boolean(successMsg)}
            className="flex items-center gap-2 rounded-xl bg-electric px-5 py-2.5 text-xs font-pixel text-slate-950 hover:bg-electric/90 disabled:opacity-50 transition shadow-neon"
          >
            <Send size={13} />
            <span>{publishing ? 'Publicando...' : destination === 'feed' ? 'Postar no Feed 🚀' : 'Publicar Dica 💡'}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

