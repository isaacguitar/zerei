import { Crown, Flame, Medal, Sparkles, Star, Trophy, Zap } from 'lucide-react'

/**
 * Badge retrô de posição para tabelas e listas
 */
export function RankBadge({ position, size = 'md' }) {
  if (position === 1) {
    return (
      <span className="inline-flex items-center gap-1 rounded-lg border border-amber-400/60 bg-gradient-to-r from-amber-500/25 to-yellow-500/15 px-2.5 py-1 text-amber-300 shadow-neon">
        <Crown size={size === 'sm' ? 12 : 14} className="text-gold animate-bounce" />
        <span className="font-pixel text-[9px] font-bold uppercase tracking-wider text-gold">1º</span>
      </span>
    )
  }

  if (position === 2) {
    return (
      <span className="inline-flex items-center gap-1 rounded-lg border border-slate-300/50 bg-gradient-to-r from-slate-300/20 to-slate-400/10 px-2.5 py-1 text-slate-200">
        <Medal size={size === 'sm' ? 12 : 14} className="text-slate-300" />
        <span className="font-pixel text-[9px] font-bold uppercase tracking-wider text-slate-200">2º</span>
      </span>
    )
  }

  if (position === 3) {
    return (
      <span className="inline-flex items-center gap-1 rounded-lg border border-amber-700/60 bg-gradient-to-r from-amber-700/25 to-amber-800/15 px-2.5 py-1 text-amber-400">
        <Medal size={size === 'sm' ? 12 : 14} className="text-amber-500" />
        <span className="font-pixel text-[9px] font-bold uppercase tracking-wider text-amber-400">3º</span>
      </span>
    )
  }

  return (
    <span className="inline-flex items-center justify-center rounded-lg border border-white/10 bg-slate-950/50 px-2 py-0.5 font-mono text-[10px] font-bold text-slate-400">
      #{position}
    </span>
  )
}

/**
 * Retorna a URL do avatar do jogador com fallback robusto no DiceBear
 */
export function getPlayerAvatar(player) {
  if (player?.avatarUrl && typeof player.avatarUrl === 'string' && player.avatarUrl.trim() !== '') {
    return player.avatarUrl
  }
  const seed = encodeURIComponent(player?.displayName || player?.userId || player?.id || 'Jogador')
  return `https://api.dicebear.com/7.x/pixel-art/svg?seed=${seed}`
}

/**
 * Pódio Olímpico Retrô Top 3 (1º no centro elevado, 2º à esquerda, 3º à direita)
 */
