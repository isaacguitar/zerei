import {
  ChevronDown,
  Maximize2,
  MessageCircle,
  Minimize2,
  Minus,
  Send,
  Sparkles,
  Users,
  X,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { getCurrentUser } from '../auth/authService'
import { sendMessage, subscribeToChat } from '../game-room/chatService'

export default function ClubFloatingChat({
  clubId,
  clubName = 'Chat da Sala',
  onlineMembers = [],
  initialMode = 'expanded', // 'minimized' | 'compact' | 'expanded'
  onModeChange,
}) {
  const [mode, setMode] = useState(initialMode) // 'minimized' | 'compact' | 'expanded'
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  const messagesEndRef = useRef(null)
  const previousLengthRef = useRef(0)
  const currentUser = getCurrentUser()

  useEffect(() => {
    onModeChange?.(mode)
  }, [mode, onModeChange])

  // Escutar mensagens do chat
  useEffect(() => {
    if (!clubId) return
    const unsubscribe = subscribeToChat(clubId, (list) => {
      setMessages(list)

      // Se estiver minimizado e chegar mensagem nova, incrementa badge
      if (mode === 'minimized' && list.length > previousLengthRef.current) {
        setUnreadCount((prev) => prev + (list.length - previousLengthRef.current))
      }
      previousLengthRef.current = list.length

      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      }, 50)
    })
    return () => unsubscribe()
  }, [clubId, mode])

  // Ao abrir o chat, zera unreadCount e dá scroll
  useEffect(() => {
    if (mode !== 'minimized') {
      setUnreadCount(0)
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      }, 50)
    }
  }, [mode])

  async function handleSend(e) {
    e?.preventDefault()
    if (!text.trim() || sending) return
    const msg = text
    setText('')
    setSending(true)
    try {
      await sendMessage(clubId, msg)
    } finally {
      setSending(false)
    }
  }

  // --- ESTÁGIO 1: MINIMIZADO (Pílula Flutuante estilo Instagram - Imagem 2) ---
  if (mode === 'minimized') {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setMode('compact')}
          className="group flex items-center gap-3 rounded-full border border-white/15 bg-slate-900/95 px-4 py-2.5 shadow-2xl backdrop-blur-md transition-all duration-200 hover:border-electric/50 hover:bg-slate-850 hover:scale-105 active:scale-95"
          title="Abrir mensagens do clube"
        >
          {/* Ícone de mensagens */}
          <div className="relative flex items-center justify-center text-white group-hover:text-electric transition">
            <MessageCircle size={18} className="fill-white/10" />
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-electric px-1 text-[9px] font-bold text-slate-950 font-pixel shadow-neon animate-pulse">
                {unreadCount}
              </span>
            )}
          </div>

          <span className="text-xs font-bold tracking-wide text-white">Mensagens</span>

          {/* Avatares dos membros online sobrepostos (estilo Instagram) */}
          {onlineMembers.length > 0 && (
            <div className="flex items-center -space-x-2 pl-1">
              {onlineMembers.slice(0, 3).map((member, i) => (
                <img
                  key={member.id || member.userId || i}
                  src={member.avatarUrl || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${member.displayName || i}`}
                  alt={member.displayName}
                  className="h-6 w-6 rounded-full border-2 border-slate-900 bg-slate-800 object-cover"
                />
              ))}
              {onlineMembers.length > 3 && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-800 text-[8px] font-bold text-slate-300 border border-slate-700">
                  +{onlineMembers.length - 3}
                </span>
              )}
            </div>
          )}
        </button>
      </div>
    )
  }

  // --- ESTÁGIOS 2 & 3: COMPACTO (JANELA FLUTUANTE) E EXPANDIDO (FIXO NA LATERAL DA TELA) ---
  const isExpanded = mode === 'expanded'

  return (
    <aside
      className={`fixed z-50 flex flex-col transition-all duration-300 ease-in-out bg-panel shadow-2xl ${
        isExpanded
          ? 'top-0 right-0 h-screen w-80 sm:w-88 border-l border-white/10 shadow-2xl'
          : 'bottom-4 right-4 w-[92vw] sm:w-[350px] h-[500px] max-h-[82vh] rounded-2xl border border-white/15 overflow-hidden'
      }`}
    >
      {/* Cabeçalho do Chat com Controles de Janela */}
      <div className="flex items-center justify-between border-b border-white/10 bg-slate-950/80 px-4 py-3 shrink-0 select-none">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400" />
          </span>
          <div className="min-w-0">
            <h3 className="text-xs font-bold text-white truncate">
              {isExpanded ? 'Chat da Sala' : 'Mensagens'}
            </h3>
            <p className="text-[10px] text-slate-400 truncate">
              {clubName} • {onlineMembers.length} online
            </p>
          </div>
        </div>

        {/* Botões de Ação de Janela */}
        <div className="flex items-center gap-1">
          {/* Botão de alternar entre Compacto e Expandido (Lateral Fixa) */}
          <button
            type="button"
            onClick={() => setMode(isExpanded ? 'compact' : 'expanded')}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition"
            title={isExpanded ? 'Modo janela flutuante' : 'Fixar na lateral da tela'}
          >
            {isExpanded ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>

          {/* Botão de Minimizar para a Pílula */}
          <button
            type="button"
            onClick={() => setMode('minimized')}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition"
            title="Minimizar chat"
          >
            <Minus size={16} />
          </button>
        </div>
      </div>

      {/* Faixa de Membros Online (Avatares horizontais - Imagem 3) */}
      {onlineMembers.length > 0 && (
        <div className="flex items-center gap-2.5 border-b border-white/5 bg-slate-950/40 px-3 py-2 overflow-x-auto shrink-0 scrollbar-none">
          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 shrink-0">Na sala:</span>
          {onlineMembers.map((member, idx) => (
            <div
              key={member.id || member.userId || idx}
              className="relative shrink-0 group"
              title={member.displayName}
            >
              <img
                src={member.avatarUrl || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${member.displayName || idx}`}
                alt={member.displayName}
                className="h-7 w-7 rounded-full border border-electric/40 bg-slate-900 object-cover"
              />
              <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-emerald-400 ring-1 ring-slate-950" />
            </div>
          ))}
        </div>
      )}

      {/* Lista de Mensagens Scrollável (Estilo Instagram Direct - Imagem 4) */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-gradient-to-b from-transparent to-slate-950/30">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6 text-slate-500">
            <MessageCircle size={32} className="mb-2 text-slate-600" />
            <p className="text-xs font-bold text-slate-400">Nenhuma mensagem ainda</p>
            <p className="text-[10px] text-slate-500 mt-1">
              Inicie a conversa com os outros membros do clube!
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.authorId && currentUser?.id && (msg.authorId === currentUser.id || msg.authorId === currentUser.uid)

            if (msg.type === 'system') {
              return (
                <div key={msg.id} className="my-2 flex items-center justify-center">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-electric/20 bg-electric/10 px-3 py-0.5 text-[9px] font-pixel text-electric">
                    <Sparkles size={10} /> {msg.text}
                  </span>
                </div>
              )
            }

            return (
              <div
                key={msg.id}
                className={`flex items-end gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}
              >
                {/* Avatar do usuário à esquerda da mensagem (estilo Instagram - Imagem 4) */}
                {!isMe && (
                  <img
                    src={msg.avatarUrl || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${msg.author}`}
                    alt={msg.author}
                    className="h-6 w-6 rounded-full border border-white/15 bg-slate-900 object-cover shrink-0 mb-1"
                    title={msg.author}
                  />
                )}

                <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[82%]`}>
                  {!isMe && (
                    <span className="text-[10px] font-bold text-slate-400 mb-1 px-1">
                      {msg.author}
                    </span>
                  )}

                  {/* Balão da Mensagem */}
                  <div
                    className={`rounded-2xl px-3.5 py-2 text-xs break-words shadow-sm leading-relaxed ${
                      isMe
                        ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-br-xs font-medium'
                        : 'bg-slate-900 border border-white/10 text-slate-200 rounded-bl-xs'
                    }`}
                  >
                    {msg.text}
                  </div>

                  {/* Hora sutil */}
                  <span className="text-[9px] text-slate-600 mt-0.5 px-1">
                    {msg.createdAt?.toLocaleTimeString?.([], { hour: '2-digit', minute: '2-digit' }) || ''}
                  </span>
                </div>

                {/* Avatar do usuário à direita se for ele mesmo (opcional e sutil) */}
                {isMe && (
                  <img
                    src={msg.avatarUrl || currentUser?.avatarUrl || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${currentUser?.displayName || 'Me'}`}
                    alt="Você"
                    className="h-6 w-6 rounded-full border border-cyan-400/40 bg-slate-900 object-cover shrink-0 mb-1"
                    title="Você"
                  />
                )}
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Caixa de Input Fixa na Base (NUNCA sai do enquadramento - Imagem 4) */}
      <form
        onSubmit={handleSend}
        className="shrink-0 border-t border-white/10 bg-slate-950/90 p-2.5 flex items-center gap-2 backdrop-blur-md"
      >
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Mensagem..."
          maxLength={500}
          className="flex-1 rounded-full border border-white/15 bg-slate-900/90 px-4 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-electric transition"
        />
        <button
          type="submit"
          disabled={!text.trim() || sending}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-electric text-slate-950 transition hover:bg-cyan-300 disabled:opacity-30 disabled:hover:bg-electric active:scale-95"
          aria-label="Enviar mensagem"
        >
          <Send size={13} className="ml-0.5" />
        </button>
      </form>
    </aside>
  )
}

