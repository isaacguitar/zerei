import { Gamepad2, LockKeyhole, Mail, Sparkles, UserPlus, Users } from 'lucide-react'
import { useState } from 'react'
import { authProvider, signInWithEmail, signInWithGoogle, signUpWithEmail } from './authService'

export default function AuthScreen({ onDemoSignIn }) {
  const [isSignUp, setIsSignUp] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (isSignUp) await signUpWithEmail(displayName.trim(), email.trim(), password)
      else await signInWithEmail(email.trim(), password)
    } catch (authError) {
      const messages = {
        'auth/email-already-in-use': 'Este e-mail já está cadastrado.',
        'auth/invalid-credential': 'E-mail ou senha inválidos.',
        'auth/weak-password': 'A senha precisa ter pelo menos 6 caracteres.',
        'auth/popup-closed-by-user': 'A janela de autenticação foi fechada.',
      }
      setError(messages[authError.code] || 'Não foi possível concluir a autenticação.')
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogleSignIn() {
    setError('')
    setLoading(true)
    try {
      await signInWithGoogle()
    } catch (authError) {
      const messages = {
        'auth/popup-closed-by-user': 'A janela de autenticação foi fechada antes da conclusão.',
        'auth/popup-blocked': 'O navegador bloqueou o popup. Permita popups para este endereço e tente novamente.',
        'auth/unauthorized-domain': `Este endereço não está autorizado no Firebase: ${window.location.hostname}.`,
        'auth/operation-not-allowed': 'O login com Google ainda não está ativado no Firebase Authentication.',
        'auth/account-exists-with-different-credential': 'Este e-mail já está ligado a outro método de login.',
        'auth/network-request-failed': 'Não foi possível conectar ao Firebase. Verifique sua internet.',
      }
      setError(messages[authError.code] || `Não foi possível entrar com Google (${authError.code || 'erro desconhecido'}).`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center overflow-hidden bg-ink px-4 py-8 text-slate-200">
      <div className="pointer-events-none absolute left-1/2 top-1/4 h-72 w-72 -translate-x-1/2 rounded-full bg-neon/10 blur-3xl" />
      <section className="relative w-full max-w-md rounded-3xl border border-white/10 bg-panel p-6 shadow-neon sm:p-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <p className="font-pixel text-[9px] uppercase tracking-[0.16em] text-electric">Clube de retrogaming</p>
            <h1 className="mt-3 font-pixel text-2xl text-white text-shadow">ZEREI<span className="text-gold">!</span></h1>
          </div>
          <span className="rounded-xl border border-neon/30 bg-neon/10 p-3 text-neon"><Gamepad2 size={22} /></span>
        </div>

        <div className="mb-8">
          <p className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-gold"><Sparkles size={13} /> Seu próximo continue</p>
          <h2 className="font-pixel text-sm leading-7 text-white">Jogue junto.<br /><span className="text-electric">Zere junto.</span></h2>
          <p className="mt-4 text-sm leading-6 text-slate-400">Entre para acompanhar suas rodadas, trocar dicas e jogar clássicos com a sua comunidade.</p>
        </div>

        {authProvider === 'firebase' ? <>
          <form onSubmit={handleSubmit} className="space-y-3">
            {isSignUp && <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} required minLength={2} placeholder="Seu nome" className="w-full rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-electric/50" />}
            <div className="relative"><Mail size={15} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" /><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required placeholder="seu@email.com" className="w-full rounded-xl border border-white/10 bg-slate-950/40 py-3 pl-10 pr-4 text-sm text-white outline-none placeholder:text-slate-600 focus:border-electric/50" /></div>
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={6} placeholder="Senha" className="w-full rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-electric/50" />
            {error && <p role="alert" className="text-[11px] leading-5 text-rose-300">{error}</p>}
            <button disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl border border-electric/40 bg-electric/15 px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-electric transition hover:bg-electric/25 disabled:cursor-wait disabled:opacity-60">{isSignUp ? <UserPlus size={16} /> : <Mail size={16} />} {loading ? 'Aguarde...' : isSignUp ? 'Criar minha conta' : 'Entrar'}</button>
          </form>
          <button type="button" onClick={handleGoogleSignIn} disabled={loading} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-200 transition hover:bg-white/10 disabled:opacity-60">Entrar com Google</button>
          <button type="button" onClick={() => { setIsSignUp((current) => !current); setError('') }} className="mt-4 w-full text-[10px] font-bold uppercase tracking-wider text-slate-500 hover:text-electric">{isSignUp ? 'Já tenho uma conta' : 'Criar uma conta'}</button>
        </> : <button onClick={onDemoSignIn} className="flex w-full items-center justify-center gap-2 rounded-xl border border-neon/40 bg-neon/15 px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-purple-100 transition hover:bg-neon/25"><Users size={16} /> Entrar no protótipo</button>}
        <div className="my-5 flex items-center gap-3 text-[10px] uppercase tracking-wider text-slate-600"><span className="h-px flex-1 bg-white/10" /> {authProvider === 'firebase' ? 'acesso seguro' : 'acesso local'} <span className="h-px flex-1 bg-white/10" /></div>
        <div className="flex items-start gap-3 rounded-xl border border-white/10 bg-slate-950/30 p-3 text-[11px] leading-5 text-slate-500"><LockKeyhole size={15} className="mt-0.5 shrink-0 text-emerald-300" /><span>Suas ROMs nunca são enviadas. O modo BYOR lê os arquivos localmente no navegador.</span></div>
        <p className="mt-5 text-center text-[10px] text-slate-600">Provedor atual: <span className="text-slate-400">{authProvider === 'firebase' ? 'Firebase Authentication' : 'sessão de demonstração'}</span></p>
      </section>
    </main>
  )
}
