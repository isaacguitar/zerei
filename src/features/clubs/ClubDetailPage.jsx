import {
  Archive,
  ArrowLeft,
  Calendar,
  Check,
  Clock3,
  Copy,
  Crown,
  Flame,
  Gamepad2,
  History,
  MessageCircle,
  Plus,
  Settings,
  Share2,
  Shield,
  Sparkles,
  Trophy,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
  X,
  AlertTriangle,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { getCurrentUser } from '../auth/authService'
import { getClubById, listClubMembers, updateMemberRole, deleteClub } from './clubService'
import { finishGameRoomAndArchive } from '../game-room/roomService'
import { publishClubInvite } from '../feed/activityService'
import NewRoomModal from './NewRoomModal'
import InviteFriendModal from './InviteFriendModal'

function getGenerationBadge(filter) {
  switch (filter) {
    case '8bit':
      return '8-Bit'
    case '16bit':
      return '16-Bit'
    case '32bit':
      return '32-Bit'
    case 'free':
    default:
      return 'Livre'
  }
}

export default function ClubDetailPage({
  clubId,
  onBack,
  onOpenGameRoom,
  onOpenDirectChat,
}) {
  const [club, setClub] = useState(null)
  const [members, setMembers] = useState([])
  const [activeTab, setActiveTab] = useState('round') // 'round' | 'history' | 'members'
  const [loading, setLoading] = useState(true)
  const [copiedCode, setCopiedCode] = useState(false)
  const [isNewRoomOpen, setIsNewRoomOpen] = useState(false)
  const [isInviteOpen, setIsInviteOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [deletingClub, setDeletingClub] = useState(false)
  const [endingRoom, setEndingRoom] = useState(false)
  const [feedNotice, setFeedNotice] = useState(null)

  const currentUser = getCurrentUser()
  const isOwner = currentUser && club && club.ownerId === currentUser.id

  const handleDeleteClub = async () => {
    if (!club?.id) return
    const confirmed = window.confirm(`Tem certeza de que deseja excluir permanentemente o clube "${club.name}"? Esta ação removerá o clube e todos os dados associados. Esta ação NÃO pode ser desfeita.`)
    if (!confirmed) return

    setDeletingClub(true)
    try {
      await deleteClub(club.id)
      alert('Clube excluído com sucesso.')
      onBack?.()
    } catch (err) {
      alert(err.message || 'Erro ao excluir o clube.')
      setDeletingClub(false)
    }
  }

  const handleShareClubToFeed = async () => {
    if (!club) return
    try {
      await publishClubInvite(club, {
        message: `🛡️ Venha fazer parte do nosso clube [${club.tag || 'CLUBE'}] ${club.name}! Junte-se ao nosso clube permanente para zerarmos clássicos juntos. Código de convite: ${club.inviteCode || ''}`,
        visibility: 'public',
      })
      setFeedNotice('Convite do clube publicado no Feed com sucesso!')
      setTimeout(() => setFeedNotice(null), 3000)
    } catch (err) {
      alert(err.message || 'Erro ao compartilhar convite no Feed.')
    }
  }

  const loadData = async () => {
    if (!clubId) return
    setLoading(true)
    try {
      const [clubData, memberList] = await Promise.all([
        getClubById(clubId),
        listClubMembers(clubId),
      ])
      setClub(clubData)
      setMembers(memberList || [])
    } catch (err) {
      console.warn('Erro ao carregar dados do clube:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [clubId])

  const handleCopyCode = () => {
    if (!club?.inviteCode) return
    navigator.clipboard.writeText(club.inviteCode)
    setCopiedCode(true)
    setTimeout(() => setCopiedCode(false), 2000)
  }

  const handleFinishRound = async () => {
    if (!club?.activeRoomId && !club?.id) return
    const confirmed = window.confirm('Deseja finalizar a rodada atual e arquivar os resultados no Histórico de Zeramentos do Clube?')
    if (!confirmed) return

    setEndingRoom(true)
    try {
      const targetRoomId = club.activeRoomId || club.id
      await finishGameRoomAndArchive(targetRoomId)
      await loadData()
    } catch (err) {
      alert(err.message || 'Erro ao finalizar rodada.')
    } finally {
      setEndingRoom(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center text-slate-400">
        <p className="font-pixel text-xs">Carregando clube permanente...</p>
      </div>
    )
  }

  if (!club) {
    return (
      <div className="p-8 text-center text-slate-400">
        <p className="text-sm">Clube não encontrado.</p>
        <button onClick={onBack} className="mt-4 text-xs text-electric hover:underline">
          Voltar ao Salão de Jogos
        </button>
      </div>
    )
  }

  const hasActiveRoom = Boolean(
    club.activeRoomSummary?.gameTitle ||
    (club.gameTitle && club.phase !== 'completed')
  )

  const activeGameTitle = club.activeRoomSummary?.gameTitle || club.gameTitle
  const activeGameCover = club.activeRoomSummary?.gameCoverUrl || club.gameCoverUrl
  const activeGameConsole = club.activeRoomSummary?.gameConsole || club.gameConsole
  const activeRoomId = club.activeRoomId || club.id

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-16 text-slate-200">
      {/* Botão Voltar */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 transition hover:text-electric"
      >
        <ArrowLeft size={14} />
        Voltar ao Salão de Jogos
      </button>

      {/* Header Permanente do Clube */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-panel p-6 sm:p-8 shadow-pixel">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="relative flex h-16 w-16 sm:h-20 sm:w-20 shrink-0 items-center justify-center rounded-2xl border-2 border-electric/40 bg-gradient-to-br from-electric/20 to-slate-900 shadow-neon">
              {club.avatarUrl ? (
                <img src={club.avatarUrl} alt="" className="h-full w-full rounded-2xl object-cover" />
              ) : (
                <span className="font-pixel text-2xl text-electric">{club.icon || '✦'}</span>
              )}
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-lg border border-purple-500/40 bg-purple-500/15 px-2.5 py-0.5 font-pixel text-[9px] font-bold text-purple-300">
                  [{club.tag}]
                </span>
                <span className="rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-cyan-300">
                  Geração: {getGenerationBadge(club.consoleFilter)}
                </span>
                <h1 className="font-pixel text-base sm:text-xl text-white">{club.name}</h1>
              </div>
              <p className="mt-1 text-xs text-slate-400 max-w-xl leading-relaxed">
                {club.description || 'Comunidade permanente de retrogamers.'}
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-4 text-[11px] text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Users size={13} className="text-electric" />
                  <strong className="text-white">{club.members}</strong> {club.members === 1 ? 'membro' : 'membros'}
                </span>

                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-slate-950/60 px-2.5 py-1 text-slate-300 hover:border-electric/40 hover:text-white transition"
                  title="Copiar código de convite"
                >
                  {copiedCode ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                  <span>Convite: <strong className="font-pixel text-[10px] text-gold">{club.inviteCode || 'ZR-RETRO'}</strong></span>
                </button>
              </div>
            </div>
          </div>

          {/* Ações do Clube */}
          <div className="flex flex-wrap sm:flex-col items-stretch gap-2 shrink-0">
            <button
              onClick={() => setIsInviteOpen(true)}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-xs font-bold text-white hover:bg-white/10 transition"
            >
              <UserPlus size={14} />
              <span>Convidar</span>
            </button>

            <button
              onClick={handleShareClubToFeed}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-electric/30 bg-electric/10 px-4 py-2 text-xs font-bold text-electric hover:bg-electric/20 transition"
              title="Postar convite do clube no Feed"
            >
              <Share2 size={14} />
              <span>Postar no Feed</span>
            </button>

            {isOwner && (
              <>
                <button
                  onClick={() => setIsNewRoomOpen(true)}
                  className="flex items-center justify-center gap-1.5 rounded-xl bg-electric px-4 py-2 text-xs font-pixel font-bold text-slate-950 hover:bg-electric/90 transition shadow-neon"
                >
                  <Plus size={14} />
                  <span>Nova Sala</span>
                </button>

                <button
                  onClick={() => setIsSettingsOpen(true)}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-slate-900/80 px-4 py-2 text-xs font-bold text-slate-300 hover:border-white/30 hover:text-white transition"
                  title="Configurações do Clube"
                >
                  <Settings size={14} />
                  <span>Configurações</span>
                </button>
              </>
            )}
          </div>
        </div>

        {feedNotice && (
          <div className="mt-4 rounded-xl border border-emerald-500/40 bg-emerald-500/15 p-3 text-xs font-bold text-emerald-300 flex items-center gap-2 animate-fadeIn">
            <Check size={14} />
            <span>{feedNotice}</span>
          </div>
        )}
      </div>

      {/* Tabs de Conteúdo do Clube */}
      <div className="flex border-b border-white/10 gap-2 text-xs">
        <button
          onClick={() => setActiveTab('round')}
          className={`flex items-center gap-2 rounded-t-xl px-4 py-2.5 font-bold uppercase tracking-wider transition border-b-2 ${
            activeTab === 'round'
              ? 'border-electric text-electric bg-electric/10'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <Gamepad2 size={14} />
          Sala da Rodada
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 rounded-t-xl px-4 py-2.5 font-bold uppercase tracking-wider transition border-b-2 ${
            activeTab === 'history'
              ? 'border-gold text-gold bg-gold/10'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <History size={14} />
          Histórico de Zeramentos ({club.history?.length || 0})
        </button>

        <button
          onClick={() => setActiveTab('members')}
          className={`flex items-center gap-2 rounded-t-xl px-4 py-2.5 font-bold uppercase tracking-wider transition border-b-2 ${
            activeTab === 'members'
              ? 'border-purple-400 text-purple-300 bg-purple-500/10'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <Users size={14} />
          Membros ({members.length})
        </button>
      </div>

      {/* ================= ABA 1: SALA DA RODADA ================= */}
      {activeTab === 'round' && (
        <div>
          {hasActiveRoom ? (
            <div className="rounded-3xl border border-electric/30 bg-panel p-6 shadow-neon relative overflow-hidden">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="flex items-center gap-5">
                  <div className="relative h-28 w-28 sm:h-32 sm:w-32 rounded-2xl overflow-hidden bg-slate-950 border border-white/15 shrink-0 shadow-lg">
                    {activeGameCover ? (
                      <img src={activeGameCover} alt={activeGameTitle} className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-slate-600">
                        <Gamepad2 size={40} />
                      </div>
                    )}
                    <span className="absolute left-2 top-2 rounded bg-black/70 px-1.5 py-0.5 font-pixel text-[8px] uppercase text-slate-200">
                      {activeGameConsole || 'Retro'}
                    </span>
                  </div>

                  <div>
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-300">
                      <Flame size={11} className="animate-pulse" />
                      Rodada Ativa
                    </span>
                    <h3 className="mt-2 font-pixel text-sm sm:text-base text-white">{activeGameTitle}</h3>
                    <p className="mt-1 text-xs text-slate-400">
                      Objetivo: Zerar o jogo e pontuar no ranking do clube antes do término da rodada!
                    </p>

                    <div className="mt-3 flex items-center gap-3 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <Clock3 size={13} className="text-electric" />
                        Até {club.roundEndsAt ? new Date(club.roundEndsAt).toLocaleDateString('pt-BR') : 'Tempo limite'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Botões da Sala */}
                <div className="flex flex-col gap-2 w-full md:w-auto shrink-0">
                  <button
                    onClick={() => onOpenGameRoom?.({ ...club, id: activeRoomId, gameTitle: activeGameTitle, gameCoverUrl: activeGameCover, gameConsole: activeGameConsole })}
                    className="flex items-center justify-center gap-2 rounded-xl bg-electric px-6 py-3 font-pixel text-xs text-slate-950 hover:bg-electric/90 transition shadow-neon"
                  >
                    <Gamepad2 size={16} />
                    <span>Entrar na Sala de Jogo</span>
                  </button>

                  {isOwner && (
                    <button
                      disabled={endingRoom}
                      onClick={handleFinishRound}
                      className="flex items-center justify-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-xs font-bold text-rose-300 hover:bg-rose-500/20 transition"
                    >
                      <span>{endingRoom ? 'Encerrando...' : 'Finalizar Rodada & Arquivar'}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-3xl border border-white/5 bg-panel p-12 text-center">
              <Gamepad2 size={44} className="mx-auto text-slate-600 mb-3" />
              <h3 className="font-pixel text-sm text-white">Nenhuma sala de jogo ativa no momento</h3>
              <p className="mt-2 text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                {isOwner
                  ? 'Como líder do clube, você pode abrir uma nova sala de jogo a qualquer momento para iniciar uma nova rodada com os membros!'
                  : 'Aguarde o líder do clube iniciar a próxima rodada ou participe da votação do próximo título!'}
              </p>

              {isOwner && (
                <button
                  onClick={() => setIsNewRoomOpen(true)}
                  className="mt-6 inline-flex items-center gap-2 rounded-xl bg-electric px-5 py-2.5 font-pixel text-xs text-slate-950 hover:bg-electric/90 transition shadow-neon"
                >
                  <Plus size={14} />
                  <span>Abrir Nova Sala de Jogo</span>
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ================= ABA 2: HISTÓRICO DE ZERAMENTOS (HALL DA FAMA) ================= */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          {club.history?.length === 0 ? (
            <div className="rounded-3xl border border-white/5 bg-panel p-12 text-center">
              <Trophy size={40} className="mx-auto text-slate-600 mb-3" />
              <h3 className="font-pixel text-sm text-white">Nenhuma rodada arquivada ainda</h3>
              <p className="mt-2 text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                Quando uma sala de jogo for finalizada, o jogo, a data e os membros que zeraram ficarão eternizados aqui no Hall da Fama do clube!
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {club.history.map((hist, idx) => (
                <div
                  key={hist.roomId || idx}
                  className="rounded-2xl border border-gold/30 bg-panel p-4 shadow-pixel flex flex-col justify-between"
                >
                  <div>
                    <div className="relative h-36 w-full rounded-xl overflow-hidden bg-slate-950 mb-3">
                      <img
                        src={hist.gameCoverUrl || 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=600&q=85'}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                      <span className="absolute left-2 top-2 rounded bg-black/70 px-2 py-0.5 font-pixel text-[8px] uppercase text-slate-200">
                        {hist.gameConsole || 'Retro'}
                      </span>
                    </div>

                    <h4 className="font-pixel text-xs text-white truncate">{hist.gameTitle}</h4>
                    <p className="mt-1 text-[10px] text-slate-400">
                      Concluído em {new Date(hist.completedAt).toLocaleDateString('pt-BR')}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-white/10">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gold mb-2">
                      🏆 Zeraram esta rodada ({hist.playersBeaten?.length || 0})
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {hist.playersBeaten?.map((player) => (
                        <img
                          key={player.userId}
                          src={player.avatarUrl}
                          alt={player.displayName}
                          title={player.displayName}
                          className="h-7 w-7 rounded-lg border border-gold/50 bg-slate-950 object-cover"
                        />
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ================= ABA 3: MEMBROS ================= */}
      {activeTab === 'members' && (
        <div className="rounded-3xl border border-white/10 bg-panel p-6 shadow-pixel">
          <div className="divide-y divide-white/5">
            {members.map((member) => (
              <div key={member.userId || member.id} className="flex items-center justify-between py-3.5">
                <div className="flex items-center gap-3">
                  <img
                    src={member.avatarUrl}
                    alt={member.displayName}
                    className="h-10 w-10 rounded-xl object-cover bg-slate-950 border border-white/10"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-xs text-white">{member.displayName}</p>
                      {member.role === 'owner' ? (
                        <span className="inline-flex items-center gap-1 rounded bg-amber-500/20 px-2 py-0.5 text-[8px] font-pixel text-amber-300 border border-amber-500/40">
                          <Crown size={10} /> Líder
                        </span>
                      ) : member.role === 'moderator' ? (
                        <span className="inline-flex items-center gap-1 rounded bg-purple-500/20 px-2 py-0.5 text-[8px] font-pixel text-purple-300 border border-purple-500/40">
                          <Shield size={10} /> Moderador
                        </span>
                      ) : null}
                    </div>
                    <p className="text-[10px] text-slate-500">Membro do clube permanente</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onOpenDirectChat?.(member)}
                    className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white transition"
                    title="Enviar mensagem"
                  >
                    <MessageCircle size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal para abrir nova sala */}
      <NewRoomModal
        isOpen={isNewRoomOpen}
        onClose={() => setIsNewRoomOpen(false)}
        defaultClub={club}
        onRoomCreated={(newRoom) => {
          loadData()
          onOpenGameRoom?.(newRoom)
        }}
      />

      {/* Modal de convidar amigo */}
      {isInviteOpen && (
        <InviteFriendModal
          isOpen={isInviteOpen}
          onClose={() => setIsInviteOpen(false)}
          club={club}
        />
      )}

      {/* Modal de Configurações do Clube */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-white/10 bg-panel shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 bg-slate-950/50 px-6 py-4">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-200">
                  <Settings size={18} />
                </span>
                <div>
                  <h3 className="font-pixel text-xs text-white">Configurações do Clube</h3>
                  <p className="text-[10px] text-slate-400">[{club.tag}] {club.name}</p>
                </div>
              </div>
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-white transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto text-xs">
              {/* Informações Gerais */}
              <div className="space-y-3 rounded-xl border border-white/10 bg-slate-950/40 p-4">
                <h4 className="font-bold text-slate-300 uppercase tracking-wider text-[10px]">Informações do Clube</h4>
                <div className="grid grid-cols-2 gap-3 text-slate-400">
                  <div>
                    <span className="text-[10px] block text-slate-500">Geração Permitida:</span>
                    <strong className="text-cyan-300 uppercase">{getGenerationBadge(club.consoleFilter)}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] block text-slate-500">Modo de Votação:</span>
                    <strong className="text-white">{club.votingMode === 'random' ? 'Sorteio Aleatório' : club.votingMode === 'owner' ? 'Dono Escolhe' : 'Votação Coletiva'}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] block text-slate-500">Duração da Rodada:</span>
                    <strong className="text-white">{club.roundDurationDays || 14} dias</strong>
                  </div>
                  <div>
                    <span className="text-[10px] block text-slate-500">Acesso:</span>
                    <strong className="text-white">{club.accessMode === 'code' ? 'Código Privado' : club.accessMode === 'approval' ? 'Com Aprovação' : 'Público'}</strong>
                  </div>
                </div>
              </div>

              {/* Zona de Perigo */}
              {isOwner && (
                <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 space-y-3">
                  <div className="flex items-center gap-2 text-rose-300">
                    <AlertTriangle size={16} />
                    <h4 className="font-bold uppercase tracking-wider text-[11px]">Zona de Perigo</h4>
                  </div>
                  <p className="text-[11px] text-rose-200/80 leading-relaxed">
                    Excluir este clube removerá permanentemente todos os registros, históricos de zeramentos, salas associadas e acessos dos membros. Esta ação é irreversível.
                  </p>
                  <button
                    type="button"
                    disabled={deletingClub}
                    onClick={handleDeleteClub}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-rose-500 disabled:opacity-50"
                  >
                    <Trash2 size={14} />
                    <span>{deletingClub ? 'Excluindo clube...' : 'Excluir Clube Permanentemente'}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

