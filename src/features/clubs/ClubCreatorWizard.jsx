import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  Clock3,
  Dices,
  Flame,
  Gamepad2,
  Globe,
  HelpCircle,
  KeyRound,
  LoaderCircle,
  Lock,
  MessageSquare,
  Sparkles,
  Trophy,
  Users,
  Vote,
  X,
  Zap,
} from 'lucide-react'
import { useRef, useState } from 'react'
import { searchRetroAchievementsGames, resolveGameIdFromTitle } from '../retro-achievements/retroAchievementsService'

const ACCENT_OPTIONS = [
  { id: 'electric', name: 'Ciano Elétrico', border: 'border-cyan-400/60', bg: 'bg-cyan-500/20', text: 'text-cyan-300', dot: 'bg-cyan-400' },
  { id: 'neon', name: 'Roxo Neon', border: 'border-purple-500/60', bg: 'bg-purple-500/20', text: 'text-purple-300', dot: 'bg-purple-400' },
  { id: 'gold', name: 'Dourado Retrô', border: 'border-amber-400/60', bg: 'bg-amber-500/20', text: 'text-amber-300', dot: 'bg-amber-400' },
  { id: 'emerald', name: 'Esmeralda 8-bit', border: 'border-emerald-400/60', bg: 'bg-emerald-500/20', text: 'text-emerald-300', dot: 'bg-emerald-400' },
  { id: 'rose', name: 'Rosa Cyber', border: 'border-rose-400/60', bg: 'bg-rose-500/20', text: 'text-rose-300', dot: 'bg-rose-400' },
]

const ACCESS_OPTIONS = [
  { id: 'public', label: 'Pública', desc: 'Qualquer um pode descobrir e entrar.', icon: Globe },
  { id: 'code', label: 'Código Privado', desc: 'Entrada apenas via código de convite.', icon: KeyRound },
  { id: 'approval', label: 'Com Aprovação', desc: 'O dono aprova quem entra no grupo.', icon: Lock },
]

const MEMBER_LIMITS = [
  { id: '5', label: '5 membros', desc: 'Clube íntimo' },
  { id: '15', label: '15 membros', desc: 'Padrão sugerido' },
  { id: '30', label: '30 membros', desc: 'Comunidade' },
  { id: 'unlimited', label: 'Sem limite', desc: 'Livre' },
]

const VOTING_MODES = [
  { id: 'vote', label: 'Votação Coletiva', desc: 'Todos indicam jogos e votam. O mais votado ganha.', icon: Vote },
  { id: 'random', label: 'Sorteio Aleatório', desc: 'Todos indicam jogos e o sistema sorteia um.', icon: Dices },
  { id: 'owner', label: 'Dono Escolhe', desc: 'Você escolhe o jogo agora e vai direto para a sala.', icon: Trophy },
]

const CONSOLE_GENERATIONS = [
  { id: '8bit', label: '8-Bit', desc: 'NES, Master System, Game Boy' },
  { id: '16bit', label: '16-Bit', desc: 'SNES, Mega Drive, GBA' },
  { id: '32bit', label: '32-Bit', desc: 'PS1, Sega Saturn' },
  { id: 'free', label: 'Livre', desc: 'Qualquer console retrô' },
]

const PRESET_DURATIONS = [
  { days: 1, label: '1 dia' },
  { days: 3, label: '3 dias' },
  { days: 7, label: '7 dias' },
  { days: 14, label: '14 dias' },
  { days: 30, label: '30 dias' },
  { days: 45, label: '45 dias' },
  { days: 60, label: '60 dias' },
]

const ROUND_GOALS = [
  { id: 'campaign', label: 'Zerar Campanha', desc: 'Chegar aos créditos finais ou final oficial.', icon: Trophy },
  { id: 'mastery', label: 'Platinar / 100%', desc: 'Conquistar todos os troféus no RetroAchievements.', icon: Sparkles },
  { id: 'casual', label: 'Casual', desc: 'Jogar sem pressão de zeramento.', icon: Gamepad2 },
  { id: 'highscore', label: 'Desafio de Pontos', desc: 'Foco em pontuação e conquistas difíceis.', icon: Zap },
]

