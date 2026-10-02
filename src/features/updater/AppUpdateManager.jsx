import { useEffect, useState } from 'react'
import {
  DownloadCloud,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  X,
  ExternalLink,
  ChevronRight,
  Info,
} from 'lucide-react'
import { CHANGELOG_HISTORY, CURRENT_APP_VERSION } from './changelogData'

export default function AppUpdateManager() {
  const [updaterState, setUpdaterState] = useState({
    status: 'idle', // 'idle' | 'checking' | 'available' | 'downloading' | 'downloaded' | 'error'
    version: '',
    percent: 0,
    releaseNotes: '',
    error: '',
  })
  const [showChangelogModal, setShowChangelogModal] = useState(false)
  const [currentVersion, setCurrentVersion] = useState(CURRENT_APP_VERSION)
  const [toastDismissed, setToastDismissed] = useState(false)

  // 1. Detecta versão instalada e abre changelog se for a primeira vez nessa versão
  useEffect(() => {
    async function checkVersionChangelog() {
      let activeVer = CURRENT_APP_VERSION
      if (typeof window !== 'undefined' && window.zereiNative?.getAppVersion) {
        try {
          const nativeVer = await window.zereiNative.getAppVersion()
          if (nativeVer) activeVer = nativeVer
        } catch {}
      }
      setCurrentVersion(activeVer)

      const lastSeen = localStorage.getItem('zerei:last_seen_version')
      if (lastSeen !== activeVer) {
        // Nova versão detectada após atualização! Abre o pop-up com as novidades
        setShowChangelogModal(true)
      }
    }

    checkVersionChangelog()
  }, [])

  // 2. Escuta eventos do electron-updater (download automático em segundo plano)
  useEffect(() => {
    if (typeof window === 'undefined' || !window.zereiNative?.onUpdaterStatus) return

    const unsubscribe = window.zereiNative.onUpdaterStatus((event) => {
      if (!event) return
      setUpdaterState((prev) => ({
        ...prev,
        status: event.status || prev.status,
        version: event.version || prev.version,
        percent: event.percent !== undefined ? event.percent : prev.percent,
        releaseNotes: event.releaseNotes || prev.releaseNotes,
        error: event.message || prev.error,
      }))

      if (event.status === 'downloading' || event.status === 'downloaded') {
        setToastDismissed(false)
      }
    })

    return () => unsubscribe?.()
  }, [])

  function handleDismissChangelog() {
    localStorage.setItem('zerei:last_seen_version', currentVersion)
    setShowChangelogModal(false)
  }

  function handleRestartAndInstall() {
    if (window.zereiNative?.installUpdate) {
      window.zereiNative.installUpdate()
    }
  }

  const currentChangelog = CHANGELOG_HISTORY[currentVersion] || CHANGELOG_HISTORY[CURRENT_APP_VERSION]

  return (
    <>
      {/* ── BANNER DISCRETO DE ATUALIZAÇÃO EM SEGUNDO PLANO ──────────────── */}
      {!toastDismissed && (updaterState.status === 'downloading' || updaterState.status === 'downloaded') && (
        <div className="fixed bottom-4 right-4 z-[99998] flex items-center gap-3 rounded-2xl border border-cyan-400/40 bg-slate-950/95 p-4 shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom duration-300 max-w-sm">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-300">
            {updaterState.status === 'downloading' ? (
              <RefreshCw size={20} className="animate-spin text-cyan-400" />
            ) : (
              <CheckCircle2 size={20} className="text-emerald-400" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-white">
              {updaterState.status === 'downloading'
                ? `Baixando atualização ${updaterState.version ? `v${updaterState.version}` : ''}...`
                : `ZEREI! v${updaterState.version || currentVersion} pronto!`}
            </p>
            <p className="text-[10px] text-slate-300">
              {updaterState.status === 'downloading'
                ? `${updaterState.percent}% concluído em segundo plano`
                : 'A atualização será instalada ao reiniciar o aplicativo.'}
            </p>
            {updaterState.status === 'downloaded' && (
              <button
                type="button"
                onClick={handleRestartAndInstall}
                className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-cyan-400 px-3 py-1 font-pixel text-[9px] font-bold text-slate-950 hover:brightness-110"
              >
                <RefreshCw size={11} /> Reiniciar agora
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => setToastDismissed(true)}
            className="text-slate-500 hover:text-slate-300"
            title="Fechar aviso"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* ── MODAL DE NOVIDADES / CHANGELOG APÓS ATUALIZAÇÃO ──────────────── */}
      {showChangelogModal && (
        <div
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
          aria-labelledby="changelog-title"
        >
          <div className="relative w-full max-w-lg rounded-2xl border border-white/10 bg-[#090d1a] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            {/* Cabeçalho */}
            <div className="flex items-center justify-between border-b border-white/10 p-5 bg-gradient-to-r from-electric/10 via-transparent to-transparent">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-electric/20 text-electric border border-electric/40 shadow-[0_0_15px_rgba(0,212,255,0.25)]">
                  <Sparkles size={22} />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-md border border-cyan-400/40 bg-cyan-500/20 px-2 py-0.5 font-pixel text-[9px] uppercase tracking-wider text-cyan-300">
                      Atualização Concluída
                    </span>
                    <span className="font-pixel text-[10px] text-gold">v{currentVersion}</span>
                  </div>
                  <h2 id="changelog-title" className="mt-1 font-pixel text-sm text-white">
                    {currentChangelog?.title || 'O que há de novo no ZEREI!'}
                  </h2>
                </div>
              </div>
              <button
                type="button"
                onClick={handleDismissChangelog}
                className="text-slate-400 hover:text-white transition p-1"
                title="Fechar"
              >
                <X size={18} />
              </button>
            </div>

            {/* Conteúdo com os destaques e melhorias */}
            <div className="p-5 overflow-y-auto space-y-3 flex-1 text-slate-300 text-xs">
              <p className="text-slate-400 leading-relaxed">
                Seu aplicativo foi atualizado com sucesso para a versão <strong className="text-white">v{currentVersion}</strong>. Veja o que mudou:
              </p>

              <div className="space-y-2.5 mt-3">
                {(currentChangelog?.highlights || []).map((item, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl border border-white/8 bg-slate-950/60 p-3.5 transition hover:border-white/15"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded px-1.5 py-0.5 font-pixel text-[8px] uppercase tracking-wider ${
                          item.color === 'cyan'
                            ? 'border border-cyan-400/40 bg-cyan-500/20 text-cyan-300'
                            : item.color === 'amber'
                            ? 'border border-amber-500/40 bg-amber-500/20 text-amber-300'
                            : item.color === 'emerald'
                            ? 'border border-emerald-500/40 bg-emerald-500/20 text-emerald-300'
                            : 'border border-purple-500/40 bg-purple-500/20 text-purple-300'
                        }`}
                      >
                        {item.tag}
                      </span>
                      <h4 className="font-pixel text-[11px] text-white">{item.title}</h4>
                    </div>
                    <p className="mt-1.5 text-[11px] leading-relaxed text-slate-300">
                      {item.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Rodapé */}
            <div className="border-t border-white/10 p-4 bg-white/[0.02] flex items-center justify-between">
              <span className="text-[10px] text-slate-500 flex items-center gap-1">
                <Info size={12} /> Atualizações gerenciadas via GitHub
              </span>
              <button
                type="button"
                onClick={handleDismissChangelog}
                className="inline-flex items-center gap-2 rounded-xl bg-electric px-5 py-2.5 text-xs font-bold text-slate-950 hover:brightness-110 transition shadow-pixel cursor-pointer"
              >
                <span>Entendi, vamos jogar!</span>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

