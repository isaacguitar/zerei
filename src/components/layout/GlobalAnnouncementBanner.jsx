import {
  AlertTriangle,
  ChevronRight,
  ExternalLink,
  Flame,
  Info,
  PartyPopper,
  Sparkles,
  X,
  Zap,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { subscribeToSystemSettings, subscribeToTopAnnouncement } from '../../features/admin/adminService'

export default function GlobalAnnouncementBanner() {
  const [announcement, setAnnouncement] = useState(null)
  const [system, setSystem] = useState(null)
  const [dismissedId, setDismissedId] = useState(null)

  useEffect(() => {
    const unsubAnn = subscribeToTopAnnouncement(setAnnouncement)
    const unsubSys = subscribeToSystemSettings(setSystem)
    return () => {
      unsubAnn()
      unsubSys()
    }
  }, [])

  const hasAnnouncement = announcement?.active && announcement?.message && dismissedId !== announcement?.message
  const hasDoubleXp = system?.doubleXpActive

  if (!hasAnnouncement && !hasDoubleXp) return null

  return (
    <div className="relative z-40 w-full overflow-hidden bg-gradient-to-r from-purple-950 via-slate-950 to-purple-950 border-b border-purple-500/30 text-xs shadow-lg">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-2 sm:px-6">
        <div className="flex flex-1 items-center gap-3 min-w-0">
          {/* Badge 2x XP */}
          {hasDoubleXp && (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-amber-400/50 bg-gradient-to-r from-amber-500/20 to-orange-500/20 px-2.5 py-0.5 font-pixel text-[8px] font-bold text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.3)] animate-pulse">
              <Zap size={11} className="text-gold" />
              <span>{system?.doubleXpLabel || '2X XP ATIVO'}</span>
            </span>
          )}

          {/* Aviso Global Oficial */}
          {hasAnnouncement && (
            <div className="flex items-center gap-2 min-w-0">
              {announcement.type === 'alert' || announcement.type === 'warning' ? (
                <AlertTriangle size={14} className="text-amber-400 shrink-0" />
              ) : announcement.type === 'celebration' ? (
                <PartyPopper size={14} className="text-pink-400 shrink-0" />
              ) : (
                <Info size={14} className="text-cyan-400 shrink-0" />
              )}

              <p className="truncate text-slate-200 text-xs">
                {announcement.message}
              </p>

              {announcement.linkUrl && (
                <a
                  href={announcement.linkUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-bold text-electric hover:underline shrink-0 text-[11px]"
                >
                  <span>{announcement.linkLabel || 'Saiba mais'}</span>
                  <ExternalLink size={10} />
                </a>
              )}
            </div>
          )}
        </div>

        {hasAnnouncement && (
          <button
            onClick={() => setDismissedId(announcement.message)}
            className="rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-white transition shrink-0"
            title="Dispensar aviso"
          >
            <X size={14} />
          </button>
        )}
      </div>
    </div>
  )
}

