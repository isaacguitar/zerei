import {
  AlertTriangle,
  ArrowLeft,
  Award,
  Ban,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  ExternalLink,
  Flame,
  Gamepad2,
  Globe,
  Info,
  Layers,
  Lock,
  MessageSquare,
  MoreVertical,
  PartyPopper,
  Plus,
  RefreshCw,
  Save,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Trash2,
  Trophy,
  UserCheck,
  UserMinus,
  UserPlus,
  Users,
  Wrench,
  X,
  Zap,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { getCurrentUser } from '../auth/authService'
import {
  adminDeletePost,
  adminDeleteTip,
  awardUserBonusXp,
  fetchPlatformMetrics,
  listAllUsers,
  resetUserNick,
  resolveReport,
  saveFeaturedGame,
  saveGlobalChallenge,
  saveSeasonInfo,
  saveSystemSettings,
  saveTopAnnouncement,
  setUserRole,
  subscribeToAuditLogs,
  subscribeToFeaturedGame,
  subscribeToGlobalChallenge,
  subscribeToReports,
  subscribeToSeasonInfo,
  subscribeToSystemSettings,
  subscribeToTopAnnouncement,
  toggleUserBan,
} from './adminService'

export default function AdminDashboard({ onBack }) {
  const [activeTab, setActiveTab] = useState('events') // 'events' | 'comms' | 'users' | 'moderation' | 'metrics'
  const [notice, setNotice] = useState(null)

  // ── Tab 1: Eventos & Desafios ─────────────────────────────────────────────
  const [challenge, setChallenge] = useState({
    title: 'Super Mario World: 10.000 moedas',
    gameTitle: 'Super Mario World',
    description: 'A comunidade está quase lá. Cada moeda conta!',
    currentValue: 8450,
    targetValue: 10000,
    unit: 'moedas',
    rewardXp: 500,
    active: true,
  })
  const [savingChallenge, setSavingChallenge] = useState(false)

  const [system, setSystem] = useState({
    doubleXpActive: false,
    doubleXpLabel: 'Fim de Semana 2x XP Ativo!',
    maintenanceMode: false,
    maintenanceMessage: 'Estamos realizando melhorias na plataforma. Voltamos em instantes!',
  })
  const [savingSystem, setSavingSystem] = useState(false)

  const [featuredGame, setFeaturedGame] = useState({
    gameTitle: 'Chrono Trigger',
    gameConsole: 'SNES',
    description: 'Um dos maiores RPGs de todos os tempos. Escolhido pela comunidade como destaque da semana!',
    coverUrl: '',
    active: true,
  })
  const [savingFeatured, setSavingFeatured] = useState(false)

  const [season, setSeason] = useState({
    seasonNumber: 1,
    title: 'Temporada Retrô 1',
    description: 'Disputa geral pelo troféu dos maiores zeradores do ano.',
    active: true,
  })
  const [savingSeason, setSavingSeason] = useState(false)

  // ── Tab 2: Comunicação & Avisos ───────────────────────────────────────────
  const [announcement, setAnnouncement] = useState({
    message: '',
    type: 'info',
    linkUrl: '',
    linkLabel: '',
    active: false,
  })
  const [savingAnnouncement, setSavingAnnouncement] = useState(false)

  // ── Tab 3: Gestão de Usuários ─────────────────────────────────────────────
  const [users, setUsers] = useState([])
  const [userSearch, setUserSearch] = useState('')
  const [userRoleFilter, setUserRoleFilter] = useState('all')
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [selectedUserForXp, setSelectedUserForXp] = useState(null)
  const [bonusXpAmount, setBonusXpAmount] = useState(250)
  const [bonusXpReason, setBonusXpReason] = useState('Prêmio de Torneio da Comunidade')

  // ── Tab 4: Moderação & Denúncias ──────────────────────────────────────────
  const [reports, setReports] = useState([])
  const [deleteActivityId, setDeleteActivityId] = useState('')

  // ── Tab 5: Métricas & Logs ────────────────────────────────────────────────
  const [metrics, setMetrics] = useState({ users: 0, clubs: 0, activities: 0, tips: 0 })
  const [auditLogs, setAuditLogs] = useState([])

  const currentUser = getCurrentUser()

  const showToast = (msg) => {
    setNotice(msg)
    setTimeout(() => setNotice(null), 3500)
  }

  // Assinaturas em tempo real
  useEffect(() => {
    const unsubChallenge = subscribeToGlobalChallenge((data) => {
      if (data) setChallenge((prev) => ({ ...prev, ...data }))
    })

    const unsubSystem = subscribeToSystemSettings((data) => {
      if (data) setSystem((prev) => ({ ...prev, ...data }))
    })

    const unsubFeatured = subscribeToFeaturedGame((data) => {
      if (data) setFeaturedGame((prev) => ({ ...prev, ...data }))
    })

    const unsubAnnouncement = subscribeToTopAnnouncement((data) => {
      if (data) setAnnouncement((prev) => ({ ...prev, ...data }))
    })

    const unsubSeason = subscribeToSeasonInfo((data) => {
      if (data) setSeason((prev) => ({ ...prev, ...data }))
    })

    const unsubReports = subscribeToReports(setReports)
    const unsubLogs = subscribeToAuditLogs(setAuditLogs)

    fetchPlatformMetrics().then(setMetrics)

    return () => {
      unsubChallenge()
      unsubSystem()
      unsubFeatured()
      unsubAnnouncement()
      unsubSeason()
      unsubReports()
      unsubLogs()
    }
  }, [])

  // Carrega lista de usuários ao abrir a aba
  const loadUsers = async () => {
    setLoadingUsers(true)
    try {
      const data = await listAllUsers({ search: userSearch, roleFilter: userRoleFilter })
      setUsers(data)
    } finally {
      setLoadingUsers(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'users') {
      loadUsers()
    }
  }, [activeTab, userSearch, userRoleFilter])

  // Handlers Tab 1: Desafios e Eventos
  const handleSaveChallenge = async (e) => {
    e.preventDefault()
    setSavingChallenge(true)
    try {
      await saveGlobalChallenge(challenge)
      showToast('Desafio global atualizado com sucesso!')
    } catch (err) {
      alert(err.message || 'Erro ao salvar desafio.')
    } finally {
      setSavingChallenge(false)
    }
  }

  const handleSaveSystem = async () => {
    setSavingSystem(true)
    try {
      await saveSystemSettings(system)
      showToast('Configurações do sistema salvas!')
    } catch (err) {
      alert(err.message || 'Erro ao salvar configurações.')
    } finally {
      setSavingSystem(false)
    }
  }

  const handleSaveFeatured = async (e) => {
    e.preventDefault()
    setSavingFeatured(true)
    try {
      await saveFeaturedGame(featuredGame)
      showToast('Jogo destaque da semana atualizado!')
    } catch (err) {
      alert(err.message || 'Erro ao salvar jogo destaque.')
    } finally {
      setSavingFeatured(false)
    }
  }

  const handleSaveSeason = async (e) => {
    e.preventDefault()
    setSavingSeason(true)
    try {
      await saveSeasonInfo(season)
      showToast('Configurações da Temporada atualizadas!')
    } catch (err) {
      alert(err.message || 'Erro ao salvar temporada.')
    } finally {
      setSavingSeason(false)
    }
  }

  // Handlers Tab 2: Avisos
  const handleSaveAnnouncement = async (e) => {
    e.preventDefault()
    setSavingAnnouncement(true)
    try {
      await saveTopAnnouncement(announcement)
      showToast('Aviso global transmitido com sucesso!')
    } catch (err) {
      alert(err.message || 'Erro ao transmitir aviso.')
    } finally {
      setSavingAnnouncement(false)
    }
  }

  // Handlers Tab 3: Gestão de Usuários
  const handleToggleRole = async (user) => {
    const newRole = user.role === 'admin' ? 'player' : 'admin'
    const confirmMsg = user.role === 'admin'
      ? `Deseja remover as permissões de administrador de ${user.displayName}?`
      : `Deseja promover ${user.displayName} para ADMINISTRADOR com acesso total ao backoffice?`
    if (!window.confirm(confirmMsg)) return

    try {
      await setUserRole(user.id, newRole)
      showToast(`Cargo de ${user.displayName} alterado para ${newRole}!`)
      loadUsers()
    } catch (err) {
      alert(err.message || 'Erro ao alterar cargo.')
    }
  }

  const handleToggleBan = async (user) => {
    const willBan = !user.isBanned
    let reason = ''
    if (willBan) {
      reason = window.prompt(`Motivo do banimento para ${user.displayName}:`, 'Violação das regras')
      if (reason === null) return
    } else {
      if (!window.confirm(`Deseja revogar o banimento de ${user.displayName}?`)) return
    }

    try {
      await toggleUserBan(user.id, { banned: willBan, reason })
      showToast(willBan ? `Usuário ${user.displayName} banido.` : `Usuário ${user.displayName} desbanido!`)
      loadUsers()
    } catch (err) {
      alert(err.message || 'Erro ao aplicar banimento.')
    }
  }

  const handleConfirmBonusXp = async () => {
    if (!selectedUserForXp || !bonusXpAmount) return
    try {
      await awardUserBonusXp(selectedUserForXp.id, bonusXpAmount, bonusXpReason)
      showToast(`+${bonusXpAmount} XP concedidos a ${selectedUserForXp.displayName}!`)
      setSelectedUserForXp(null)
      loadUsers()
    } catch (err) {
      alert(err.message || 'Erro ao conceder XP.')
    }
  }

  const handleResetNick = async (user) => {
    if (!window.confirm(`Redefinir o apelido de ${user.displayName} para 'Jogador'?`)) return
    try {
      await resetUserNick(user.id, 'Jogador')
      showToast(`Apelido de ${user.displayName} redefinido com sucesso!`)
      loadUsers()
    } catch (err) {
      alert(err.message || 'Erro ao redefinir apelido.')
    }
  }

  // Handlers Tab 4: Moderação
  const handleResolveReport = async (reportId, action) => {
    try {
      await resolveReport(reportId, action)
      showToast('Denúncia tratada com sucesso!')
    } catch (err) {
      alert(err.message || 'Erro ao tratar denúncia.')
    }
  }

  const handleDeletePostById = async (e) => {
    e.preventDefault()
    if (!deleteActivityId.trim()) return
    if (!window.confirm(`Excluir permanentemente a postagem ID ${deleteActivityId}?`)) return
    try {
      await adminDeletePost(deleteActivityId.trim())
      showToast('Postagem excluída pela moderação!')
      setDeleteActivityId('')
    } catch (err) {
      alert(err.message || 'Erro ao excluir postagem.')
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-20 text-slate-200">
      {/* Botão Voltar */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-500 transition hover:text-electric"
      >
        <ArrowLeft size={15} />
        Voltar à Visão Geral
      </button>

      {/* Header do Backoffice */}
      <div className="relative overflow-hidden rounded-3xl border border-gold/40 bg-gradient-to-r from-panelDeep via-slate-950 to-panelDeep p-6 sm:p-8 shadow-neon">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 sm:h-20 sm:w-20 shrink-0 items-center justify-center rounded-2xl border-2 border-gold/50 bg-gradient-to-br from-gold/20 to-purple-950 text-gold shadow-neon">
              <ShieldCheck size={40} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded bg-gold/20 px-2 py-0.5 font-pixel text-[8px] font-bold uppercase tracking-wider text-gold border border-gold/40">
                  BACKOFFICE
                </span>
                <span className="rounded bg-electric/15 px-2 py-0.5 font-pixel text-[8px] font-bold text-electric">
                  ZEREI! ADM
                </span>
              </div>
              <h1 className="mt-1 font-pixel text-base sm:text-xl text-white">
                Painel de Administração
              </h1>
              <p className="mt-1 text-xs text-slate-400 max-w-xl">
                Controle global de desafios, avisos de sistema, eventos de XP, gestão de jogadores e moderação.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-2.5 text-right">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">Logado como</p>
              <p className="font-bold text-xs text-white">{currentUser?.displayName}</p>
              <span className="font-pixel text-[8px] text-gold uppercase">Super Admin</span>
            </div>
          </div>
        </div>

        {/* Notificação Toast */}
        {notice && (
          <div className="mt-4 rounded-xl border border-emerald-500/40 bg-emerald-500/15 p-3 text-xs font-bold text-emerald-300 flex items-center gap-2 animate-fadeIn">
            <Check size={14} />
            <span>{notice}</span>
          </div>
        )}
      </div>

      {/* Menu de Abas de Operação */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 border-b border-white/10 pb-2 text-xs font-bold">
        <button
          onClick={() => setActiveTab('events')}
          className={`flex items-center justify-center gap-2 rounded-2xl py-3 px-3 transition ${
            activeTab === 'events'
              ? 'bg-gold/15 text-gold border border-gold/40 shadow-sm'
              : 'bg-panel/40 text-slate-400 hover:text-white border border-white/5'
          }`}
        >
          <Trophy size={14} />
          <span>Eventos & Desafios</span>
        </button>

        <button
          onClick={() => setActiveTab('comms')}
          className={`flex items-center justify-center gap-2 rounded-2xl py-3 px-3 transition ${
            activeTab === 'comms'
              ? 'bg-electric/15 text-electric border border-electric/40 shadow-sm'
              : 'bg-panel/40 text-slate-400 hover:text-white border border-white/5'
          }`}
        >
          <Globe size={14} />
          <span>Avisos & Sistema</span>
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center justify-center gap-2 rounded-2xl py-3 px-3 transition ${
            activeTab === 'users'
              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm'
              : 'bg-panel/40 text-slate-400 hover:text-white border border-white/5'
          }`}
        >
          <Users size={14} />
          <span>Controle de Jogadores</span>
        </button>

        <button
          onClick={() => setActiveTab('moderation')}
          className={`flex items-center justify-center gap-2 rounded-2xl py-3 px-3 transition relative ${
            activeTab === 'moderation'
              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm'
              : 'bg-panel/40 text-slate-400 hover:text-white border border-white/5'
          }`}
        >
          <ShieldAlert size={14} />
          <span>Moderação</span>
          {reports.length > 0 && (
            <span className="rounded-full bg-rose-500 px-1.5 py-0.2 text-[9px] font-pixel text-white">
              {reports.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('metrics')}
          className={`flex items-center justify-center gap-2 rounded-2xl py-3 px-3 transition ${
            activeTab === 'metrics'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
              : 'bg-panel/40 text-slate-400 hover:text-white border border-white/5'
          }`}
        >
          <Layers size={14} />
          <span>Métricas & Logs</span>
        </button>
      </div>

      {/* =========================================================================
          ABA 1: EVENTOS & DESAFIOS GLOBAIS
          ========================================================================= */}
      {activeTab === 'events' && (
        <div className="space-y-6">
          {/* Card 1: Criador / Editor do Desafio Global */}
          <div className="rounded-3xl border border-white/10 bg-panel p-6 shadow-pixel">
            <div className="flex items-center justify-between gap-4 pb-4 border-b border-white/5">
              <div className="flex items-center gap-2.5">
                <Trophy size={18} className="text-gold" />
                <div>
                  <h3 className="font-pixel text-xs text-white">Desafio Global da Comunidade</h3>
                  <p className="text-[11px] text-slate-400">Card exibido no topo da página inicial para todos os jogadores</p>
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold">
                <input
                  type="checkbox"
                  checked={challenge.active}
                  onChange={(e) => setChallenge((prev) => ({ ...prev, active: e.target.checked }))}
                  className="rounded border-white/20 bg-slate-900 text-electric h-4 w-4"
                />
                <span className={challenge.active ? 'text-emerald-400' : 'text-slate-500'}>
                  {challenge.active ? 'Ativo na Dashboard' : 'Inativo / Oculto'}
                </span>
              </label>
            </div>

            <form onSubmit={handleSaveChallenge} className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400">Título do Desafio</label>
                <input
                  type="text"
                  value={challenge.title}
                  onChange={(e) => setChallenge((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="Ex: Super Mario World: 10.000 moedas"
                  className="w-full rounded-xl border border-white/10 bg-slate-950 px-3.5 py-2 text-xs text-white focus:border-electric focus:outline-none"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400">Jogo Oficial</label>
                <input
                  type="text"
                  value={challenge.gameTitle}
                  onChange={(e) => setChallenge((prev) => ({ ...prev, gameTitle: e.target.value }))}
                  placeholder="Ex: Super Mario World, Chrono Trigger, Sonic 2"
                  className="w-full rounded-xl border border-white/10 bg-slate-950 px-3.5 py-2 text-xs text-white focus:border-electric focus:outline-none"
                  required
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="text-[11px] font-bold text-slate-400">Descrição / Chamada</label>
                <input
                  type="text"
                  value={challenge.description}
                  onChange={(e) => setChallenge((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Ex: A comunidade está quase lá. Cada moeda conta!"
                  className="w-full rounded-xl border border-white/10 bg-slate-950 px-3.5 py-2 text-xs text-white focus:border-electric focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400">Progresso Atual</label>
                <input
                  type="number"
                  value={challenge.currentValue}
                  onChange={(e) => setChallenge((prev) => ({ ...prev, currentValue: Number(e.target.value) }))}
                  className="w-full rounded-xl border border-white/10 bg-slate-950 px-3.5 py-2 text-xs text-white focus:border-electric focus:outline-none font-mono"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400">Meta / Alvo Final</label>
                <input
                  type="number"
                  value={challenge.targetValue}
                  onChange={(e) => setChallenge((prev) => ({ ...prev, targetValue: Number(e.target.value) }))}
                  className="w-full rounded-xl border border-white/10 bg-slate-950 px-3.5 py-2 text-xs text-white focus:border-electric focus:outline-none font-mono"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400">Unidade de Medida</label>
                <input
                  type="text"
                  value={challenge.unit}
                  onChange={(e) => setChallenge((prev) => ({ ...prev, unit: e.target.value }))}
                  placeholder="Ex: moedas, zeramentos, chefes derrotados"
                  className="w-full rounded-xl border border-white/10 bg-slate-950 px-3.5 py-2 text-xs text-white focus:border-electric focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400">Recompensa Coletiva em XP</label>
                <input
                  type="number"
                  value={challenge.rewardXp}
                  onChange={(e) => setChallenge((prev) => ({ ...prev, rewardXp: Number(e.target.value) }))}
                  className="w-full rounded-xl border border-white/10 bg-slate-950 px-3.5 py-2 text-xs text-white focus:border-electric focus:outline-none font-mono"
                />
              </div>

              <div className="sm:col-span-2 pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={savingChallenge}
                  className="flex items-center gap-2 rounded-xl bg-gold px-6 py-2.5 font-pixel text-xs font-bold text-slate-950 hover:bg-gold/90 transition shadow-neon"
                >
                  <Save size={14} />
                  <span>{savingChallenge ? 'Salvando...' : 'Salvar Desafio Global'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Card 2: Multiplicador 2X XP & Eventos */}
          <div className="rounded-3xl border border-white/10 bg-panel p-6 shadow-pixel">
            <div className="flex items-center gap-2.5 pb-4 border-b border-white/5">
              <Zap size={18} className="text-amber-400" />
              <div>
                <h3 className="font-pixel text-xs text-white">Evento Multiplicador de XP</h3>
                <p className="text-[11px] text-slate-400">Dobra automaticamente os pontos ganhos pela comunidade durante o período</p>
              </div>
            </div>

            <div className="mt-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl border border-amber-500/30 bg-amber-500/10">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-pixel text-xs text-amber-300">Fim de Semana 2x XP</span>
                  <span className={`rounded px-2 py-0.5 font-pixel text-[8px] font-bold ${system.doubleXpActive ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-slate-800 text-slate-400'}`}>
                    {system.doubleXpActive ? 'LIGADO' : 'DESLIGADO'}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-300">
                  Quando ativo, um selo especial pulsante é exibido no topo do site e os jogadores ganham XP em dobro.
                </p>
              </div>

              <button
                type="button"
                disabled={savingSystem}
                onClick={() => {
                  setSystem((prev) => {
                    const next = { ...prev, doubleXpActive: !prev.doubleXpActive }
                    saveSystemSettings(next).then(() => showToast(next.doubleXpActive ? '2X XP Ativado!' : '2X XP Desativado.'))
                    return next
                  })
                }}
                className={`flex items-center gap-2 rounded-xl px-5 py-2.5 font-pixel text-xs font-bold transition shadow-neon shrink-0 ${
                  system.doubleXpActive
                    ? 'bg-rose-500 text-white hover:bg-rose-600'
                    : 'bg-amber-400 text-slate-950 hover:bg-amber-300'
                }`}
              >
                <Zap size={14} />
                <span>{system.doubleXpActive ? 'Desativar 2X XP' : 'Ativar 2X XP Agora'}</span>
              </button>
            </div>
          </div>

          {/* Card 3: Jogo Destaque da Semana */}
          <div className="rounded-3xl border border-white/10 bg-panel p-6 shadow-pixel">
            <div className="flex items-center justify-between gap-4 pb-4 border-b border-white/5">
              <div className="flex items-center gap-2.5">
                <Gamepad2 size={18} className="text-electric" />
                <div>
                  <h3 className="font-pixel text-xs text-white">Jogo Destaque da Semana</h3>
                  <p className="text-[11px] text-slate-400">Curadoria semanal de títulos clássicos recomendados</p>
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold">
                <input
                  type="checkbox"
                  checked={featuredGame.active}
                  onChange={(e) => setFeaturedGame((prev) => ({ ...prev, active: e.target.checked }))}
                  className="rounded border-white/20 bg-slate-900 text-electric h-4 w-4"
                />
                <span className={featuredGame.active ? 'text-emerald-400' : 'text-slate-500'}>
                  {featuredGame.active ? 'Ativo' : 'Oculto'}
                </span>
              </label>
            </div>

            <form onSubmit={handleSaveFeatured} className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400">Nome do Jogo</label>
                <input
                  type="text"
                  value={featuredGame.gameTitle}
                  onChange={(e) => setFeaturedGame((prev) => ({ ...prev, gameTitle: e.target.value }))}
                  placeholder="Ex: Chrono Trigger"
                  className="w-full rounded-xl border border-white/10 bg-slate-950 px-3.5 py-2 text-xs text-white focus:border-electric focus:outline-none"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400">Console / Plataforma</label>
                <input
                  type="text"
                  value={featuredGame.gameConsole}
                  onChange={(e) => setFeaturedGame((prev) => ({ ...prev, gameConsole: e.target.value }))}
                  placeholder="Ex: SNES, Mega Drive, GBA"
                  className="w-full rounded-xl border border-white/10 bg-slate-950 px-3.5 py-2 text-xs text-white focus:border-electric focus:outline-none"
                  required
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="text-[11px] font-bold text-slate-400">Sinopse do Destaque</label>
                <input
                  type="text"
                  value={featuredGame.description}
                  onChange={(e) => setFeaturedGame((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Ex: Obra-prima desenvolvida pelo Dream Team com trilha sonora histórica."
                  className="w-full rounded-xl border border-white/10 bg-slate-950 px-3.5 py-2 text-xs text-white focus:border-electric focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2 pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={savingFeatured}
                  className="flex items-center gap-2 rounded-xl bg-electric px-6 py-2.5 font-pixel text-xs font-bold text-slate-950 hover:bg-electric/90 transition shadow-neon"
                >
                  <Save size={14} />
                  <span>{savingFeatured ? 'Salvando...' : 'Salvar Jogo Destaque'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          ABA 2: COMUNICAÇÃO, AVISOS & MODO MANUTENÇÃO
          ========================================================================= */}
      {activeTab === 'comms' && (
        <div className="space-y-6">
          {/* Card 1: Aviso Geral no Topo do Site */}
          <div className="rounded-3xl border border-white/10 bg-panel p-6 shadow-pixel">
            <div className="flex items-center justify-between gap-4 pb-4 border-b border-white/5">
              <div className="flex items-center gap-2.5">
                <Globe size={18} className="text-electric" />
                <div>
                  <h3 className="font-pixel text-xs text-white">Aviso Global no Topo do Site</h3>
                  <p className="text-[11px] text-slate-400">Transmissão exibida no topo de todas as páginas em tempo real</p>
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold">
                <input
                  type="checkbox"
                  checked={announcement.active}
                  onChange={(e) => setAnnouncement((prev) => ({ ...prev, active: e.target.checked }))}
                  className="rounded border-white/20 bg-slate-900 text-electric h-4 w-4"
                />
                <span className={announcement.active ? 'text-emerald-400' : 'text-slate-500'}>
                  {announcement.active ? 'Transmitindo Agora' : 'Desativado'}
                </span>
              </label>
            </div>

            <form onSubmit={handleSaveAnnouncement} className="mt-5 space-y-4">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400">Texto do Aviso</label>
                <textarea
                  value={announcement.message}
                  onChange={(e) => setAnnouncement((prev) => ({ ...prev, message: e.target.value }))}
                  placeholder="Ex: Torneio de Street Fighter II neste sábado às 20h! Inscreva-se pelo Discord ou clube oficial."
                  rows={2}
                  className="w-full rounded-xl border border-white/10 bg-slate-950 p-3 text-xs text-white focus:border-electric focus:outline-none"
                  required
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400">Tipo de Alerta</label>
                  <select
                    value={announcement.type}
                    onChange={(e) => setAnnouncement((prev) => ({ ...prev, type: e.target.value }))}
                    className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-xs text-white focus:border-electric focus:outline-none"
                  >
                    <option value="info">ℹ️ Informativo (Azul Neon)</option>
                    <option value="warning">⚠️ Atenção (Amarelo)</option>
                    <option value="alert">🚨 Alerta Crítico (Vermelho)</option>
                    <option value="celebration">🎉 Comemoração / Evento (Rosa)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400">Link Opcional (URL)</label>
                  <input
                    type="url"
                    value={announcement.linkUrl || ''}
                    onChange={(e) => setAnnouncement((prev) => ({ ...prev, linkUrl: e.target.value }))}
                    placeholder="https://..."
                    className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-xs text-white focus:border-electric focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400">Texto do Botão do Link</label>
                  <input
                    type="text"
                    value={announcement.linkLabel || ''}
                    onChange={(e) => setAnnouncement((prev) => ({ ...prev, linkLabel: e.target.value }))}
                    placeholder="Ex: Saiba Mais"
                    className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-xs text-white focus:border-electric focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={savingAnnouncement}
                  className="flex items-center gap-2 rounded-xl bg-electric px-6 py-2.5 font-pixel text-xs font-bold text-slate-950 hover:bg-electric/90 transition shadow-neon"
                >
                  <Globe size={14} />
                  <span>{savingAnnouncement ? 'Transmitindo...' : 'Publicar / Atualizar Aviso'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Card 2: Modo Manutenção Geral */}
          <div className="rounded-3xl border border-rose-500/30 bg-rose-950/10 p-6 shadow-pixel">
            <div className="flex items-center justify-between gap-4 pb-4 border-b border-rose-500/20">
              <div className="flex items-center gap-2.5">
                <Wrench size={18} className="text-rose-400" />
                <div>
                  <h3 className="font-pixel text-xs text-rose-200">Modo Manutenção Geral</h3>
                  <p className="text-[11px] text-slate-400">Quando ativado, apenas administradores podem navegar no site</p>
                </div>
              </div>

              <span className={`rounded-full px-3 py-1 font-pixel text-[8px] font-bold uppercase tracking-wider ${system.maintenanceMode ? 'bg-rose-500 text-white shadow-[0_0_15px_rgba(244,63,94,0.5)] animate-pulse' : 'bg-slate-800 text-slate-400'}`}>
                {system.maintenanceMode ? 'SISTEMA BLOQUEADO' : 'OPERANDO NORMAL'}
              </span>
            </div>

            <div className="mt-4 space-y-4">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400">Mensagem exibida aos jogadores na tela de bloqueio</label>
                <input
                  type="text"
                  value={system.maintenanceMessage}
                  onChange={(e) => setSystem((prev) => ({ ...prev, maintenanceMessage: e.target.value }))}
                  className="w-full rounded-xl border border-white/10 bg-slate-950 px-3.5 py-2 text-xs text-white focus:border-rose-400 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <p className="text-xs text-rose-300 max-w-md">
                  Atenção: Ao ligar a manutenção, todos os jogadores comuns verão a tela temática de manutenção até você desligá-la.
                </p>

                <button
                  type="button"
                  onClick={() => {
                    const confirmed = window.confirm(
                      system.maintenanceMode
                        ? 'Deseja reabrir o site para todos os jogadores?'
                        : 'ATENÇÃO: Deseja ativar o Modo Manutenção e bloquear o acesso de jogadores comuns?'
                    )
                    if (!confirmed) return

                    const next = { ...system, maintenanceMode: !system.maintenanceMode }
                    setSystem(next)
                    saveSystemSettings(next).then(() =>
                      showToast(next.maintenanceMode ? 'Modo Manutenção ATIVADO!' : 'Modo Manutenção DESATIVADO!')
                    )
                  }}
                  className={`flex items-center gap-2 rounded-xl px-6 py-2.5 font-pixel text-xs font-bold transition shadow-neon ${
                    system.maintenanceMode
                      ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
                      : 'border border-rose-500/50 bg-rose-500/20 text-rose-300 hover:bg-rose-500/30'
                  }`}
                >
                  <Wrench size={14} />
                  <span>{system.maintenanceMode ? 'Reabrir Plataforma' : 'Ativar Modo Manutenção'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          ABA 3: GESTÃO DE JOGADORES
          ========================================================================= */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="rounded-3xl border border-white/10 bg-panel p-6 shadow-pixel">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/5">
              <div>
                <h3 className="font-pixel text-xs text-white">Controle de Usuários da Comunidade</h3>
                <p className="text-[11px] text-slate-400">Promova moderadores, aplique sanções ou bonifique jogadores</p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="Buscar por nick ou e-mail..."
                    className="rounded-xl border border-white/10 bg-slate-950 pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:border-electric focus:outline-none w-56"
                  />
                </div>

                <select
                  value={userRoleFilter}
                  onChange={(e) => setUserRoleFilter(e.target.value)}
                  className="rounded-xl border border-white/10 bg-slate-950 px-3 py-1.5 text-xs text-white focus:border-electric focus:outline-none"
                >
                  <option value="all">Todos os Cargos</option>
                  <option value="admin">Apenas Admins</option>
                  <option value="player">Apenas Jogadores</option>
                </select>

                <button
                  onClick={loadUsers}
                  className="rounded-xl border border-white/10 bg-slate-950 p-2 text-slate-400 hover:text-white transition"
                  title="Recarregar lista"
                >
                  <RefreshCw size={14} className={loadingUsers ? 'animate-spin' : ''} />
                </button>
              </div>
            </div>

            {/* Tabela de Usuários */}
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/5 text-[10px] uppercase font-bold text-slate-500">
                    <th className="pb-3 font-pixel">Jogador</th>
                    <th className="pb-3 font-pixel">Nível & XP</th>
                    <th className="pb-3 font-pixel">Cargo</th>
                    <th className="pb-3 font-pixel">Status</th>
                    <th className="pb-3 font-pixel text-right">Ações Rápidas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-500">
                        {loadingUsers ? 'Carregando jogadores...' : 'Nenhum jogador encontrado com os filtros atuais.'}
                      </td>
                    </tr>
                  ) : (
                    users.map((u) => {
                      const isOwner = u.email?.toLowerCase() === 'isaacfernandoguitar@gmail.com'
                      return (
                        <tr key={u.id} className="hover:bg-white/5 transition">
                          <td className="py-3 pr-4">
                            <div className="flex items-center gap-2.5">
                              <img
                                src={u.avatarUrl || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(u.displayName || 'Jogador')}`}
                                alt=""
                                className="h-8 w-8 rounded-xl object-cover border border-white/10 bg-slate-950"
                              />
                              <div>
                                <p className="font-bold text-white flex items-center gap-1.5">
                                  <span>{u.displayName || 'Jogador'}</span>
                                  {isOwner && (
                                    <span className="rounded bg-amber-500/20 px-1 py-0.2 font-pixel text-[7px] text-amber-300 border border-amber-500/40">
                                      DONO
                                    </span>
                                  )}
                                </p>
                                <p className="text-[10px] text-slate-500">{u.email || u.id}</p>
                              </div>
                            </div>
                          </td>

                          <td className="py-3 pr-4">
                            <span className="font-pixel text-[9px] text-electric">
                              Nv {u.level || 1}
                            </span>
                            <span className="text-[10px] text-slate-400 ml-1.5">
                              ({(u.xp || 0).toLocaleString()} XP)
                            </span>
                          </td>

                          <td className="py-3 pr-4">
                            {u.role === 'admin' ? (
                              <span className="inline-flex items-center gap-1 rounded bg-gold/15 px-2 py-0.5 font-pixel text-[8px] text-gold border border-gold/40">
                                <ShieldCheck size={10} /> ADMIN
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded bg-slate-800 px-2 py-0.5 text-[9px] text-slate-400">
                                Jogador
                              </span>
                            )}
                          </td>

                          <td className="py-3 pr-4">
                            {u.isBanned ? (
                              <span className="inline-flex items-center gap-1 rounded bg-rose-500/20 px-2 py-0.5 text-[9px] font-bold text-rose-300 border border-rose-500/40">
                                <Ban size={10} /> Banido
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded bg-emerald-500/15 px-2 py-0.5 text-[9px] font-bold text-emerald-300">
                                <Check size={10} /> Ativo
                              </span>
                            )}
                          </td>

                          <td className="py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Botão Bonificar XP */}
                              <button
                                type="button"
                                onClick={() => setSelectedUserForXp(u)}
                                className="rounded-lg bg-electric/15 border border-electric/30 p-1.5 text-electric hover:bg-electric/25 transition"
                                title="Conceder XP bônus"
                              >
                                <Zap size={13} />
                              </button>

                              {/* Promover/Rebaixar Cargo */}
                              {!isOwner && (
                                <button
                                  type="button"
                                  onClick={() => handleToggleRole(u)}
                                  className={`rounded-lg p-1.5 transition ${
                                    u.role === 'admin'
                                      ? 'bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500/20'
                                      : 'bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10'
                                  }`}
                                  title={u.role === 'admin' ? 'Rebaixar para Jogador' : 'Promover a Administrador'}
                                >
                                  <Shield size={13} />
                                </button>
                              )}

                              {/* Redefinir Nick */}
                              <button
                                type="button"
                                onClick={() => handleResetNick(u)}
                                className="rounded-lg bg-white/5 border border-white/10 p-1.5 text-slate-400 hover:text-white transition"
                                title="Redefinir apelido para 'Jogador'"
                              >
                                <RefreshCw size={13} />
                              </button>

                              {/* Banir/Desbanir */}
                              {!isOwner && (
                                <button
                                  type="button"
                                  onClick={() => handleToggleBan(u)}
                                  className={`rounded-lg p-1.5 transition ${
                                    u.isBanned
                                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30'
                                      : 'bg-rose-500/15 text-rose-400 border border-rose-500/30 hover:bg-rose-500/25'
                                  }`}
                                  title={u.isBanned ? 'Revogar banimento' : 'Suspender/Banir usuário'}
                                >
                                  <Ban size={13} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Modal de Concessão de XP Bônus */}
          {selectedUserForXp && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
              <div className="w-full max-w-md rounded-3xl border border-electric/40 bg-slate-900 p-6 shadow-2xl">
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <Zap size={16} className="text-electric" />
                    <h3 className="font-pixel text-xs text-white">Bonificar Jogador com XP</h3>
                  </div>
                  <button onClick={() => setSelectedUserForXp(null)} className="text-slate-400 hover:text-white">
                    <X size={16} />
                  </button>
                </div>

                <div className="mt-4 flex items-center gap-3 p-3 rounded-2xl bg-slate-950 border border-white/5">
                  <img
                    src={selectedUserForXp.avatarUrl}
                    alt=""
                    className="h-10 w-10 rounded-xl object-cover border border-white/10"
                  />
                  <div>
                    <p className="font-bold text-xs text-white">{selectedUserForXp.displayName}</p>
                    <p className="text-[10px] text-slate-400">XP Atual: {(selectedUserForXp.xp || 0).toLocaleString()}</p>
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-400">Quantidade de XP Bônus</label>
                    <input
                      type="number"
                      value={bonusXpAmount}
                      onChange={(e) => setBonusXpAmount(Number(e.target.value))}
                      className="w-full rounded-xl border border-white/10 bg-slate-950 px-3.5 py-2 text-xs text-white focus:border-electric focus:outline-none font-mono"
                      min={10}
                      step={50}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-400">Motivo da Bonificação</label>
                    <input
                      type="text"
                      value={bonusXpReason}
                      onChange={(e) => setBonusXpReason(e.target.value)}
                      placeholder="Ex: Campeão do Torneio Semanal"
                      className="w-full rounded-xl border border-white/10 bg-slate-950 px-3.5 py-2 text-xs text-white focus:border-electric focus:outline-none"
                    />
                  </div>
                </div>

                <div className="mt-6 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedUserForXp(null)}
                    className="rounded-xl border border-white/10 px-4 py-2 text-xs font-bold text-slate-300 hover:bg-white/5"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmBonusXp}
                    className="flex items-center gap-1.5 rounded-xl bg-electric px-5 py-2 font-pixel text-xs font-bold text-slate-950 hover:bg-electric/90 shadow-neon"
                  >
                    <Zap size={13} />
                    <span>Conceder XP</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          ABA 4: MODERAÇÃO & DENÚNCIAS
          ========================================================================= */}
      {activeTab === 'moderation' && (
        <div className="space-y-6">
          {/* Fila de Denúncias */}
          <div className="rounded-3xl border border-white/10 bg-panel p-6 shadow-pixel">
            <div className="flex items-center justify-between gap-4 pb-4 border-b border-white/5">
              <div className="flex items-center gap-2.5">
                <ShieldAlert size={18} className="text-rose-400" />
                <div>
                  <h3 className="font-pixel text-xs text-white">Central de Denúncias da Comunidade</h3>
                  <p className="text-[11px] text-slate-400">Relatórios enviados pelos usuários contra mensagens, perfis ou conduta</p>
                </div>
              </div>
              <span className="rounded-full bg-rose-500/20 px-2.5 py-0.5 font-pixel text-[9px] text-rose-300 border border-rose-500/40">
                {reports.length} pendentes
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {reports.length === 0 ? (
                <div className="py-10 text-center text-slate-500">
                  <CheckCircle2 size={36} className="mx-auto text-emerald-500/50 mb-2" />
                  <p className="font-pixel text-xs text-white">Nenhuma denúncia pendente!</p>
                  <p className="mt-1 text-xs">A comunidade está jogando limpo e em paz.</p>
                </div>
              ) : (
                reports.map((rep) => (
                  <div
                    key={rep.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl border border-white/10 bg-slate-950/60"
                  >
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-pixel text-[9px] uppercase px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40">
                          {rep.targetType || 'Usuário'}
                        </span>
                        <strong className="text-xs text-white">
                          Denunciado: {rep.targetUserName || rep.targetUserId}
                        </strong>
                        <span className="text-[10px] text-slate-500">
                          por {rep.reporterName || 'Anônimo'}
                        </span>
                      </div>
                      <p className="mt-1.5 text-xs text-slate-300">
                        Motivo: <span className="text-white font-medium">{rep.reason || 'Sem motivo detalhado'}</span>
                      </p>
                      {rep.details && (
                        <p className="mt-1 text-[11px] text-slate-400 italic">
                          "{rep.details}"
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleResolveReport(rep.id, 'dismissed')}
                        className="rounded-xl border border-white/10 px-3 py-1.5 text-xs font-bold text-slate-400 hover:text-white transition"
                      >
                        Descartar
                      </button>
                      <button
                        onClick={() => handleResolveReport(rep.id, 'resolved')}
                        className="rounded-xl bg-emerald-500/20 border border-emerald-500/40 px-3 py-1.5 text-xs font-bold text-emerald-300 hover:bg-emerald-500/30 transition"
                      >
                        Marcar Resolvido
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Exclusão Administrativa de Conteúdo */}
          <div className="rounded-3xl border border-white/10 bg-panel p-6 shadow-pixel">
            <div className="flex items-center gap-2.5 pb-4 border-b border-white/5">
              <Trash2 size={18} className="text-rose-400" />
              <div>
                <h3 className="font-pixel text-xs text-white">Remover Publicação do Feed por ID</h3>
                <p className="text-[11px] text-slate-400">Exclui permanentemente um post do feed com base no ID da atividade</p>
              </div>
            </div>

            <form onSubmit={handleDeletePostById} className="mt-4 flex flex-col sm:flex-row items-center gap-3">
              <input
                type="text"
                value={deleteActivityId}
                onChange={(e) => setDeleteActivityId(e.target.value)}
                placeholder="Insira o ID da postagem (ex: act_12345)..."
                className="flex-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3.5 py-2 text-xs text-white focus:border-rose-400 focus:outline-none"
              />
              <button
                type="submit"
                disabled={!deleteActivityId.trim()}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-rose-500/40 bg-rose-500/20 px-5 py-2 text-xs font-bold text-rose-300 hover:bg-rose-500/30 transition disabled:opacity-30 disabled:cursor-not-allowed w-full sm:w-auto shrink-0"
              >
                <Trash2 size={13} />
                <span>Excluir Publicação</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          ABA 5: MÉTRICAS DA PLATAFORMA & AUDIT LOGS
          ========================================================================= */}
      {activeTab === 'metrics' && (
        <div className="space-y-6">
          {/* Métricas Principais em Cards */}
          <div className="grid gap-4 sm:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-panel p-4 shadow-pixel">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-[10px] uppercase font-bold tracking-wider">Jogadores</span>
                <Users size={16} className="text-electric" />
              </div>
              <p className="mt-2 font-pixel text-xl text-white">
                {metrics.users.toLocaleString()}
              </p>
              <p className="mt-1 text-[10px] text-slate-500">Perfis registrados</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-panel p-4 shadow-pixel">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-[10px] uppercase font-bold tracking-wider">Clubes</span>
                <Shield size={16} className="text-purple-400" />
              </div>
              <p className="mt-2 font-pixel text-xl text-white">
                {metrics.clubs.toLocaleString()}
              </p>
              <p className="mt-1 text-[10px] text-slate-500">Comunidades ativas</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-panel p-4 shadow-pixel">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-[10px] uppercase font-bold tracking-wider">Feed</span>
                <MessageSquare size={16} className="text-cyan-400" />
              </div>
              <p className="mt-2 font-pixel text-xl text-white">
                {metrics.activities.toLocaleString()}
              </p>
              <p className="mt-1 text-[10px] text-slate-500">Atividades e capturas</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-panel p-4 shadow-pixel">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-[10px] uppercase font-bold tracking-wider">Mural de Dicas</span>
                <Trophy size={16} className="text-gold" />
              </div>
              <p className="mt-2 font-pixel text-xl text-white">
                {metrics.tips.toLocaleString()}
              </p>
              <p className="mt-1 text-[10px] text-slate-500">Macetes e segredos</p>
            </div>
          </div>

          {/* Histórico de Auditoria Administrativa (Audit Log) */}
          <div className="rounded-3xl border border-white/10 bg-panel p-6 shadow-pixel">
            <div className="flex items-center justify-between gap-4 pb-4 border-b border-white/5">
              <div className="flex items-center gap-2.5">
                <Clock3 size={18} className="text-gold" />
                <div>
                  <h3 className="font-pixel text-xs text-white">Logs de Auditoria Administrativa</h3>
                  <p className="text-[11px] text-slate-400">Histórico de ações e alterações executadas pelos administradores</p>
                </div>
              </div>
              <span className="font-pixel text-[8px] text-slate-500 uppercase">Segurança Operacional</span>
            </div>

            <div className="mt-4 divide-y divide-white/5 max-h-96 overflow-y-auto pr-1">
              {auditLogs.length === 0 ? (
                <p className="py-8 text-center text-xs text-slate-500">
                  Nenhum registro de auditoria gerado ainda.
                </p>
              ) : (
                auditLogs.map((log) => (
                  <div key={log.id} className="py-3 flex items-start justify-between gap-3 text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <strong className="text-white">{log.adminName}</strong>
                        <span className="font-pixel text-[8px] uppercase px-1.5 py-0.2 rounded bg-white/10 text-slate-300">
                          {log.action}
                        </span>
                      </div>
                      {log.details && (
                        <p className="text-[11px] text-slate-400 mt-1 font-mono break-all">
                          {JSON.stringify(log.details)}
                        </p>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-500 shrink-0">
                      {new Date(log.createdAt).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

