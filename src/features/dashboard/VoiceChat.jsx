import { Headphones, Mic, MicOff, MoreHorizontal, Volume2, Users } from 'lucide-react'

/**
 * VoiceChat — widget de sala de voz com avatares e indicador de fala.
 */
export default function VoiceChat({ onAction, activeCallMembers = [], compact = false, className = '' }) {
  const count = activeCallMembers.length

  return (
    <section className={`rounded-2xl border border-white/8 bg-panel ${compact ? 'p-3.5' : 'p-5'} ${className}`}>
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="rounded-lg bg-electric/10 p-2 text-electric">
            <Headphones size={16} />
          </span>
          <div>
            <p className="font-pixel text-[9px] text-white">Sala de voz</p>
            <p className="mt-0.5 text-[10px] text-slate-500">
              {count > 0 ? (
                <>Online na call <span className="text-oneUp">· {count} {count === 1 ? 'pessoa' : 'pessoas'}</span></>
              ) : (
                'Nenhuma chamada ativa'
              )}
            </p>
          </div>
        </div>
        <button
          onClick={() => onAction?.('As opções da sala de voz estarão disponíveis quando a chamada for integrada.')}
          className="text-slate-600 transition hover:text-white"
          aria-label="Mais opções"
        >
          <MoreHorizontal size={17} />
        </button>
      </div>

      {/* Membros na call ou estado vazio */}
      {count > 0 ? (
        <div className="mt-5 grid grid-cols-4 gap-2">
          {activeCallMembers.map(([name, avatar, talking]) => (
            <div key={name} className="text-center">
              <div
                className={`relative mx-auto h-11 w-11 rounded-full border-2 p-0.5 transition ${
                  talking ? 'border-oneUp shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'border-slate-700'
                }`}
              >
                <img
                  className="h-full w-full rounded-full bg-slate-950"
                  src={avatar}
                  alt={`Avatar de ${name}`}
                />
                {talking ? (
                  <span className="absolute -bottom-1 -right-1 rounded-full bg-oneUp p-1 text-slate-950">
                    <Mic size={7} />
                  </span>
                ) : (
                  <span className="absolute -bottom-1 -right-1 rounded-full bg-slate-700 p-1 text-slate-300">
                    <MicOff size={7} />
                  </span>
                )}
              </div>
              <p className="mt-2 truncate text-[9px] text-slate-400">{name}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-5 flex flex-col items-center justify-center py-4 text-center">
          <p className="text-[10px] text-slate-500">Ninguém falando no momento.</p>
        </div>
      )}

      {/* Botão entrar */}
      <button
        onClick={() => onAction?.('A sala de voz será ativada na etapa de comunicação em tempo real.')}
        className="btn-arcade-cyan mt-4 w-full"
      >
        <Volume2 size={13} /> Entrar na call
      </button>
    </section>
  )
}

