import {
  Headphones,
  Mic,
  MicOff,
  PhoneCall,
  PhoneOff,
  Radio,
  Shield,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { joinVoiceChat } from './voiceChatService'

export default function VoiceChatBar({
  roomId,
  currentUser,
  isSolo = false,
  isHost = false,
  allowVoiceChat = true,
  onToggleAllowVoice = null,
  compact = false,
}) {
  const [inVoice, setInVoice] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [peers, setPeers] = useState([])
  const [isMuted, setIsMuted] = useState(false)
  const [isDeafened, setIsDeafened] = useState(false)
  const [activeSpeakers, setActiveSpeakers] = useState(new Set())
  const [error, setError] = useState('')

  const voiceControllerRef = useRef(null)

  // Desconecta se o componente desmontar
  useEffect(() => {
    return () => {
      if (voiceControllerRef.current) {
        voiceControllerRef.current.leaveVoice().catch(() => {})
      }
    }
  }, [])

  // Atalho de teclado 'M' para mutar/desmutar rapidamente
  useEffect(() => {
    if (!inVoice) return

    function handleKeyDown(e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
        return
      }

      if (e.key === 'm' || e.key === 'M') {
        e.preventDefault()
        handleToggleMute()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [inVoice])

  async function handleJoinVoice() {
    if (connecting || inVoice) return
    setError('')
    setConnecting(true)

    try {
      const controller = await joinVoiceChat(roomId, currentUser, {
        onPeersChange: (newPeers) => {
          setPeers(newPeers)
        },
        onSpeakingChange: (userId, isSpeaking) => {
          setActiveSpeakers((prev) => {
            const next = new Set(prev)
            if (isSpeaking) {
              next.add(userId)
            } else {
              next.delete(userId)
            }
            return next
          })
        },
        onError: (err) => {
          setError(err.message || 'Erro na conexão de voz.')
        },
      })

      voiceControllerRef.current = controller
      setInVoice(true)
      setIsMuted(controller.getIsMuted())
      setIsDeafened(controller.getIsDeafened())
    } catch (err) {
      console.error(err)
      setError(err.message || 'Não foi possível acessar o microfone.')
    } finally {
      setConnecting(false)
    }
  }

  async function handleLeaveVoice() {
    if (!voiceControllerRef.current) return
    try {
      await voiceControllerRef.current.leaveVoice()
    } catch {}
    voiceControllerRef.current = null
    setInVoice(false)
    setPeers([])
    setActiveSpeakers(new Set())
  }

  function handleToggleMute() {
    if (!voiceControllerRef.current) return
    const nextMuted = voiceControllerRef.current.toggleMute()
    setIsMuted(nextMuted)
  }

  function handleToggleDeafen() {
    if (!voiceControllerRef.current) return
    const nextDeaf = voiceControllerRef.current.setDeafened(!isDeafened)
    setIsDeafened(nextDeaf)
  }

  if (!allowVoiceChat && !isHost) {
    return (
      <div className="rounded-xl border border-white/5 bg-slate-950/40 p-3 text-center text-[10px] text-slate-500">
        O chat de voz foi desativado pelo anfitrião desta sala.
      </div>
    )
  }

  return (
    <div className={`border border-white/10 bg-panel/90 backdrop-blur-md shadow-pixel transition ${compact ? 'rounded-xl p-2.5' : 'rounded-2xl p-3.5'}`}>
      <div className={`flex items-center justify-between gap-2.5 ${compact ? 'flex-col sm:flex-row' : 'flex-col sm:flex-row flex-wrap'}`}>
        {/* Lado Esquerdo: Status da Chamada / Título */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <div className={`flex shrink-0 items-center justify-center rounded-xl border ${compact ? 'h-7 w-7' : 'h-9 w-9'} ${inVoice ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400 animate-pulse' : 'border-electric/30 bg-electric/10 text-electric'}`}>
            <Headphones size={compact ? 14 : 18} />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className={`font-pixel text-white truncate ${compact ? 'text-[9px]' : 'text-[11px]'}`}>
                {compact ? 'Sala de Voz' : 'Chat de Voz da Sala'}
              </span>
              {inVoice && (
                <span className="rounded-full bg-emerald-400/20 px-1.5 py-0.2 font-bold uppercase tracking-wider text-emerald-300 border border-emerald-400/30 text-[7px]">
                  Ao Vivo
                </span>
              )}
            </div>
            <p className="text-[9.5px] text-slate-400 truncate">
              {inVoice
                ? `${peers.length} ${peers.length === 1 ? 'na call' : 'na call'} · Tecla "M"`
                : 'Converse ao vivo com quem estiver na sala'}
            </p>
          </div>
        </div>

        {/* Lado Direito: Controles ou Botão de Entrada */}
        <div className={`flex items-center gap-1.5 ${compact ? 'w-full justify-between' : 'flex-wrap'}`}>
          {isHost && isSolo && onToggleAllowVoice && (
            <button
              type="button"
              onClick={() => onToggleAllowVoice(!allowVoiceChat)}
              className="flex items-center gap-1 rounded-lg border border-white/10 bg-slate-900/60 px-2 py-1 text-[8.5px] font-bold uppercase tracking-wider text-slate-400 hover:text-white transition"
              title="Permitir ou proibir que espectadores entrem na chamada de voz"
            >
              <Shield size={10} className={allowVoiceChat ? 'text-emerald-400' : 'text-slate-500'} />
              <span>{allowVoiceChat ? 'Voz: ON' : 'Voz: OFF'}</span>
            </button>
          )}

          {!inVoice ? (
            <button
              type="button"
              onClick={handleJoinVoice}
              disabled={connecting}
              className={`flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-electric to-cyan-400 font-pixel font-bold text-slate-950 shadow-neon hover:scale-105 active:scale-95 transition disabled:opacity-50 cursor-pointer ${
                compact ? 'w-full py-2 text-[9px]' : 'px-4 py-2 text-[10px]'
              }`}
            >
              <Radio size={12} className={connecting ? 'animate-spin' : 'animate-pulse'} />
              <span>{connecting ? 'Conectando...' : 'Entrar na Voz'}</span>
            </button>
          ) : (
            <div className="flex items-center gap-1 w-full sm:w-auto justify-end">
              {/* Botão Mute Microfone */}
              <button
                type="button"
                onClick={handleToggleMute}
                className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition ${
                  isMuted
                    ? 'border-rose-500/40 bg-rose-500/15 text-rose-300 hover:bg-rose-500/25'
                    : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20'
                }`}
                title="Mutar/Desmutar Microfone (Atalho: tecla M)"
              >
                {isMuted ? <MicOff size={14} /> : <Mic size={14} />}
                <span>{isMuted ? 'Mutado' : 'Microfone'}</span>
              </button>

              {/* Botão Ensurdecer / Mute Saída */}
              <button
                type="button"
                onClick={handleToggleDeafen}
                className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition ${
                  isDeafened
                    ? 'border-amber-500/40 bg-amber-500/15 text-amber-300 hover:bg-amber-500/25'
                    : 'border-white/10 bg-slate-900/60 text-slate-300 hover:bg-slate-800'
                }`}
                title="Silenciar o áudio dos outros participantes"
              >
                {isDeafened ? <VolumeX size={14} /> : <Volume2 size={14} />}
                <span>{isDeafened ? 'Surdo' : 'Áudio'}</span>
              </button>

              {/* Botão Desconectar */}
              <button
                type="button"
                onClick={handleLeaveVoice}
                className="flex items-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-rose-300 hover:bg-rose-500/20 transition"
                title="Sair da sala de voz"
              >
                <PhoneOff size={14} />
                <span>Desconectar</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Exibição dos Participantes Conectados com Efeito de Fala */}
      {inVoice && peers.length > 0 && (
        <div className="mt-3 flex items-center gap-2 overflow-x-auto pt-2 border-t border-white/5">
          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 shrink-0">
            Na chamada:
          </span>

          <div className="flex items-center gap-2 flex-wrap">
            {peers.map((p) => {
              const isSpeaking = activeSpeakers.has(p.id) || p.isSpeaking
              const isSelf = p.id === currentUser?.id

              return (
                <div
                  key={p.id}
                  className={`flex items-center gap-2 rounded-lg border px-2.5 py-1 transition ${
                    isSpeaking
                      ? 'border-emerald-400/60 bg-emerald-500/20 text-emerald-200 shadow-[0_0_10px_rgba(16,185,129,0.25)]'
                      : 'border-white/10 bg-slate-950/60 text-slate-300'
                  }`}
                >
                  <div className="relative">
                    {p.photoURL ? (
                      <img
                        src={p.photoURL}
                        alt={p.name}
                        className={`h-5 w-5 rounded-full object-cover border ${
                          isSpeaking ? 'border-emerald-400 ring-2 ring-emerald-400/40' : 'border-white/15'
                        }`}
                      />
                    ) : (
                      <div
                        className={`flex h-5 w-5 items-center justify-center rounded-full bg-slate-800 text-[9px] font-bold border ${
                          isSpeaking ? 'border-emerald-400 text-emerald-300 ring-2 ring-emerald-400/40' : 'border-white/15 text-slate-400'
                        }`}
                      >
                        {p.name.charAt(0).toUpperCase()}
                      </div>
                    )}

                    {/* Ícone de mute sobreposto */}
                    {p.isMuted && (
                      <span className="absolute -bottom-1 -right-1 flex h-3 w-3 items-center justify-center rounded-full bg-rose-500 text-white">
                        <MicOff size={7} />
                      </span>
                    )}
                  </div>

                  <span className="text-[10px] font-semibold truncate max-w-[110px]">
                    {p.name} {isSelf && '(Você)'}
                  </span>

                  {/* Equalizador animado quando falando */}
                  {isSpeaking && (
                    <div className="flex items-end gap-0.5 h-3">
                      <span className="w-0.5 h-2 bg-emerald-400 animate-pulse rounded-full" />
                      <span className="w-0.5 h-3 bg-emerald-300 animate-bounce rounded-full" />
                      <span className="w-0.5 h-1.5 bg-emerald-400 animate-pulse rounded-full" />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {error && (
        <p className="mt-2 text-[10px] text-rose-300 flex items-center gap-1">
          <span>⚠️</span> {error}
        </p>
      )}
    </div>
  )
}