export function Top3Podium({ players = [], metricLabel = 'jogos zerados', metricKey = 'gamesBeatenCount', pointsKey = 'seasonPoints' }) {
  if (!players || players.length === 0) return null

  const first = players[0]
  const second = players[1]
  const third = players[2]

  return (
    <div className="relative mx-auto my-6 flex max-w-2xl items-end justify-center gap-2 sm:gap-4 px-2 pt-8">
      {/* 2º Lugar (Esquerda) */}
      {second && (
        <div className="flex w-1/3 flex-col items-center">
          <div className="relative mb-2 flex flex-col items-center">
            <span className="mb-1 rounded-full border border-slate-400/40 bg-slate-800/80 px-2 py-0.5 font-pixel text-[8px] font-bold text-slate-300">
              🥈 2º LUGAR
            </span>
            <div className="relative">
              <img
                src={getPlayerAvatar(second)}
                alt={second.displayName}
                onError={(e) => {
                  e.currentTarget.onerror = null
                  e.currentTarget.src = `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(second.displayName || 'Jogador')}`
                }}
                className="h-14 w-14 sm:h-16 sm:w-16 rounded-2xl border-2 border-slate-300 bg-slate-900 object-cover shadow-lg"
              />
              <span className="absolute -bottom-1 -right-1 rounded-full bg-slate-700 p-1 text-slate-200 border border-slate-500">
                <Medal size={11} />
              </span>
            </div>
            <p className="mt-2 text-center text-xs font-bold text-white truncate max-w-[100px] sm:max-w-[130px]">
              {second.displayName}
            </p>
            <p className="font-pixel text-[10px] text-slate-300 mt-0.5">
              {second[metricKey] ?? 0} <span className="text-[8px] font-sans text-slate-400">{metricLabel}</span>
            </p>
            {(second[pointsKey] !== undefined) && (
              <p className="text-[9px] font-bold text-electric">
                ⚡ {second[pointsKey]} pts
              </p>
            )}
          </div>
          {/* Base do Pódio 2º Lugar */}
          <div className="flex h-24 sm:h-28 w-full flex-col items-center justify-center rounded-t-2xl border-t-2 border-x-2 border-slate-400/40 bg-gradient-to-b from-slate-700/40 via-slate-800/60 to-slate-950/80 shadow-pixel">
            <span className="font-pixel text-2xl sm:text-3xl font-bold text-slate-300/80">2</span>
            <span className="text-[8px] font-bold uppercase tracking-wider text-slate-400">Vice</span>
          </div>
        </div>
      )}

      {/* 1º Lugar (Centro Elevado) */}
      {first && (
        <div className="flex w-1/3 flex-col items-center -mt-6">
          <div className="relative mb-2 flex flex-col items-center">
            {/* Coroa Pixel Dourada Flutuante */}
            <div className="flex items-center gap-1 rounded-full border border-gold/60 bg-gradient-to-r from-amber-500/30 via-yellow-400/20 to-amber-500/30 px-3 py-1 text-gold shadow-neon animate-pulse mb-1">
              <Crown size={13} className="text-gold" />
              <span className="font-pixel text-[8px] font-bold uppercase tracking-wider">CAMPEÃO</span>
            </div>
            <div className="relative">
              <img
                src={getPlayerAvatar(first)}
                alt={first.displayName}
                onError={(e) => {
                  e.currentTarget.onerror = null
                  e.currentTarget.src = `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(first.displayName || 'Jogador')}`
                }}
                className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl border-2 border-gold bg-slate-900 object-cover shadow-neon"
              />
              <span className="absolute -bottom-1 -right-1 rounded-full bg-amber-500 p-1 text-slate-950 border border-amber-300 shadow-md">
                <Crown size={13} />
              </span>
            </div>
            <p className="mt-2 text-center text-xs sm:text-sm font-bold text-gold truncate max-w-[110px] sm:max-w-[140px]">
              {first.displayName}
            </p>
            <p className="font-pixel text-[11px] text-white mt-0.5">
              {first[metricKey] ?? 0} <span className="text-[8px] font-sans text-slate-400">{metricLabel}</span>
            </p>
            {(first[pointsKey] !== undefined) && (
              <p className="text-[10px] font-bold text-gold flex items-center gap-1">
                <Zap size={10} /> {first[pointsKey]} pts
              </p>
            )}
          </div>
          {/* Base do Pódio 1º Lugar */}
          <div className="flex h-32 sm:h-36 w-full flex-col items-center justify-center rounded-t-2xl border-t-2 border-x-2 border-gold/60 bg-gradient-to-b from-amber-500/25 via-amber-600/15 to-slate-950/90 shadow-neon">
            <span className="font-pixel text-3xl sm:text-4xl font-bold text-gold">1</span>
            <span className="text-[9px] font-bold uppercase tracking-wider text-amber-300">Líder</span>
          </div>
        </div>
      )}

      {/* 3º Lugar (Direita) */}
      {third && (
        <div className="flex w-1/3 flex-col items-center">
          <div className="relative mb-2 flex flex-col items-center">
            <span className="mb-1 rounded-full border border-amber-700/50 bg-amber-950/60 px-2 py-0.5 font-pixel text-[8px] font-bold text-amber-400">
              🥉 3º LUGAR
            </span>
            <div className="relative">
              <img
                src={getPlayerAvatar(third)}
                alt={third.displayName}
                onError={(e) => {
                  e.currentTarget.onerror = null
                  e.currentTarget.src = `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(third.displayName || 'Jogador')}`
                }}
                className="h-14 w-14 sm:h-16 sm:w-16 rounded-2xl border-2 border-amber-600 bg-slate-900 object-cover shadow-lg"
              />
              <span className="absolute -bottom-1 -right-1 rounded-full bg-amber-800 p-1 text-amber-200 border border-amber-600">
                <Medal size={11} />
              </span>
            </div>
            <p className="mt-2 text-center text-xs font-bold text-white truncate max-w-[100px] sm:max-w-[130px]">
              {third.displayName}
            </p>
            <p className="font-pixel text-[10px] text-amber-300 mt-0.5">
              {third[metricKey] ?? 0} <span className="text-[8px] font-sans text-slate-400">{metricLabel}</span>
            </p>
            {(third[pointsKey] !== undefined) && (
              <p className="text-[9px] font-bold text-electric">
                ⚡ {third[pointsKey]} pts
              </p>
            )}
          </div>
          {/* Base do Pódio 3º Lugar */}
          <div className="flex h-20 sm:h-24 w-full flex-col items-center justify-center rounded-t-2xl border-t-2 border-x-2 border-amber-700/50 bg-gradient-to-b from-amber-800/30 via-amber-900/40 to-slate-950/80 shadow-pixel">
            <span className="font-pixel text-xl sm:text-2xl font-bold text-amber-400/80">3</span>
            <span className="text-[8px] font-bold uppercase tracking-wider text-amber-500">Bronze</span>
          </div>
        </div>
      )}
    </div>
  )
}

