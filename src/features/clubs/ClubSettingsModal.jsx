import { AlertTriangle, Check, Copy, Gamepad2, LoaderCircle, Settings, Shield, Trash2, UserCheck, UserMinus, Users, UserX, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import {
  deleteClub,
  listClubMembers,
  removeMemberFromClub,
  updateClub,
  updateMemberRole,
  subscribeToJoinRequests,
  approveJoinRequest,
  rejectJoinRequest,
} from './clubService'
import { getCurrentUser } from '../auth/authService'
import { searchRetroAchievementsGames, resolveGameIdFromTitle } from '../retro-achievements/retroAchievementsService'

export default function ClubSettingsModal({ club, onClose, onClubUpdated, onClubDeleted }) {
  const [activeTab, setActiveTab] = useState('info') // 'info' | 'members' | 'requests' | 'danger'
  const [name, setName] = useState(club.name || '')
  const [gameTitle, setGameTitle] = useState(club.gameTitle || '')
  const [selectedGame, setSelectedGame] = useState(null)
  const [gameSuggestions, setGameSuggestions] = useState([])
  const searchRequestId = useRef(0)
  const [description, setDescription] = useState(club.description || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [copiedCode, setCopiedCode] = useState(false)

  const [members, setMembers] = useState([])
  const [loadingMembers, setLoadingMembers] = useState(false)
  const [actionMemberId, setActionMemberId] = useState(null)

  const [joinRequests, setJoinRequests] = useState([])
  const [requestActionId, setRequestActionId] = useState(null)

  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const currentUser = getCurrentUser()

  async function searchGames(value) {
    const trimmedValue = value.trim()
    setGameTitle(value)
    setSelectedGame(null)

    if (trimmedValue.length < 2) {
      searchRequestId.current += 1
      return setGameSuggestions([])
    }

    const requestId = ++searchRequestId.current

    try {
      const results = await searchRetroAchievementsGames(trimmedValue)
      if (requestId !== searchRequestId.current) return
      setGameSuggestions(results || [])
    } catch {
      if (requestId === searchRequestId.current) {
        setGameSuggestions([])
      }
    }
  }

  useEffect(() => {
    loadMembers()
    const unsubscribeRequests = subscribeToJoinRequests(club.id, setJoinRequests)
    return () => unsubscribeRequests()
  }, [club.id])

  async function loadMembers() {
    setLoadingMembers(true)
    try {
      const list = await listClubMembers(club.id)
      setMembers(list)
    } catch (err) {
      console.warn('Erro ao carregar membros:', err)
    } finally {
      setLoadingMembers(false)
    }
  }

  async function handleApprove(req) {
    setRequestActionId(req.userId || req.id)
    setError('')
    try {
      await approveJoinRequest(club.id, req)
      setSuccess(`Jogador ${req.displayName} aprovado com sucesso!`)
      await loadMembers()
    } catch (err) {
      setError(err.message || 'Erro ao aprovar solicitação.')
    } finally {
      setRequestActionId(null)
    }
  }

  async function handleReject(userId) {
    setRequestActionId(userId)
    setError('')
    try {
      await rejectJoinRequest(club.id, userId)
      setSuccess('Solicitação recusada.')
    } catch (err) {
      setError(err.message || 'Erro ao recusar solicitação.')
    } finally {
      setRequestActionId(null)
    }
  }

  async function handleSaveInfo(e) {
    e.preventDefault()
    if (!name.trim() || saving) return
    setSaving(true)
    setError('')
    setSuccess('')

    try {
      const resolvedRaId = selectedGame?.id || (gameTitle === club.gameTitle ? club.retroAchievementsId : resolveGameIdFromTitle(gameTitle))
      const payload = {
        name,
        description,
        gameTitle,
        retroAchievementsId: resolvedRaId || null,
      }
      if (selectedGame?.imageBoxArt || selectedGame?.imageIcon) {
        payload.gameCoverUrl = selectedGame.imageBoxArt || selectedGame.imageIcon
      }
      if (selectedGame?.consoleName) {
        payload.gameConsole = selectedGame.consoleName
      }
      const updated = await updateClub(club.id, payload)
      setSuccess('Informações atualizadas com sucesso!')
      onClubUpdated?.({ ...club, ...updated })
    } catch (err) {
      setError(err.message || 'Não foi possível atualizar o clube.')
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleRole(member) {
    if (actionMemberId) return
    setActionMemberId(member.userId)
    setError('')
    const nextRole = member.role === 'admin' ? 'member' : 'admin'

    try {
      await updateMemberRole(club.id, member.userId, nextRole)
      setMembers((curr) => curr.map((m) => m.userId === member.userId ? { ...m, role: nextRole } : m))
    } catch (err) {
      setError(err.message || 'Não foi possível alterar o cargo.')
    } finally {
      setActionMemberId(null)
    }
  }

  async function handleKickMember(member) {
    if (actionMemberId) return
    if (!window.confirm(`Tem certeza que deseja remover ${member.displayName} do clube?`)) return
    setActionMemberId(member.userId)
    setError('')

    try {
      await removeMemberFromClub(club.id, member.userId)
      setMembers((curr) => curr.filter((m) => m.userId !== member.userId))
      onClubUpdated?.({ ...club, members: Math.max(0, (club.members || 1) - 1) })
    } catch (err) {
      setError(err.message || 'Não foi possível remover o participante.')
    } finally {
      setActionMemberId(null)
    }
  }

  async function handleDeleteClub() {
    if (deleting) return
    setDeleting(true)
    setError('')

    try {
      await deleteClub(club.id)
      onClubDeleted?.(club.id)
      onClose()
    } catch (err) {
      setError(err.message || 'Não foi possível excluir o clube.')
      setDeleting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/80 px-4 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-panel p-6 shadow-neon sm:p-7">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <span className="rounded-xl border border-electric/30 bg-electric/10 p-2.5 text-electric">
              <Settings size={18} />
            </span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-electric">Administração</p>
              <h2 className="font-pixel text-xs text-white truncate max-w-[280px]">Configurar: {club.name}</h2>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar" className="text-slate-500 hover:text-white transition">
            <X size={18} />
          </button>
        </div>

        <div className="mt-6 flex border-b border-white/10 text-xs">
          <button
            type="button"
            onClick={() => { setActiveTab('info'); setError(''); setSuccess('') }}
            className={`flex-1 border-b-2 py-2.5 text-center font-bold transition ${activeTab === 'info' ? 'border-electric text-electric' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
          >
            Informações
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('members'); setError(''); setSuccess('') }}
            className={`flex-1 border-b-2 py-2.5 text-center font-bold transition ${activeTab === 'members' ? 'border-electric text-electric' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
          >
            Membros ({members.length})
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('requests'); setError(''); setSuccess('') }}
            className={`flex-1 relative border-b-2 py-2.5 text-center font-bold transition ${activeTab === 'requests' ? 'border-amber-400 text-amber-300' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
          >
            Solicitações
            {joinRequests.length > 0 && (
              <span className="ml-1.5 rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-bold text-amber-300 border border-amber-500/40">
                {joinRequests.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('danger'); setError(''); setSuccess('') }}
            className={`flex-1 border-b-2 py-2.5 text-center font-bold transition ${activeTab === 'danger' ? 'border-rose-400 text-rose-300' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
          >
            Zona de Perigo
          </button>
        </div>

        {error && (
          <p className="mt-4 rounded-xl border border-rose-300/20 bg-rose-300/10 px-4 py-2.5 text-xs text-rose-200">
            {error}
          </p>
        )}

        {success && (
          <p className="mt-4 rounded-xl border border-emerald-300/20 bg-emerald-300/10 px-4 py-2.5 text-xs text-emerald-200">
            {success}
          </p>
        )}

        {activeTab === 'info' && (
          <form onSubmit={handleSaveInfo} className="mt-5 space-y-4">
            {club.inviteCode && (
              <div className="flex items-center justify-between rounded-xl border border-electric/30 bg-electric/10 p-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-electric">Código de Convite do Clube</p>
                  <p className="font-mono text-sm font-bold text-white tracking-widest mt-0.5">{club.inviteCode}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(club.inviteCode)
                    setCopiedCode(true)
                    setTimeout(() => setCopiedCode(false), 2000)
                  }}
                  className="flex items-center gap-1.5 rounded-lg border border-electric/40 bg-electric/20 px-3 py-1.5 text-[11px] font-bold text-electric hover:bg-electric/30 transition"
                >
                  {copiedCode ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                  {copiedCode ? 'Copiado!' : 'Copiar'}
                </button>
              </div>
            )}

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Nome do Clube</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                minLength={3}
                maxLength={60}
                className="mt-1.5 w-full rounded-xl border border-white/10 bg-slate-950/40 px-3.5 py-2.5 text-sm text-white outline-none focus:border-electric/50"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Jogo da Rodada (RetroAchievements)</label>
              <input
                value={gameTitle}
                onChange={(e) => searchGames(e.target.value)}
                required
                minLength={2}
                maxLength={100}
                placeholder="Ex.: Zelda Minish Cap, Pokémon FireRed, Sonic 2..."
                className="mt-1.5 w-full rounded-xl border border-white/10 bg-slate-950/40 px-3.5 py-2.5 text-sm text-white outline-none focus:border-electric/50"
              />

              {(selectedGame || club.retroAchievementsId) && (
                <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-electric/30 bg-electric/10 px-3 py-1.5 text-[10px] text-electric">
                  <Check size={12} className="shrink-0 text-emerald-400" />
                  <span className="font-bold truncate">{selectedGame?.title || club.gameTitle}</span>
                  {(selectedGame?.consoleName || club.gameConsole) && (
                    <span className="text-slate-400">({selectedGame?.consoleName || club.gameConsole})</span>
                  )}
                  <span className="font-mono text-[9px] text-slate-400">RA #{selectedGame?.id || club.retroAchievementsId}</span>
                </div>
              )}

              {gameSuggestions.length > 0 && (
                <div className="mt-1 max-h-56 overflow-y-auto rounded-xl border border-white/10 bg-slate-950 shadow-neon">
                  {gameSuggestions.map((suggestion) => (
                    <button
                      type="button"
                      key={suggestion.id || suggestion.title}
                      onClick={() => {
                        setGameTitle(suggestion.title)
                        setSelectedGame(suggestion)
                        setGameSuggestions([])
                      }}
                      className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-xs text-slate-300 hover:bg-white/10 transition border-b border-white/5 last:border-0"
                    >
                      {suggestion.imageIcon ? (
                        <img src={suggestion.imageIcon} alt="" className="h-6 w-6 rounded object-cover border border-white/10 shrink-0" />
                      ) : (
                        <Gamepad2 size={16} className="text-electric shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-bold text-white">{suggestion.title}</p>
                        {suggestion.consoleName && (
                          <p className="text-[9px] text-electric uppercase tracking-wider">{suggestion.consoleName}</p>
                        )}
                      </div>
                      {suggestion.id && (
                        <span className="text-[9px] font-mono text-slate-500 shrink-0">RA #{suggestion.id}</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Descrição</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={240}
                rows={3}
                className="mt-1.5 w-full resize-none rounded-xl border border-white/10 bg-slate-950/40 px-3.5 py-2.5 text-sm text-white outline-none focus:border-electric/50"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-electric/40 bg-electric/15 py-3 text-xs font-bold uppercase tracking-wider text-electric transition hover:bg-electric/25 disabled:opacity-50"
            >
              {saving && <LoaderCircle size={15} className="animate-spin" />}
              {saving ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </form>
        )}

        {activeTab === 'members' && (
          <div className="mt-5 space-y-3">
            <p className="text-[11px] text-slate-400">
              Gerencie os participantes do grupo. Você pode conceder cargo de administrador ou remover jogadores.
            </p>

            <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
              {loadingMembers ? (
                <div className="py-6 text-center text-xs text-slate-500">
                  <LoaderCircle size={16} className="mx-auto mb-2 animate-spin text-electric" />
                  Carregando membros...
                </div>
              ) : members.length === 0 ? (
                <p className="py-4 text-center text-xs text-slate-500">Nenhum membro encontrado.</p>
              ) : (
                members.map((member) => {
                  const isOwner = member.role === 'owner' || member.userId === club.ownerId
                  const isSelf = member.userId === currentUser?.id
                  const isActing = actionMemberId === member.userId

                  return (
                    <div key={member.id} className="flex items-center justify-between rounded-xl border border-white/5 bg-slate-950/30 p-3">
                      <div className="flex items-center gap-3">
                        <img className="h-8 w-8 rounded-lg bg-slate-950 object-cover" src={member.avatarUrl} alt={member.displayName} />
                        <div>
                          <p className="text-xs font-bold text-white flex items-center gap-1.5">
                            {member.displayName}
                            {isOwner && (
                              <span className="rounded bg-gold/15 px-1.5 py-0.5 text-[8px] font-bold text-gold uppercase tracking-wider">
                                Dono
                              </span>
                            )}
                            {member.role === 'admin' && !isOwner && (
                              <span className="rounded bg-neon/20 px-1.5 py-0.5 text-[8px] font-bold text-purple-200 uppercase tracking-wider">
                                Admin
                              </span>
                            )}
                          </p>
                          <p className="text-[9px] text-slate-500">{member.userId === currentUser?.id ? 'Você' : member.userId}</p>
                        </div>
                      </div>

                      {!isOwner && !isSelf && (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleToggleRole(member)}
                            disabled={isActing}
                            className={`flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider transition ${member.role === 'admin' ? 'border-purple-400/40 bg-purple-500/10 text-purple-200 hover:bg-purple-500/20' : 'border-white/10 bg-slate-900 text-slate-300 hover:border-electric/40 hover:text-electric'}`}
                            title={member.role === 'admin' ? 'Remover Admin' : 'Conceder Admin'}
                          >
                            <Shield size={11} />
                            {member.role === 'admin' ? 'Remover ADM' : 'Dar ADM'}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleKickMember(member)}
                            disabled={isActing}
                            className="flex items-center gap-1 rounded-lg border border-rose-400/30 bg-rose-500/10 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-rose-300 transition hover:bg-rose-500/20"
                            title="Remover do grupo"
                          >
                            <UserMinus size={11} />
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </div>
        )}

        {activeTab === 'requests' && (
          <div className="mt-5 space-y-3">
            <p className="text-[11px] text-slate-400">
              Jogadores que solicitaram entrada neste clube com aprovação obrigatória.
            </p>

            <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
              {joinRequests.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">
                  <Users size={20} className="mx-auto mb-2 text-slate-600" />
                  Nenhuma solicitação pendente de aprovação.
                </div>
              ) : (
                joinRequests.map((req) => {
                  const isActing = requestActionId === (req.userId || req.id)

                  return (
                    <div key={req.userId || req.id} className="flex items-center justify-between rounded-xl border border-white/5 bg-slate-950/30 p-3">
                      <div className="flex items-center gap-3">
                        <img className="h-8 w-8 rounded-lg bg-slate-950 object-cover" src={req.avatarUrl} alt={req.displayName} />
                        <div>
                          <p className="text-xs font-bold text-white flex items-center gap-1.5">
                            {req.displayName}
                          </p>
                          <p className="text-[9px] text-slate-500">
                            {req.requestedAt?.toDate ? req.requestedAt.toDate().toLocaleDateString('pt-BR') : 'Hoje'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleApprove(req)}
                          disabled={isActing}
                          className="flex items-center gap-1 rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-emerald-300 transition hover:bg-emerald-500/20 disabled:opacity-50"
                          title="Aprovar entrada"
                        >
                          {isActing ? <LoaderCircle size={11} className="animate-spin" /> : <UserCheck size={11} />}
                          Aprovar
                        </button>

                        <button
                          type="button"
                          onClick={() => handleReject(req.userId || req.id)}
                          disabled={isActing}
                          className="flex items-center gap-1 rounded-lg border border-rose-400/30 bg-rose-500/10 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-rose-300 transition hover:bg-rose-500/20 disabled:opacity-50"
                          title="Recusar solicitação"
                        >
                          <UserX size={11} />
                          Recusar
                        </button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        )}

        {activeTab === 'danger' && (
          <div className="mt-5 rounded-2xl border border-rose-400/20 bg-rose-950/20 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="text-rose-400 shrink-0 mt-0.5" size={18} />
              <div>
                <h3 className="text-xs font-bold text-rose-200">Excluir Grupo Permanentemente</h3>
                <p className="mt-1 text-[11px] leading-5 text-slate-400">
                  Esta ação é irreversível. O clube será desfeito e nenhum membro poderá mais acessá-lo.
                </p>
              </div>
            </div>

            {!confirmDelete ? (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-rose-400/40 bg-rose-500/15 py-3 text-xs font-bold uppercase tracking-wider text-rose-200 transition hover:bg-rose-500/25"
              >
                <Trash2 size={14} /> Deletar Clube
              </button>
            ) : (
              <div className="mt-5 space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-rose-300 text-center">
                  Tem certeza absoluta?
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    disabled={deleting}
                    className="flex-1 rounded-xl border border-white/10 bg-slate-900 py-2.5 text-xs font-bold text-slate-300 transition hover:bg-slate-800"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteClub}
                    disabled={deleting}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-rose-500 bg-rose-600 py-2.5 text-xs font-bold text-white transition hover:bg-rose-700"
                  >
                    {deleting && <LoaderCircle size={14} className="animate-spin" />}
                    {deleting ? 'Deletando...' : 'Sim, Excluir'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

