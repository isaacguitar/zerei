import { ChevronRight, Clock3 } from 'lucide-react'
import ProgressBar from '../../components/ui/ProgressBar'
import { getGameRetroMedia } from '../retro-achievements/gameMediaService'

/**
 * GameCard — card de jogo com moldura de cartucho retrô.
 * Props:
 *   title    {string}
 *   subtitle {string}
 *   clubName {string}  opcional: nome do clube
 *   image    {string}  URL da capa / fallback
 *   progress {number}  0–100
 *   members  {string}  ex: "3 / 15 membros"
 *   time     {string}  ex: "1 dia"
 *   accent   {string}  classes Tailwind para badge de rodada
 *   onOpen   {Function}
 */
export default function GameCard({
  title,
  subtitle,
  clubName,
  image,
  progress = 0,
  members,
  time,
  accent = 'border-cyan-400/55 bg-cyan-500/8 text-cyan-200',
  onOpen,
}) {
  const isCyan = accent?.includes('cyan')
  const media = getGameRetroMedia(title)
  const displayBanner = media.bannerUrl || image || media.boxArtUrl

  return (
    <article
      className="game-card group w-[260px] sm:w-[290px] shrink-0 snap-start cursor-pointer transition hover:-translate-y-1"
      onClick={onOpen}
    >
      {/* Thumbnail / Banner panorâmico do jogo */}
      <div className="relative h-36 overflow-hidden sm:h-40 bg-slate-950">
        {displayBanner ? (
          <img
            src={displayBanner}
            alt={`Banner de ${title}`}
            className="h-full w-full object-cover saturate-[0.85] transition duration-500 group-hover:scale-105 group-hover:saturate-100"
            onError={(e) => {
              e.currentTarget.style.display = 'none'
            }}
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-[#1a0f30] via-[#0e172a] to-[#071329] flex items-center justify-center">
            <span className="font-pixel text-2xl text-electric/40">ZEREI</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a1020] via-black/25 to-black/30" />

        {/* Badge de rodada / clube */}
        <div className="absolute left-2.5 top-2.5 flex items-center gap-1.5 flex-wrap">
          <span className={`rounded border px-1.5 py-0.5 text-[7.5px] font-bold tracking-widest uppercase ${accent}`}>
            Rodada atual
          </span>
          {clubName && (
            <span className="rounded border border-white/20 bg-slate-950/80 px-1.5 py-0.5 text-[7.5px] font-bold text-white backdrop-blur-sm truncate max-w-[130px]">
              {clubName}
            </span>
          )}
        </div>

        {/* Botão abrir */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            onOpen?.()
          }}
          className="absolute bottom-2.5 right-2.5 rounded-full bg-black/50 p-1.5 text-white backdrop-blur-sm transition hover:bg-electric/20 hover:text-electric"
          aria-label={`Abrir ${title}`}
        >
          <ChevronRight size={14} />
        </button>
      </div>

      {/* Info com Logo/Ícone do jogo junto ao nome */}
      <div className="p-3.5">
        <div className="flex items-center gap-2.5">
          <div className="relative shrink-0">
            {media.iconUrl ? (
              <img
                src={media.iconUrl}
                alt={`Ícone de ${title}`}
                className="h-9 w-9 rounded-lg border border-white/20 bg-slate-950 p-0.5 object-contain shadow-pixel"
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                }}
              />
            ) : (
              <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-electric/30 bg-slate-950 font-pixel text-xs text-electric">
                🎮
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[8.5px] font-bold tracking-wider text-slate-400 uppercase truncate">
              {subtitle || (clubName ? `Clube: ${clubName}` : 'Clube Retro')}
            </p>
            <h3 className="mt-0.5 font-pixel text-[9.5px] leading-4 text-white truncate" title={title}>
              {title}
            </h3>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between text-[9.5px]">
          <span className="text-slate-400 truncate">{members || 'Jogando agora'}</span>
          <span className="flex items-center gap-1 text-gold shrink-0">
            <Clock3 size={10} /> {time || 'Ativo'}
          </span>
        </div>
        <ProgressBar
          value={progress}
          color={isCyan ? 'bg-electric' : 'bg-synthwave'}
          className="mt-2"
        />
      </div>
    </article>
  )
}

