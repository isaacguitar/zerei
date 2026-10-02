import {
  Archive,
  ArrowLeft,
  Award,
  Check,
  Clock3,
  Flame,
  Gamepad2,
  GripVertical,
  Heart,
  LoaderCircle,
  Plus,
  RefreshCw,
  Search,
  Share2,
  Sparkles,
  Star,
  Trash2,
  Trophy,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { getCurrentUser } from '../auth/authService'
import { fetchUserRetroAchievementsShelf, searchRetroAchievementsGames } from '../retro-achievements/retroAchievementsService'
import RetroAchievementsConnectModal from '../retro-achievements/RetroAchievementsConnectModal'
import GameDetailModal from './GameDetailModal'
import {
  POPULAR_RETRO_GAMES,
  clearUserShelfGames,
  getUserShelfData,
  isGameFavorited,
  removeGameFromShelf,
  saveUserShelfData,
  saveUserTop10,
  toggleFavoriteGame,
  updateGameDedication,
} from './shelfService'

export default function ShelfPage({ targetUser = null, onBack, onOpenGameRoom }) {
  const currentUser = getCurrentUser()
  const activeUser = targetUser || currentUser
  const isOwner =
    !targetUser ||
    targetUser.id === currentUser?.id ||
    (currentUser?.displayName && targetUser.displayName === currentUser?.displayName)

  const [shelf, setShelf] = useState({
    beatenGames: [],
    inProgressGames: [],
    playedGames: [],
    favorites: [],
    top10: [],
    dedications: {},
  })

  // 'beaten' | 'inProgress' | 'top10' | 'favorites'
  const [activeTab, setActiveTab] = useState('beaten')
  const [loading, setLoading] = useState(true)
  const [savingTop10, setSavingTop10] = useState(false)
  const [currentUserFavorites, setCurrentUserFavorites] = useState([])
  const [favActionLoading, setFavActionLoading] = useState({})

  // Estado para drag & drop do Top 10
  const [draggedIndex, setDraggedIndex] = useState(null)
  const [dragOverIndex, setDragOverIndex] = useState(null)

  // Modal para adicionar jogo (Top 10 ou Favoritos) com busca livre
  const [searchModalMode, setSearchModalMode] = useState(null) // 'top10' | 'favorite' | null
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)

  // Modal de Detalhes Expandidos do Jogo
  const [selectedGameForModal, setSelectedGameForModal] = useState(null)

  // RetroAchievements Sync
  const [isSyncingRA, setIsSyncingRA] = useState(false)
  const [isRAConnectModalOpen, setIsRAConnectModalOpen] = useState(false)
  const [syncToast, setSyncToast] = useState(null)

  // Carregar estante do usuário
  useEffect(() => {
    let cancelled = false
    setLoading(true)

    async function load() {
      try {
        const targetLookupKey = activeUser?.id || activeUser?.displayName
        const myLookupKey = currentUser?.id || currentUser?.displayName
        const [targetData, myData] = await Promise.all([
          getUserShelfData(targetLookupKey, activeUser?.retroAchievementsUsername),
          isOwner ? Promise.resolve(null) : getUserShelfData(myLookupKey, currentUser?.retroAchievementsUsername),
        ])

        if (!cancelled) {
          setShelf(targetData)
          if (isOwner) {
            setCurrentUserFavorites(targetData.favorites || [])
          } else if (myData) {
            setCurrentUserFavorites(myData.favorites || [])
          }
        }
      } catch (err) {
        console.error('Erro ao carregar estante:', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [activeUser?.id, activeUser?.retroAchievementsUsername, currentUser?.id, currentUser?.retroAchievementsUsername, isOwner])

  // Busca em tempo real de jogos quando o modal de pesquisa estiver aberto
  useEffect(() => {
    if (!searchModalMode) {
      setSearchQuery('')
      setSearchResults([])
      return
    }

    const trimmed = searchQuery.trim().toLowerCase()
    if (!trimmed) {
      // Exibe os clássicos populares curados
      setSearchResults(POPULAR_RETRO_GAMES)
      return
    }

    let isMounted = true
    setIsSearching(true)

    const timer = setTimeout(async () => {
      try {
        const onlineResults = await searchRetroAchievementsGames(trimmed)
        if (isMounted) {
          if (onlineResults && onlineResults.length > 0) {
            const formatted = onlineResults.map((r) => ({
              id: String(r.id),
              title: r.title,
              console: r.consoleName || 'Retro',
              coverUrl: r.imageBoxArt || r.imageIcon || 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=600&q=85',
              iconUrl: r.imageIcon || null,
            }))
            setSearchResults(formatted)
          } else {
            // Fallback nos populares
            const localFiltered = POPULAR_RETRO_GAMES.filter((g) =>
              g.title.toLowerCase().includes(trimmed)
            )
            setSearchResults(localFiltered)
          }
        }
      } catch (err) {
        console.warn('Erro ao pesquisar jogos para estante:', err)
      } finally {
        if (isMounted) setIsSearching(false)
      }
    }, 280)

    return () => {
      isMounted = false
      clearTimeout(timer)
    }
  }, [searchQuery, searchModalMode])

  // Alternar favorito
  async function handleToggleFavorite(game) {
    if (!game?.id) return
    setFavActionLoading((prev) => ({ ...prev, [game.id]: true }))
    try {
      const nowFav = await toggleFavoriteGame(game)
      if (nowFav) {
        setCurrentUserFavorites((prev) => [...prev, game])
        if (isOwner) {
          setShelf((prev) => ({ ...prev, favorites: [...prev.favorites, game] }))
        }
      } else {
        setCurrentUserFavorites((prev) => prev.filter((g) => String(g.id) !== String(game.id)))
        if (isOwner) {
          setShelf((prev) => ({ ...prev, favorites: prev.favorites.filter((g) => String(g.id) !== String(game.id)) }))
        }
      }
    } finally {
      setFavActionLoading((prev) => ({ ...prev, [game.id]: false }))
    }
  }

  // Salvar dedicatória de um jogo
  async function handleSaveDedication(gameId, dedicationText) {
    if (!isOwner || !activeUser?.id) return
    const updated = await updateGameDedication(activeUser.id, gameId, dedicationText)
    if (updated) {
      setShelf(updated)
      // Atualizar no modal se estiver aberto
      if (selectedGameForModal && (selectedGameForModal.id === gameId || String(selectedGameForModal.id) === String(gameId))) {
        setSelectedGameForModal((prev) => ({ ...prev, dedication: dedicationText }))
      }
    }
  }

  // Excluir um jogo da estante do usuário
  async function handleRemoveGame(game) {
    if (!game?.id || !isOwner) return
    const confirmed = window.confirm(`Deseja remover "${game.title}" da sua estante?`)
    if (!confirmed) return

    const userId = activeUser?.id || currentUser?.id
    try {
      const updated = await removeGameFromShelf(userId, game.id)
      setShelf(updated)
      if (selectedGameForModal && String(selectedGameForModal.id) === String(game.id)) {
        setSelectedGameForModal(null)
      }
    } catch (err) {
      console.error('Erro ao remover jogo da estante:', err)
    }
  }

  // Limpar todos os jogos zerados da estante
  async function handleClearShelf() {
    if (!isOwner) return
    const confirmed = window.confirm('Deseja limpar todos os jogos da sua estante?')
    if (!confirmed) return

    const userId = activeUser?.id || currentUser?.id
    try {
      const updated = await clearUserShelfGames(userId)
      setShelf(updated)
      setSelectedGameForModal(null)
    } catch (err) {
      console.error('Erro ao limpar estante:', err)
    }
  }

  // Drag & drop handlers para o Top 10 com efeito flutuante
  function handleDragStart(e, index) {
    if (!isOwner) return
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = 'move'
  }

  function handleDragOver(e, index) {
    if (!isOwner) return
    e.preventDefault()
    if (dragOverIndex !== index) {
      setDragOverIndex(index)
    }
  }

  function handleDragEnd() {
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  async function handleDrop(e, dropIndex) {
    if (!isOwner || draggedIndex === null) return
    e.preventDefault()

    const updated = [...shelf.top10]
    const [movedItem] = updated.splice(draggedIndex, 1)
    updated.splice(dropIndex, 0, movedItem)

    setShelf((prev) => ({ ...prev, top10: updated }))
    setDraggedIndex(null)
    setDragOverIndex(null)

    setSavingTop10(true)
    try {
      await saveUserTop10(activeUser.id, updated)
    } finally {
      setSavingTop10(false)
    }
  }

  // Adicionar jogo ao Top 10 a partir da busca livre
  async function handleSelectGameForTop10(game) {
    if (shelf.top10.length >= 10 || shelf.top10.some((g) => String(g.id) === String(game.id))) {
      setSearchModalMode(null)
      return
    }
    const updated = [...shelf.top10, game]
    setShelf((prev) => ({ ...prev, top10: updated }))
    setSearchModalMode(null)
    await saveUserTop10(activeUser.id, updated)
  }

  // Adicionar jogo aos Favoritos a partir da busca livre
  async function handleSelectGameForFavorites(game) {
    if (shelf.favorites.some((g) => String(g.id) === String(game.id))) {
      setSearchModalMode(null)
      return
    }
    await handleToggleFavorite(game)
    setSearchModalMode(null)
  }

  function handleRemoveFromTop10(gameId) {
    if (!isOwner) return
    const updated = shelf.top10.filter((g) => String(g.id) !== String(gameId))
    setShelf((prev) => ({ ...prev, top10: updated }))
    saveUserTop10(activeUser.id, updated)
  }

  async function handleSyncWithRetroAchievements() {
    const raUsername = activeUser?.retroAchievementsUsername || currentUser?.retroAchievementsUsername
    if (!raUsername) {
      setIsRAConnectModalOpen(true)
      return
    }

    setIsSyncingRA(true)
    try {
      const raData = await fetchUserRetroAchievementsShelf(raUsername)
      const existingDedications = shelf.dedications || {}

      // Enrich beaten games with existing dedications
      const mergedBeaten = (raData.beatenGames || []).map((g) => ({
        ...g,
        dedication: existingDedications[g.id] || g.dedication || '',
      }))

      // Merge any user-added beaten games not present in RA list
      const raBeatenIds = new Set(mergedBeaten.map((g) => String(g.id)))
      const localOnlyBeaten = (shelf.beatenGames || []).filter((g) => !raBeatenIds.has(String(g.id)))
      const allBeaten = [...mergedBeaten, ...localOnlyBeaten]

      // Merge in progress
      const raInProgressIds = new Set((raData.inProgressGames || []).map((g) => String(g.id)))
      const localOnlyInProgress = (shelf.inProgressGames || []).filter((g) => !raInProgressIds.has(String(g.id)) && !raBeatenIds.has(String(g.id)))
      const allInProgress = [...(raData.inProgressGames || []), ...localOnlyInProgress]

      const updatedShelf = {
        ...shelf,
        beatenGames: allBeaten,
        inProgressGames: allInProgress,
        playedGames: [...allBeaten, ...allInProgress],
      }

      setShelf(updatedShelf)
      await saveUserShelfData(activeUser.id, updatedShelf)

      const totalImported = (raData.beatenGames?.length || 0) + (raData.inProgressGames?.length || 0)
      setSyncToast(`Sincronizado com sucesso! ${totalImported} jogos do RetroAchievements importados na sua estante.`)
      setTimeout(() => setSyncToast(null), 6000)
    } catch (err) {
      alert('Erro ao sincronizar com RetroAchievements: ' + (err.message || 'Tente novamente.'))
    } finally {
      setIsSyncingRA(false)
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:py-8">
      {/* Botão de retorno */}
      <button
        onClick={onBack}
        className="mb-6 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 transition hover:text-electric"
      >
        <ArrowLeft size={14} /> Voltar
      </button>

      {/* Header da Estante Retrô */}
      <header className="relative mb-8 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-r from-panelDeep via-panel to-purple-950/40 p-6 sm:p-8 shadow-pixel">
        <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-electric/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-10 bottom-0 h-40 w-40 rounded-full bg-gold/10 blur-2xl" />

        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <img
                src={activeUser.avatarUrl || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${activeUser.id}`}
                alt={activeUser.displayName}
                className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl border-2 border-electric/40 bg-slate-950 object-cover shadow-neon"
              />
              <span className="absolute -bottom-1 -right-1 rounded-md bg-gold/20 p-1 text-gold border border-gold/40">
                <Archive size={14} />
              </span>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="font-pixel text-[9px] uppercase tracking-wider text-electric">
                  {isOwner ? 'Sua Estante Retrô' : 'Estante Pública'}
                </span>
                <span className="rounded bg-white/10 px-2 py-0.5 text-[8px] font-pixel text-slate-300">
                  RETRÔ
                </span>
              </div>
              <h1 className="mt-1 font-pixel text-xl sm:text-2xl text-white">
                {activeUser.displayName || 'Jogador'}
              </h1>
              <p className="mt-1 text-xs text-slate-400">
                {isOwner
                  ? 'Exiba seus troféus reais, ordene seu Top 10 e registre sua dedicatória para a comunidade.'
                  : `Coleção de jogos zerados, cartuchos favoritos e Top 10 de ${activeUser.displayName}.`}
              </p>
            </div>
          </div>

          {/* Resumo em blocos retrô com dados reais */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-center min-w-[76px]">
              <span className="block font-pixel text-base text-gold">
                {shelf.beatenGames.length}
              </span>
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                Zerados 🏆
              </span>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-center min-w-[76px]">
              <span className="block font-pixel text-base text-amber-400">
                {shelf.inProgressGames.length}
              </span>
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                Jogando 🔥
              </span>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-center min-w-[76px]">
              <span className="block font-pixel text-base text-rose-400">
                {shelf.favorites.length}
              </span>
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                Favoritos ❤️
              </span>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-center min-w-[76px]">
              <span className="block font-pixel text-base text-electric">
                {shelf.top10.length} / 10
              </span>
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                Top 10 ⭐
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs de navegação da estante */}
      <div className="mb-6 flex flex-wrap gap-2 border-b border-white/10 pb-3 text-xs">
        <button
          onClick={() => setActiveTab('beaten')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 font-bold uppercase tracking-wider transition ${
            activeTab === 'beaten'
              ? 'bg-gold/20 text-gold border border-gold/40 shadow-neon'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Trophy size={14} />
          Jogos Zerados ({shelf.beatenGames.length})
        </button>

        <button
          onClick={() => setActiveTab('inProgress')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 font-bold uppercase tracking-wider transition ${
            activeTab === 'inProgress'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-neon'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Flame size={14} />
          Jogando ({shelf.inProgressGames.length})
        </button>

        <button
          onClick={() => setActiveTab('top10')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 font-bold uppercase tracking-wider transition ${
            activeTab === 'top10'
              ? 'bg-electric/20 text-electric border border-electric/40 shadow-neon'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Star size={14} />
          Top 10 ({shelf.top10.length})
        </button>

        <button
          onClick={() => setActiveTab('favorites')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 font-bold uppercase tracking-wider transition ${
            activeTab === 'favorites'
              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-neon'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Heart size={14} />
          Favoritos ({shelf.favorites.length})
        </button>

        {isOwner && (
          <button
            type="button"
            onClick={handleSyncWithRetroAchievements}
            disabled={isSyncingRA}
            className="sm:ml-auto flex items-center gap-2 rounded-xl border border-gold/40 bg-gold/15 px-4 py-2.5 font-bold uppercase tracking-wider text-gold hover:bg-gold/25 transition shadow-neon disabled:opacity-50 text-[11px]"
            title="Puxar seus jogos zerados e em andamento diretamente da sua conta oficial do RetroAchievements"
          >
            <RefreshCw size={13} className={isSyncingRA ? 'animate-spin' : ''} />
            <span>{isSyncingRA ? 'Sincronizando com RA...' : 'Sincronizar com RA'}</span>
          </button>
        )}
      </div>

      {/* Conteúdo Principal da Estante */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <LoaderCircle size={28} className="animate-spin text-electric" />
          <p className="mt-3 font-pixel text-xs">Organizando a estante com dados reais...</p>
        </div>
      ) : (
        <>
          {/* ================= ABA 1: JOGOS ZERADOS ================= */}
          {activeTab === 'beaten' && (
            <div>
              {shelf.beatenGames.length === 0 ? (
                <div className="rounded-3xl border border-white/5 bg-panel p-12 text-center">
                  <Trophy size={40} className="mx-auto text-slate-600 mb-3" />
                  <h3 className="font-pixel text-sm text-white">Nenhum jogo zerado ainda</h3>
                  <p className="mt-2 text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                    {isOwner
                      ? activeUser?.retroAchievementsUsername
                        ? 'Você ainda não possui nenhum jogo 100% zerado registrado na sua estante. Complete jogos no emulador ou nas salas do clube para celebrar seus troféus aqui!'
                        : 'Conecte sua conta do RetroAchievements no seu Perfil ou jogue nas salas do clube para registrar seus jogos zerados!'
                      : `${activeUser.displayName} ainda não registrou nenhum jogo zerado na plataforma.`}
                  </p>
                  {isOwner && (
                    <div className="mt-6 flex justify-center">
                      <button
                        type="button"
                        onClick={handleSyncWithRetroAchievements}
                        disabled={isSyncingRA}
                        className="flex items-center gap-2 rounded-xl border border-gold/40 bg-gold/15 px-5 py-3 text-xs font-bold uppercase tracking-wider text-gold hover:bg-gold/25 transition shadow-neon disabled:opacity-50"
                      >
                        <RefreshCw size={14} className={isSyncingRA ? 'animate-spin' : ''} />
                        <span>{isSyncingRA ? 'Sincronizando com RA...' : 'Sincronizar com RetroAchievements'}</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <div className="mb-4 flex items-center justify-between">
                    <p className="text-xs text-slate-400">
                      Total de <span className="font-bold text-gold">{shelf.beatenGames.length}</span> {shelf.beatenGames.length === 1 ? 'jogo zerado' : 'jogos zerados'}
                    </p>
                    {isOwner && (
                      <button
                        type="button"
                        onClick={handleClearShelf}
                        className="flex items-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 font-pixel text-[9px] text-rose-300 hover:bg-rose-500/20 transition"
                      >
                        <Trash2 size={12} />
                        <span>Limpar Estante</span>
                      </button>
                    )}
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {shelf.beatenGames.map((game, idx) => {
                    const isFav = isGameFavorited(currentUserFavorites, game.id)
                    const isFavLoading = !!favActionLoading[game.id]
                    const isMastered =
                      (game.achievementsTotal > 0 && game.achievementsCount >= game.achievementsTotal) ||
                      game.isMastered === true

                    return (
                      <div
                        key={game.id || idx}
                        onClick={() => setSelectedGameForModal(game)}
                        className={`group relative flex flex-col overflow-hidden rounded-2xl border bg-panel shadow-pixel transition duration-200 hover:-translate-y-1 cursor-pointer select-none ${
                          isMastered
                            ? 'border-gold/50 hover:border-gold shadow-[0_0_15px_rgba(255,199,44,0.15)]'
                            : 'border-white/10 hover:border-gold/40'
                        }`}
                      >
                        {/* Imagem de Capa */}
                        <div className="relative h-48 w-full overflow-hidden bg-slate-950 flex items-center justify-center">
                          {game.coverUrl || game.boxArt || game.iconUrl ? (
                            <img
                              src={game.coverUrl || game.boxArt || game.iconUrl}
                              alt={game.title}
                              className="h-full w-full object-cover saturate-[0.85] transition duration-300 group-hover:scale-105 group-hover:saturate-100"
                            />
                          ) : (
                            <div className="flex flex-col items-center justify-center p-4 text-center">
                              <Gamepad2 size={36} className="text-slate-600 mb-2" />
                              <span className="font-pixel text-[9px] text-slate-400 max-w-[140px] truncate">{game.title}</span>
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-panel via-transparent to-black/30 pointer-events-none" />

                          {/* Badge de Console */}
                          <span className="absolute left-3 top-3 rounded-md border border-white/15 bg-black/60 px-2 py-0.5 font-pixel text-[8px] uppercase tracking-wider text-slate-200 backdrop-blur-sm">
                            {game.console || 'Retro'}
                          </span>

                          {/* Botão de Excluir da Estante (apenas para o dono) */}
                          {isOwner && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleRemoveGame(game)
                              }}
                              className="absolute right-12 top-3 rounded-full p-2 bg-black/50 text-slate-400 hover:bg-rose-600 hover:text-white backdrop-blur-md transition"
                              title="Excluir este jogo da estante"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}

                          {/* Botão de Favoritar */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleToggleFavorite(game)
                            }}
                            disabled={isFavLoading}
                            className={`absolute right-3 top-3 rounded-full p-2 backdrop-blur-md transition ${
                              isFav
                                ? 'bg-rose-500 text-white shadow-[0_0_10px_rgba(244,63,94,0.6)]'
                                : 'bg-black/50 text-slate-300 hover:bg-rose-500/80 hover:text-white'
                            }`}
                            title={isFav ? 'Remover dos favoritos' : 'Favoritar este jogo'}
                          >
                            <Heart size={14} fill={isFav ? 'currentColor' : 'none'} />
                          </button>

                          {/* Badge de Zerado ou 100% Mastery */}
                          {isMastered ? (
                            <div className="absolute bottom-3 left-3 flex items-center gap-1 rounded-lg border border-gold/70 bg-gradient-to-r from-gold/30 to-amber-500/20 px-2.5 py-1 backdrop-blur-md shadow-[0_0_12px_rgba(255,199,44,0.4)]">
                              <Sparkles size={13} className="text-gold animate-spin" style={{ animationDuration: '4s' }} />
                              <span className="font-pixel text-[8px] font-bold text-gold">
                                100% MASTERY
                              </span>
                            </div>
                          ) : (
                            <div className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-lg border border-gold/50 bg-gold/20 px-2.5 py-1 backdrop-blur-md">
                              <Trophy size={13} className="text-gold" />
                              <span className="font-pixel text-[8px] font-bold text-gold">
                                ZERADO!
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Metadados */}
                        <div className="flex flex-1 flex-col justify-between p-4">
                          <div>
                            <h3 className="font-pixel text-xs text-white leading-relaxed truncate" title={game.title}>
                              {game.title}
                            </h3>
                            <div className="mt-2.5 flex items-center justify-between text-[10px] text-slate-400">
                              {game.timePlayed ? (
                                <span className="flex items-center gap-1">
                                  <Clock3 size={11} className="text-slate-500" />
                                  {game.timePlayed}
                                </span>
                              ) : <span />}
                              {game.score ? (
                                <span className="font-pixel text-gold">
                                  +{game.score} pts
                                </span>
                              ) : null}
                            </div>
                          </div>

                          {/* Conquistas RetroAchievements */}
                          {game.achievementsTotal > 0 && (
                            <div className="mt-3.5 pt-3 border-t border-white/5 flex items-center justify-between text-[9px] text-slate-400">
                              <span>Conquistas</span>
                              <span className="font-pixel text-emerald-400">
                                {game.achievementsCount || 0} / {game.achievementsTotal}
                              </span>
                            </div>
                          )}

                          {/* Se houver dedicatória, mostra pequeno indicador */}
                          {game.dedication && (
                            <div className="mt-2 rounded-lg bg-white/5 px-2 py-1 text-[9px] text-slate-300 italic truncate">
                              "{game.dedication}"
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
                </>
              )}
            </div>
          )}

          {/* ================= ABA 2: JOGANDO (EM ANDAMENTO) ================= */}
          {activeTab === 'inProgress' && (
            <div>
              {shelf.inProgressGames.length === 0 ? (
                <div className="rounded-3xl border border-white/5 bg-panel p-12 text-center">
                  <Gamepad2 size={40} className="mx-auto text-slate-600 mb-3" />
                  <h3 className="font-pixel text-sm text-white">Nenhum jogo em andamento</h3>
                  <p className="mt-2 text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                    {isOwner
                      ? 'Jogos iniciados nas salas ou sincronizados pela sua conta do RetroAchievements aparecerão aqui enquanto você estiver na jornada para zerá-los!'
                      : `${activeUser.displayName} não possui jogos com progresso ativo no momento.`}
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {shelf.inProgressGames.map((game, idx) => {
                    const isFav = isGameFavorited(currentUserFavorites, game.id)
                    const pct = game.completionPercent || 0

                    return (
                      <div
                        key={game.id || idx}
                        onClick={() => setSelectedGameForModal(game)}
                        className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-panel shadow-pixel transition duration-200 hover:-translate-y-1 hover:border-amber-500/40 cursor-pointer select-none"
                      >
                        {/* Imagem de Capa */}
                        <div className="relative h-44 w-full overflow-hidden bg-slate-950 flex items-center justify-center">
                          {game.coverUrl || game.boxArt || game.iconUrl ? (
                            <img
                              src={game.coverUrl || game.boxArt || game.iconUrl}
                              alt={game.title}
                              className="h-full w-full object-cover saturate-[0.85] transition duration-300 group-hover:scale-105 group-hover:saturate-100"
                            />
                          ) : (
                            <div className="flex flex-col items-center justify-center p-4 text-center">
                              <Gamepad2 size={32} className="text-slate-600 mb-2" />
                              <span className="font-pixel text-[9px] text-slate-400 max-w-[140px] truncate">{game.title}</span>
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-panel via-transparent to-black/30 pointer-events-none" />

                          <span className="absolute left-3 top-3 rounded-md border border-white/15 bg-black/60 px-2 py-0.5 font-pixel text-[8px] uppercase tracking-wider text-slate-200 backdrop-blur-sm">
                            {game.console || 'Retro'}
                          </span>

                          {/* Badge de Sala Ativa */}
                          {game.isRoomActive && (
                            <span className="absolute left-3 top-9 rounded-md border border-cyan-400/40 bg-cyan-950/80 px-2 py-0.5 font-pixel text-[7px] uppercase tracking-wider text-cyan-300 backdrop-blur-sm">
                              SALA ATIVA 🎮
                            </span>
                          )}

                          {/* Botão de Excluir da Estante (apenas para o dono) */}
                          {isOwner && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleRemoveGame(game)
                              }}
                              className="absolute right-12 top-3 rounded-full p-2 bg-black/50 text-slate-400 hover:bg-rose-600 hover:text-white backdrop-blur-md transition"
                              title="Excluir este jogo da estante"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleToggleFavorite(game)
                            }}
                            className={`absolute right-3 top-3 rounded-full p-2 backdrop-blur-md transition ${
                              isFav
                                ? 'bg-rose-500 text-white shadow-[0_0_10px_rgba(244,63,94,0.6)]'
                                : 'bg-black/50 text-slate-300 hover:bg-rose-500/80 hover:text-white'
                            }`}
                            title={isFav ? 'Remover dos favoritos' : 'Favoritar este jogo'}
                          >
                            <Heart size={14} fill={isFav ? 'currentColor' : 'none'} />
                          </button>

                          <div className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-lg border border-amber-500/50 bg-amber-500/20 px-2.5 py-1 backdrop-blur-md">
                            <Flame size={13} className="text-amber-400 animate-pulse" />
                            <span className="font-pixel text-[8px] font-bold text-amber-300">
                              JOGANDO
                            </span>
                          </div>
                        </div>

                        {/* Detalhes & Barra de Progresso */}
                        <div className="flex flex-1 flex-col justify-between p-4">
                          <div>
                            <h3 className="font-pixel text-xs text-white leading-relaxed truncate" title={game.title}>
                              {game.title}
                            </h3>
                            {game.timePlayed && (
                              <p className="mt-1 text-[10px] text-slate-400">
                                {game.timePlayed}
                              </p>
                            )}
                          </div>

                          <div className="mt-3">
                            <div className="flex items-center justify-between text-[9px] text-slate-400 font-pixel">
                              <span>Progresso</span>
                              <span className="text-amber-400">{pct}%</span>
                            </div>
                            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all duration-300"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <div className="mt-2 flex items-center justify-between text-[9px] text-slate-400">
                              <span>Conquistas</span>
                              <span className="font-pixel text-slate-200">
                                {game.achievementsCount || 0} / {game.achievementsTotal || 0}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* ================= ABA 3: TOP 10 (DRAG & DROP TÁTIL FLUTUANTE) ================= */}
          {activeTab === 'top10' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-electric/30 bg-electric/10 p-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-electric/20 text-electric border border-electric/30">
                    <Star size={18} />
                  </span>
                  <div>
                    <h3 className="font-pixel text-xs text-white">Top 10 Jogos da Sua Vida</h3>
                    <p className="text-[11px] text-slate-300">
                      {isOwner
                        ? 'Pesquise qualquer jogo retrô da história e arraste para definir seu pódio pessoal!'
                        : `Pódio dos 10 maiores clássicos escolhidos por ${activeUser.displayName}.`}
                    </p>
                  </div>
                </div>

                {isOwner && shelf.top10.length < 10 && (
                  <button
                    onClick={() => setSearchModalMode('top10')}
                    className="btn-arcade-cyan flex items-center gap-1.5 text-xs shrink-0"
                  >
                    <Plus size={14} /> Adicionar Jogo ao Top 10
                  </button>
                )}
              </div>

              {/* Lista Interativa Drag & Drop */}
              <div className="space-y-2.5">
                {shelf.top10.length === 0 ? (
                  <div className="rounded-3xl border border-white/5 bg-panel p-12 text-center">
                    <Star size={36} className="mx-auto text-slate-600 mb-3" />
                    <h3 className="font-pixel text-xs text-white">Top 10 ainda vazio</h3>
                    <p className="mt-1 text-xs text-slate-400">
                      Clique em "Adicionar Jogo ao Top 10" para pesquisar seus cartuchos favoritos e montar seu ranking pessoal!
                    </p>
                  </div>
                ) : (
                  shelf.top10.map((game, index) => {
                    const isDragging = draggedIndex === index
                    const isOver = dragOverIndex === index
                    const isFav = isGameFavorited(currentUserFavorites, game.id)

                    return (
                      <div
                        key={game.id || index}
                        draggable={isOwner}
                        onDragStart={(e) => handleDragStart(e, index)}
                        onDragOver={(e) => handleDragOver(e, index)}
                        onDragEnd={handleDragEnd}
                        onDrop={(e) => handleDrop(e, index)}
                        onClick={() => setSelectedGameForModal(game)}
                        className={`group relative flex items-center justify-between gap-4 rounded-2xl border p-3 transition-all duration-200 select-none cursor-pointer ${
                          isOwner ? 'hover:cursor-grab active:cursor-grabbing' : ''
                        } ${
                          isDragging
                            ? 'opacity-30 scale-95 border-dashed border-electric'
                            : isOver
                            ? 'border-electric bg-electric/25 translate-y-1 shadow-[0_0_25px_rgba(0,212,255,0.4)]'
                            : 'border-white/10 bg-panel hover:border-white/20 hover:bg-slate-900/80 shadow-md'
                        }`}
                      >
                        <div className="flex items-center gap-3.5 min-w-0 flex-1">
                          {/* Número da Posição */}
                          <div
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-pixel text-xs font-bold border ${
                              index === 0
                                ? 'border-gold/60 bg-gold/25 text-gold shadow-[0_0_15px_rgba(255,199,44,0.4)]'
                                : index === 1
                                ? 'border-slate-300/50 bg-slate-300/20 text-slate-200'
                                : index === 2
                                ? 'border-amber-600/50 bg-amber-600/20 text-amber-300'
                                : 'border-white/10 bg-slate-950/60 text-slate-400'
                            }`}
                          >
                            #{index + 1}
                          </div>

                          {/* Capa */}
                          <img
                            src={game.coverUrl || game.boxArt || 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=600&q=85'}
                            alt={game.title}
                            className="h-12 w-12 shrink-0 rounded-xl border border-white/10 object-cover bg-slate-950"
                          />

                          {/* Título & Detalhes */}
                          <div className="min-w-0 flex-1">
                            <h4 className="font-pixel text-xs text-white truncate">{game.title}</h4>
                            <p className="mt-0.5 text-[10px] text-slate-400 truncate">
                              Plataforma: <span className="text-electric">{game.console || 'Retro'}</span>
                            </p>
                          </div>
                        </div>

                        {/* Ações da linha */}
                        <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => handleToggleFavorite(game)}
                            className={`rounded-xl border p-2 transition ${
                              isFav
                                ? 'border-rose-500/40 bg-rose-500/20 text-rose-400'
                                : 'border-white/10 bg-slate-950/50 text-slate-400 hover:text-white'
                            }`}
                            title={isFav ? 'Remover dos favoritos' : 'Favoritar este jogo'}
                          >
                            <Heart size={14} fill={isFav ? 'currentColor' : 'none'} />
                          </button>

                          {isOwner && (
                            <div className="flex items-center gap-1.5 pl-2 border-l border-white/10">
                              <button
                                type="button"
                                onClick={() => handleRemoveFromTop10(game.id)}
                                className="rounded-lg p-1.5 text-slate-500 hover:bg-rose-500/20 hover:text-rose-400 transition"
                                title="Remover do Top 10"
                              >
                                ×
                              </button>
                              <span className="cursor-grab text-slate-500 hover:text-white transition" title="Segure e arraste para reordenar">
                                <GripVertical size={16} />
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )}

          {/* ================= ABA 4: FAVORITOS ================= */}
          {activeTab === 'favorites' && (
            <div>
              <div className="mb-4 flex items-center justify-between">
                <p className="text-xs text-slate-400">
                  Jogos guardados no seu acervo pessoal de fitas do coração.
                </p>
                {isOwner && (
                  <button
                    onClick={() => setSearchModalMode('favorite')}
                    className="btn-arcade-cyan flex items-center gap-1.5 text-xs shrink-0"
                  >
                    <Plus size={14} /> Adicionar Favorito
                  </button>
                )}
              </div>

              {shelf.favorites.length === 0 ? (
                <div className="rounded-3xl border border-white/5 bg-panel p-12 text-center">
                  <Heart size={36} className="mx-auto text-slate-600 mb-3" />
                  <h3 className="font-pixel text-xs text-white">Nenhum jogo favoritado</h3>
                  <p className="mt-1 text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                    Clique no coração em qualquer jogo ou use o botão acima para pesquisar qualquer clássico e adicioná-lo à sua lista de prediletos!
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {shelf.favorites.map((game) => {
                    const isFav = isGameFavorited(currentUserFavorites, game.id)

                    return (
                      <div
                        key={game.id}
                        onClick={() => setSelectedGameForModal(game)}
                        className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-panel shadow-pixel transition duration-200 hover:-translate-y-1 hover:border-rose-500/40 cursor-pointer select-none"
                      >
                        <div className="relative h-44 w-full overflow-hidden bg-slate-950">
                          <img
                            src={game.coverUrl || game.boxArt || 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=600&q=85'}
                            alt={game.title}
                            className="h-full w-full object-cover saturate-[0.85] transition duration-300 group-hover:scale-105 group-hover:saturate-100"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-panel via-transparent to-black/30" />

                          <span className="absolute left-3 top-3 rounded-md border border-white/15 bg-black/60 px-2 py-0.5 font-pixel text-[8px] uppercase tracking-wider text-slate-200 backdrop-blur-sm">
                            {game.console || 'Retro'}
                          </span>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleToggleFavorite(game)
                            }}
                            className="absolute right-3 top-3 rounded-full bg-rose-500 p-2 text-white shadow-[0_0_10px_rgba(244,63,94,0.6)] backdrop-blur-md transition hover:scale-110"
                            title="Remover dos favoritos"
                          >
                            <Heart size={14} fill="currentColor" />
                          </button>
                        </div>

                        <div className="p-4">
                          <h3 className="font-pixel text-xs text-white truncate" title={game.title}>
                            {game.title}
                          </h3>
                          <p className="mt-1 text-[10px] text-slate-400">
                            Cartucho favorito do jogador
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ================= MODAL DE BUSCA LIVRE PARA TOP 10 OU FAVORITOS ================= */}
      {searchModalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-white/15 bg-panelDeep shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 bg-slate-950/70 px-6 py-4">
              <h3 className="font-pixel text-xs text-white flex items-center gap-2">
                {searchModalMode === 'top10' ? (
                  <>
                    <Star size={14} className="text-electric" /> Adicionar ao Top 10
                  </>
                ) : (
                  <>
                    <Heart size={14} className="text-rose-400" /> Adicionar aos Favoritos
                  </>
                )}
              </h3>
              <button
                onClick={() => setSearchModalMode(null)}
                className="rounded-lg p-1 text-slate-400 transition hover:bg-white/10 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            {/* Barra de Pesquisa Livre */}
            <div className="p-4 border-b border-white/10 bg-slate-950/40">
              <div className="relative">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Pesquisar por qualquer jogo retrô (ex: Chrono, Zelda, Mario, Sonic, Megaman...)"
                  className="w-full rounded-xl border border-white/15 bg-slate-900 py-2.5 pl-10 pr-4 text-xs text-white placeholder-slate-500 focus:border-electric focus:outline-none focus:ring-1 focus:ring-electric"
                />
                {isSearching && (
                  <LoaderCircle size={15} className="absolute right-3.5 top-1/2 -translate-y-1/2 animate-spin text-electric" />
                )}
              </div>
            </div>

            {/* Lista de Resultados da Busca */}
            <div className="max-h-96 overflow-y-auto p-4 space-y-2">
              {searchResults.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  {isSearching ? 'Buscando nos arquivos retrô...' : 'Nenhum jogo encontrado com esse nome.'}
                </div>
              ) : (
                searchResults.map((game) => (
                  <div
                    key={game.id}
                    onClick={() => {
                      if (searchModalMode === 'top10') {
                        handleSelectGameForTop10(game)
                      } else {
                        handleSelectGameForFavorites(game)
                      }
                    }}
                    className="flex items-center justify-between rounded-xl border border-white/5 bg-slate-950/50 p-3 hover:border-electric/40 hover:bg-white/5 cursor-pointer transition"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={game.coverUrl || game.iconUrl || 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=600&q=85'}
                        alt={game.title}
                        className="h-10 w-10 rounded-lg object-cover border border-white/10 bg-slate-950"
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-white truncate">{game.title}</p>
                        <p className="text-[10px] text-slate-400">{game.console || 'Retro'}</p>
                      </div>
                    </div>
                    <span className="font-pixel text-[9px] text-electric shrink-0">
                      + Adicionar
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL DE DETALHES EXPANDIDOS DO JOGO ================= */}
      {selectedGameForModal && (
        <GameDetailModal
          game={selectedGameForModal}
          isOwner={isOwner}
          ownerName={activeUser.displayName}
          isFavorited={isGameFavorited(currentUserFavorites, selectedGameForModal.id)}
          onToggleFavorite={handleToggleFavorite}
          onSaveDedication={handleSaveDedication}
          onClose={() => setSelectedGameForModal(null)}
        />
      )}

      {/* ================= MODAL DE CONEXÃO AO RETROACHIEVEMENTS ================= */}
      {isRAConnectModalOpen && (
        <RetroAchievementsConnectModal
          isOpen={isRAConnectModalOpen}
          onClose={() => setIsRAConnectModalOpen(false)}
          userProfile={currentUser}
          onConnected={(savedData) => {
            setIsRAConnectModalOpen(false)
            if (activeUser) {
              activeUser.retroAchievementsUsername = savedData.retroAchievementsUsername
            }
            handleSyncWithRetroAchievements()
          }}
        />
      )}

      {/* Notificação Toast de Sincronização */}
      {syncToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl border-2 border-gold bg-slate-950/95 p-4 shadow-[0_0_30px_rgba(255,215,0,0.35)] backdrop-blur-md animate-in fade-in slide-in-from-bottom-5 max-w-sm">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gold/20 text-gold border border-gold/40">
            <Trophy size={18} />
          </span>
          <p className="text-xs font-bold text-white flex-1">{syncToast}</p>
          <button
            type="button"
            onClick={() => setSyncToast(null)}
            className="text-slate-400 hover:text-white transition p-1"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  )
}
