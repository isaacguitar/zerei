import React, { useState, useEffect } from 'react'
import {
  X,
  Search,
  Users,
  UserPlus,
  UserCheck,
  Eye,
  MessageCircle,
  Gamepad2,
  Sparkles,
  LoaderCircle,
  Archive,
} from 'lucide-react'
import {
  getClubCoMembers,
  getFriendSuggestions,
  sendFriendRequest,
  cancelFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  listPendingReceivedRequests,
  unfollowUser,
  getFriendshipStatus,
  searchCommunityUsers,
} from './friendService'
import { getCurrentUser } from '../auth/authService'

export default function FriendSearchModal({
  isOpen,
  onClose,
  onOpenProfile,
  onOpenDirectChat,
}) {
  const currentUser = getCurrentUser()
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [coMembers, setCoMembers] = useState([])
  const [suggestions, setSuggestions] = useState([])
  const [pendingRequests, setPendingRequests] = useState([])
  const [friendshipState, setFriendshipState] = useState({}) // { [userId]: { isMutual, isPendingSent, isPendingReceived } }
  const [actionLoading, setActionLoading] = useState({})

  // Resultados de busca dinâmica na comunidade
  const [communitySearchResults, setCommunitySearchResults] = useState([])
  const [isSearchingCommunity, setIsSearchingCommunity] = useState(false)

  const uid = currentUser?.id || currentUser?.uid

  useEffect(() => {
    if (!isOpen) return
    loadData()
  }, [isOpen, uid])

  async function loadData() {
    setLoading(true)
    try {
      const [members, suggs, pending] = await Promise.all([
        getClubCoMembers(uid),
        getFriendSuggestions(uid),
        listPendingReceivedRequests(uid),
      ])
      setCoMembers(members)
      setSuggestions(suggs)
      setPendingRequests(pending)

      // Initialize friendship states
      const stateMap = {}
      for (const m of [...members, ...suggs]) {
        const st = await getFriendshipStatus(uid, m.id)
        stateMap[m.id] = st
      }
      setFriendshipState(stateMap)
    } catch (err) {
      console.error('Erro ao carregar dados de amigos:', err)
    } finally {
      setLoading(false)
    }
  }

  // Busca em tempo real de usuários na comunidade
  useEffect(() => {
    const trimmed = searchTerm.trim()
    if (!trimmed) {
      setCommunitySearchResults([])
      setIsSearchingCommunity(false)
      return
    }

    let isMounted = true
    setIsSearchingCommunity(true)

    const timer = setTimeout(async () => {
      try {
        const results = await searchCommunityUsers(trimmed, uid)
        if (isMounted) {
          setCommunitySearchResults(results)
          // Atualiza state de friendship
          setFriendshipState((prev) => {
            const updated = { ...prev }
            results.forEach((u) => {
              if (u.friendshipStatus) updated[u.id] = u.friendshipStatus
            })
            return updated
          })
        }
      } catch (err) {
        console.warn('Erro ao pesquisar comunidade:', err)
      } finally {
        if (isMounted) setIsSearchingCommunity(false)
      }
    }, 250)

    return () => {
      isMounted = false
      clearTimeout(timer)
    }
  }, [searchTerm, uid])

  async function handleSendRequest(user) {
    setActionLoading((prev) => ({ ...prev, [user.id]: true }))
    try {
      await sendFriendRequest(user)
      setFriendshipState((prev) => ({
        ...prev,
        [user.id]: { ...prev[user.id], isPendingSent: true },
      }))
    } catch (err) {
      console.error('Erro ao enviar solicitação:', err)
    } finally {
      setActionLoading((prev) => ({ ...prev, [user.id]: false }))
    }
  }

  async function handleCancelRequest(userId) {
    setActionLoading((prev) => ({ ...prev, [userId]: true }))
    try {
      await cancelFriendRequest(userId)
      setFriendshipState((prev) => ({
        ...prev,
        [userId]: { ...prev[userId], isPendingSent: false },
      }))
    } catch (err) {
      console.error('Erro ao cancelar solicitação:', err)
    } finally {
      setActionLoading((prev) => ({ ...prev, [userId]: false }))
    }
  }

  async function handleAcceptRequest(requestOrUser) {
    const senderId = requestOrUser.senderId || requestOrUser.id
    setActionLoading((prev) => ({ ...prev, [senderId]: true }))
    try {
      await acceptFriendRequest(requestOrUser)
      setPendingRequests((prev) => prev.filter((r) => r.senderId !== senderId && r.id !== senderId))
      setFriendshipState((prev) => ({
        ...prev,
        [senderId]: { ...prev[senderId], isMutual: true, isPendingReceived: false },
      }))
    } catch (err) {
      console.error('Erro ao aceitar solicitação:', err)
    } finally {
      setActionLoading((prev) => ({ ...prev, [senderId]: false }))
    }
  }

  async function handleRejectRequest(senderId) {
    setActionLoading((prev) => ({ ...prev, [senderId]: true }))
    try {
      await rejectFriendRequest(senderId)
      setPendingRequests((prev) => prev.filter((r) => r.senderId !== senderId && r.id !== senderId))
      setFriendshipState((prev) => ({
        ...prev,
        [senderId]: { ...prev[senderId], isPendingReceived: false },
      }))
    } catch (err) {
      console.error('Erro ao recusar solicitação:', err)
    } finally {
      setActionLoading((prev) => ({ ...prev, [senderId]: false }))
    }
  }

  async function handleUnfriend(userId) {
    setActionLoading((prev) => ({ ...prev, [userId]: true }))
    try {
      await unfollowUser(userId)
      setFriendshipState((prev) => ({
        ...prev,
        [userId]: { ...prev[userId], isMutual: false, isFollowing: false },
      }))
    } catch (err) {
      console.error('Erro ao desfazer amizade:', err)
    } finally {
      setActionLoading((prev) => ({ ...prev, [userId]: false }))
    }
  }

  if (!isOpen) return null

  const term = searchTerm.trim().toLowerCase()
  const isSearchActive = term.length > 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#121624] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="rounded-xl border border-purple-400/30 bg-purple-500/10 p-2.5 text-purple-300">
              <Users size={18} />
            </span>
            <div>
              <h2 className="font-pixel text-xs text-white">Explorar & Adicionar Amigos</h2>
              <p className="text-[11px] text-slate-400">
                Pesquise perfis reais da comunidade e conecte-se para liberar DM e ver estantes
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl border border-white/5 p-2 text-slate-400 hover:bg-white/5 hover:text-white transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Search Input */}
        <div className="border-b border-white/5 px-6 py-3 bg-slate-950/40">
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              autoFocus
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Digite o nome do jogador (ex: Ferdinando, Gandalf...)..."
              className="w-full rounded-xl border border-white/10 bg-slate-950/60 py-2.5 pl-10 pr-10 text-xs font-medium text-white placeholder-slate-500 outline-none focus:border-electric"
            />
            {isSearchingCommunity && (
              <LoaderCircle size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 animate-spin text-electric" />
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Section: Solicitações de amizade pendentes recebidas */}
          {pendingRequests.length > 0 && (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Users size={15} className="text-amber-400" />
                <h3 className="font-pixel text-[11px] text-white">
                  Pedidos de amizade recebidos ({pendingRequests.length})
                </h3>
              </div>
              <div className="space-y-2.5">
                {pendingRequests.map((req) => (
                  <div
                    key={req.id}
                    className="flex items-center justify-between rounded-xl bg-slate-950/60 p-3 border border-white/5"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={req.senderAvatar}
                        alt=""
                        className="h-10 w-10 rounded-xl bg-slate-900 border border-white/10 object-cover"
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-white truncate">{req.senderName}</p>
                        <p className="text-[10px] text-slate-400">Quer adicionar você aos amigos</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleAcceptRequest(req)}
                        className="flex items-center gap-1 rounded-lg bg-emerald-500 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-950 hover:bg-emerald-400 transition shadow-neon"
                      >
                        <UserCheck size={12} />
                        <span>Aceitar</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRejectRequest(req.senderId)}
                        className="rounded-lg border border-white/10 bg-slate-900 p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 transition"
                        title="Recusar"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Se houver busca digitada: exibe resultados da pesquisa na comunidade */}
          {isSearchActive ? (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Search size={14} className="text-electric" />
                <h3 className="font-pixel text-[11px] text-slate-200">
                  Jogadores Encontrados ({communitySearchResults.length})
                </h3>
              </div>

              {isSearchingCommunity ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                  <LoaderCircle size={22} className="animate-spin text-electric mb-2" />
                  <p className="text-xs">Buscando na comunidade...</p>
                </div>
              ) : communitySearchResults.length === 0 ? (
                <div className="rounded-2xl border border-white/5 bg-slate-950/30 p-8 text-center text-xs text-slate-400">
                  Nenhum jogador encontrado com o nome <strong className="text-white">"{searchTerm}"</strong>.
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {communitySearchResults.map((user) => {
                    const st = friendshipState[user.id] || user.friendshipStatus || {}
                    const isWorking = !!actionLoading[user.id]

                    return (
                      <div
                        key={user.id}
                        className="flex flex-col justify-between rounded-2xl border border-white/10 bg-slate-950/60 p-4 hover:border-white/20 transition shadow-pixel"
                      >
                        <div className="flex items-start gap-3">
                          <img
                            src={user.avatarUrl}
                            alt={user.displayName}
                            className="h-11 w-11 rounded-xl bg-slate-900 border border-white/10 object-cover"
                          />
                          <div className="min-w-0 flex-1">
                            <h4 className="font-pixel text-xs text-white truncate">{user.displayName}</h4>
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              Nível {user.level || 1} • {user.rank || 'Novato'}
                            </p>
                            {user.retroAchievementsUsername && (
                              <span className="mt-1 inline-block text-[9px] font-pixel text-gold">
                                RA: {user.retroAchievementsUsername}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Ações */}
                        <div className="mt-4 flex items-center gap-2 pt-3 border-t border-white/5">
                          {/* Botão de Amizade */}
                          {st.isMutual ? (
                            <button
                              type="button"
                              onClick={() => handleUnfriend(user.id)}
                              disabled={isWorking}
                              className="flex-1 rounded-xl border border-emerald-500/30 bg-emerald-500/10 py-2 text-[10px] font-bold uppercase tracking-wider text-emerald-300 hover:border-rose-500/30 hover:bg-rose-500/15 hover:text-rose-300 transition"
                              title="Clique para desfazer amizade"
                            >
                              {isWorking ? <LoaderCircle size={13} className="animate-spin mx-auto" /> : 'Amigos 🤝'}
                            </button>
                          ) : st.isPendingSent ? (
                            <button
                              type="button"
                              onClick={() => handleCancelRequest(user.id)}
                              disabled={isWorking}
                              className="flex-1 rounded-xl border border-amber-500/30 bg-amber-500/10 py-2 text-[10px] font-bold uppercase tracking-wider text-amber-300 hover:border-rose-500/30 hover:bg-rose-500/15 hover:text-rose-300 transition"
                              title="Clique para cancelar pedido"
                            >
                              {isWorking ? <LoaderCircle size={13} className="animate-spin mx-auto" /> : 'Pendente ⏳'}
                            </button>
                          ) : st.isPendingReceived ? (
                            <button
                              type="button"
                              onClick={() => handleAcceptRequest(user)}
                              disabled={isWorking}
                              className="flex-1 rounded-xl bg-emerald-500 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-950 hover:bg-emerald-400 transition"
                            >
                              {isWorking ? <LoaderCircle size={13} className="animate-spin mx-auto" /> : 'Aceitar Pedido'}
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleSendRequest(user)}
                              disabled={isWorking}
                              className="flex-1 rounded-xl border border-electric/40 bg-electric py-2 text-[10px] font-bold uppercase tracking-wider text-slate-950 hover:bg-electric/90 transition shadow-neon"
                            >
                              {isWorking ? <LoaderCircle size={13} className="animate-spin mx-auto" /> : '+ Adicionar'}
                            </button>
                          )}

                          {/* Botão Ver Perfil / Estante */}
                          <button
                            type="button"
                            onClick={() => {
                              onClose?.()
                              onOpenProfile?.(user)
                            }}
                            className="rounded-xl border border-white/10 bg-white/5 p-2 text-slate-400 hover:bg-white/10 hover:text-white transition"
                            title="Ver Perfil & Estante de Jogos"
                          >
                            <Eye size={14} />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Section 1: Co-members from Clubs */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Gamepad2 size={14} className="text-electric" />
                  <h3 className="font-pixel text-[11px] text-slate-200">
                    Jogaram com você nos clubes ({coMembers.length})
                  </h3>
                </div>

                {coMembers.length === 0 ? (
                  <p className="rounded-xl border border-white/5 bg-slate-950/20 py-4 text-center text-xs text-slate-500">
                    Você ainda não jogou com outros membros em salas de clubes.
                  </p>
                ) : (
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    {coMembers.map((member) => {
                      const st = friendshipState[member.id] || {}
                      const isWorking = !!actionLoading[member.id]

                      return (
                        <div
                          key={member.id}
                          className="flex flex-col justify-between rounded-2xl border border-white/5 bg-slate-950/40 p-3.5 hover:border-white/10 transition"
                        >
                          <div className="flex items-start gap-3">
                            <img
                              src={member.avatarUrl}
                              alt={member.displayName}
                              className="h-10 w-10 rounded-xl bg-slate-900 border border-white/10 object-cover"
                            />
                            <div className="min-w-0 flex-1">
                              <h4 className="font-pixel text-xs text-white truncate">{member.displayName}</h4>
                              <p className="text-[10px] text-slate-400 mt-0.5">
                                Nível {member.level} • {member.rank}
                              </p>
                            </div>
                          </div>

                          <div className="mt-3 flex items-center gap-2 pt-2 border-t border-white/5">
                            {st.isMutual ? (
                              <button
                                type="button"
                                onClick={() => handleUnfriend(member.id)}
                                disabled={isWorking}
                                className="flex-1 rounded-xl border border-emerald-500/30 bg-emerald-500/10 py-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-300 hover:border-rose-500/30 hover:bg-rose-500/15 hover:text-rose-300 transition"
                              >
                                {isWorking ? <LoaderCircle size={12} className="animate-spin mx-auto" /> : 'Amigos 🤝'}
                              </button>
                            ) : st.isPendingSent ? (
                              <button
                                type="button"
                                onClick={() => handleCancelRequest(member.id)}
                                disabled={isWorking}
                                className="flex-1 rounded-xl border border-amber-500/30 bg-amber-500/10 py-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-300 transition"
                              >
                                {isWorking ? <LoaderCircle size={12} className="animate-spin mx-auto" /> : 'Pendente ⏳'}
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleSendRequest(member)}
                                disabled={isWorking}
                                className="flex-1 rounded-xl border border-electric/40 bg-electric/15 py-1.5 text-[10px] font-bold uppercase tracking-wider text-electric hover:bg-electric/25 transition"
                              >
                                {isWorking ? <LoaderCircle size={12} className="animate-spin mx-auto" /> : '+ Adicionar'}
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => {
                                onClose?.()
                                onOpenProfile?.(member)
                              }}
                              className="rounded-xl border border-white/10 bg-white/5 p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition"
                              title="Ver Perfil"
                            >
                              <Eye size={13} />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Section 2: Friend Suggestions */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles size={14} className="text-gold" />
                  <h3 className="font-pixel text-[11px] text-slate-200">
                    Sugestões para você ({suggestions.length})
                  </h3>
                </div>

                <div className="grid gap-2.5 sm:grid-cols-2">
                  {suggestions.map((user) => {
                    const st = friendshipState[user.id] || {}
                    const isWorking = !!actionLoading[user.id]

                    return (
                      <div
                        key={user.id}
                        className="flex flex-col justify-between rounded-2xl border border-white/5 bg-slate-950/40 p-3.5 hover:border-white/10 transition"
                      >
                        <div className="flex items-start gap-3">
                          <img
                            src={user.avatarUrl}
                            alt={user.displayName}
                            className="h-10 w-10 rounded-xl bg-slate-900 border border-white/10 object-cover"
                          />
                          <div className="min-w-0 flex-1">
                            <h4 className="font-pixel text-xs text-white truncate">{user.displayName}</h4>
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              Nível {user.level} • {user.rank}
                            </p>
                          </div>
                        </div>

                        <div className="mt-3 flex items-center gap-2 pt-2 border-t border-white/5">
                          {st.isMutual ? (
                            <button
                              type="button"
                              onClick={() => handleUnfriend(user.id)}
                              disabled={isWorking}
                              className="flex-1 rounded-xl border border-emerald-500/30 bg-emerald-500/10 py-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-300 hover:border-rose-500/30 hover:bg-rose-500/15 hover:text-rose-300 transition"
                            >
                              {isWorking ? <LoaderCircle size={12} className="animate-spin mx-auto" /> : 'Amigos 🤝'}
                            </button>
                          ) : st.isPendingSent ? (
                            <button
                              type="button"
                              onClick={() => handleCancelRequest(user.id)}
                              disabled={isWorking}
                              className="flex-1 rounded-xl border border-amber-500/30 bg-amber-500/10 py-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-300 transition"
                            >
                              {isWorking ? <LoaderCircle size={12} className="animate-spin mx-auto" /> : 'Pendente ⏳'}
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleSendRequest(user)}
                              disabled={isWorking}
                              className="flex-1 rounded-xl border border-electric/40 bg-electric/15 py-1.5 text-[10px] font-bold uppercase tracking-wider text-electric hover:bg-electric/25 transition"
                            >
                              {isWorking ? <LoaderCircle size={12} className="animate-spin mx-auto" /> : '+ Adicionar'}
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              onClose?.()
                              onOpenProfile?.(user)
                            }}
                            className="rounded-xl border border-white/10 bg-white/5 p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition"
                            title="Ver Perfil"
                          >
                            <Eye size={13} />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
