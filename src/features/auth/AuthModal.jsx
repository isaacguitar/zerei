import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ArrowRight, Lock, Mail, User, Loader2, AlertCircle, Sparkles } from 'lucide-react'
import {
  authProvider,
  signInWithGoogle,
  signInWithEmail,
  signUpWithEmail,
  signInDemo,
} from './authService'

export default function AuthModal({ isOpen, onClose, onSuccess, initialTab = 'email' }) {
  const [activeTab, setActiveTab] = useState(initialTab) // 'email' | 'register'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isOpen) {
      setError('')
      setLoading(false)
    }
  }, [isOpen])

  // Fecha com ESC
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) onClose?.()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const handleGoogleSignIn = async () => {
    if (authProvider !== 'firebase') {
      setError('O login com Google está disponível apenas quando o Firebase está configurado.')
      return
    }

    try {
      setLoading(true)
      setError('')
      const user = await signInWithGoogle()
      onSuccess?.(user)
      onClose?.()
    } catch (err) {
      console.error('Erro no login Google:', err)
      if (err.code === 'auth/config-not-set') {
        setError('O Firebase ainda não está configurado neste ambiente. Use o modo de demonstração.')
      } else if (err.code !== 'auth/popup-closed-by-user') {
        setError('Não foi possível conectar com o Google. Tente novamente.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleEmailSignIn = async (e) => {
    e?.preventDefault()
    if (!email || !password) {
      setError('Preencha seu e-mail e sua senha.')
      return
    }

    try {
      setLoading(true)
      setError('')
      const user = await signInWithEmail(email.trim(), password)
      onSuccess?.(user)
      onClose?.()
    } catch (err) {
      console.error('Erro no login Email:', err)
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        setError('E-mail ou senha incorretos.')
      } else if (err.code === 'auth/invalid-email') {
        setError('E-mail inválido.')
      } else {
        setError('Erro ao entrar. Verifique seus dados e tente novamente.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e) => {
    e?.preventDefault()
    if (!email || !password) {
      setError('Preencha todos os campos obrigatórios.')
      return
    }
    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.')
      return
    }

    try {
      setLoading(true)
      setError('')
      const nameToUse = displayName.trim() || email.split('@')[0]
      const user = await signUpWithEmail(nameToUse, email.trim(), password)
      onSuccess?.(user)
      onClose?.()
    } catch (err) {
      console.error('Erro no cadastro:', err)
      if (err.code === 'auth/email-already-in-use') {
        setError('Este e-mail já está cadastrado. Alterne para Entrar.')
      } else if (err.code === 'auth/weak-password') {
        setError('A senha deve ter no mínimo 6 caracteres.')
      } else {
        setError('Erro ao criar conta. Tente novamente.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleDemoSignIn = () => {
    try {
      setLoading(true)
      const session = signInDemo()
      onSuccess?.(session.user)
      onClose?.()
    } catch (err) {
      setError('Erro ao entrar no modo convidado.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4">
        {/* Backdrop com desfoque e escurecimento */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/75 backdrop-blur-xl"
        />

        {/* Card do Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="relative w-full max-w-[390px] overflow-hidden rounded-3xl border border-white/10 bg-[#0b1220] p-6 shadow-2xl text-slate-200"
          style={{
            boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.8), 0 0 35px rgba(0, 212, 255, 0.1)',
          }}
        >
          {/* Topo: Título + Botão Fechar */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-pixel text-[13px] tracking-tight text-white flex items-center gap-2">
                Entrar no Zerei<span className="text-gold">!</span>
              </h3>
              <p className="mt-1 text-xs text-slate-400">Conecte sua conta para continuar</p>
            </div>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
              aria-label="Fechar"
            >
              <X size={16} />
            </button>
          </div>

          {/* Atalho Social Superior: Botão Google (estilo square como na imagem de referência) */}
          <div className="mt-5 flex items-center justify-center gap-3">
            {authProvider === 'firebase' ? (
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="group relative flex h-12 flex-1 items-center justify-center gap-2.5 rounded-2xl border border-white/8 bg-white/[0.04] transition-all duration-200 hover:border-electric/50 hover:bg-white/[0.08] active:scale-95 disabled:opacity-50"
                title="Entrar com Google"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24">
                  <path
                    fill="#EA4335"
                    d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.4 1 3.5 3.6 1.6 7.4l3.7 2.9C6.2 7.3 8.9 5 12 5z"
                  />
                  <path
                    fill="#4285F4"
                    d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.3 14.7c-.2-.7-.4-1.5-.4-2.7s.1-2 .4-2.7L1.6 6.4C.6 8.3 0 10.1 0 12s.6 3.7 1.6 5.6l3.7-2.9z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3.1 0-5.8-2.3-6.7-5.3L1.6 16c1.9 3.8 5.8 7 10.4 7z"
                  />
                </svg>
                <span className="text-xs font-semibold text-white group-hover:text-electric transition-colors">
                  Google
                </span>
              </button>
            ) : (
              <div className="flex h-12 flex-1 items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-3 text-center text-[10px] uppercase tracking-[0.16em] text-slate-500">
                Modo demo
              </div>
            )}

            <button
              type="button"
              onClick={handleDemoSignIn}
              disabled={loading}
              className="group relative flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl border border-white/8 bg-white/[0.04] transition-all duration-200 hover:border-gold/50 hover:bg-white/[0.08] active:scale-95 disabled:opacity-50"
              title="Acesso de Convidado / Testes"
            >
              <Sparkles size={16} className="text-gold group-hover:scale-110 transition-transform" />
              <span className="text-xs font-semibold text-slate-300 group-hover:text-gold transition-colors">
                Convidado
              </span>
            </button>
          </div>

          {/* Abas Pílula Segmentadas (Email / Criar Conta) */}
          <div className="mt-4 flex rounded-xl border border-white/6 bg-black/40 p-1">
            <button
              type="button"
              onClick={() => { setActiveTab('email'); setError('') }}
              className={`relative flex-1 rounded-lg py-2 text-xs font-semibold transition-colors duration-200 ${
                activeTab === 'email' ? 'text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {activeTab === 'email' && (
                <motion.div
                  layoutId="auth-active-tab"
                  className="absolute inset-0 rounded-lg bg-white/10 shadow-sm"
                  transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                />
              )}
              <span className="relative z-10">Email</span>
            </button>

            <button
              type="button"
              onClick={() => { setActiveTab('register'); setError('') }}
              className={`relative flex-1 rounded-lg py-2 text-xs font-semibold transition-colors duration-200 ${
                activeTab === 'register' ? 'text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {activeTab === 'register' && (
                <motion.div
                  layoutId="auth-active-tab"
                  className="absolute inset-0 rounded-lg bg-white/10 shadow-sm"
                  transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                />
              )}
              <span className="relative z-10">Criar Conta</span>
            </button>
          </div>

          {/* Mensagem de Erro */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-3.5 flex items-center gap-2 rounded-xl border border-pixelRed/30 bg-pixelRed/10 px-3.5 py-2.5 text-xs text-rose-300"
            >
              <AlertCircle size={15} className="shrink-0 text-pixelRed" />
              <span>{error}</span>
            </motion.div>
          )}

          {/* Formulário */}
          <form
            onSubmit={activeTab === 'email' ? handleEmailSignIn : handleRegister}
            className="mt-4 space-y-3"
          >
            {activeTab === 'register' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="relative"
              >
                <input
                  type="text"
                  placeholder="Seu apelido / Nick gamer"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  disabled={loading}
                  className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-xs text-white placeholder-slate-500 transition-all focus:border-electric focus:outline-none focus:ring-1 focus:ring-electric"
                />
              </motion.div>
            )}

            <div className="relative flex items-center">
              <input
                type="email"
                placeholder="seu.email@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                required
                className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-xs text-white placeholder-slate-500 transition-all focus:border-electric focus:outline-none focus:ring-1 focus:ring-electric"
              />
            </div>

            <div className="relative flex items-center">
              <input
                type="password"
                placeholder={activeTab === 'register' ? 'Crie uma senha (mín. 6 dígitos)' : 'Sua senha'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                required
                className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 pr-12 text-xs text-white placeholder-slate-500 transition-all focus:border-electric focus:outline-none focus:ring-1 focus:ring-electric"
              />
              <button
                type="submit"
                disabled={loading}
                className="absolute right-1.5 flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-white transition-all hover:bg-electric hover:text-slate-950 active:scale-90 disabled:opacity-40"
                title="Continuar"
              >
                {loading ? <Loader2 size={15} className="animate-spin" /> : <ArrowRight size={15} />}
              </button>
            </div>
          </form>

          {/* Divisor "OU" */}
          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-white/10" />
            <span className="font-mono text-[10px] uppercase tracking-widest text-slate-500">OU</span>
            <div className="h-px flex-1 bg-white/10" />
          </div>

          {/* Botão de Destaque Inferior (CTA Principal) */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="flex w-full items-center justify-center gap-2.5 rounded-2xl bg-electric py-3.5 text-xs font-bold text-slate-950 shadow-lg shadow-electric/25 transition-all duration-200 hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <>
                <svg className="h-4 w-4" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14.5v-9l6 4.5-6 4.5z"
                  />
                </svg>
                <span>Conectar com Google</span>
              </>
            )}
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

