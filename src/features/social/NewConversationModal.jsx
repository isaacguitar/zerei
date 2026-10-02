import { Check, MessageCircle, Plus, Search, Users, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { getCurrentUser } from '../auth/authService'
import { createGroupConversation, createOrGetDirectConversation } from './directChatService'
import { listMutualFriends, listUserConnections } from './friendService'

export default function NewConversationModal({ isOpen, onClose, onSelectConversation }) {
  const [tab, setTab] = useState('direct') // 'direct' | 'group'
  const [search, setSearch] = useState('')
  const [groupTitle, setGroupTitle] = useState('')
  const [selectedUserIds, setSelectedUserIds] = useState([])
  const [availableUsers, setAvailableUsers] = useState([])
  const [loading, setLoading] = useState(false)

  const currentUser = getCurrentUser()

  useEffect(() => {
    if (!isOpen) return

    const loadUsers = async () => {
      const mutuals = await listMutualFriends(currentUser?.id)
      const connections = await listUserConnections(currentUser?.id)
      const combined = [
        ...mutuals,
        ...connections.following,
        ...connections.followers,
      ]
      // Remove duplicates and self
      const unique = []
      const seen = new Set()
      for (const u of combined) {
        if (u.id !== currentUser?.id && !seen.has(u.id)) {
          seen.add(u.id)
          unique.push({
            ...u,
            isMutual: mutuals.some((m) => m.id === u.id),
          })
        }
      }
      setAvailableUsers(unique)
    }

    loadUsers()
    setSelectedUserIds([])
    setGroupTitle('')
    setSearch('')
  }, [isOpen, currentUser?.id])

  if (!isOpen) return null

  const filteredUsers = availableUsers.filter((u) => {
    const matchesSearch = u.displayName.toLowerCase().includes(search.toLowerCase())
    if (tab === 'direct') {
      return matchesSearch && u.isMutual
    }
    return matchesSearch
  })

  async function handleStartDirect(user) {
    if (!user.isMutual) return
    setLoading(true)
    try {
      const conv = await createOrGetDirectConversation(user)
      onSelectConversation?.(conv)
      onClose?.()
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateGroup(e) {
    e.preventDefault()
    if (!groupTitle.trim() || selectedUserIds.length === 0 || loading) return
    setLoading(true)

    try {
      const selectedUsers = availableUsers.filter((u) => selectedUserIds.includes(u.id))
      const group = await createGroupConversation(groupTitle, selectedUsers)
      onSelectConversation?.(group)
      onClose?.()
    } finally {
      setLoading(false)
    }
  }

  function toggleSelectUser(userId) {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-panel shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 bg-slate-950/40 px-5 py-4">
          <h3 className="font-pixel text-xs text-white">Nova Conversa</h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 transition hover:bg-white/10 hover:text-white"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tabs: 1x1 ou Grupo */}
        <div className="flex border-b border-white/10 bg-slate-950/20 text-xs">
          <button
            onClick={() => setTab('direct')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 font-bold transition border-b-2 ${
              tab === 'direct'
                ? 'border-electric text-electric bg-electric/5'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <MessageCircle size={14} />
            Mensagem Direta
          </button>
          <button
            onClick={() => setTab('group')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 font-bold transition border-b-2 ${
              tab === 'group'
                ? 'border-purple-400 text-purple-300 bg-purple-500/5'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Users size={14} />
            Criar Grupo
          </button>
        </div>

        {/* Busca */}
        <div className="p-4 pb-2">
          {tab === 'group' && (
            <div className="mb-3">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Nome do Grupo
              </label>
              <input
                type="text"
                value={groupTitle}
                onChange={(e) => setGroupTitle(e.target.value)}
                placeholder="Ex: Esquadrão Mario World 🎮"
                className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-xs text-white placeholder-slate-600 outline-none focus:border-purple-400/50 transition"
              />
            </div>
          )}

          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-slate-500" size={14} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar amigos por nome..."
              className="w-full rounded-xl border border-white/10 bg-slate-950/60 py-2 pl-9 pr-3 text-xs text-white placeholder-slate-600 outline-none focus:border-electric/50 transition"
            />
          </div>
        </div>

        {/* Lista de Usuários */}
        <div className="max-h-64 overflow-y-auto px-4 py-2 space-y-1">
          {filteredUsers.length === 0 ? (
            <p className="py-6 text-center text-xs text-slate-500">Nenhum jogador encontrado.</p>
          ) : (
            filteredUsers.map((user) => {
              const isSelected = selectedUserIds.includes(user.id)
              return (
                <div
                  key={user.id}
                  onClick={() => (tab === 'group' ? toggleSelectUser(user.id) : handleStartDirect(user))}
                  className={`flex items-center justify-between rounded-xl p-2.5 transition cursor-pointer ${
                    isSelected ? 'bg-purple-500/15 border border-purple-500/30' : 'hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <img
                        src={user.avatarUrl}
                        alt=""
                        className="h-10 w-10 rounded-xl bg-slate-900 border border-white/10 object-cover"
                      />
                      {user.online && (
                        <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-slate-950 bg-emerald-400" />
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">{user.displayName}</p>
                      <p className="text-[10px] text-slate-500">Nível {user.level || 1} • {user.rank || 'Jogador'}</p>
                    </div>
                  </div>

                  {tab === 'group' && (
                    <div
                      className={`flex h-5 w-5 items-center justify-center rounded-md border transition ${
                        isSelected ? 'border-purple-400 bg-purple-500 text-white' : 'border-white/20 bg-slate-900'
                      }`}
                    >
                      {isSelected && <Check size={12} />}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>

        {/* Footer para criação de grupo */}
        {tab === 'group' && (
          <div className="border-t border-white/10 bg-slate-950/40 p-4 flex items-center justify-between">
            <span className="text-xs text-slate-400">
              {selectedUserIds.length} {selectedUserIds.length === 1 ? 'amigo selecionado' : 'amigos selecionados'}
            </span>
            <button
              onClick={handleCreateGroup}
              disabled={!groupTitle.trim() || selectedUserIds.length === 0 || loading}
              className="flex items-center gap-1.5 rounded-xl border border-purple-400/40 bg-purple-500/20 px-4 py-2 text-xs font-bold uppercase tracking-wider text-purple-200 transition hover:bg-purple-500/30 disabled:opacity-40"
            >
              <Plus size={14} />
              Criar Grupo
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

