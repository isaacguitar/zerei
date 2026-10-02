import {
  Award,
  Check,
  Clock3,
  Flame,
  Heart,
  Image as ImageIcon,
  LoaderCircle,
  MessageSquare,
  PenLine,
  Save,
  Share2,
  Sparkles,
  Trophy,
  X,
} from 'lucide-react'
import { useState } from 'react'
import { getGameSynopsisAndMedia } from './gameSynopses'

/**
 * Modal de Detalhes Expandidos do Jogo na Estante:
 * - Capa do jogo e screenshots (Gameplay e Tela de Título)
 * - Sinopse e metadados oficiais
 * - Badge comemorativo especial de 100% Mastery
 * - Caixa de texto de Dedicatória (editável pelo dono da estante, leitura para visitantes)
 */
export default function GameDetailModal({
  game,
  isOwner = false,
  ownerName = 'Jogador',
  isFavorited = false,
  onToggleFavorite,
  onSaveDedication,
  onClose,
}) {
  if (!game) return null

  const richMedia = getGameSynopsisAndMedia(game.title)
  const synopsis = game.synopsis || richMedia?.synopsis || 'Sem sinopse cadastrada para este clássico.'
  const releaseYear = game.releaseYear || richMedia?.releaseYear || ''

  // Screenshots: ingameUrl, titleUrl ou galeria do gameSynopses
  const screenshots = []
  if (game.titleUrl) screenshots.push({ type: 'title', label: 'Tela de Título', url: game.titleUrl })
  if (game.ingameUrl) screenshots.push({ type: 'ingame', label: 'Gameplay', url: game.ingameUrl })
  if (richMedia?.screenshots?.length) {
    for (const sc of richMedia.screenshots) {
      if (!screenshots.some((s) => s.url === sc.url)) {
        screenshots.push(sc)
      }
    }
  }

  const [activeMediaTab, setActiveMediaTab] = useState('cover') // 'cover' | 'screenshots'
  const [selectedScreenshotIdx, setSelectedScreenshotIdx] = useState(0)

  // Estado para edição da dedicatória
  const [dedicationText, setDedicationText] = useState(game.dedication || '')
  const [isEditingDedication, setIsEditingDedication] = useState(false)
  const [isSavingDedication, setIsSavingDedication] = useState(false)
  const [dedicationSavedToast, setDedicationSavedToast] = useState(false)

  // Condição de 100% Mastery
  const isMastered =
    game.completionPercent === 100 ||
    (game.achievementsTotal > 0 && game.achievementsCount >= game.achievementsTotal) ||
    game.isMastered === true

  async function handleSaveDedicationSubmit() {
    if (!onSaveDedication || isSavingDedication) return
    setIsSavingDedication(true)
    try {
      await onSaveDedication(game.id, dedicationText.trim())
      setIsEditingDedication(false)
      setDedicationSavedToast(true)
      setTimeout(() => setDedicationSavedToast(false), 3000)
    } catch (err) {
      console.error('Erro ao salvar dedicatória:', err)
    } finally {
      setIsSavingDedication(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-4 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-white/15 bg-panelDeep shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header do Pop up */}
        <div className="flex items-center justify-between border-b border-white/10 bg-slate-950/70 px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 font-pixel text-[8px] uppercase tracking-wider text-electric">
              {game.console || 'Retro'}
            </span>
            {releaseYear && (
              <span className="text-[10px] text-slate-400 font-bold">
                {releaseYear}
              </span>
            )}
            {isMastered && (
              <span className="flex items-center gap-1 rounded-full border border-gold/50 bg-gold/15 px-2.5 py-0.5 font-pixel text-[8px] text-gold shadow-[0_0_12px_rgba(255,199,44,0.3)] animate-pulse">
                <Sparkles size={10} /> 100% MASTERY
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {onToggleFavorite && (
              <button
                type="button"
                onClick={() => onToggleFavorite(game)}
                className={`rounded-xl border p-2 transition ${
                  isFavorited
                    ? 'border-rose-500/50 bg-rose-500/20 text-rose-400'
                    : 'border-white/10 bg-slate-900 text-slate-400 hover:text-white'
                }`}
                title={isFavorited ? 'Remover dos favoritos' : 'Favoritar este jogo'}
              >
                <Heart size={15} fill={isFavorited ? 'currentColor' : 'none'} />
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-white/10 bg-white/5 p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Corpo com Scroll */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6">
          {/* Banner 100% Dourado Especial */}
          {isMastered && (
            <div className="relative overflow-hidden rounded-2xl border-2 border-gold/40 bg-gradient-to-r from-gold/20 via-amber-500/10 to-gold/20 p-4 shadow-[0_0_25px_rgba(255,199,44,0.2)]">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gold/20 text-gold border border-gold/40 shadow-neon">
                  <Trophy size={24} />
                </span>
                <div>
                  <h4 className="font-pixel text-xs text-gold flex items-center gap-1.5">
                    <Sparkles size={13} /> CONQUISTA MÁXIMA: 100% ZERADO
                  </h4>
                  <p className="mt-0.5 text-xs text-amber-200/90 leading-relaxed">
                    Todas as conquistas e desafios deste jogo foram dominados com perfeição no RetroAchievements!
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Seção de Mídia: Capa & Screenshots */}
          <div className="flex flex-col gap-4 md:flex-row md:items-start">
            {/* Imagem Principal ou Screenshots */}
            <div className="w-full md:w-64 shrink-0 space-y-2">
              <div className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl border border-white/15 bg-slate-950 shadow-pixel">
                {activeMediaTab === 'cover' || screenshots.length === 0 ? (
                  <img
                    src={game.coverUrl || game.boxArt || 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=600&q=85'}
                    alt={game.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <img
                    src={screenshots[selectedScreenshotIdx]?.url}
                    alt={screenshots[selectedScreenshotIdx]?.label || 'Captura de tela'}
                    className="h-full w-full object-cover"
                  />
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
                <span className="absolute bottom-2 left-2 rounded bg-black/60 px-2 py-0.5 font-pixel text-[8px] text-slate-300 backdrop-blur-sm">
                  {game.console || 'Retro'}
                </span>
              </div>

              {/* Miniaturas / Seletor de mídia */}
              {screenshots.length > 0 && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveMediaTab('cover')}
                    className={`flex-1 rounded-xl border py-1.5 text-center text-[10px] font-bold uppercase tracking-wider transition ${
                      activeMediaTab === 'cover'
                        ? 'border-electric bg-electric/20 text-electric'
                        : 'border-white/10 bg-slate-950/50 text-slate-400 hover:text-white'
                    }`}
                  >
                    Capa
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveMediaTab('screenshots')
                      setSelectedScreenshotIdx(0)
                    }}
                    className={`flex-1 rounded-xl border py-1.5 text-center text-[10px] font-bold uppercase tracking-wider transition ${
                      activeMediaTab === 'screenshots'
                        ? 'border-electric bg-electric/20 text-electric'
                        : 'border-white/10 bg-slate-950/50 text-slate-400 hover:text-white'
                    }`}
                  >
                    Telas ({screenshots.length})
                  </button>
                </div>
              )}

              {/* Thumbnails se estiver na aba de screenshots */}
              {activeMediaTab === 'screenshots' && screenshots.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {screenshots.map((sc, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setSelectedScreenshotIdx(i)}
                      className={`relative h-12 w-16 shrink-0 overflow-hidden rounded-lg border transition ${
                        selectedScreenshotIdx === i
                          ? 'border-electric ring-2 ring-electric/40'
                          : 'border-white/10 opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img src={sc.url} alt={sc.label} className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Informações detalhadas e Sinopse */}
            <div className="flex-1 space-y-4">
              <div>
                <h2 className="font-pixel text-lg sm:text-xl text-white leading-relaxed">
                  {game.title}
                </h2>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <Clock3 size={13} className="text-slate-500" />
                    {game.timePlayed || 'Tempo registrado'}
                  </span>
                  <span className="font-pixel text-gold">
                    +{game.score || 500} pts RA
                  </span>
                  {game.beatenAt && (
                    <span className="text-slate-400">
                      Zerado em: <strong className="text-slate-200">{game.beatenAt}</strong>
                    </span>
                  )}
                </div>
              </div>

              {/* Barra de Progresso de Conquistas */}
              <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-pixel text-[10px] uppercase text-slate-400 flex items-center gap-1.5">
                    <Award size={13} className="text-electric" /> Progresso RetroAchievements
                  </span>
                  <span className="font-pixel text-emerald-400 text-[11px]">
                    {game.completionPercent ?? (isMastered ? 100 : 75)}% Concluído
                  </span>
                </div>

                <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-slate-800">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isMastered
                        ? 'bg-gradient-to-r from-gold via-amber-400 to-yellow-300 shadow-[0_0_10px_rgba(255,199,44,0.7)]'
                        : 'bg-gradient-to-r from-cyan-500 to-electric'
                    }`}
                    style={{
                      width: `${game.completionPercent ?? (isMastered ? 100 : 75)}%`,
                    }}
                  />
                </div>

                <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400">
                  <span>
                    Conquistas desbloqueadas:{' '}
                    <strong className="text-white">
                      {game.achievementsCount || 10} de {game.achievementsTotal || 10}
                    </strong>
                  </span>
                  {isMastered && (
                    <span className="font-pixel text-[9px] text-gold font-bold">
                      PERFEITO 🏆
                    </span>
                  )}
                </div>
              </div>

              {/* Sinopse do Jogo */}
              <div className="space-y-1.5">
                <h4 className="font-pixel text-[10px] uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Flame size={12} className="text-gold" /> Sinopse Oficial
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/40 p-3.5 rounded-2xl border border-white/5">
                  {synopsis}
                </p>
              </div>
            </div>
          </div>

          {/* Seção Dedicatória / Memória do Jogador */}
          <div className="rounded-2xl border border-electric/30 bg-electric/5 p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="rounded-lg bg-electric/20 p-2 text-electric">
                  <MessageSquare size={16} />
                </span>
                <div>
                  <h4 className="font-pixel text-xs text-white">
                    Dedicatória de {isOwner ? 'Você' : ownerName}
                  </h4>
                  <p className="text-[10px] text-slate-400">
                    Memória do jogador ao zerar este cartucho
                  </p>
                </div>
              </div>

              {isOwner && !isEditingDedication && (
                <button
                  type="button"
                  onClick={() => setIsEditingDedication(true)}
                  className="flex items-center gap-1 rounded-xl border border-electric/40 bg-electric/10 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-electric transition hover:bg-electric/20"
                >
                  <PenLine size={13} />
                  Editar Dedicatória
                </button>
              )}
            </div>

            {/* Visualização ou Edição */}
            <div className="mt-4">
              {isOwner && isEditingDedication ? (
                <div className="space-y-3">
                  <textarea
                    rows={4}
                    value={dedicationText}
                    onChange={(e) => setDedicationText(e.target.value)}
                    placeholder="Escreva sua dedicatória, memórias ao zerar este jogo ou o que ele representou para você..."
                    className="w-full rounded-xl border border-white/15 bg-slate-950 p-3 text-xs text-white placeholder-slate-500 focus:border-electric focus:outline-none focus:ring-1 focus:ring-electric"
                  />
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setDedicationText(game.dedication || '')
                        setIsEditingDedication(false)
                      }}
                      className="rounded-xl px-3 py-2 text-xs font-bold text-slate-400 hover:text-white"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveDedicationSubmit}
                      disabled={isSavingDedication}
                      className="btn-arcade-cyan flex items-center gap-1.5 text-xs"
                    >
                      {isSavingDedication ? (
                        <LoaderCircle size={13} className="animate-spin" />
                      ) : (
                        <Save size={13} />
                      )}
                      Salvar Dedicatória
                    </button>
                  </div>
                </div>
              ) : (
                <div className="relative rounded-xl border border-white/10 bg-slate-950/70 p-4">
                  {game.dedication || dedicationText ? (
                    <blockquote className="text-xs italic text-slate-200 leading-relaxed font-sans">
                      "{game.dedication || dedicationText}"
                    </blockquote>
                  ) : (
                    <p className="text-xs text-slate-500 italic">
                      {isOwner
                        ? 'Você ainda não adicionou uma dedicatória para este jogo. Clique em "Editar Dedicatória" para registrar sua experiência!'
                        : `${ownerName} ainda não registrou uma dedicatória para este jogo.`}
                    </p>
                  )}

                  {dedicationSavedToast && (
                    <div className="mt-2 flex items-center gap-1.5 text-[10px] font-pixel text-emerald-400">
                      <Check size={13} /> Dedicatória salva com sucesso na sua estante!
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

