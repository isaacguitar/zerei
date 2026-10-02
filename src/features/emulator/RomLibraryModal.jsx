import React, { useState, useEffect, useMemo } from 'react'
import {
  Folder,
  FolderPlus,
  RefreshCw,
  Search,
  CheckCircle2,
  FileCode,
  HardDrive,
  X,
  Play,
  Upload,
  AlertCircle,
  Gamepad2,
} from 'lucide-react'
import {
  getRomIndex,
  getConfiguredRomFolders,
  addRomFolderAndScan,
  scanAllConfiguredFolders,
  pickSingleRomFile,
  isNativeEnvironment,
} from './romLibraryService'

export default function RomLibraryModal({
  isOpen,
  onClose,
  onSelectRom,
  targetGameTitle = '',
  targetConsole = '',
}) {
  const [roms, setRoms] = useState([])
  const [folders, setFolders] = useState([])
  const [search, setSearch] = useState('')
  const [selectedConsole, setSelectedConsole] = useState('ALL')
  const [isScanning, setIsScanning] = useState(false)
  const [scanStatus, setScanStatus] = useState('')

  const isNative = isNativeEnvironment()

  useEffect(() => {
    if (isOpen) {
      setRoms(getRomIndex())
      setFolders(getConfiguredRomFolders())
      if (targetGameTitle) {
        setSearch(targetGameTitle.split(/[:\-\(]/)[0].trim())
      }
    }
  }, [isOpen, targetGameTitle])

  const consolesList = useMemo(() => {
    const set = new Set(roms.map((r) => r.detectedConsole).filter(Boolean))
    return ['ALL', ...Array.from(set).sort()]
  }, [roms])

  const filteredRoms = useMemo(() => {
    const q = search.toLowerCase().trim()
    return roms.filter((rom) => {
      const matchConsole = selectedConsole === 'ALL' || rom.detectedConsole === selectedConsole
      const matchQuery =
        !q ||
        rom.fileName.toLowerCase().includes(q) ||
        rom.filePath?.toLowerCase().includes(q)
      return matchConsole && matchQuery
    })
  }, [roms, search, selectedConsole])

  async function handleAddFolder() {
    setIsScanning(true)
    setScanStatus('Selecionando pasta...')
    try {
      const allRoms = await addRomFolderAndScan()
      if (allRoms) {
        setRoms(allRoms)
        setFolders(getConfiguredRomFolders())
      }
    } catch (err) {
      console.error('Erro ao adicionar pasta:', err)
    } finally {
      setIsScanning(false)
      setScanStatus('')
    }
  }

  async function handleRescan() {
    setIsScanning(true)
    setScanStatus('Buscando novos arquivos...')
    try {
      const allRoms = await scanAllConfiguredFolders((progress) => {
        setScanStatus(`Escaneando pasta ${progress.current} de ${progress.total}...`)
      })
      setRoms(allRoms)
    } catch (err) {
      console.error('Erro ao rescanear:', err)
    } finally {
      setIsScanning(false)
      setScanStatus('')
    }
  }

  async function handlePickSingle() {
    try {
      const rom = await pickSingleRomFile()
      if (rom) {
        setRoms(getRomIndex())
        onSelectRom?.(rom)
        onClose?.()
      }
    } catch (err) {
      console.error('Erro ao selecionar arquivo:', err)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl rounded-2xl border border-white/10 bg-[#080d1a] shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between border-b border-white/10 p-5 bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-electric/10 text-electric border border-electric/30 shadow-[0_0_15px_rgba(0,212,255,0.2)]">
              <HardDrive size={20} />
            </span>
            <div>
              <h2 className="font-pixel text-sm text-white flex items-center gap-2">
                Sua Biblioteca de ROMs
                <span className="rounded-md bg-electric/20 px-2 py-0.5 text-[9px] font-bold text-electric">
                  {roms.length} {roms.length === 1 ? 'jogo' : 'jogos'}
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {targetGameTitle
                  ? `Selecione a ROM para jogar "${targetGameTitle}"`
                  : 'Varredura automática e indexação direta do seu computador'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white transition"
          >
            <X size={16} />
          </button>
        </div>

        {/* Barra de Ações (Pastas & Rescan) */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 bg-slate-950/40 px-5 py-3 text-xs">
          <div className="flex items-center gap-2 overflow-hidden text-slate-400">
            <Folder size={14} className="text-gold shrink-0" />
            <span className="shrink-0 font-semibold text-slate-300">Pastas vinculadas:</span>
            {folders.length === 0 ? (
              <span className="text-slate-500 italic">Nenhuma pasta definida</span>
            ) : (
              <span className="truncate text-slate-400 font-mono text-[11px]" title={folders.join(', ')}>
                {folders[0]} {folders.length > 1 && `(+${folders.length - 1})`}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleAddFolder}
              disabled={isScanning}
              className="flex items-center gap-1.5 rounded-lg border border-gold/30 bg-gold/10 px-3 py-1.5 font-semibold text-gold hover:bg-gold/20 transition active:scale-95 disabled:opacity-50"
            >
              <FolderPlus size={14} />
              <span>{folders.length === 0 ? 'Selecionar Pasta de Jogos' : 'Adicionar Pasta'}</span>
            </button>

            {folders.length > 0 && (
              <button
                onClick={handleRescan}
                disabled={isScanning}
                className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-slate-300 hover:bg-white/10 transition active:scale-95 disabled:opacity-50"
                title="Procurar novos jogos nas pastas já salvas"
              >
                <RefreshCw size={13} className={isScanning ? 'animate-spin text-electric' : ''} />
                <span>Atualizar</span>
              </button>
            )}

            <button
              onClick={handlePickSingle}
              disabled={isScanning}
              className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-slate-300 hover:bg-white/10 transition active:scale-95"
              title="Carregar um arquivo de jogo avulso"
            >
              <Upload size={13} />
              <span>Arquivo Avulso</span>
            </button>
          </div>
        </div>

        {/* Busca e Filtros */}
        <div className="p-5 pb-3 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Buscar ROM pelo nome ou arquivo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-slate-950/60 py-2.5 pl-10 pr-4 text-xs text-white placeholder:text-slate-500 focus:border-electric focus:outline-none focus:ring-1 focus:ring-electric"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {consolesList.length > 2 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full sm:max-w-[280px]">
              {consolesList.map((c) => (
                <button
                  key={c}
                  onClick={() => setSelectedConsole(c)}
                  className={`rounded-lg px-2.5 py-1.5 text-[11px] font-semibold whitespace-nowrap transition ${
                    selectedConsole === c
                      ? 'bg-electric text-slate-950'
                      : 'bg-white/5 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {c === 'ALL' ? 'Todos' : c}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Status de Varredura */}
        {isScanning && (
          <div className="mx-5 mb-3 flex items-center gap-2 rounded-xl border border-electric/30 bg-electric/10 px-3.5 py-2 text-xs text-electric">
            <RefreshCw size={14} className="animate-spin" />
            <span>{scanStatus}</span>
          </div>
        )}

        {/* Lista de Jogos */}
        <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-2">
          {filteredRoms.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-slate-500">
              <FileCode size={36} className="mb-3 text-slate-600" />
              <p className="font-pixel text-xs text-slate-400">Nenhuma ROM encontrada</p>
              <p className="text-xs text-slate-500 mt-1 max-w-md">
                {folders.length === 0
                  ? 'Você ainda não adicionou uma pasta de jogos. Clique em "Selecionar Pasta de Jogos" acima para fazer a varredura automática.'
                  : 'Nenhuma ROM corresponde à pesquisa atual. Tente outro nome ou clique em "Atualizar".'}
              </p>
            </div>
          ) : (
            filteredRoms.map((rom) => (
              <div
                key={rom.id || rom.filePath}
                onClick={() => {
                  onSelectRom?.(rom)
                  onClose?.()
                }}
                className="group flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-3 transition hover:border-electric/40 hover:bg-white/[0.05] cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 text-slate-400 group-hover:bg-electric group-hover:text-slate-950 transition">
                    <Gamepad2 size={18} />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-semibold text-white truncate group-hover:text-electric transition">
                      {rom.fileName}
                    </h4>
                    <p className="text-[10px] text-slate-500 truncate font-mono mt-0.5" title={rom.filePath}>
                      {rom.filePath}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  {rom.detectedConsole && (
                    <span className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-semibold text-slate-300">
                      {rom.detectedConsole}
                    </span>
                  )}
                  {rom.fileSize > 0 && (
                    <span className="text-[10px] text-slate-500">
                      {(rom.fileSize / 1024 / 1024).toFixed(1)} MB
                    </span>
                  )}
                  <button className="flex h-8 items-center gap-1.5 rounded-lg bg-electric/10 px-3 text-xs font-bold text-electric group-hover:bg-electric group-hover:text-slate-950 transition">
                    <Play size={12} fill="currentColor" />
                    <span>Jogar</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

