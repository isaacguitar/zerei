import {
  Camera,
  Check,
  Gamepad2,
  Globe,
  Image as ImageIcon,
  Lock,
  Send,
  Sparkles,
  Trash2,
  Users,
  X,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { createFeedPost } from './activityService'
import { listMyScreenshots } from '../emulator/screenshotStorage'
import { listMyClubs } from '../clubs/clubService'

const VISIBILITY_OPTIONS = [
  { id: 'public', label: 'Público', desc: 'Qualquer pessoa na plataforma', icon: Globe },
  { id: 'restricted', label: 'Restrito', desc: 'Amigos e membros dos seus clubes', icon: Users },
  { id: 'friends', label: 'Apenas Amigos', desc: 'Somente amigos mútuos', icon: Lock },
  { id: 'club', label: 'Apenas Clube', desc: 'Membros de um clube específico', icon: Users },
]

export default function CreateFeedPostModal({ isOpen, onClose, onPostCreated }) {
  const [text, setText] = useState('')
  const [gameTitle, setGameTitle] = useState('')
  const [visibility, setVisibility] = useState('public')
  const [selectedClubId, setSelectedClubId] = useState('')
  const [myClubs, setMyClubs] = useState([])
  const [selectedScreenshot, setSelectedScreenshot] = useState(null)
  const [isGalleryOpen, setIsGalleryOpen] = useState(false)
  const [screenshots, setScreenshots] = useState([])
  const [publishing, setPublishing] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isOpen) return
    listMyScreenshots().then(setScreenshots)
    listMyClubs().then((clubs) => {
      setMyClubs(clubs || [])
      if (clubs?.length > 0) {
        setSelectedClubId(clubs[0].id)
      }
    })
  }, [isOpen])

  if (!isOpen) return null

  const handleSelectScreenshot = (sc) => {
    setSelectedScreenshot(sc)
    if (sc.gameTitle && !gameTitle) {
      setGameTitle(sc.gameTitle)
    }
    setIsGalleryOpen(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!text.trim() && !selectedScreenshot) {
      setError('Por favor, escreva algo ou selecione uma captura de tela da galeria.')
      return
    }

    setPublishing(true)
    setError('')

    try {
      const chosenClub = myClubs.find((c) => c.id === selectedClubId)
      await createFeedPost({
        text: text.trim(),
        imageUrl: selectedScreenshot?.dataUrl || null,
        gameTitle: gameTitle.trim() || selectedScreenshot?.gameTitle || null,
        visibility,
        clubId: visibility === 'club' ? selectedClubId : null,
        clubName: visibility === 'club' ? (chosenClub?.name || null) : null,
        type: selectedScreenshot ? 'screenshot' : 'post',
      })

      setText('')
      setSelectedScreenshot(null)
      setGameTitle('')
      onPostCreated?.()
      onClose()
    } catch (err) {
      setError(err.message || 'Erro ao publicar no Feed.')
    } finally {
      setPublishing(false)
    }
  }

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-5 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative flex w-full max-w-lg flex-col rounded-3xl border border-white/10 bg-panel shadow-2xl overflow-hidden max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 bg-slate-950/50 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-electric/40 bg-electric/10 text-electric">
              <Sparkles size={16} />
            </span>
            <h3 className="font-pixel text-xs text-white">Nova Publicação no Feed</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 transition hover:bg-white/10 hover:text-white"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
          {/* Campo de Texto */}
          <div>
            <textarea
              rows={3}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="O que está jogando? Compartilhe seu progresso, desafios ou impressões..."
              className="w-full rounded-2xl border border-white/10 bg-slate-950 p-3.5 text-xs text-white placeholder-slate-500 outline-none focus:border-electric/50 resize-none"
              autoFocus
            />
          </div>

          {/* Screenshot Selecionada da Galeria */}
          {selectedScreenshot ? (
            <div className="relative overflow-hidden rounded-2xl border border-white/15 bg-slate-950 p-2">
              <img
                src={selectedScreenshot.dataUrl}
                alt="Captura selecionada"
                className="w-full aspect-[4/3] rounded-xl object-contain bg-black/80"
              />
              <div className="mt-2 flex items-center justify-between px-1 text-[10px] text-slate-400">
                <span className="font-bold text-electric truncate max-w-xs">
                  {selectedScreenshot.gameTitle || 'Captura do Emulador'}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedScreenshot(null)}
                  className="flex items-center gap-1 text-rose-400 hover:text-rose-300 font-bold"
                >
                  <Trash2 size={12} /> Remover foto
                </button>
              </div>
            </div>
          ) : (
            <div>
              {/* Botão de abrir a Galeria Interna do Zerei */}
              <button
                type="button"
                onClick={() => setIsGalleryOpen(true)}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-white/20 bg-slate-950/40 py-3 text-xs font-bold text-slate-300 transition hover:border-electric/50 hover:bg-slate-900/60"
              >
                <Camera size={16} className="text-electric" />
                <span>Anexar Foto da Galeria de Prints do Zerei</span>
              </button>
              <p className="mt-1.5 text-[9px] text-slate-500 text-center">
                🛡️ Por segurança da comunidade, apenas prints tirados no emulador do site podem ser anexados.
              </p>
            </div>
          )}

          {/* Jogo Associado */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Jogo Relacionado (Opcional):
            </label>
            <input
              type="text"
              value={gameTitle}
              onChange={(e) => setGameTitle(e.target.value)}
              placeholder="Ex: Chrono Trigger, Super Mario World..."
              className="w-full rounded-xl border border-white/10 bg-slate-950 px-3.5 py-2 text-xs text-white placeholder-slate-600 outline-none focus:border-electric/50"
            />
          </div>

          {/* Seletor de Privacidade */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
              Privacidade da Postagem:
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

            {visibility === 'club' && (
              <div className="mt-2">
                <label className="block text-[10px] text-slate-400 mb-1">Selecione o Clube:</label>
                {myClubs.length > 0 ? (
                  <select
                    value={selectedClubId}
                    onChange={(e) => setSelectedClubId(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-xs text-white outline-none focus:border-electric/50"
                  >
                    {myClubs.map((c) => (
                      <option key={c.id} value={c.id}>
                        [{c.tag || 'CLUBE'}] {c.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-[10px] text-amber-400">Você ainda não participa de nenhum clube.</p>
                )}
              </div>
            )}
          </div>

          {error && <p className="text-xs text-rose-300">{error}</p>}
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
            onClick={handleSubmit}
            disabled={publishing}
            className="flex items-center gap-2 rounded-xl bg-electric px-5 py-2.5 text-xs font-pixel text-slate-950 hover:bg-electric/90 disabled:opacity-50 transition shadow-neon"
          >
            <Send size={13} />
            <span>{publishing ? 'Publicando...' : 'Publicar no Feed 🚀'}</span>
          </button>
        </div>
      </div>

      {/* Modal / Gaveta da Galeria Interna de Prints do Emulador */}
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
                <Camera size={18} className="text-electric" />
                <h4 className="font-pixel text-xs text-white">Galeria de Capturas do Zerei!</h4>
              </div>
              <button
                type="button"
                onClick={() => setIsGalleryOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-xs text-slate-400 mb-4">
              Selecione uma das capturas que você tirou no emulador para anexar a esta postagem:
            </p>

            <div className="flex-1 overflow-y-auto">
              {screenshots.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {screenshots.map((sc) => (
                    <div
                      key={sc.id}
                      onClick={() => handleSelectScreenshot(sc)}
                      className="group cursor-pointer overflow-hidden rounded-xl border border-white/10 bg-slate-950 transition hover:border-electric hover:scale-[1.02]"
                    >
                      <img
                        src={sc.dataUrl}
                        alt=""
                        className="w-full aspect-[4/3] object-cover"
                      />
                      <div className="p-2">
                        <p className="font-pixel text-[9px] text-white truncate">{sc.gameTitle || 'Jogo Retrô'}</p>
                        <p className="text-[8px] text-slate-500">
                          {new Date(sc.capturedAt).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Camera size={32} className="text-slate-600 mb-3" />
                  <p className="font-pixel text-xs text-white">Nenhum print salvo ainda</p>
                  <p className="mt-1 text-xs text-slate-500 max-w-sm">
                    Inicie qualquer jogo em uma Sala de Jogos e clique no botão <strong>"Capturar Tela"</strong> para adicionar imagens à sua galeria.
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
    </div>
  )
}

