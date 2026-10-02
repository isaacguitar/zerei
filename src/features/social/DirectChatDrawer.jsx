import {
  ArrowLeft,
  Edit,
  Eye,
  Gamepad2,
  Lock,
  Maximize2,
  MessageCircle,
  Minimize2,
  MoreVertical,
  Send,
  UserCheck,
  UserPlus,
  Users,
  X,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { getCurrentUser } from '../auth/authService'
import {
  formatRelativeTime,
  getClubConversation,
  markConversationAsRead,
  sendDirectMessage,
  subscribeToConversationMessages,
  subscribeToConversations,
} from './directChatService'
import { getFriendshipStatus, sendFriendRequest } from './friendService'
import NewConversationModal from './NewConversationModal'
import ReportUserModal from './ReportUserModal'
import VoiceChatBar from '../game-room/VoiceChatBar'

export default function DirectChatDrawer({
  isOpen,
  onClose,
  initialTargetUser = null,
  activeClubId = null,
  activeClubName = 'Chat da Sala',
  onlineMembers = [],
  initialExpanded = true,
  isExpanded: controlledIsExpanded,
  onToggleExpanded,
  onExpandedChange,
  onOpenUserProfile,
  onWatchGame,
}) {
  const [conversations, setConversations] = useState([])
  const [activeConversation, setActiveConversation] = useState(null)
  const [messages, setMessages] = useState([])
  const [inputText, setInputText] = useState('')
  const [uncontrolledExpanded, setUncontrolledExpanded] = useState(initialExpanded)

  const isExpanded = controlledIsExpanded !== undefined ? controlledIsExpanded : uncontrolledExpanded

  const handleToggleExpanded = () => {
    if (onToggleExpanded) {
      onToggleExpanded()
    } else {
      setUncontrolledExpanded((prev) => !prev)
    }
  }

  const [isNewConvOpen, setIsNewConvOpen] = useState(false)
  const [isReportOpen, setIsReportOpen] = useState(false)
  const [reportTargetUser, setReportTargetUser] = useState(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [inboxTab, setInboxTab] = useState('all') // 'all' | 'clubs' | 'direct'

  const messagesEndRef = useRef(null)
  const currentUser = getCurrentUser()

  // Notifica o componente pai sobre a mudança no modo expandido
  useEffect(() => {
    onExpandedChange?.(isOpen && isExpanded)
  }, [isOpen, isExpanded, onExpandedChange])

  // Escuta todas as conversas do usuário (clubes + directs)
  useEffect(() => {
    if (!currentUser?.id) return
    const unsubscribe = subscribeToConversations(currentUser.id, setConversations)
    return () => unsubscribe()
  }, [currentUser?.id])

  // Se activeClubId for fornecido, pré-carrega a conversa sem forçar a abertura automática
  useEffect(() => {
    if (activeClubId) {
      getClubConversation(activeClubId, activeClubName).catch(() => {})
    }
  }, [activeClubId, activeClubName])

  // Se um initialTargetUser for passado externamente, abre ou cria a conversa correspondente
  useEffect(() => {
    if (initialTargetUser && conversations.length > 0) {
      const found = conversations.find(
        (c) => c.type === 'direct' && c.participantIds?.includes(initialTargetUser.id)
      )
      if (found) {
        setActiveConversation(found)
      } else {
        // Cria conversa temporária local
        setActiveConversation({
          id: `temp_${initialTargetUser.id}`,
          type: 'direct',
          participantIds: [currentUser?.id, initialTargetUser.id],
          participants: [
            { id: currentUser?.id, displayName: currentUser?.displayName || 'Você' },
            initialTargetUser,
          ],
          title: initialTargetUser.displayName,
          avatarUrl: initialTargetUser.avatarUrl,
          online: true,
        })
      }
    }
  }, [initialTargetUser, conversations, currentUser?.id])

  // Escuta as mensagens da conversa ativa
  useEffect(() => {
    if (!activeConversation?.id) {
      setMessages([])
      return
    }

    markConversationAsRead(activeConversation.id, currentUser?.id)

    const unsubscribe = subscribeToConversationMessages(activeConversation.id, (list) => {
      setMessages(list)
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      }, 50)
    })

    return () => unsubscribe()
  }, [activeConversation?.id, currentUser?.id])

  // Total de não-lidas global
  const totalUnread = conversations.reduce((acc, c) => acc + (c.unreadCount || 0), 0)

  // Verifica status de amizade quando estiver em uma conversa direta
  const [friendship, setFriendship] = useState({ isMutual: true, isPendingSent: false, isPendingReceived: false })
  const [sendError, setSendError] = useState('')
  const [requestSending, setRequestSending] = useState(false)

  const otherParticipant =
    activeConversation?.type === 'direct'
      ? activeConversation.participants?.find((p) => p.id !== currentUser?.id)
      : null

  useEffect(() => {
    if (!activeConversation || activeConversation.type !== 'direct' || !otherParticipant?.id) {
      setFriendship({ isMutual: true, isPendingSent: false, isPendingReceived: false })
      setSendError('')
      return
    }

    let isMounted = true
    getFriendshipStatus(currentUser?.id, otherParticipant.id).then((status) => {
      if (isMounted) {
        setFriendship(status)
      }
    })

    return () => {
      isMounted = false
    }
  }, [activeConversation, otherParticipant?.id, currentUser?.id])

  async function handleSendMessage(e) {
    e?.preventDefault()
    if (!inputText.trim() || !activeConversation?.id) return
    const text = inputText
    setSendError('')

    try {
      setInputText('')
      await sendDirectMessage(activeConversation.id, text)
    } catch (err) {
      setSendError(err.message || 'Não foi possível enviar a mensagem.')
    }
  }

  async function handleSendFriendRequestFromChat() {
    if (!otherParticipant || requestSending) return
    setRequestSending(true)
    try {
      await sendFriendRequest(otherParticipant)
      setFriendship((prev) => ({ ...prev, isPendingSent: true }))
    } finally {
      setRequestSending(false)
    }
  }

  function handleSelectConversation(conv) {
    setActiveConversation(conv)
    markConversationAsRead(conv.id, currentUser?.id)
  }

  if (!isOpen) return null

  const clubConversations = conversations.filter((c) => c.type === 'club')
  const directConversations = conversations.filter((c) => c.type !== 'club')

  return (
    <>
      <div
        className={`fixed z-40 flex flex-col bg-[#121624] shadow-2xl backdrop-blur-xl transition-all duration-300 ease-in-out ${
          isExpanded
            ? 'top-0 right-0 h-screen w-80 sm:w-88 border-l border-white/10'
            : 'bottom-4 right-4 h-[540px] w-[92vw] sm:w-[380px] rounded-3xl border border-white/15 overflow-hidden shadow-[0_12px_40px_rgba(0,0,0,0.8)]'
        }`}
      >
        {/* ================= HEADER DO DRAWER ================= */}
        <div className="flex items-center justify-between border-b border-white/10 bg-[#161b2d] px-4 py-3.5 select-none shrink-0">
          {activeConversation ? (
            /* Header quando está dentro de uma conversa (com botão de Voltar para navegar entre clubes e amigos) */
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <button
                onClick={() => setActiveConversation(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition shrink-0"
                title="Voltar para a lista de conversas"
              >
                <ArrowLeft size={18} />
              </button>
              <div className="relative shrink-0">
                <img
                  src={activeConversation.avatarUrl}
                  alt=""
                  className="h-8 w-8 rounded-xl border border-white/15 object-cover bg-slate-900"
                />
                {activeConversation.online && (
                  <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#121624] bg-emerald-400" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <h3 className="truncate text-xs font-bold text-white">
                    {activeConversation.title}
                  </h3>
                  {activeConversation.type === 'club' && (
                    <span className="shrink-0 rounded bg-electric/10 px-1 py-0.5 text-[8px] font-pixel text-electric border border-electric/20">
                      CLUBE
                    </span>
                  )}
                </div>
                <p className="truncate text-[10px] text-slate-400">
                  {activeConversation.type === 'club'
                    ? activeConversation.subtitle || 'Chat do clube'
                    : activeConversation.online
                    ? 'Online agora'
                    : 'Offline'}
                </p>
              </div>
            </div>
          ) : (
            /* Header da Inbox */
            <div className="flex items-center gap-2">
              <h3 className="font-pixel text-xs text-white">Mensagens & Clubes</h3>
              {totalUnread > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-bold text-white shadow-[0_0_10px_rgba(244,63,94,0.5)]">
                  {totalUnread}
                </span>
              )}
            </div>
          )}

          {/* Controles de Janela */}
          <div className="flex items-center gap-1 shrink-0 ml-2">
            {activeConversation && otherParticipant && (
              <div className="relative">
                <button
                  onClick={() => setMenuOpen((prev) => !prev)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-white transition"
                  title="Mais opções"
                >
                  <MoreVertical size={16} />
                </button>
                {menuOpen && (
                  <div className="absolute right-0 top-8 z-30 w-40 rounded-xl border border-white/10 bg-slate-900 p-1 shadow-2xl">
                    <button
                      onClick={() => {
                        setMenuOpen(false)
                        onOpenUserProfile?.(otherParticipant)
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-slate-200 hover:bg-white/10 text-left transition"
                    >
                      Ver perfil
                    </button>
                    <button
                      onClick={() => {
                        setMenuOpen(false)
                        setReportTargetUser(otherParticipant)
                        setIsReportOpen(true)
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-amber-300 hover:bg-amber-500/10 text-left transition"
                    >
                      Denunciar
                    </button>
                  </div>
                )}
              </div>
            )}

            <button
              onClick={handleToggleExpanded}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition"
              title={isExpanded ? 'Modo janela flutuante' : 'Preencher lateral da tela'}
            >
              {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition"
              title="Fechar mensagens"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Faixa de Membros Online (quando dentro de um chat de clube e houver membros) */}
        {activeConversation?.type === 'club' && onlineMembers?.length > 0 && (
          <div className="flex items-center gap-2.5 border-b border-white/5 bg-slate-950/50 px-3.5 py-2 overflow-x-auto shrink-0 scrollbar-none">
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 shrink-0">
              Na sala:
            </span>
            {onlineMembers.map((member, idx) => (
              <div
                key={member.id || member.userId || idx}
                className="relative shrink-0 group cursor-pointer"
                title={member.displayName}
                onClick={() => onOpenUserProfile?.(member)}
              >
                <img
                  src={
                    member.avatarUrl ||
                    `https://api.dicebear.com/7.x/pixel-art/svg?seed=${member.displayName || idx}`
                  }
                  alt={member.displayName}
                  className="h-6 w-6 rounded-full border border-electric/40 bg-slate-900 object-cover"
                />
                <span className="absolute bottom-0 right-0 h-1.5 w-1.5 rounded-full bg-emerald-400 ring-1 ring-slate-950" />
              </div>
            ))}
          </div>
        )}

        {/* ================= CORPO DO DRAWER ================= */}
        {activeConversation ? (
          /* ================= VIEW: THREAD DE MENSAGENS ================= */
          <div className="flex flex-1 flex-col overflow-hidden bg-[#0d101a]">
            {/* Mensagens com scroll */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center p-6 text-slate-500">
                  <div className="h-12 w-12 rounded-full bg-electric/10 border border-electric/20 flex items-center justify-center text-electric mb-3">
                    <MessageCircle size={22} />
                  </div>
                  <p className="text-xs font-bold text-white">Início da conversa</p>
                  <p className="text-[11px] text-slate-500 mt-1 max-w-xs">
                    Envie uma mensagem para trocar dicas, combinar jogatinas ou vibrar com o clube!
                  </p>
                </div>
              ) : (
                messages.map((msg, index) => {
                  const isMine =
                    msg.authorId &&
                    currentUser?.id &&
                    (msg.authorId === currentUser.id || msg.authorId === currentUser.uid)

                  if (msg.type === 'system') {
                    return (
                      <div key={msg.id || index} className="my-2 flex items-center justify-center">
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-electric/20 bg-electric/10 px-3 py-0.5 text-[9px] font-pixel text-electric">
                          {msg.text}
                        </span>
                      </div>
                    )
                  }

                  return (
                    <div
                      key={msg.id || index}
                      className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                    >
                      {!isMine && (
                        <span className="text-[9px] text-slate-400 ml-1 mb-1 font-bold">
                          {msg.author || 'Jogador'}
                        </span>
                      )}
                      <div
                        className={`max-w-[82%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed ${
                          isMine
                            ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-medium rounded-br-xs shadow-md'
                            : 'bg-slate-800/90 text-white rounded-bl-xs border border-white/5'
                        }`}
                      >
                        <p className="break-words select-text">{msg.text}</p>
                      </div>
                      <span className="text-[8px] text-slate-600 mt-1 px-1">
                        {formatRelativeTime(msg.createdAt)}
                      </span>
                    </div>
                  )
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Aviso de erro se tentar enviar */}
            {sendError && (
              <div className="border-t border-rose-500/20 bg-rose-500/10 px-3 py-1.5 text-[10px] text-rose-300">
                {sendError}
              </div>
            )}

            {/* Trava de Amizade Mútua para DMs 1x1 */}
            {activeConversation.type === 'direct' && otherParticipant && !friendship.isMutual ? (
              <div className="border-t border-white/10 bg-slate-950/80 p-4 text-center">
                <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl border border-amber-400/30 bg-amber-500/10 text-amber-400">
                  <Lock size={18} />
                </div>
                <h4 className="font-pixel text-[10px] text-white">DM Bloqueada</h4>
                <p className="mt-1 text-[11px] text-slate-400">
                  Mensagens diretas só podem ser trocadas se ambos se adicionarem como amigos.
                </p>

                <div className="mt-3 flex justify-center">
                  {friendship.isPendingSent ? (
                    <span className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-300">
                      Solicitação enviada (aguardando resposta)
                    </span>
                  ) : friendship.isPendingReceived ? (
                    <button
                      type="button"
                      onClick={() => {
                        onClose()
                        // Pode abrir o modal de amigos ou perfil
                        onOpenUserProfile?.(otherParticipant)
                      }}
                      className="rounded-xl border border-emerald-500/40 bg-emerald-500/20 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-300 hover:bg-emerald-500/30 transition"
                    >
                      Aceitar pedido de amizade no perfil
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={requestSending}
                      onClick={handleSendFriendRequestFromChat}
                      className="flex items-center gap-1.5 rounded-xl border border-electric/40 bg-electric/20 px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-electric hover:bg-electric/30 transition shadow-neon"
                    >
                      <UserPlus size={13} />
                      <span>{requestSending ? 'Enviando...' : 'Enviar solicitação de amizade'}</span>
                    </button>
                  )}
                </div>
              </div>
            ) : (
              /* Input de envio regular */
              <form
                onSubmit={handleSendMessage}
                className="flex items-center gap-2 border-t border-white/10 bg-[#161b2d] p-3 shrink-0"
              >
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={
                    activeConversation.type === 'club'
                      ? `Mensagem para ${activeConversation.title}...`
                      : 'Mensagem...'
                  }
                  className="flex-1 rounded-xl border border-white/10 bg-slate-950/60 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-electric/50 transition"
                />
                <button
                  type="submit"
                  disabled={!inputText.trim()}
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-electric text-slate-950 transition hover:bg-electric/90 disabled:opacity-30 disabled:cursor-not-allowed shadow-neon shrink-0"
                  title="Enviar mensagem"
                >
                  <Send size={15} />
                </button>
              </form>
            )}
          </div>
        ) : (
          /* ================= VIEW: INBOX (CLUBES + DIRECTS) ================= */
          <div className="relative flex flex-1 flex-col overflow-hidden bg-[#0d101a]">
            {/* Bloco de Sala de Voz integrado dentro do Chat */}
            {activeClubId && (
              <div className="border-b border-white/10 bg-slate-950/40 p-2.5 shrink-0">
                <VoiceChatBar
                  roomId={activeClubId}
                  currentUser={currentUser}
                  compact={true}
                />
              </div>
            )}

            {/* Tabs de Filtro na Inbox */}
            <div className="flex border-b border-white/10 bg-slate-950/60 p-2 gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setInboxTab('all')}
                className={`flex-1 rounded-xl py-1.5 text-center text-[10px] font-bold uppercase tracking-wider transition ${
                  inboxTab === 'all'
                    ? 'bg-purple-500/20 text-purple-200 border border-purple-500/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Todas ({conversations.length})
              </button>
              <button
                type="button"
                onClick={() => setInboxTab('clubs')}
                className={`flex-1 rounded-xl py-1.5 text-center text-[10px] font-bold uppercase tracking-wider transition flex items-center justify-center gap-1 ${
                  inboxTab === 'clubs'
                    ? 'bg-electric/20 text-electric border border-electric/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Gamepad2 size={12} />
                Clubes ({clubConversations.length})
              </button>
              <button
                type="button"
                onClick={() => setInboxTab('direct')}
                className={`flex-1 rounded-xl py-1.5 text-center text-[10px] font-bold uppercase tracking-wider transition flex items-center justify-center gap-1 ${
                  inboxTab === 'direct'
                    ? 'bg-purple-500/20 text-purple-200 border border-purple-500/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Users size={12} />
                Amigos ({directConversations.length})
              </button>
            </div>

            {/* Lista Scrollável de Conversas */}
            <div className="flex-1 overflow-y-auto divide-y divide-white/5 pb-20">
              {conversations.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  <p className="text-xs">Nenhuma conversa encontrada.</p>
                </div>
              ) : (
                <>
                  {/* Seção 1: Clubes (se tab all ou clubs) */}
                  {(inboxTab === 'all' || inboxTab === 'clubs') && clubConversations.length > 0 && (
                    <div className="py-2">
                      <div className="px-4 py-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        <Gamepad2 size={12} className="text-electric" />
                        <span>Seus Clubes ({clubConversations.length})</span>
                      </div>
                      {clubConversations.map((conv) => (
                        <div
                          key={conv.id}
                          onClick={() => handleSelectConversation(conv)}
                          className="group flex items-center justify-between gap-3 px-4 py-3 transition cursor-pointer hover:bg-white/5 active:bg-white/10"
                        >
                          <div className="relative shrink-0">
                            <img
                              src={conv.avatarUrl}
                              alt=""
                              className="h-11 w-11 rounded-xl border border-electric/30 object-cover bg-slate-900 shadow-sm"
                            />
                            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#121624] bg-emerald-400" />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-baseline justify-between gap-1">
                              <h4 className="truncate text-xs font-bold text-white group-hover:text-electric transition">
                                {conv.title}
                              </h4>
                              <span className="text-[9px] text-slate-500 font-pixel">
                                {conv.memberCount || 1} membros
                              </span>
                            </div>
                            <p className="mt-0.5 truncate text-[11px] text-slate-400">
                              {conv.subtitle || 'Chat comunitário da rodada'}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Seção 2: Mensagens Diretas & Amigos (se tab all ou direct) */}
                  {(inboxTab === 'all' || inboxTab === 'direct') && (
                    <div className="py-2">
                      {inboxTab === 'all' && directConversations.length > 0 && (
                        <div className="px-4 py-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          <Users size={12} className="text-purple-300" />
                          <span>Mensagens Diretas & Grupos ({directConversations.length})</span>
                        </div>
                      )}

                      {directConversations.length === 0 ? (
                        <div className="p-6 text-center">
                          <p className="text-xs text-slate-500">Nenhuma mensagem direta ainda.</p>
                          <p className="text-[10px] text-slate-600 mt-1">
                            Clique no lápis abaixo para iniciar um bate-papo!
                          </p>
                        </div>
                      ) : (
                        directConversations.map((conv) => {
                          const hasUnread = (conv.unreadCount || 0) > 0
                          return (
                            <div
                              key={conv.id}
                              onClick={() => handleSelectConversation(conv)}
                              className="group flex items-center justify-between gap-3 px-4 py-3 transition cursor-pointer hover:bg-white/5 active:bg-white/10"
                            >
                              <div className="relative shrink-0">
                                <img
                                  src={conv.avatarUrl}
                                  alt=""
                                  className="h-11 w-11 rounded-full border border-white/15 object-cover bg-slate-900"
                                />
                                {conv.online && (
                                  <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-[#121624] bg-emerald-400" />
                                )}
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="flex items-baseline justify-between gap-1">
                                  <h4
                                    className={`truncate text-xs ${
                                      hasUnread ? 'font-bold text-white' : 'font-semibold text-slate-200'
                                    }`}
                                  >
                                    {conv.title}
                                  </h4>
                                </div>
                                {conv.currentActivity?.status === 'playing' ? (
                                  <div className="mt-0.5 flex items-center justify-between gap-1.5">
                                    <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 truncate">
                                      <Gamepad2 size={11} className="shrink-0 animate-pulse" />
                                      Jogando {conv.currentActivity.gameTitle}
                                    </span>
                                    {conv.currentActivity.allowSpectators && onWatchGame && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          onWatchGame({
                                            id: conv.currentActivity.roomId,
                                            gameTitle: conv.currentActivity.gameTitle,
                                            isSolo: conv.currentActivity.isSolo,
                                            allowSpectators: conv.currentActivity.allowSpectators,
                                          })
                                        }}
                                        className="flex items-center gap-1 rounded px-1.5 py-0.5 font-pixel text-[8px] font-bold bg-cyan-400/20 text-cyan-300 border border-cyan-400/30 hover:bg-cyan-400 hover:text-slate-950 transition shrink-0"
                                      >
                                        <Eye size={10} /> Assistir
                                      </button>
                                    )}
                                  </div>
                                ) : (
                                  <p
                                    className={`mt-0.5 truncate text-[11px] ${
                                      hasUnread ? 'font-bold text-white' : 'text-slate-400'
                                    }`}
                                  >
                                    {conv.lastMessage?.text || 'Sem mensagens'}{' '}
                                    <span className="text-[10px] text-slate-500 font-normal">
                                      · {formatRelativeTime(conv.lastMessage?.createdAt || conv.updatedAt)}
                                    </span>
                                  </p>
                                )}
                              </div>

                              {hasUnread && (
                                <div className="shrink-0 flex items-center pr-1">
                                  <span className="h-2.5 w-2.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
                                </div>
                              )}
                            </div>
                          )
                        })
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Botão Flutuante de Composição (Nova mensagem ou grupo) */}
            <div className="absolute bottom-4 right-4 z-10">
              <button
                onClick={() => setIsNewConvOpen(true)}
                className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/15 bg-slate-900/90 text-white shadow-2xl backdrop-blur transition hover:scale-105 hover:bg-slate-800 hover:text-electric active:scale-95"
                title="Nova mensagem ou grupo"
              >
                <Edit size={19} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal para Nova Conversa / Criar Grupo */}
      <NewConversationModal
        isOpen={isNewConvOpen}
        onClose={() => setIsNewConvOpen(false)}
        onSelectConversation={(conv) => {
          if (!conv) return
          setActiveConversation(conv)
          if (conv.id && currentUser?.id) {
            markConversationAsRead(conv.id, currentUser.id)
          }
        }}
      />

      {/* Modal de Denúncia */}
      <ReportUserModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        targetUser={reportTargetUser}
      />
    </>
  )
}
