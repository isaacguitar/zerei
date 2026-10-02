import { Gamepad2, RefreshCw, Wrench } from 'lucide-react'

export default function MaintenanceScreen({ message }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-crtVoid p-4 text-center">
      <div className="relative max-w-md w-full rounded-3xl border border-synthwave/40 bg-panel p-8 shadow-pixel">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl border-2 border-gold/40 bg-gradient-to-br from-gold/20 to-purple-950/40 text-gold shadow-neon mb-5">
          <Wrench size={36} className="animate-bounce" />
        </div>

        <span className="rounded-full border border-amber-500/40 bg-amber-500/15 px-3 py-1 font-pixel text-[9px] font-bold uppercase tracking-wider text-amber-300">
          Modo Manutenção
        </span>

        <h1 className="mt-4 font-pixel text-base text-white">
          Trocando a Fita do Videogame...
        </h1>

        <p className="mt-3 text-xs text-slate-400 leading-relaxed">
          {message || 'A equipe do ZEREI! está realizando uma manutenção programada e atualizações de sistema. Voltamos em alguns minutos!'}
        </p>

        <div className="mt-6 flex flex-col items-center gap-3">
          <button
            onClick={() => window.location.reload()}
            className="flex items-center justify-center gap-2 rounded-xl bg-electric px-6 py-3 font-pixel text-xs font-bold text-slate-950 hover:bg-electric/90 transition shadow-neon w-full"
          >
            <RefreshCw size={14} />
            <span>Verificar Novamente</span>
          </button>
        </div>

        <p className="mt-6 font-pixel text-[8px] text-slate-600 uppercase tracking-widest">
          ZEREI! · Clube de Retrogaming
        </p>
      </div>
    </div>
  )
}

