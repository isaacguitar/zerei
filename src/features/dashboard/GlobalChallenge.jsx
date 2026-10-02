import { Flame, Sparkles, Trophy, Zap } from 'lucide-react'
import { useEffect, useState } from 'react'
import ProgressBar from '../../components/ui/ProgressBar'
import { getGameRetroMedia } from '../retro-achievements/gameMediaService'
import { subscribeToGlobalChallenge } from '../admin/adminService'

/**
 * GlobalChallenge — faixa de desafio comunitário dinâmica em tempo real.
 * Gerenciada pelo Painel de Administrador (Backoffice).
 */
export default function GlobalChallenge({ onAction }) {
  const [challenge, setChallenge] = useState(null)

  useEffect(() => {
    const unsub = subscribeToGlobalChallenge(setChallenge)
    return () => unsub()
  }, [])

  // Se não estiver ativo ou não configurado, exibe desafio padrão amigável
  const title = challenge?.title || 'Super Mario World: 10.000 moedas'
  const gameTitle = challenge?.gameTitle || 'Super Mario World'
  const description = challenge?.description || 'A comunidade está quase lá. Cada moeda conta!'
  const current = challenge?.currentValue ?? 8450
  const target = challenge?.targetValue ?? 10000
  const unit = challenge?.unit || 'moedas'
  const rewardXp = challenge?.rewardXp || 500
  const isActive = challenge?.active !== false

  if (!isActive) return null

  const percent = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0
  const gameMedia = getGameRetroMedia(gameTitle)

  return (
    <section className="relative overflow-hidden rounded-3xl border border-synthwave/25 bg-gradient-to-r from-[#200e40] via-[#14163a] to-[#0d2648] p-5 crt-glow sm:p-6 shadow-pixel transition hover:border-synthwave/40">
      {/* Imagem de fundo sutil do jogo */}
      {gameMedia.bannerUrl && (
        <img
          src={gameMedia.bannerUrl}
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-10 mix-blend-luminosity"
        />
      )}

      {/* Blur decorativo */}
      <div className="pointer-events-none absolute -right-4 -top-8 h-32 w-32 rounded-full bg-electric/8 blur-3xl" />
      <div className="pointer-events-none absolute -left-6 bottom-0 h-24 w-24 rounded-full bg-synthwave/10 blur-2xl" />

      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          {/* Logo / Ícone oficial do jogo do RetroAchievements */}
          <div className="relative shrink-0">
            <img
              src={gameMedia.iconUrl || 'https://media.retroachievements.org/Images/000001.png'}
              alt={gameTitle}
              className="h-13 w-13 rounded-2xl border-2 border-gold/50 bg-slate-950/80 p-0.5 shadow-pixel object-contain"
            />
            <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border border-gold/60 bg-gold/20 text-gold backdrop-blur-sm">
              <Trophy size={11} />
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <p className="font-pixel text-[9px] text-gold">Desafio global</p>
              <span className="rounded bg-white/8 px-2 py-0.5 text-[8px] font-bold text-white/60 uppercase">
                {percent >= 100 ? 'CONCLUÍDO' : 'EM ANDAMENTO'}
              </span>
              {rewardXp > 0 && (
                <span className="rounded bg-amber-500/20 px-1.5 py-0.5 font-pixel text-[8px] text-amber-300 border border-amber-500/30">
                  +{rewardXp} XP COLETIVO
                </span>
              )}
            </div>
            <h2 className="mt-1 font-pixel text-[11px] leading-5 text-white sm:text-[13px]">
              {title}
            </h2>
            <p className="mt-1 text-xs text-slate-400">{description}</p>
          </div>
        </div>

        <div className="w-full shrink-0 sm:w-48">
          <div className="mb-2 flex items-end justify-between">
            <span className="font-pixel text-[11px] text-electric">
              {current.toLocaleString('pt-BR')} {unit}
            </span>
            <span className="text-[10px] text-slate-400">
              / {target.toLocaleString('pt-BR')}
            </span>
          </div>
          <ProgressBar value={percent} color="bg-gradient-to-r from-electric to-synthwave" segmented />
          <p className="mt-1.5 text-right text-[9px] text-slate-400">{percent}% completo</p>
        </div>
      </div>
    </section>
  )
}