export default function ClubCreatorWizard({ isOpen = true, onClose, onCreated }) {
  if (!isOpen) return null

  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Step 1: Identidade
  const [name, setName] = useState('')
  const [tag, setTag] = useState('')
  const [description, setDescription] = useState('')
  const [accessMode, setAccessMode] = useState('public')
  const [memberLimit, setMemberLimit] = useState('15')
  const [accentColor, setAccentColor] = useState('electric')

  // Step 2: Jogo & Rodada
  const [votingMode, setVotingMode] = useState('vote')
  const [consoleFilter, setConsoleFilter] = useState('16bit')
  const [durationDays, setDurationDays] = useState(14)
  const [customDuration, setCustomDuration] = useState('')
  const [isCustomDuration, setIsCustomDuration] = useState(false)
  const [gameTitle, setGameTitle] = useState('')
  const [selectedGame, setSelectedGame] = useState(null)
  const [gameSuggestions, setGameSuggestions] = useState([])
  const searchRequestId = useRef(0)

  // Step 3: Dinâmica & Regras
  const [roundGoal, setRoundGoal] = useState('campaign')
  const [hardcoreMode, setHardcoreMode] = useState(false)
  const [chatEnabled, setChatEnabled] = useState(true)
  const [spoilerControl, setSpoilerControl] = useState(false)

  const activeAccent = ACCENT_OPTIONS.find((opt) => opt.id === accentColor) || ACCENT_OPTIONS[0]

  async function handleGameSearch(query, filter = consoleFilter) {
    setGameTitle(query)
    setSelectedGame(null)

    const trimmed = query.trim()
    if (trimmed.length < 2) {
      searchRequestId.current += 1
      return setGameSuggestions([])
    }

    const reqId = ++searchRequestId.current
    try {
      const results = await searchRetroAchievementsGames(trimmed, filter)
      if (reqId === searchRequestId.current) {
        setGameSuggestions(results || [])
      }
    } catch {
      if (reqId === searchRequestId.current) {
        setGameSuggestions([])
      }
    }
  }

  function validateStep1() {
    if (!name.trim() || name.trim().length < 3) {
      setError('Por favor, dê um nome com pelo menos 3 caracteres ao clube.')
      return false
    }
    setError('')
    return true
  }

  function validateStep2() {
    if (votingMode === 'owner' && !gameTitle.trim()) {
      setError('Como você escolheu definir o jogo, selecione ou digite o jogo da rodada.')
      return false
    }
    if (isCustomDuration && (!Number(customDuration) || Number(customDuration) < 1)) {
      setError('Informe uma quantidade válida de dias para a duração da rodada.')
      return false
    }
    setError('')
    return true
  }

  function handleNext() {
    if (step === 1 && validateStep1()) {
      setStep(2)
    } else if (step === 2 && validateStep2()) {
      setStep(3)
    }
  }

  function handleBack() {
    setError('')
    if (step > 1) setStep(step - 1)
  }

  async function handleFinish() {
    setError('')
    setSaving(true)

    try {
      const finalDays = isCustomDuration ? Number(customDuration) : Number(durationDays)
      const resolvedRaId = selectedGame?.id || (gameTitle ? resolveGameIdFromTitle(gameTitle) : null)

      const payload = {
        name: name.trim(),
        tag: tag.trim().toUpperCase() || name.slice(0, 4).toUpperCase(),
        description: description.trim(),
        accessMode,
        memberLimit: memberLimit === 'unlimited' ? null : Number(memberLimit),
        accentColor,
        votingMode,
        consoleFilter,
        roundDurationDays: finalDays,
        roundGoal,
        hardcoreMode,
        chatEnabled,
        spoilerControl,
        gameTitle: votingMode === 'owner' ? gameTitle.trim() : '',
        retroAchievementsId: votingMode === 'owner' ? resolvedRaId : null,
        gameCoverUrl: votingMode === 'owner' ? (selectedGame?.imageBoxArt || selectedGame?.imageIcon || null) : null,
        gameConsole: votingMode === 'owner' ? (selectedGame?.consoleName || null) : null,
      }

      await onCreated(payload)
      onClose()
    } catch (err) {
      setError(err.message || 'Falha ao criar o clube. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/85 p-3 sm:p-5 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="relative flex max-h-[92vh] w-full max-w-3xl flex-col rounded-2xl border border-white/10 bg-panel shadow-2xl overflow-hidden">
        {/* Header do Wizard */}
        <div className="flex items-center justify-between border-b border-white/10 bg-slate-950/50 px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-electric/40 bg-electric/10 text-electric">
              <Gamepad2 size={18} />
            </span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-electric">Criador de Clubes</p>
              <h2 className="font-pixel text-xs text-white sm:text-sm">Configuração da Sala</h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 transition hover:bg-white/10 hover:text-white"
            aria-label="Fechar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Barra de Progresso das Etapas */}
        <div className="flex border-b border-white/5 bg-slate-950/30 px-6 py-3">
          {[
            { num: 1, title: 'Identidade' },
            { num: 2, title: 'Jogo & Rodada' },
            { num: 3, title: 'Regras & Dinâmica' },
          ].map((item) => {
            const isCurrent = step === item.num
            const isDone = step > item.num
            return (
              <div key={item.num} className="flex flex-1 items-center">
                <div className="flex items-center gap-2">
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold transition ${
                      isDone
                        ? 'bg-emerald-400 text-slate-950'
                        : isCurrent
                        ? 'bg-electric text-slate-950 font-pixel shadow-neon'
                        : 'border border-white/20 text-slate-500'
                    }`}
                  >
                    {isDone ? <Check size={12} /> : item.num}
                  </span>
                  <span className={`hidden text-[11px] font-bold sm:inline ${isCurrent ? 'text-white' : 'text-slate-500'}`}>
                    {item.title}
                  </span>
                </div>
                {item.num < 3 && <div className={`mx-3 h-0.5 flex-1 ${isDone ? 'bg-emerald-400/60' : 'bg-white/10'}`} />}
              </div>
            )
          })}
        </div>

        {/* Mensagem de Erro se houver */}
        {error && (
          <div className="mx-6 mt-4 flex items-center justify-between rounded-xl border border-rose-400/30 bg-rose-400/10 px-4 py-2.5 text-xs text-rose-200">
            <span>{error}</span>
            <button onClick={() => setError('')}><X size={14} /></button>
          </div>
        )}

        {/* Conteúdo scrollável dos passos */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* PASSO 1: IDENTIDADE */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Nome do Clube <span className="text-rose-400">*</span>
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Clássicos do SNES, Desafio RPG 90s..."
                  maxLength={60}
                  className="mt-1.5 w-full rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white placeholder-slate-600 outline-none focus:border-electric/60"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Sigla / Tag do Clube <span className="text-slate-500 font-normal normal-case">(ex: 16BIT, SNES, RPG)</span>
                </label>
                <div className="relative mt-1.5 flex items-center">
                  <span className="absolute left-3.5 font-pixel text-xs text-purple-400 font-bold">[</span>
                  <input
                    value={tag}
                    maxLength={6}
                    onChange={(e) => setTag(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                    placeholder="TAG"
                    className="w-full rounded-xl border border-white/10 bg-slate-950/60 pl-8 pr-8 py-2.5 font-pixel text-xs text-white placeholder-slate-600 outline-none focus:border-purple-400/60 uppercase"
                  />
                  <span className="absolute right-3.5 font-pixel text-xs text-purple-400 font-bold">]</span>
                </div>
                <p className="mt-1 text-[10px] text-slate-500">
                  Essa sigla identificará sua comunidade permanente e as rodadas do clube.
                </p>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Descrição <span className="text-slate-600 font-normal normal-case">(opcional)</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Qual o objetivo desse clube? Regras ou foco dos jogadores..."
                  maxLength={240}
                  rows={2}
                  className="mt-1.5 w-full resize-none rounded-xl border border-white/10 bg-slate-950/60 px-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-electric/60"
                />
              </div>

              {/* Nível de Acesso */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Nível de Acesso
                </label>
                <div className="grid gap-2 sm:grid-cols-3">
                  {ACCESS_OPTIONS.map((opt) => {
                    const Icon = opt.icon
                    const isSelected = accessMode === opt.id
                    return (
                      <button
                        type="button"
                        key={opt.id}
                        onClick={() => setAccessMode(opt.id)}
                        className={`flex flex-col items-start rounded-xl border p-3 text-left transition ${
                          isSelected
                            ? 'border-electric bg-electric/15 text-white shadow-neon'
                            : 'border-white/10 bg-slate-950/40 text-slate-400 hover:border-white/20'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Icon size={15} className={isSelected ? 'text-electric' : 'text-slate-500'} />
                          <span className="text-xs font-bold text-white">{opt.label}</span>
                        </div>
                        <p className="mt-1 text-[10px] text-slate-400 leading-tight">{opt.desc}</p>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Limite de Membros */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Limite de Jogadores na Sala
                </label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {MEMBER_LIMITS.map((limit) => {
                    const isSelected = memberLimit === limit.id
                    return (
                      <button
                        type="button"
                        key={limit.id}
                        onClick={() => setMemberLimit(limit.id)}
                        className={`rounded-xl border p-2.5 text-center transition ${
                          isSelected
                            ? 'border-electric bg-electric/15 text-white'
                            : 'border-white/10 bg-slate-950/40 text-slate-400 hover:border-white/20'
                        }`}
                      >
                        <p className="text-xs font-bold text-white">{limit.label}</p>
                        <p className="text-[9px] text-slate-500">{limit.desc}</p>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Cor de Destaque Neon */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Destaque Neon do Clube
                </label>
                <div className="flex flex-wrap gap-2">
                  {ACCENT_OPTIONS.map((acc) => {
                    const isSelected = accentColor === acc.id
                    return (
                      <button
                        type="button"
                        key={acc.id}
                        onClick={() => setAccentColor(acc.id)}
                        className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold transition ${
                          isSelected
                            ? `${acc.border} ${acc.bg} ${acc.text} ring-1 ring-white/20`
                            : 'border-white/10 bg-slate-950/40 text-slate-400 hover:border-white/20'
                        }`}
                      >
                        <span className={`h-2.5 w-2.5 rounded-full ${acc.dot}`} />
                        {acc.name}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Mini Preview do Card */}
              <div className="rounded-xl border border-white/10 bg-slate-950/60 p-3">
                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500 mb-2">Pré-visualização do Cartão:</p>
                <div className={`rounded-xl border ${activeAccent.border} bg-panel p-4 flex items-center justify-between`}>
                  <div>
                    <span className="font-pixel text-lg text-electric">✦</span>
                    <h4 className="mt-1 font-pixel text-xs text-white">{name.trim() || 'Nome do seu Clube'}</h4>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {accessMode === 'public' ? 'Pública' : accessMode === 'code' ? 'Código Privado' : 'Com Aprovação'} • {memberLimit === 'unlimited' ? 'Livre' : `Até ${memberLimit} membros`}
                    </p>
                  </div>
                  <span className="rounded-md bg-emerald-400/10 px-2 py-1 text-[9px] font-bold uppercase text-emerald-300">
                    Ativo
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* PASSO 2: JOGO & RODADA */}
          {step === 2 && (
            <div className="space-y-5">
              {/* Escolher Geração de Console do Clube */}
              <div className="rounded-2xl border border-electric/30 bg-electric/10 p-4 space-y-3">
                <div className="flex items-center gap-2 text-electric">
                  <Gamepad2 size={18} />
                  <h3 className="font-bold text-xs">Geração de Consoles Permitida no Clube</h3>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Defina quais consoles farão parte das rodadas e votações deste clube:
                </p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 pt-1">
                  {CONSOLE_GENERATIONS.map((gen) => {
                    const isSelected = consoleFilter === gen.id
                    return (
                      <button
                        type="button"
                        key={gen.id}
                        onClick={() => {
                          setConsoleFilter(gen.id)
                          if (gameTitle.trim().length >= 2) {
                            handleGameSearch(gameTitle, gen.id)
                          }
                        }}
                        className={`rounded-xl border p-2.5 text-center transition ${
                          isSelected
                            ? 'border-electric bg-electric/25 text-white ring-1 ring-electric shadow-neon'
                            : 'border-white/10 bg-slate-950/50 text-slate-400 hover:border-white/20'
                        }`}
                      >
                        <p className="text-xs font-bold text-white">{gen.label}</p>
                        <p className="text-[9px] text-slate-400 mt-0.5">{gen.desc}</p>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Modo de Escolha do Jogo */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Como o Jogo da Rodada Será Escolhido?
                </label>
                <div className="grid gap-2 sm:grid-cols-3">
                  {VOTING_MODES.map((mode) => {
                    const Icon = mode.icon
                    const isSelected = votingMode === mode.id
                    return (
                      <button
                        type="button"
                        key={mode.id}
                        onClick={() => setVotingMode(mode.id)}
                        className={`flex flex-col items-start rounded-xl border p-3 text-left transition ${
                          isSelected
                            ? 'border-gold bg-gold/15 text-white shadow-neon'
                            : 'border-white/10 bg-slate-950/40 text-slate-400 hover:border-white/20'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Icon size={16} className={isSelected ? 'text-gold' : 'text-slate-500'} />
                          <span className="text-xs font-bold text-white">{mode.label}</span>
                        </div>
                        <p className="mt-1.5 text-[10px] text-slate-400 leading-tight">{mode.desc}</p>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Se Votação Coletiva: Aviso */}
              {votingMode !== 'owner' ? (
                <div className="rounded-xl border border-white/10 bg-slate-950/40 p-3.5 text-xs text-slate-400">
                  <p>
                    ✓ Os membros entrarão na <strong>Sala de Votação</strong> para sugerir jogos da geração <strong>{CONSOLE_GENERATIONS.find(g => g.id === consoleFilter)?.label || 'Livre'}</strong> e eleger o vencedor.
                  </p>
                </div>
              ) : (
                /* Se Dono Escolhe: Campo de Busca no RetroAchievements */
                <div className="space-y-2">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Pesquisar Jogo no RetroAchievements <span className="text-rose-400">*</span>
                  </label>
                  {consoleFilter && consoleFilter !== 'free' && (
                    <p className="text-[11px] text-amber-300 flex items-center gap-1">
                      <span>⚡ Exibindo apenas jogos da geração: <strong>{CONSOLE_GENERATIONS.find(g => g.id === consoleFilter)?.label}</strong></span>
                    </p>
                  )}
                  <input
                    value={gameTitle}
                    onChange={(e) => handleGameSearch(e.target.value)}
                    placeholder="Ex: Super Mario World, Chrono Trigger, Sonic 2..."
                    className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white placeholder-slate-600 outline-none focus:border-electric/60"
                  />

                  {selectedGame && (
                    <div className="flex items-center gap-3 rounded-xl border border-emerald-400/40 bg-emerald-500/10 p-2.5 text-xs text-emerald-200">
                      {selectedGame.imageIcon ? (
                        <img src={selectedGame.imageIcon} alt="" className="h-8 w-8 rounded object-cover border border-emerald-400/30" />
                      ) : (
                        <Gamepad2 size={20} className="text-emerald-400" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-white truncate">{selectedGame.title}</p>
                        <p className="text-[10px] text-emerald-300 uppercase tracking-wider">{selectedGame.consoleName || 'RetroAchievements'}</p>
                      </div>
                      <span className="font-mono text-[10px] text-emerald-400 shrink-0">RA #{selectedGame.id}</span>
                    </div>
                  )}

                  {gameSuggestions.length > 0 && (
                    <div className="max-h-48 overflow-y-auto rounded-xl border border-white/10 bg-slate-950 shadow-2xl divide-y divide-white/5">
                      {gameSuggestions.map((game) => (
                        <button
                          type="button"
                          key={game.id || game.title}
                          onClick={() => {
                            setGameTitle(game.title)
                            setSelectedGame(game)
                            setGameSuggestions([])
                          }}
                          className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-xs text-slate-300 hover:bg-white/10 transition"
                        >
                          {game.imageIcon ? (
                            <img src={game.imageIcon} alt="" className="h-7 w-7 rounded object-cover border border-white/10 shrink-0" />
                          ) : (
                            <Gamepad2 size={16} className="text-electric shrink-0" />
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-bold text-white">{game.title}</p>
                            {game.consoleName && <p className="text-[9px] text-electric uppercase">{game.consoleName}</p>}
                          </div>
                          {game.id && <span className="font-mono text-[9px] text-slate-500">RA #{game.id}</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Tempo de Gameplay da Rodada */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Tempo de Gameplay da Rodada
                </label>
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
                  {PRESET_DURATIONS.map((dur) => {
                    const isSelected = !isCustomDuration && durationDays === dur.days
                    return (
                      <button
                        type="button"
                        key={dur.days}
                        onClick={() => {
                          setIsCustomDuration(false)
                          setDurationDays(dur.days)
                        }}
                        className={`rounded-xl border py-2 text-center text-xs font-bold transition ${
                          isSelected
                            ? 'border-electric bg-electric/20 text-electric'
                            : 'border-white/10 bg-slate-950/40 text-slate-400 hover:border-white/20'
                        }`}
                      >
                        {dur.label}
                      </button>
                    )
                  })}
                </div>

                <div className="mt-2.5 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsCustomDuration(!isCustomDuration)}
                    className={`text-[11px] font-bold uppercase tracking-wider transition ${
                      isCustomDuration ? 'text-electric underline' : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    Personalizar dias
                  </button>

                  {isCustomDuration && (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        max="365"
                        value={customDuration}
                        onChange={(e) => setCustomDuration(e.target.value)}
                        placeholder="Ex: 21"
                        className="w-20 rounded-lg border border-white/10 bg-slate-950/60 px-3 py-1.5 text-xs text-white outline-none focus:border-electric"
                      />
                      <span className="text-xs text-slate-400">dias</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* PASSO 3: REGRAS & DINÂMICAS */}
          {step === 3 && (
            <div className="space-y-5">
              {/* Meta de Zeramento */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Meta de Conclusão da Rodada
                </label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {ROUND_GOALS.map((goal) => {
                    const Icon = goal.icon
                    const isSelected = roundGoal === goal.id
                    return (
                      <button
                        type="button"
                        key={goal.id}
                        onClick={() => setRoundGoal(goal.id)}
                        className={`flex items-start gap-3 rounded-xl border p-3 text-left transition ${
                          isSelected
                            ? 'border-electric bg-electric/15 text-white shadow-neon'
                            : 'border-white/10 bg-slate-950/40 text-slate-400 hover:border-white/20'
                        }`}
                      >
                        <Icon size={18} className={isSelected ? 'text-electric mt-0.5' : 'text-slate-500 mt-0.5'} />
                        <div>
                          <p className="text-xs font-bold text-white">{goal.label}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">{goal.desc}</p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Modo Livre vs Hardcore */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Dificuldade e Salvamento
                </label>
                <div className="grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setHardcoreMode(false)}
                    className={`rounded-xl border p-3 text-left transition ${
                      !hardcoreMode
                        ? 'border-emerald-400 bg-emerald-500/15 text-white'
                        : 'border-white/10 bg-slate-950/40 text-slate-400'
                    }`}
                  >
                    <p className="text-xs font-bold text-emerald-300">🕹️ Modo Livre</p>
                    <p className="text-[10px] text-slate-400 mt-1 leading-tight">
                      Save States e Rewind permitidos no emulador. Jogue no seu próprio ritmo.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setHardcoreMode(true)}
                    className={`rounded-xl border p-3 text-left transition ${
                      hardcoreMode
                        ? 'border-rose-500 bg-rose-500/20 text-white shadow-neon'
                        : 'border-white/10 bg-slate-950/40 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <Flame size={14} className="text-rose-400" />
                      <p className="text-xs font-bold text-rose-300">💀 Modo Hardcore</p>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1 leading-tight">
                      Save States e Rewind desativados no emulador! Apenas saves originais da fita.
                    </p>
                  </button>
                </div>

                {hardcoreMode && (
                  <div className="mt-2.5 flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-[11px] text-rose-200">
                    <AlertTriangle size={14} className="shrink-0 text-rose-400" />
                    <span>Atenção: No modo Hardcore os jogadores não poderão voltar no tempo nem usar save states!</span>
                  </div>
                )}
              </div>

              {/* Chat e Spoilers */}
              <div className="grid gap-3 sm:grid-cols-2 pt-1">
                {/* Chat */}
                <div className="rounded-xl border border-white/10 bg-slate-950/40 p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MessageSquare size={15} className="text-electric" />
                      <span className="text-xs font-bold text-white">Chat da Sala</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={chatEnabled}
                      onChange={(e) => setChatEnabled(e.target.checked)}
                      className="h-4 w-4 rounded accent-cyan-400 cursor-pointer"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1.5">
                    Permite troca de mensagens de texto e presença online na sala.
                  </p>
                </div>

                {/* Spoilers */}
                <div className="rounded-xl border border-white/10 bg-slate-950/40 p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Lock size={15} className="text-gold" />
                      <span className="text-xs font-bold text-white">Ocultar Spoilers</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={spoilerControl}
                      onChange={(e) => setSpoilerControl(e.target.checked)}
                      className="h-4 w-4 rounded accent-amber-400 cursor-pointer"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1.5">
                    Oculta checkpoints e dicas avançadas no mural para evitar spoilers de história.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Rodapé de Ações com Navegação */}
        <div className="flex items-center justify-between border-t border-white/10 bg-slate-950/50 px-6 py-4">
          {step > 1 ? (
            <button
              type="button"
              onClick={handleBack}
              disabled={saving}
              className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-300 transition hover:bg-white/10 disabled:opacity-50"
            >
              <ArrowLeft size={14} /> Voltar
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-slate-300"
            >
              Cancelar
            </button>
          )}

          {step < 3 ? (
            <button
              type="button"
              onClick={handleNext}
              className="flex items-center gap-1.5 rounded-xl border border-electric/40 bg-electric/20 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-electric transition hover:bg-electric/30"
            >
              Avançar <ArrowRight size={14} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinish}
              disabled={saving}
              className="flex items-center gap-2 rounded-xl border border-emerald-400/40 bg-emerald-500/20 px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-emerald-300 transition hover:bg-emerald-500/30 disabled:opacity-50 shadow-neon"
            >
              {saving && <LoaderCircle size={14} className="animate-spin" />}
              {saving ? 'Criando Clube...' : 'Criar Clube 🚀'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

