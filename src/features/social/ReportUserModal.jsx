import { AlertTriangle, Check, LoaderCircle, ShieldAlert, X } from 'lucide-react'
import { useState } from 'react'
import { reportUser } from './friendService'

const REPORT_CATEGORIES = [
  { id: 'toxic', label: 'Comportamento Tóxico / Ofensivo' },
  { id: 'spam', label: 'Spam ou Propaganda não solicitada' },
  { id: 'cheat', label: 'Trapaça ou Cheats no Emulador' },
  { id: 'inappropriate', label: 'Nome ou Avatar Inapropriado' },
  { id: 'other', label: 'Outro motivo' },
]

export default function ReportUserModal({ isOpen, onClose, targetUser }) {
  const [selectedCategory, setSelectedCategory] = useState(REPORT_CATEGORIES[0].id)
  const [details, setDetails] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen || !targetUser) return null

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      await reportUser({
        targetUserId: targetUser.id,
        targetUserName: targetUser.displayName || 'Jogador',
        category: selectedCategory,
        details,
      })
      setSubmitted(true)
      setTimeout(() => {
        setSubmitted(false)
        onClose?.()
      }, 1600)
    } catch (err) {
      setError(err.message || 'Não foi possível enviar a denúncia.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-panel shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4 bg-slate-950/40">
          <div className="flex items-center gap-2 text-rose-400">
            <ShieldAlert size={18} />
            <h3 className="font-pixel text-xs text-white">Denunciar Jogador</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 transition hover:bg-white/10 hover:text-white"
          >
            <X size={16} />
          </button>
        </div>

        {submitted ? (
          <div className="p-8 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
              <Check size={24} />
            </div>
            <h4 className="font-pixel text-xs text-white">Denúncia Enviada</h4>
            <p className="mt-2 text-xs text-slate-400">
              Nossa equipe de moderação avaliará a ocorrência para manter a comunidade justa e segura.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {/* Usuário denunciado */}
            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-slate-950/30 p-3">
              <img
                src={targetUser.avatarUrl || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${targetUser.id}`}
                alt=""
                className="h-9 w-9 rounded-lg border border-white/10 object-cover bg-slate-900"
              />
              <div>
                <p className="text-xs font-bold text-white">{targetUser.displayName || 'Jogador'}</p>
                <p className="text-[10px] text-slate-500">ID: {targetUser.id}</p>
              </div>
            </div>

            {/* Motivo */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                Motivo da denúncia
              </label>
              <div className="space-y-1.5">
                {REPORT_CATEGORIES.map((cat) => (
                  <label
                    key={cat.id}
                    className={`flex items-center gap-2.5 rounded-xl border p-2.5 text-xs transition cursor-pointer ${
                      selectedCategory === cat.id
                        ? 'border-rose-500/50 bg-rose-500/10 text-rose-200'
                        : 'border-white/5 bg-slate-950/30 text-slate-300 hover:bg-white/5'
                    }`}
                  >
                    <input
                      type="radio"
                      name="report_category"
                      value={cat.id}
                      checked={selectedCategory === cat.id}
                      onChange={() => setSelectedCategory(cat.id)}
                      className="accent-rose-500"
                    />
                    <span>{cat.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Detalhes adicionais */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Detalhes ou evidências (opcional)
              </label>
              <textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                rows={3}
                placeholder="Descreva brevemente o que aconteceu..."
                className="w-full rounded-xl border border-white/10 bg-slate-950/50 p-3 text-xs text-white placeholder-slate-600 outline-none focus:border-rose-500/50 transition resize-none"
              />
            </div>

            {error && <p className="text-[10px] text-rose-400">{error}</p>}

            {/* Ações */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="rounded-xl border border-white/10 bg-slate-900 px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-300 hover:bg-white/10 transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/20 px-4 py-2 text-xs font-bold uppercase tracking-wider text-rose-200 hover:bg-rose-500/30 transition disabled:opacity-50"
              >
                {submitting && <LoaderCircle size={14} className="animate-spin" />}
                Enviar denúncia
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

