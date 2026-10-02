import { CheckCircle2, FileArchive, FolderSearch, HardDrive, LoaderCircle, Play, ShieldCheck, Sparkles, Trash2, Upload } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { deleteLocalRom, getLocalRomMetadata, saveLocalRom } from './romStorage'
import { assignRomToGame, findBestRomMatch, getAssignedRom, isNativeEnvironment, unassignRomFromGame } from './romLibraryService'
import RomLibraryModal from './RomLibraryModal'

const acceptedExtensions = [
  '.nes', '.fds', '.sfc', '.smc', '.fig', '.swc', '.gb', '.gbc', '.gba',
  '.sms', '.gg', '.gen', '.md', '.smd', '.32x', '.bin', '.cue', '.chd',
  '.pbp', '.iso', '.img', '.z64', '.n64', '.v64', '.nds', '.pce',
  '.ngp', '.ngc', '.ws', '.wsc', '.lnx', '.vb', '.a26', '.a78', '.zip', '.7z'
]
const maxRomSize = 500 * 1024 * 1024

function formatSize(bytes) {
  if (!bytes) return '0 MB'
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function isValidRom(file) {
  const extension = `.${file.name.split('.').pop()?.toLowerCase()}`
  return acceptedExtensions.includes(extension) && file.size <= maxRomSize
}

export default function RomLoader({ gameId, gameTitle, gameConsole = '', clubId, onRomReady, onRomRemoved }) {
  const inputRef = useRef(null)
  const [rom, setRom] = useState(null)
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')
  const [isLibraryOpen, setIsLibraryOpen] = useState(false)
  const [suggestedRom, setSuggestedRom] = useState(null)

  const isNative = isNativeEnvironment()

  useEffect(() => {
    // 1. Verifica se já tem ROM vinculada (nativa ou local)
    const nativeAssigned = isNative ? getAssignedRom(gameId) : null
    if (nativeAssigned) {
      setRom({
        fileName: nativeAssigned.fileName,
        size: nativeAssigned.fileSize || nativeAssigned.size,
        filePath: nativeAssigned.filePath,
        isNativeLibrary: true,
      })
      onRomReady?.()
      return
    }

    getLocalRomMetadata(gameId).then((meta) => {
      if (meta) {
        setRom(meta)
        onRomReady?.()
        return
      }

      // 2. Se não tem ROM vinculada mas está no app nativo, procura match na biblioteca
      if (isNative) {
        const best = findBestRomMatch(gameTitle, gameConsole)
        if (best) {
          setSuggestedRom(best)
        }
      }
    })
  }, [gameId, gameTitle, gameConsole, isNative])

  async function handleFileChange(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    if (!isValidRom(file)) {
      setError('Use uma ROM compatível de até 500 MB.')
      setStatus('error')
      return
    }

    setError('')
    setStatus('saving')
    try {
      await saveLocalRom(gameId, file)
      setRom({ fileName: file.name, size: file.size, savedAt: new Date().toISOString() })
      setStatus('saved')
      onRomReady?.()
    } catch (saveError) {
      setError(saveError.message || 'O navegador bloqueou o armazenamento local.')
      setStatus('error')
    }
  }

  async function handleSelectFromLibrary(selectedRom) {
    setStatus('saving')
    try {
      assignRomToGame(gameId, selectedRom)
      setRom({
        fileName: selectedRom.fileName,
        size: selectedRom.fileSize || selectedRom.size,
        filePath: selectedRom.filePath,
        savedAt: new Date().toISOString(),
        isNativeLibrary: true,
      })
      setSuggestedRom(null)
      setStatus('saved')
      onRomReady?.()
    } catch (err) {
      setError('Erro ao vincular ROM da biblioteca.')
    }
  }

  async function handleDelete() {
    setStatus('saving')
    try {
      if (rom?.isNativeLibrary) {
        unassignRomFromGame(gameId)
      } else {
        await deleteLocalRom(gameId)
      }
      setRom(null)
      setStatus('idle')
      onRomRemoved?.()
    } catch {
      setError('Não foi possível desvincular a ROM.')
      setStatus('error')
    }
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-panel p-5 shadow-pixel sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3">
          <span className="rounded-xl bg-electric/10 p-2.5 text-electric"><HardDrive size={19} /></span>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-electric">
              {isNative ? 'ROM Local no Computador' : 'Sua cópia local'}
            </p>
            <h2 className="mt-2 font-pixel text-xs text-white">
              {isNative ? 'Biblioteca de Jogos' : 'Traga sua própria ROM'}
            </h2>
            <p className="mt-2 max-w-xl text-xs leading-5 text-slate-400">
              {isNative
                ? 'Selecione a ROM da sua pasta de jogos. O arquivo é lido diretamente do seu PC sem ocupar cache.'
                : 'O arquivo fica na memória e no cache deste navegador. Nada é enviado para a nuvem.'}
            </p>
          </div>
        </div>
        <span className="flex shrink-0 items-center gap-1.5 rounded-md bg-emerald-400/10 px-2 py-1 text-[9px] font-bold uppercase text-emerald-300">
          <ShieldCheck size={12} /> {isNative ? 'Nativo' : 'BYOR'}
        </span>
      </div>

      <input ref={inputRef} type="file" accept={acceptedExtensions.join(',')} onChange={handleFileChange} className="hidden" />

      {/* Sugestão de Match Automático se encontrado na Biblioteca */}
      {!rom && suggestedRom && (
        <div className="mt-4 rounded-xl border border-gold/30 bg-gold/5 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gold/15 text-gold border border-gold/30">
              <Sparkles size={16} />
            </span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-gold">Jogo compatível encontrado!</p>
              <p className="text-xs font-semibold text-white mt-0.5">{suggestedRom.fileName}</p>
              <p className="text-[10px] text-slate-400 font-mono truncate max-w-md">{suggestedRom.filePath}</p>
            </div>
          </div>
          <button
            onClick={() => handleSelectFromLibrary(suggestedRom)}
            className="flex items-center justify-center gap-2 rounded-lg bg-gold px-4 py-2 text-xs font-bold text-slate-950 hover:brightness-110 active:scale-95 transition shadow-lg shadow-gold/20"
          >
            <Play size={12} fill="currentColor" />
            <span>Jogar Esta ROM</span>
          </button>
        </div>
      )}

      {/* Card da ROM Selecionada ou Ação de Selecionar */}
      <div className="mt-5 flex flex-col gap-3 rounded-xl border border-dashed border-white/15 bg-slate-950/25 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          {rom ? <CheckCircle2 className="shrink-0 text-emerald-300" size={18} /> : <FileArchive className="shrink-0 text-slate-500" size={18} />}
          <div className="min-w-0">
            <p className="truncate text-xs font-bold text-slate-200">{rom ? rom.fileName : 'Nenhuma ROM selecionada'}</p>
            <p className="mt-1 text-[10px] text-slate-500">
              {rom
                ? `${formatSize(rom.size)} · ${rom.filePath ? rom.filePath : 'armazenado localmente'}`
                : 'Selecione da sua pasta ou carregue o arquivo'}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 gap-2">
          {isNative ? (
            <button
              onClick={() => setIsLibraryOpen(true)}
              disabled={status === 'saving'}
              className="flex items-center justify-center gap-2 rounded-lg border border-electric/30 bg-electric/15 px-3.5 py-2.5 text-[10px] font-bold uppercase tracking-wider text-electric transition hover:bg-electric/25 active:scale-95 disabled:opacity-60"
            >
              <FolderSearch size={14} />
              <span>{rom ? 'Trocar da Biblioteca' : 'Abrir Biblioteca de ROMs'}</span>
            </button>
          ) : (
            <button
              onClick={() => inputRef.current?.click()}
              disabled={status === 'saving'}
              className="flex items-center justify-center gap-2 rounded-lg border border-electric/30 bg-electric/10 px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-electric transition hover:bg-electric/20 disabled:cursor-wait disabled:opacity-60"
            >
              {status === 'saving' ? <LoaderCircle className="animate-spin" size={14} /> : <Upload size={14} />} {rom ? 'Trocar ROM' : 'Selecionar ROM'}
            </button>
          )}

          {rom && (
            <button
              onClick={handleDelete}
              disabled={status === 'saving'}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-rose-400/25 text-rose-300 hover:bg-rose-400/10 disabled:opacity-50"
              aria-label="Remover ROM"
              title="Remover ROM desta sala"
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>
      </div>

      {/* Modal da Biblioteca de ROMs */}
      <RomLibraryModal
        isOpen={isLibraryOpen}
        onClose={() => setIsLibraryOpen(false)}
        onSelectRom={handleSelectFromLibrary}
        targetGameTitle={gameTitle}
        targetConsole={gameConsole}
      />

      {error && <p className="mt-3 text-[10px] text-rose-300">{error}</p>}
    </section>
  )
}
