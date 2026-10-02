import { Gamepad2, KeyRound, LoaderCircle, ShieldCheck, Trophy, X } from 'lucide-react'
import { useState } from 'react'
import { connectRetroAchievements } from '../profile/profileService'

export default function RetroAchievementsConnectModal({ isOpen, onClose, userProfile, onConnected, forceMandatory = false }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen) return null

  async function handleVerify(e) {
    e.preventDefault()
    const trimmed = username.trim()
    if (!trimmed || !userProfile?.id) return

    setError('')
    setLoading(true)
    let authenticatedAccount = null

    try {
      if (!window.zereiNative?.connectRetroAchievements) {
        throw new Error('O login oficial do RetroAchievements está disponível no aplicativo desktop.')
      }
      authenticatedAccount = await window.zereiNative.connectRetroAchievements({ username: trimmed, password })
      const saved = await connectRetroAchievements(userProfile.id, {
        username: authenticatedAccount.username,
        points: authenticatedAccount.points || 0,
        rank: authenticatedAccount.rank || 'Conta autenticada',
      })
      onConnected?.(saved)
      setPassword('')
      onClose?.()
    } catch (err) {
      if (authenticatedAccount?.username) {
        await window.zereiNative?.disconnectRetroAchievements?.(authenticatedAccount.username).catch(() => {})
      }
      setError(err.message || 'Conta do RetroAchievements não encontrada.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 px-4 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="w-full max-w-md rounded-3xl border border-electric/30 bg-panel p-6 shadow-neon sm:p-7">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-gold/40 bg-gold/15 text-gold">
              <Trophy size={20} />
            </span>
            <div>
              <p className="font-pixel text-[10px] uppercase tracking-wider text-gold">RetroAchievements</p>
              <h2 className="mt-1 font-pixel text-xs text-white">Vincular Conta Oficial</h2>
            </div>
          </div>

          {!forceMandatory && (
            <button type="button" onClick={onClose} aria-label="Fechar" className="text-slate-500 hover:text-white transition">
              <X size={18} />
            </button>
          )}
        </div>

        <p className="mt-4 text-xs leading-5 text-slate-300">
          Entre na sua conta para validar conquistas oficiais durante a emulação Libretro. Sua senha é usada somente para autenticar no RetroAchievements; o ZEREI! guarda apenas o token cifrado neste dispositivo.
        </p>

        <form onSubmit={handleVerify} className="mt-5 space-y-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Nome de usuário do RetroAchievements
              </label>
              <div className="relative mt-2">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Ex: SeuNickNoRA"
                  required
                  autoFocus
                  className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-3 text-xs font-bold text-white outline-none focus:border-electric/50"
                />
              </div>
              <label className="mt-3 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Senha do RetroAchievements
              </label>
              <div className="relative mt-2">
                <KeyRound size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Senha da sua conta RA"
                  required
                  autoComplete="current-password"
                  className="w-full rounded-xl border border-white/10 bg-slate-950/50 py-3 pl-9 pr-4 text-xs font-bold text-white outline-none focus:border-electric/50"
                />
              </div>
              <p className="mt-1.5 text-[10px] text-slate-500">
                A senha não é salva nem enviada aos servidores do ZEREI!.
              </p>
            </div>

            {error && (
              <div className="rounded-xl border border-rose-300/20 bg-rose-300/10 p-3 text-xs text-rose-200">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !username.trim() || !password}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-electric/40 bg-electric/15 py-3.5 text-xs font-bold uppercase tracking-wider text-electric transition hover:bg-electric/25 disabled:opacity-40"
            >
              {loading ? <LoaderCircle size={15} className="animate-spin" /> : <ShieldCheck size={15} />}
              {loading ? 'Verificando no RA...' : 'Verificar e Conectar'}
            </button>
        </form>

        <div className="mt-5 border-t border-white/5 pt-4 text-center">
          <a
            href="https://retroachievements.org"
            target="_blank"
            rel="noreferrer"
            className="text-[10px] text-slate-500 hover:text-electric transition"
          >
            Ainda não tem conta no RetroAchievements? Crie gratuitamente ↗
          </a>
        </div>
      </div>
    </div>
  )
}

