import {
  AlertCircle,
  Check,
  Eye,
  Gamepad2,
  Lock,
  Maximize2,
  MessageSquare,
  Minimize2,
  Radio,
  ShieldCheck,
  Sparkles,
  Tv,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { getCurrentUser } from '../auth/authService'
import { connectSpectatorStream } from './spectatorStreamService'

export default function SpectatorCanvas({
  roomId,
  gameTitle = 'Jogo Retrô',
  hostName = 'Jogador',
  gameCoverUrl = null,
  allowChat = true,
  onOpenChat = null,
}) {
  const [streamStatus, setStreamStatus] = useState('connecting') // 'connecting' | 'streaming' | 'fallback' | 'disconnected'
  const [remoteStream, setRemoteStream] = useState(null)
  const [isMuted, setIsMuted] = useState(false)
  const [volume, setVolume] = useState(0.8)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const containerRef = useRef(null)
  const videoRef = useRef(null)
  const currentUser = getCurrentUser()

  useEffect(() => {
    if (!roomId || !currentUser?.id) return

    const disconnect = connectSpectatorStream(
      roomId,
      currentUser,
      (stream) => {
        setRemoteStream(stream)
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play().catch(() => {})
        }
      },
      (status) => {
        setStreamStatus(status)
      }
    )

    return () => {
      disconnect()
    }
  }, [roomId, currentUser?.id])

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume
      videoRef.current.muted = isMuted
    }
  }, [volume, isMuted])

  function handleToggleFullscreen() {
    if (!containerRef.current) return
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen?.().then(() => setIsFullscreen(true)).catch(() => {})
    } else {
      document.exitFullscreen?.().then(() => setIsFullscreen(false)).catch(() => {})
    }
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-panel p-4 shadow-pixel sm:p-5">
      {/* Header do Espectador */}
      <div className="mb-4 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-400">
              Modo Espectador · Ao Vivo
            </p>
          </div>
          <h2 className="mt-1 font-pixel text-xs text-white">
            Assistindo à gameplay de {hostName}
          </h2>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-emerald-300">
            <ShieldCheck size={12} />
            <span className="text-[9px] font-bold uppercase tracking-wider">Canvas Direto · Sem Captura de Tela</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-full border border-cyan-500/40 bg-cyan-500/10 px-3 py-1 text-cyan-300">
            <Eye size={12} />
            <span className="font-pixel text-[9px] uppercase tracking-wider">
              {streamStatus === 'streaming' ? 'Transmissão Ativa' : 'Conectando ao Host'}
            </span>
          </div>
          <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-slate-950/40 px-3 py-1 text-slate-400">
            <Lock size={11} className="text-amber-400" />
            <span className="text-[9px] font-bold uppercase tracking-wider">Trava de 1 Jogador</span>
          </div>
        </div>
      </div>

      {/* Área da Tela / Vídeo WebRTC do Canvas do Host */}
      <div ref={containerRef} className="relative mx-auto flex aspect-[4/3] w-full max-w-[720px] items-center justify-center overflow-hidden rounded-xl border-4 border-slate-950 bg-[#070b14] shadow-2xl group">
        {/* Elemento de Vídeo com o Stream do Canvas do Host */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isMuted}
          className={`h-full w-full object-contain ${streamStatus === 'streaming' ? 'block' : 'hidden'}`}
        />

        {/* Fallback visual quando o stream está conectando ou em espera */}
        {streamStatus !== 'streaming' && (
          <div className="relative z-10 flex flex-col items-center justify-center p-6 text-center">
            {gameCoverUrl ? (
              <img
                src={gameCoverUrl}
                alt={gameTitle}
                className="h-28 w-28 rounded-2xl object-contain bg-slate-950/80 border-2 border-cyan-400/30 p-1 shadow-pixel mb-4 animate-pulse"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-cyan-500/10 border border-cyan-400/30 text-cyan-400 mb-4 animate-pulse">
                <Tv size={36} />
              </div>
            )}

            <div className="flex items-center gap-2 text-cyan-400 mb-1">
              <Radio size={16} className="animate-pulse" />
              <span className="font-pixel text-xs">Quartinho Gamer de {hostName}</span>
            </div>
            <p className="font-pixel text-[10px] text-white max-w-sm mt-1">
              {gameTitle}
            </p>
            <p className="text-[11px] text-slate-400 mt-2 max-w-xs">
              {streamStatus === 'connecting'
                ? 'Estabelecendo conexão direta com o host...'
                : 'O jogador está na sala. O sinal de transmissão começará assim que a sessão iniciar.'}
            </p>
            <div className="mt-4 flex items-center gap-2 rounded-full border border-white/10 bg-slate-950/60 px-3.5 py-1.5 text-[10px] text-slate-400">
              <Lock size={12} className="text-amber-400 shrink-0" />
              <span>Controles desabilitados no modo espectador</span>
            </div>
          </div>
        )}

        {/* Linhas CRT e efeito retrô */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.4)_100%)]" />

        {/* Barra Flutuante de Controles do Espectador (Volume e Tela Cheia) */}
        {streamStatus === 'streaming' && (
          <div className="absolute bottom-3 right-3 z-20 flex items-center gap-2 rounded-xl bg-slate-950/80 px-2.5 py-1.5 text-white backdrop-blur-md border border-white/10 opacity-90 transition hover:opacity-100">
            {/* Controle de Volume com Slider */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setIsMuted((m) => !m)}
                className="text-slate-300 hover:text-white transition"
                title={isMuted ? 'Ativar áudio' : 'Mutar áudio'}
              >
                {isMuted || volume === 0 ? <VolumeX size={15} /> : <Volume2 size={15} />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={(e) => {
                  const val = parseFloat(e.target.value)
                  setVolume(val)
                  if (val > 0 && isMuted) setIsMuted(false)
                }}
                className="h-1 w-14 accent-cyan-400 cursor-pointer"
                title={`Volume do jogo: ${Math.round((isMuted ? 0 : volume) * 100)}%`}
              />
            </div>

            <div className="h-3 w-px bg-white/15" />

            {/* Tela Cheia */}
            <button
              type="button"
              onClick={handleToggleFullscreen}
              className="text-slate-300 hover:text-white transition"
              title={isFullscreen ? 'Sair da tela cheia' : 'Tela cheia'}
            >
              {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            </button>
          </div>
        )}
      </div>

      {/* Barra de Ações do Espectador */}
      <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-white/5">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <MessageSquare size={14} className={allowChat ? 'text-electric' : 'text-slate-600'} />
          <span>
            {allowChat
              ? 'Chat com o jogador liberado! Envie mensagens para conversar e torcer.'
              : 'O jogador desativou mensagens no chat para manter o foco total.'}
          </span>
        </div>

        {allowChat && onOpenChat && (
          <button
            type="button"
            onClick={onOpenChat}
            className="flex items-center gap-1.5 rounded-xl border border-electric/40 bg-electric/10 px-4 py-2 text-xs font-bold text-electric hover:bg-electric/20 transition shrink-0"
          >
            <MessageSquare size={13} />
            <span>Abrir Chat da Sala</span>
          </button>
        )}
      </div>
    </section>
  )
}

