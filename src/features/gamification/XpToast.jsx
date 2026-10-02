import { Crown, Flame, Sparkles, Trophy, Zap } from 'lucide-react'
import { useEffect, useState } from 'react'
import { subscribeToXpEvents } from './xpService'

export default function XpToast() {
  const [toast, setToast] = useState(null)
  const [levelUpModal, setLevelUpModal] = useState(null)

  useEffect(() => {
    const unsub = subscribeToXpEvents((event) => {
      setToast(event)

      if (event.leveledUp) {
        setLevelUpModal(event)
      }

      // Auto dismiss XP badge
      const timer = setTimeout(() => {
        setToast((curr) => (curr === event ? null : curr))
      }, 3500)

      return () => clearTimeout(timer)
    })

    return () => unsub()
  }, [])

  return (
    <>
      {/* Toast Flutuante de Ganho ou Penalidade de XP */}
      {toast && (
        <div
          className={`fixed top-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-2xl border px-5 py-2.5 text-white shadow-2xl backdrop-blur-md animate-bounce ${
            toast.isPenalty
              ? 'border-rose-500/60 bg-gradient-to-r from-rose-500/20 via-slate-950/95 to-rose-500/20 shadow-[0_0_20px_rgba(244,63,94,0.4)]'
              : 'border-gold/60 bg-gradient-to-r from-amber-500/20 via-slate-950/95 to-amber-500/20 shadow-neon'
          }`}
        >
          <span
            className={`flex h-7 w-7 items-center justify-center rounded-lg border ${
              toast.isPenalty
                ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                : 'bg-gold/20 text-gold border-gold/40'
            }`}
          >
            {toast.isPenalty ? <Flame size={15} /> : <Zap size={15} />}
          </span>
          <div>
            <div className="flex items-center gap-2">
              <span className={`font-pixel text-xs ${toast.isPenalty ? 'text-rose-400' : 'text-gold'}`}>
                {toast.amount > 0 ? `+${toast.amount}` : toast.amount} XP
              </span>
              <span className="text-[10px] text-slate-300 font-bold">{toast.reason}</span>
            </div>
          </div>
        </div>
      )}

      {/* Celebração de Subida de Nível (LEVEL UP!) */}
      {levelUpModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 px-4 backdrop-blur-sm animate-fade-in"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative w-full max-w-sm overflow-hidden rounded-3xl border-2 border-gold/70 bg-panel p-6 text-center shadow-neon">
            {/* Brilho de Fundo */}
            <div className="absolute -top-12 left-1/2 -translate-x-1/2 h-32 w-32 rounded-full bg-gold/20 blur-3xl" />

            <div className="relative flex flex-col items-center">
              <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-gold bg-gradient-to-b from-amber-400 to-amber-600 text-slate-950 shadow-neon animate-pulse">
                <Crown size={32} />
              </div>

              <span className="rounded-full border border-gold/50 bg-gold/15 px-3 py-1 font-pixel text-[9px] uppercase tracking-widest text-gold shadow-sm">
                PARABÉNS!
              </span>

              <h2 className="mt-2 font-pixel text-lg sm:text-xl text-white text-shadow">
                LEVEL UP!
              </h2>

              <p className="mt-1 text-xs text-slate-300">
                Você alcançou o <strong className="text-gold font-pixel">Nível {levelUpModal.newLevel}</strong>
              </p>

              <div className="mt-4 rounded-xl border border-white/10 bg-slate-950/60 px-4 py-2.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Novo Título</p>
                <p className="font-pixel text-xs text-amber-300 mt-0.5">{levelUpModal.newRank}</p>
              </div>

              <button
                type="button"
                onClick={() => setLevelUpModal(null)}
                className="mt-6 w-full rounded-xl border border-gold/60 bg-gradient-to-r from-amber-500 to-amber-600 py-3 font-pixel text-xs font-bold uppercase tracking-wider text-slate-950 transition hover:brightness-110 shadow-neon"
              >
                Continuar Jogando 🕹️
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

