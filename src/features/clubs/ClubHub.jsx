import {
  ArrowLeft,
  CalendarDays,
  Check,
  Clock3,
  Flame,
  Gamepad2,
  KeyRound,
  Link2,
  LoaderCircle,
  Lock,
  Plus,
  Search,
  Settings,
  Share2,
  Shield,
  Sparkles,
  Trophy,
  Users,
  Vote,
  X,
  Trash2,
  Eye,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { createClub, listMyClubs, listClubs, joinClub, findClubByCode, requestToJoinClub } from './clubService'
import { listMyGameRooms, listMySoloRooms, deleteGameRoom, joinGameRoom } from '../game-room/roomService'
import { getCurrentUser } from '../auth/authService'
import ClubSettingsModal from './ClubSettingsModal'
import ClubCreatorWizard from './ClubCreatorWizard'
import InviteFriendModal from './InviteFriendModal'
import NewRoomModal from './NewRoomModal'
import CreateSoloRoomModal from '../game-room/CreateSoloRoomModal'
import ClubDetailPage from './ClubDetailPage'
import { getGameRetroMedia } from '../retro-achievements/gameMediaService'

function getGenerationLabel(filter) {
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

export default function ClubHub({ onBack, onOpenGameRoom, initialClub = null }) {
  // Seletor principal: 'clubs' (Clubes/Guildas) | 'rooms' (Salas de Jogo)
  const [mainTab, setMainTab] = useState('clubs')

  // Clube selecionado para ver detalhes completos
  const [selectedClubForDetail, setSelectedClubForDetail] = useState(initialClub || null)

  useEffect(() => {
    if (initialClub) {
      setSelectedClubForDetail(initialClub)
      setMainTab('clubs')
    }
  }, [initialClub])

  // Clubes
  const [myClubs, setMyClubs] = useState([])
  const [allClubs, setAllClubs] = useState([])
  const [clubSubTab, setClubSubTab] = useState('my') // 'my' | 'explore'

  // Salas de Jogos
  const [myRooms, setMyRooms] = useState([])
  const [mySoloRooms, setMySoloRooms] = useState([])
  const [roomSubTab, setRoomSubTab] = useState('solo') // 'solo' | 'my'

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Modais
  const [isCreateClubOpen, setIsCreateClubOpen] = useState(false)
  const [isNewRoomOpen, setIsNewRoomOpen] = useState(false)
  const [isSoloModalOpen, setIsSoloModalOpen] = useState(false)
  const [isJoinOpen, setIsJoinOpen] = useState(false)
  const [settingsClub, setSettingsClub] = useState(null)
  const [inviteFriendClub, setInviteFriendClub] = useState(null)
  const [inviteCode, setInviteCode] = useState('')
  const [joining, setJoining] = useState(false)
  const [foundClub, setFoundClub] = useState(null)
  const [searchingClub, setSearchingClub] = useState(false)
  const [requestSent, setRequestSent] = useState(false)
  const searchTimeoutRef = useRef(null)

  useEffect(() => {
    loadAll()

    // Detectar convite via parâmetro de URL (?join=CODIGO)
    try {
      const params = new URLSearchParams(window.location.search)
      const joinParam = params.get('join')
      if (joinParam) {
        const code = joinParam.trim().toUpperCase()
        setInviteCode(code)
        setIsJoinOpen(true)
        handleLookupCode(code)
      }
    } catch {}
  }, [])

  async function loadAll() {
    setLoading(true)
    setError('')
    try {
      const [userClubs, publicClubs, userRooms, userSoloRooms] = await Promise.all([
        listMyClubs(),
        listClubs(),
        listMyGameRooms(),
        listMySoloRooms(),
      ])
      setMyClubs(userClubs || [])
      setAllClubs(publicClubs || [])
      setMyRooms(userRooms || [])
      setMySoloRooms(userSoloRooms || [])
    } catch (loadError) {
      setError(loadError.message || 'Não foi possível carregar os dados do Salão de Jogos.')
    } finally {
      setLoading(false)
    }
  }

  async function handleDeleteSoloRoom(e, roomId) {
    e.stopPropagation()
    if (!window.confirm('Tem certeza de que deseja excluir esta Sala Individual (Quartinho Gamer)?')) return
    try {
      await deleteGameRoom(roomId)
      setMySoloRooms((prev) => prev.filter((r) => r.id !== roomId))
    } catch (err) {
      alert(err.message || 'Erro ao excluir sala individual.')
    }
  }

  async function handleLookupCode(code) {
    const clean = code.trim().toUpperCase()
    if (clean.length < 3) {
      setFoundClub(null)
      return
    }
    setSearchingClub(true)
    setError('')
    try {
      const club = await findClubByCode(clean)
      setFoundClub(club)
    } catch {
      setFoundClub(null)
    } finally {
      setSearchingClub(false)
    }
  }

  function handleCodeChange(val) {
    const upper = val.toUpperCase()
    setInviteCode(upper)
    setRequestSent(false)
    setError('')

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    searchTimeoutRef.current = setTimeout(() => {
      handleLookupCode(upper)
    }, 300)
  }

  async function handleCreatedFromWizard(clubPayload) {
    const club = await createClub(clubPayload)
    setMyClubs((curr) => [...curr, club])
    setSelectedClubForDetail(club)
  }

  async function handleJoin(event) {
    event.preventDefault()
    const targetCode = inviteCode.trim()
    if (!targetCode) return
    setJoining(true)
    setError('')
    setRequestSent(false)

    try {
      if (foundClub?.accessMode === 'approval') {
        await requestToJoinClub(foundClub.id)
        setRequestSent(true)
      } else {
        const joined = await joinClub(foundClub?.id || targetCode)
        await loadAll()
        setInviteCode('')
        setFoundClub(null)
        setIsJoinOpen(false)
        if (joined) setSelectedClubForDetail(joined)
      }
    } catch (joinError) {
      setError(joinError.message || 'Não foi possível entrar neste clube.')
    } finally {
      setJoining(false)
    }
  }

  // Se estiver visualizando a página de detalhes de um clube permanente
  if (selectedClubForDetail) {
    return (
      <ClubDetailPage
        clubId={selectedClubForDetail.id}
        onBack={() => {
          setSelectedClubForDetail(null)
          loadAll()
        }}
        onOpenGameRoom={onOpenGameRoom}
      />
    )
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-16">
      {/* Header Principal do Salão de Jogos */}
      <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <button
            onClick={onBack}
            className="mb-4 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 transition hover:text-electric"
          >
            <ArrowLeft size={14} /> Voltar para visão geral
          </button>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-electric">Comunidade & Rodadas</p>
          <h1 className="mt-2 font-pixel text-base sm:text-lg text-white">Salão de Jogos</h1>
          <p className="mt-1 text-xs text-slate-400">
            Junte-se a clubes permanentes para disputar temporadas ou abra salas para jogatinas avulsas.
          </p>
        </div>

        {/* Botões de Ação */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => { setError(''); setIsJoinOpen(true) }}
            className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-slate-950/40 px-3.5 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-300 transition hover:bg-white/5"
          >
            <KeyRound size={14} />
            <span>Código de Convite</span>
          </button>

          {mainTab === 'clubs' ? (
            <button
              onClick={() => { setError(''); setIsCreateClubOpen(true) }}
              className="flex items-center justify-center gap-2 rounded-xl border border-purple-500/40 bg-purple-500/15 px-4 py-2.5 text-[10px] font-pixel text-purple-200 hover:bg-purple-500/25 transition shadow-neon"
            >
              <Plus size={14} />
              <span>Criar Clube</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setError(''); setIsSoloModalOpen(true) }}
                className="flex items-center justify-center gap-2 rounded-xl bg-electric px-4 py-2.5 text-[10px] font-pixel text-slate-950 hover:bg-electric/90 transition shadow-neon"
                title="Abrir uma nova sala individual para zerar um jogo"
              >
                <Gamepad2 size={14} />
                <span>+ Novo Quartinho Gamer</span>
              </button>

              <button
                onClick={() => { setError(''); setIsNewRoomOpen(true) }}
                className="flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-slate-900 px-3.5 py-2.5 text-[10px] font-pixel text-slate-200 hover:bg-slate-800 transition"
              >
                <Plus size={13} />
                <span>Sala em Grupo</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {error && (
        <div role="alert" className="flex items-center justify-between gap-4 rounded-xl border border-rose-300/20 bg-rose-300/5 px-4 py-3 text-xs text-rose-200">
          <span>{error}</span>
          <button onClick={() => setError('')}><X size={15} /></button>
        </div>
      )}

      {/* Switcher Principal: Clubes vs Salas de Jogos */}
      <div className="flex border-b border-white/10 gap-2 text-xs">
        <button
          onClick={() => setMainTab('clubs')}
          className={`flex items-center gap-2 rounded-t-xl px-5 py-3 font-bold uppercase tracking-wider transition border-b-2 ${
            mainTab === 'clubs'
              ? 'border-purple-400 text-purple-300 bg-purple-500/10'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <Shield size={15} />
          Clubes ({myClubs.length})
        </button>

        <button
          onClick={() => setMainTab('rooms')}
          className={`flex items-center gap-2 rounded-t-xl px-5 py-3 font-bold uppercase tracking-wider transition border-b-2 ${
            mainTab === 'rooms'
              ? 'border-electric text-electric bg-electric/10'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <Gamepad2 size={15} />
          Salas de Jogos ({myRooms.length + mySoloRooms.length})
        </button>
      </div>

      {/* ================= SEÇÃO 1: CLUBES & GUILDAS ================= */}
      {mainTab === 'clubs' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setClubSubTab('my')}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                  clubSubTab === 'my'
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Meus Clubes ({myClubs.length})
              </button>
              <button
                onClick={() => setClubSubTab('explore')}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                  clubSubTab === 'explore'
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Explorar Todos ({allClubs.length})
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center p-12 text-slate-500 text-xs">
              <LoaderCircle className="mr-2 animate-spin text-purple-400" size={16} /> Carregando clubes...
            </div>
          ) : (clubSubTab === 'my' ? myClubs : allClubs).length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-panel p-12 text-center">
              <Shield className="mx-auto text-slate-600 mb-3" size={36} />
              <h3 className="font-pixel text-xs text-white">
                {clubSubTab === 'my' ? 'Você ainda não faz parte de nenhum clube' : 'Nenhum clube encontrado'}
              </h3>
              <p className="mt-1 text-xs text-slate-400 max-w-sm mx-auto">
                Crie seu próprio grupo fixo com amigos para jogar rodadas e acumular um histórico de vitórias!
              </p>
              <button
                onClick={() => setIsCreateClubOpen(true)}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2 font-pixel text-xs text-white hover:bg-purple-500 transition shadow-neon"
              >
                <Plus size={14} /> Criar Clube
              </button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {(clubSubTab === 'my' ? myClubs : allClubs).map((club) => {
                const currentUser = getCurrentUser()
                const isMember = club.memberIds?.includes(currentUser?.id)
                const hasRoom = Boolean(club.activeRoomSummary?.gameTitle || club.gameTitle)

                return (
                  <div
                    key={club.id}
                    onClick={() => setSelectedClubForDetail(club)}
                    className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-panel p-5 shadow-pixel transition duration-200 hover:-translate-y-1 hover:border-purple-400/50 cursor-pointer select-none"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-purple-500/30 bg-purple-500/10 text-purple-300 font-pixel text-sm">
                            {club.icon || '✦'}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="rounded font-pixel text-[8px] font-bold text-purple-400 bg-purple-500/15 px-1.5 py-0.5 border border-purple-500/30">
                                [{club.tag}]
                              </span>
                              <span className="rounded text-[8px] font-bold uppercase tracking-wider text-cyan-300 bg-cyan-500/10 px-1.5 py-0.5 border border-cyan-500/30">
                                {getGenerationLabel(club.consoleFilter)}
                              </span>
                              <h3 className="font-pixel text-xs text-white group-hover:text-purple-300 transition truncate max-w-[140px]">
                                {club.name}
                              </h3>
                            </div>
                            <span className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                              <Users size={11} /> {club.members} {club.members === 1 ? 'membro' : 'membros'}
                            </span>
                          </div>
                        </div>

                        {club.inviteCode && (
                          <span className="font-mono text-[9px] font-bold text-gold bg-gold/10 border border-gold/30 px-1.5 py-0.5 rounded shrink-0">
                            {club.inviteCode}
                          </span>
                        )}
                      </div>

                      <p className="mt-3 text-xs text-slate-400 line-clamp-2 leading-relaxed">
                        {club.description || 'Comunidade permanente de jogadores retrô.'}
                      </p>
                    </div>

                    {/* Rodada Atual ou Status */}
                    <div className="mt-5 pt-3 border-t border-white/5 flex items-center justify-between">
                      {hasRoom ? (
                        <div className="flex items-center gap-1.5 text-xs text-emerald-300 truncate">
                          <Flame size={12} className="text-emerald-400 animate-pulse shrink-0" />
                          <span className="truncate font-bold text-[11px] text-emerald-400">
                            {club.activeRoomSummary?.gameTitle || club.gameTitle}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-500">Sem rodada ativa</span>
                      )}

                      <span className="text-[10px] font-pixel text-purple-400 group-hover:translate-x-0.5 transition">
                        Ver Clube →
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ================= SEÇÃO 2: SALAS DE JOGOS ================= */}
      {mainTab === 'rooms' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setRoomSubTab('solo')}
                className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
                  roomSubTab === 'solo'
                    ? 'bg-electric/20 text-electric border border-electric/40 shadow-neon'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Gamepad2 size={13} />
                Quartinho Gamer ({mySoloRooms.length})
              </button>
              <button
                onClick={() => setRoomSubTab('my')}
                className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
                  roomSubTab === 'my'
                    ? 'bg-electric/20 text-electric border border-electric/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Salas em Grupo ({myRooms.filter((r) => !r.isSolo).length})
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center p-12 text-slate-500 text-xs">
              <LoaderCircle className="mr-2 animate-spin text-electric" size={16} /> Carregando salas de jogo...
            </div>
          ) : roomSubTab === 'solo' ? (
            /* Sub-seção: Quartinho Gamer (Salas Individuais) */
            mySoloRooms.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-electric/20 bg-panel p-12 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-electric/10 border border-electric/30 text-electric mb-3 shadow-pixel">
                  <Gamepad2 size={28} />
                </div>
                <h3 className="font-pixel text-xs text-white">Nenhum Quartinho Gamer aberto</h3>
                <p className="mt-1 text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                  Abra uma sala individual para jogar e zerar qualquer jogo retrô no seu próprio ritmo, sem limite de tempo e com link de transmissão para seus amigos assistirem e conversarem no chat!
                </p>
                <button
                  onClick={() => setIsSoloModalOpen(true)}
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-electric px-5 py-2.5 font-pixel text-xs text-slate-950 hover:bg-electric/90 transition shadow-neon"
                >
                  <Plus size={14} /> Abrir Meu Primeiro Quartinho Gamer
                </button>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {mySoloRooms.map((room) => {
                  return (
                    <div
                      key={room.id}
                      onClick={() => onOpenGameRoom?.(room)}
                      className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-panel shadow-pixel transition duration-200 hover:-translate-y-1 hover:border-electric/50 cursor-pointer select-none"
                    >
                      <div className="relative h-36 w-full overflow-hidden bg-slate-950">
                        <img
                          src={room.gameCoverUrl || 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=600&q=85'}
                          alt={room.gameTitle}
                          className="h-full w-full object-contain p-2 saturate-[0.9] transition duration-300 group-hover:scale-105 group-hover:saturate-100"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-panel via-transparent to-black/30" />

                        <span className="absolute left-3 top-3 rounded-md border border-white/15 bg-black/70 px-2 py-0.5 font-pixel text-[8px] uppercase text-slate-200 backdrop-blur-md">
                          {room.gameConsole || 'Retro'}
                        </span>

                        <span className="absolute right-3 top-3 rounded-md border border-electric/40 bg-electric/25 px-2 py-0.5 font-pixel text-[8px] font-bold uppercase text-electric backdrop-blur-md shadow-pixel">
                          🎮 Sala Individual
                        </span>
                      </div>

                      <div className="p-4 flex flex-1 flex-col justify-between">
                        <div>
                          <h4 className="font-pixel text-xs text-white truncate group-hover:text-electric transition">
                            {room.gameTitle || room.title}
                          </h4>
                          <p className="mt-1 text-[10.5px] text-slate-400">
                            {room.roundGoal === 'mastery'
                              ? '100% Conquistas (Mastery)'
                              : room.roundGoal === 'casual'
                              ? 'Casual & Nostalgia'
                              : room.roundGoal === 'speedrun'
                              ? 'Speedrun'
                              : 'Meta: Zerar Campanha'}
                          </p>
                          <span className="inline-block mt-1.5 text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                            Sem limite de tempo
                          </span>
                        </div>

                        <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[10px]">
                          <button
                            type="button"
                            onClick={(e) => handleDeleteSoloRoom(e, room.id)}
                            className="flex items-center gap-1 rounded-lg p-1 text-slate-500 hover:bg-rose-500/10 hover:text-rose-400 transition"
                            title="Excluir este Quartinho Gamer"
                          >
                            <Trash2 size={13} />
                            <span className="text-[9px]">Excluir</span>
                          </button>

                          <span className="font-pixel text-electric group-hover:translate-x-0.5 transition flex items-center gap-1">
                            Jogar Solo →
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          ) : (roomSubTab === 'my' ? myRooms.filter((r) => !r.isSolo) : myRooms.filter((r) => !r.isSolo)).length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-panel p-12 text-center">
              <Gamepad2 className="mx-auto text-slate-600 mb-3" size={36} />
              <h3 className="font-pixel text-xs text-white">Nenhuma sala coletiva encontrada</h3>
              <p className="mt-1 text-xs text-slate-400 max-w-sm mx-auto">
                Inicie uma rodada vinculada a um clube ou abra uma jogatina avulsa para jogar em grupo!
              </p>
              <button
                onClick={() => setIsNewRoomOpen(true)}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-electric px-4 py-2 font-pixel text-xs text-slate-950 hover:bg-electric/90 transition shadow-neon"
              >
                <Plus size={14} /> Abrir Sala Coletiva
              </button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {(roomSubTab === 'my' ? myRooms.filter((r) => !r.isSolo) : myRooms.filter((r) => !r.isSolo)).map((room) => {
                const isClubRoom = Boolean(room.clubId)

                return (
                  <div
                    key={room.id}
                    onClick={() => onOpenGameRoom?.(room)}
                    className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-panel shadow-pixel transition duration-200 hover:-translate-y-1 hover:border-electric/50 cursor-pointer select-none"
                  >
                    <div className="relative h-36 w-full overflow-hidden bg-slate-950">
                      <img
                        src={room.gameCoverUrl || 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=600&q=85'}
                        alt=""
                        className="h-full w-full object-cover saturate-[0.85] transition duration-300 group-hover:scale-105 group-hover:saturate-100"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-panel via-transparent to-black/30" />

                      <span className="absolute left-3 top-3 rounded-md border border-white/15 bg-black/60 px-2 py-0.5 font-pixel text-[8px] uppercase text-slate-200 backdrop-blur-md">
                        {room.gameConsole || 'Retro'}
                      </span>

                      {isClubRoom ? (
                        <span className="absolute right-3 top-3 rounded-md border border-purple-500/40 bg-purple-500/30 px-2 py-0.5 font-pixel text-[8px] font-bold uppercase text-purple-200 backdrop-blur-md">
                          [{room.clubTag || 'CLUBE'}] {room.clubName}
                        </span>
                      ) : (
                        <span className="absolute right-3 top-3 rounded-md border border-amber-500/40 bg-amber-500/30 px-2 py-0.5 font-pixel text-[8px] font-bold uppercase text-amber-200 backdrop-blur-md">
                          ⭐ Jogatina Avulsa
                        </span>
                      )}
                    </div>

                    <div className="p-4 flex flex-1 flex-col justify-between">
                      <div>
                        <h4 className="font-pixel text-xs text-white truncate group-hover:text-electric transition">
                          {room.gameTitle || room.title}
                        </h4>
                        <p className="mt-1 text-[10px] text-slate-400 truncate">
                          {room.title !== room.gameTitle ? room.title : `Rodada de ${room.roundDurationDays || 14} dias`}
                        </p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[10px] text-slate-400">
                        <span className="flex items-center gap-1">
                          <Users size={12} className="text-slate-500" />
                          {room.memberCount || 1} jogadores
                        </span>

                        <span className="font-pixel text-electric group-hover:translate-x-0.5 transition">
                          Jogar Agora →
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Modal Criar Clube */}
      <ClubCreatorWizard
        isOpen={isCreateClubOpen}
        onClose={() => setIsCreateClubOpen(false)}
        onCreated={handleCreatedFromWizard}
      />

      {/* Modal Abrir Sala de Jogo */}
      <NewRoomModal
        isOpen={isNewRoomOpen}
        onClose={() => setIsNewRoomOpen(false)}
        onRoomCreated={(newRoom) => {
          loadAll()
          onOpenGameRoom?.(newRoom)
        }}
      />

      {/* Modal Quartinho Gamer (Sala Individual) */}
      <CreateSoloRoomModal
        isOpen={isSoloModalOpen}
        onClose={() => setIsSoloModalOpen(false)}
        onRoomCreated={(newRoom) => {
          loadAll()
          onOpenGameRoom?.(newRoom)
        }}
      />

      {/* Modal Entrar por Convite */}
      {isJoinOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-panel shadow-2xl p-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
              <h3 className="font-pixel text-xs text-white">Entrar por Código</h3>
              <button onClick={() => setIsJoinOpen(false)} className="text-slate-400 hover:text-white"><X size={16} /></button>
            </div>

            <form onSubmit={handleJoin} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Código de Convite (ex: ZR-16BIT)
                </label>
                <input
                  type="text"
                  value={inviteCode}
                  onChange={(e) => handleCodeChange(e.target.value)}
                  placeholder="ZR-XXXXX"
                  className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-2.5 font-mono text-sm text-gold uppercase outline-none focus:border-electric/50"
                  autoFocus
                />
              </div>

              {searchingClub && (
                <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
                  <LoaderCircle size={13} className="animate-spin text-electric" /> Buscando clube...
                </p>
              )}

              {foundClub && (
                <div className="rounded-xl border border-purple-500/30 bg-purple-500/10 p-3 text-xs">
                  <p className="font-bold text-white">[{foundClub.tag}] {foundClub.name}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{foundClub.description}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={joining || !inviteCode.trim()}
                className="w-full rounded-xl bg-electric py-2.5 font-pixel text-xs font-bold text-slate-950 hover:bg-electric/90 disabled:opacity-50 transition shadow-neon"
              >
                {joining ? 'Entrando...' : 'Confirmar e Entrar'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
