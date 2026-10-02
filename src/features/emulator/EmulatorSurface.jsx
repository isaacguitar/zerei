import {
  Camera,
  CirclePause,
  FolderSearch,
  Gamepad2,
  Lock,
  Play,
  RotateCcw,
  Save,
  Sparkles,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import GamepadStatus from './GamepadStatus'
import { saveScreenshot } from './screenshotStorage'
import ScreenshotCaptureModal from './ScreenshotCaptureModal'
import { assignRomToGame, findBestRomMatch, getAssignedRom, isNativeEnvironment } from './romLibraryService'
import RomLibraryModal from './RomLibraryModal'
import {
  getGameStateSlots,
  getRomHash,
  listGameDataSlots,
  loadGameData,
  loadGameState,
  saveGameData,
  saveGameState,
} from './romStorage'
import { getCurrentUser } from '../auth/authService'
import { liveTelemetry } from '../telemetry/liveTelemetryService'

const fpsOptions = [30, 60, 0]
const buttonByKey = {
  ArrowUp: 4,
  ArrowDown: 5,
  ArrowLeft: 6,
  ArrowRight: 7,
  z: 8,
  x: 0,
  a: 1,
  s: 9,
  Enter: 3,
  Shift: 2,
  q: 10,
  w: 11,
}

function isTextEntryEvent(event) {
  const selector = 'input, textarea, select, [contenteditable]:not([contenteditable="false"])'
  const activeElement = document.activeElement
  if (activeElement instanceof HTMLElement && activeElement.matches(selector)) return true

  return event.composedPath().some((target) =>
    target instanceof HTMLElement && (target.matches(selector) || target.isContentEditable)
  )
}

function bytesFromIpc(value) {
  if (value instanceof Uint8Array) return value
  if (value instanceof ArrayBuffer) return new Uint8Array(value)
  if (value?.data && Array.isArray(value.data)) return new Uint8Array(value.data)
  return new Uint8Array(value || [])
}

function int16FromIpc(value) {
  if (value instanceof Int16Array) return value
  if (value instanceof ArrayBuffer) return new Int16Array(value)
  if (value instanceof Uint8Array) {
    return new Int16Array(value.buffer, value.byteOffset, Math.floor(value.byteLength / 2))
  }
  return Int16Array.from(value || [])
}

export default function EmulatorSurface({
  gameId,
  romVersion = 0,
  hardcoreMode = false,
  gameTitle = 'Jogo Retrô',
  gameConsole = '',
  club = null,
  roomId = null,
  onRomLoaded,
}) {
  const canvasRef = useRef(null)
  const audioContextRef = useRef(null)
  const audioGainRef = useRef(null)
  const sampleRateRef = useRef(44100)
  const nextAudioTimeRef = useRef(0)
  const pressedKeysRef = useRef(new Set())
  const romHashRef = useRef(null)
  const stateRevisionRef = useRef(0)
  const sramRevisionRef = useRef(0)
  const sramSyncPendingRef = useRef(false)
  const sramConflictRef = useRef(false)
  const saveSramRef = useRef(null)
  const emulatorRunningRef = useRef(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [emulatorState, setEmulatorState] = useState({ running: false, paused: false })
  const [fpsLimit, setFpsLimit] = useState(60)
  const [measuredFps, setMeasuredFps] = useState(0)
  const [volume, setVolume] = useState(70)
  const [isLibraryOpen, setIsLibraryOpen] = useState(false)
  const [isCaptureModalOpen, setIsCaptureModalOpen] = useState(false)
  const [capturedScreenshot, setCapturedScreenshot] = useState(null)
  const [hasQuickSave, setHasQuickSave] = useState(false)
  const [romHash, setRomHash] = useState(null)
  const [saveStatus, setSaveStatus] = useState('')
  const isNative = isNativeEnvironment()
  const assignedRom = getAssignedRom(gameId) || findBestRomMatch(gameTitle, gameConsole)

  useEffect(() => {
    const native = window.zereiNative
    if (!native?.onFrame) return undefined

    const unsubscribeFrame = native.onFrame((frame) => {
      const canvas = canvasRef.current
      if (!canvas || !frame?.width || !frame?.height) return
      if (canvas.width !== frame.width || canvas.height !== frame.height) {
        canvas.width = frame.width
        canvas.height = frame.height
      }
      const context = canvas.getContext('2d', { alpha: false })
      const pixels = bytesFromIpc(frame.buffer)
      context.putImageData(new ImageData(new Uint8ClampedArray(pixels), frame.width, frame.height), 0, 0)
      if (Number.isFinite(frame.fps)) setMeasuredFps(frame.fps)
    })

    const unsubscribeAudio = native.onAudio?.((block) => {
      const context = audioContextRef.current
      const gain = audioGainRef.current
      if (!context || !gain || !block?.length) return

      const samples = int16FromIpc(block)
      const frameCount = Math.floor(samples.length / 2)
      if (!frameCount) return
      const buffer = context.createBuffer(2, frameCount, sampleRateRef.current)
      const left = buffer.getChannelData(0)
      const right = buffer.getChannelData(1)
      for (let index = 0; index < frameCount; index++) {
        left[index] = samples[index * 2] / 32768
        right[index] = samples[index * 2 + 1] / 32768
      }

      const source = context.createBufferSource()
      source.buffer = buffer
      source.connect(gain)
      const startAt = Math.max(context.currentTime + 0.02, nextAudioTimeRef.current)
      source.start(startAt)
      nextAudioTimeRef.current = startAt + buffer.duration
    })

    const unsubscribeState = native.onEmulatorStateChange?.((state) => {
      setEmulatorState((current) => ({ ...current, ...state }))
    })

    const unsubscribeRetroAchievements = native.onRetroAchievementsEvent?.((event) => {
      if (event?.type === 1 && event.source === 'retroachievements') {
        window.dispatchEvent(new CustomEvent('zerei:achievement_unlocked', {
          detail: {
            source: 'retroachievements',
            achievement: {
              id: event.id,
              title: event.title,
              description: event.description,
              points: event.points,
              badgeUrl: event.badgeUrl,
            },
          },
        }))
      } else if (event?.type === 101) {
        setSaveStatus(event.result === 0
          ? `RA identificou ${event.title || gameTitle} (#${event.gameId || event.id})${event.description ? ` · hash ${event.description}` : ''}.`
          : `RA não identificou esta ROM: ${event.message || event.description || 'hash sem correspondência'}.`)
      } else if (event?.type === 'login-required' || event?.type === 'game-load-error') {
        setSaveStatus(event.message || 'Conecte sua conta do RetroAchievements neste dispositivo.')
      } else if (event?.type === 'progress-restore-warning') {
        setSaveStatus(event.message)
      } else if (event?.type === 16) {
        setError(`RetroAchievements: ${event.message || 'erro ao sincronizar evento oficial.'}`)
      }
    })

    return () => {
      unsubscribeFrame?.()
      unsubscribeAudio?.()
      unsubscribeState?.()
      unsubscribeRetroAchievements?.()
    }
  }, [])

  useEffect(() => {
    let active = true
    romHashRef.current = null
    setRomHash(null)
    if (!assignedRom) return () => { active = false }

    getRomHash(gameId, assignedRom).then((hash) => {
      if (!active) return
      romHashRef.current = hash
      setRomHash(hash)
    }).catch(() => {
      if (active) setSaveStatus('Não foi possível verificar o hash da ROM; os saves ficarão somente locais.')
    })
    return () => { active = false }
  }, [gameId, assignedRom?.filePath, assignedRom?.fileName, romVersion])

  useEffect(() => {
    let active = true
    if (!romHash) {
      setHasQuickSave(false)
      stateRevisionRef.current = 0
      sramRevisionRef.current = 0
      return () => { active = false }
    }

    Promise.all([
      getGameStateSlots(gameId, { romHash }),
      listGameDataSlots(gameId, 'sram', romHash),
    ]).then(([states, srams]) => {
      if (!active) return
      const quickSave = states.find((slot) => slot.slotId === 'quick')
      setHasQuickSave(Boolean(quickSave))
      stateRevisionRef.current = Number(quickSave?.revision || 0)
      const batterySave = srams.find((slot) => slot.slotId === 'battery')
      sramRevisionRef.current = Number(batterySave?.revision || 0)
    }).catch(() => {})
    return () => { active = false }
  }, [gameId, romHash])

  useEffect(() => {
    emulatorRunningRef.current = emulatorState.running
  }, [emulatorState.running])

  useEffect(() => {
    if (audioGainRef.current) audioGainRef.current.gain.value = volume / 100
  }, [volume])

  useEffect(() => {
    if (emulatorState.running) window.zereiNative?.setFpsLimit?.(fpsLimit)
  }, [fpsLimit, emulatorState.running])

  useEffect(() => {
    if (!emulatorState.running) return undefined

    function releaseInputs() {
      pressedKeysRef.current.forEach((buttonId) => window.zereiNative?.sendInput?.(buttonId, false))
      pressedKeysRef.current.clear()
    }

    function onKeyDown(event) {
      const key = event.key.length === 1 ? event.key.toLowerCase() : event.key
      const buttonId = buttonByKey[key]
      if (buttonId === undefined) return
      if (isTextEntryEvent(event)) return
      event.preventDefault()
      if (event.repeat || pressedKeysRef.current.has(buttonId)) return
      pressedKeysRef.current.add(buttonId)
      window.zereiNative?.sendInput?.(buttonId, true)
    }

    function onKeyUp(event) {
      const key = event.key.length === 1 ? event.key.toLowerCase() : event.key
      const buttonId = buttonByKey[key]
      if (buttonId === undefined) return
      if (isTextEntryEvent(event)) {
        if (pressedKeysRef.current.delete(buttonId)) {
          window.zereiNative?.sendInput?.(buttonId, false)
        }
        return
      }
      event.preventDefault()
      pressedKeysRef.current.delete(buttonId)
      window.zereiNative?.sendInput?.(buttonId, false)
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', releaseInputs)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', releaseInputs)
      releaseInputs()
    }
  }, [emulatorState.running])

  useEffect(() => () => {
    const native = window.zereiNative
    void (async () => {
      if (emulatorRunningRef.current) await saveSramRef.current?.(true)
      await native?.closeEmulator?.()
    })().catch(() => {})
    liveTelemetry.stop()
    audioContextRef.current?.close().catch(() => {})
  }, [])

  function handleSelectRom(rom) {
    setError('')
    assignRomToGame(gameId, rom)
    setMessage(`ROM local vinculada: ${rom.fileName}`)
    onRomLoaded?.()
  }

  async function initializeAudio() {
    if (audioContextRef.current) {
      if (audioContextRef.current.state === 'suspended') await audioContextRef.current.resume()
      return
    }
    const context = new (window.AudioContext || window.webkitAudioContext)()
    const gain = context.createGain()
    gain.gain.value = volume / 100
    gain.connect(context.destination)
    audioContextRef.current = context
    audioGainRef.current = gain
    nextAudioTimeRef.current = context.currentTime
  }

  async function persistBatteryRam(quiet = false) {
    if (!emulatorRunningRef.current || !romHashRef.current || sramSyncPendingRef.current || sramConflictRef.current) return null
    sramSyncPendingRef.current = true
    try {
      const bytes = bytesFromIpc(await window.zereiNative?.readMemory?.(0))
      if (!bytes.length) return { empty: true }

      const result = await saveGameData(gameId, 'sram', 'battery', romHashRef.current, bytes, {
        expectedRevision: sramRevisionRef.current,
        snapshot: { gameTitle, gameConsole },
        core: emulatorState.core || null,
      })
      if (result.cloudSynced) {
        sramRevisionRef.current = Number(result.revision || sramRevisionRef.current)
        if (!quiet) setSaveStatus('Save de cartucho salvo e sincronizado na nuvem.')
      } else if (result.conflict) {
        sramConflictRef.current = true
        setSaveStatus('Outro dispositivo salvou uma versão mais recente. A SRAM local foi preservada; encerre e reabra o jogo para carregar a versão cloud.')
      } else if (!quiet && result.reason !== 'cloud-account-required') {
        setSaveStatus(result.error || 'Save de cartucho preservado localmente; sincronização pendente.')
      }
      return result
    } catch (saveError) {
      if (!quiet) setSaveStatus(saveError.message || 'Falha ao sincronizar SRAM; a cópia local foi preservada.')
      return { cloudSynced: false, error: saveError.message }
    } finally {
      sramSyncPendingRef.current = false
    }
  }

  saveSramRef.current = persistBatteryRam

  useEffect(() => {
    if (!emulatorState.running) return undefined
    const intervalId = window.setInterval(() => saveSramRef.current?.(true), 60_000)
    return () => window.clearInterval(intervalId)
  }, [emulatorState.running])

  async function handleLaunch() {
    setError('')
    setMessage('')
    if (!isNative || !window.zereiNative?.launchEmulator) {
      setError('O motor Libretro nativo está disponível na versão desktop do ZEREI!.')
      return
    }
    if (!assignedRom?.filePath) {
      setIsLibraryOpen(true)
      setError('Selecione uma ROM local da biblioteca para iniciar.')
      return
    }

    try {
      await initializeAudio()
      setMessage('Iniciando o motor Libretro...')
      const verifiedRomHash = romHashRef.current || await getRomHash(gameId, assignedRom)
      if (!verifiedRomHash) throw new Error('Não foi possível calcular o hash da ROM para associar os saves com segurança.')
      romHashRef.current = verifiedRomHash
      setRomHash(verifiedRomHash)
      const stateSlots = await getGameStateSlots(gameId, { romHash: verifiedRomHash }).catch(() => [])
      stateRevisionRef.current = Number(stateSlots.find((slot) => slot.slotId === 'quick')?.revision || 0)
      const batterySave = await loadGameData(gameId, 'sram', verifiedRomHash, 'battery').catch(() => null)
      sramRevisionRef.current = Number(batterySave?.revision || 0)
      sramConflictRef.current = false
      const user = getCurrentUser()
      const result = await window.zereiNative.launchEmulator({
        romPath: assignedRom.filePath,
        consoleName: assignedRom.detectedConsole || gameConsole || club?.gameConsole || '',
        fpsLimit,
        hardcore: hardcoreMode,
        romHash: verifiedRomHash,
        userId: user?.id || 'local',
        retroAchievementsUsername: user?.retroAchievementsUsername || '',
        saveScope: gameId,
        initialSaveRam: batterySave?.data || null,
        initialSaveRamSavedAt: batterySave?.savedAt || null,
        initialSaveRamSource: batterySave?.cloudSynced ? 'cloud' : 'local-cache',
      })
      sampleRateRef.current = Number(result.timing?.sample_rate) || 44100
      emulatorRunningRef.current = true
      setEmulatorState({ running: true, paused: false, core: result.core, sampleRate: sampleRateRef.current })
      liveTelemetry.start({
        gameTitle,
        roomId,
        userId: user?.id || null,
        userDisplayName: user?.displayName || 'Jogador',
      })
      setMessage(`Motor nativo ativo: ${result.core}`)
      const restoreStatus = result.saveRamRestoreStatus
      setSaveStatus(restoreStatus?.status === 'restored'
        ? restoreStatus.source === 'room-local' || restoreStatus.source === 'legacy-local'
          ? 'Save local mais recente restaurado; será sincronizado quando houver conexão.'
          : batterySave?.localConflictAvailable
            ? 'Versão cloud restaurada. A cópia local divergente foi preservada neste dispositivo.'
            : restoreStatus.source === 'cloud'
              ? 'Save de cartucho restaurado da nuvem.'
              : 'Save de cartucho restaurado do cache local deste dispositivo.'
        : restoreStatus?.status === 'restored-partial'
          ? `Save aplicado parcialmente (${restoreStatus.sourceBytes} bytes; core espera ${restoreStatus.coreBytes}).`
          : restoreStatus?.status === 'pending'
            ? 'Save encontrado; aguardando o core disponibilizar a memória de bateria.'
            : batterySave?.data?.length
              ? `Save encontrado (${batterySave.data.length} bytes), mas o core não confirmou a restauração (${restoreStatus?.reason || restoreStatus?.status || 'sem status'}).`
              : '')
      onRomLoaded?.()
    } catch (launchError) {
      setError(launchError.message || 'Não foi possível iniciar o motor nativo.')
    }
  }

  async function handlePause() {
    try {
      const result = await window.zereiNative?.pauseEmulator?.()
      setEmulatorState((current) => ({ ...current, paused: Boolean(result?.isPaused) }))
      if (result?.isPaused) await persistBatteryRam()
      if (result?.isPaused) await persistBatteryRam()
    } catch (pauseError) {
      setError(pauseError.message || 'Não foi possível pausar o jogo.')
    }
  }

  async function handleReset() {
    try {
      await window.zereiNative?.resetEmulator?.()
      setEmulatorState((current) => ({ ...current, paused: false }))
      setMessage('Jogo reiniciado.')
    } catch (resetError) {
      setError(resetError.message || 'Não foi possível reiniciar o jogo.')
    }
  }

  function handleFpsCycle() {
    const currentIndex = fpsOptions.indexOf(fpsLimit)
    const nextLimit = fpsOptions[(currentIndex + 1) % fpsOptions.length]
    setFpsLimit(nextLimit)
  }

  async function handleSaveState() {
    setError('')
    try {
      const state = await window.zereiNative?.saveState?.()
      if (!state) throw new Error('O core não conseguiu criar um save state.')
      const verifiedRomHash = romHashRef.current || await getRomHash(gameId, assignedRom)
      if (!verifiedRomHash) throw new Error('Não foi possível verificar a ROM antes de salvar o estado.')
      const result = await saveGameState(gameId, 'quick', {
        gameTitle,
        gameConsole,
        core: emulatorState.core || null,
      }, bytesFromIpc(state), {
        romHash: verifiedRomHash,
        expectedRevision: stateRevisionRef.current,
        core: emulatorState.core || null,
      })
      setHasQuickSave(true)
      if (result.cloudSynced) stateRevisionRef.current = Number(result.revision || stateRevisionRef.current)
      setMessage(result.conflict
        ? 'Outro dispositivo salvou uma versão mais recente. Sua cópia local foi preservada; carregue a versão cloud antes de salvar novamente.'
        : result.cloudSynced
          ? 'Save state rápido salvo e sincronizado na nuvem.'
          : 'Save state salvo neste dispositivo. A sincronização na nuvem não foi confirmada.')
    } catch (saveError) {
      setError(saveError.message || 'Não foi possível salvar o estado.')
    }
  }

  async function handleLoadState() {
    setError('')
    try {
      const verifiedRomHash = romHashRef.current || await getRomHash(gameId, assignedRom)
      if (!verifiedRomHash) throw new Error('Não foi possível verificar a ROM antes de carregar o save.')
      const saved = await loadGameState(gameId, 'quick', { romHash: verifiedRomHash })
      if (!saved?.state?.length) throw new Error('Ainda não existe um save state rápido para este jogo.')
      if (!saved.verified && !window.confirm('Este save antigo não tem hash de ROM associado. Carregá-lo pode ser incompatível. Deseja continuar?')) return
      const loaded = await window.zereiNative?.loadState?.(saved.state)
      if (!loaded) throw new Error('O core recusou este save state. Confira a versão da ROM e do core.')
      stateRevisionRef.current = Number(saved.revision || 0)
      setMessage('Save state rápido restaurado.')
    } catch (loadError) {
      setError(loadError.message || 'Não foi possível carregar o estado.')
    }
  }

  async function handleTakeScreenshot() {
    setError('')
    try {
      const canvas = canvasRef.current
      if (!canvas || !canvas.width || !canvas.height) throw new Error('Inicie o jogo antes de capturar a tela.')
      const saved = await saveScreenshot({
        gameId,
        gameTitle,
        dataUrl: canvas.toDataURL('image/jpeg', 0.92),
      })
      setCapturedScreenshot(saved)
      setIsCaptureModalOpen(true)
    } catch (captureError) {
      setError(captureError.message || 'Não foi possível capturar a tela.')
    }
  }

  async function handleClose() {
    await persistBatteryRam()
    await window.zereiNative?.closeEmulator?.()
    emulatorRunningRef.current = false
    emulatorRunningRef.current = false
    liveTelemetry.stop()
    setEmulatorState({ running: false, paused: false })
    setMeasuredFps(0)
    setMessage('Sessão encerrada.')
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-panel p-3 shadow-pixel sm:p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${emulatorState.running ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
          <span className="font-pixel text-[10px] uppercase tracking-wider text-emerald-300">Libretro nativo</span>
          {emulatorState.core && <span className="text-[10px] text-slate-400">· {emulatorState.core}</span>}
          {hardcoreMode && <span className="flex items-center gap-1 rounded border border-rose-500/30 px-1.5 py-0.5 text-[9px] text-rose-300"><Lock size={10} /> Hardcore</span>}
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-md border border-white/10 bg-slate-950/50 px-2 py-1 text-[10px] tabular-nums text-slate-300">
            {measuredFps} FPS
          </span>
          <button
            type="button"
            onClick={handleFpsCycle}
            className="rounded-md border border-cyan-400/30 bg-cyan-500/10 px-2.5 py-1 text-[10px] font-bold text-cyan-200 hover:bg-cyan-500/20"
            title="Alternar entre 30 FPS, 60 FPS e sem limite"
          >
            {fpsLimit === 0 ? 'Sem limite' : `${fpsLimit} FPS`}
          </button>
        </div>
      </div>

      <div className="relative mx-auto flex aspect-[4/3] w-full max-w-[720px] items-center justify-center overflow-hidden rounded-xl border-4 border-slate-950 bg-[#060a14] shadow-inner">
        <canvas
          ref={canvasRef}
          className="h-full w-full object-contain [image-rendering:pixelated]"
          aria-label={`Tela de ${gameTitle}`}
        />
        {!emulatorState.running && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-5 text-center">
            <Gamepad2 size={30} className="mb-3 text-electric" />
            <p className="font-pixel text-[11px] text-white">{isNative ? 'Pronto para jogar' : 'Emulação disponível no desktop'}</p>
            <p className="mt-2 max-w-sm text-[11px] leading-5 text-slate-400">
              {assignedRom?.fileName
                ? `ROM local selecionada: ${assignedRom.fileName}`
                : 'Selecione uma ROM local da sua biblioteca. O arquivo não é enviado para a nuvem.'}
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <button type="button" onClick={() => setIsLibraryOpen(true)} className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-[10px] font-bold text-slate-200 hover:border-electric/50">
                <FolderSearch size={13} /> Biblioteca
              </button>
              {isNative && <button type="button" onClick={handleLaunch} className="inline-flex items-center gap-2 rounded-lg bg-electric px-3 py-2 text-[10px] font-bold text-slate-950 hover:brightness-110">
                <Play size={13} fill="currentColor" /> Iniciar jogo
              </button>}
            </div>
          </div>
        )}
        {emulatorState.paused && <span className="absolute bottom-3 rounded bg-slate-950/80 px-3 py-1 text-[10px] font-bold text-amber-200">PAUSADO</span>}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <GamepadStatus />
        <div className="flex flex-wrap items-center gap-1.5">
          {emulatorState.running && <>
            <button type="button" onClick={handlePause} title={emulatorState.paused ? 'Continuar' : 'Pausar'} className="flex items-center gap-1.5 rounded-lg border border-amber-400/30 bg-amber-500/10 px-2.5 py-1.5 text-[10px] font-bold text-amber-200 hover:bg-amber-500/20">
              <CirclePause size={13} /> {emulatorState.paused ? 'Continuar' : 'Pausar'}
            </button>
            <button type="button" onClick={handleReset} title="Reiniciar jogo" className="flex items-center gap-1.5 rounded-lg border border-cyan-400/30 bg-cyan-500/10 px-2.5 py-1.5 text-[10px] font-bold text-cyan-200 hover:bg-cyan-500/20">
              <RotateCcw size={13} /> Resetar
            </button>
            <button type="button" onClick={handleSaveState} title="Salvar estado rápido" className="flex items-center gap-1.5 rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-2.5 py-1.5 text-[10px] font-bold text-emerald-200 hover:bg-emerald-500/20">
              <Save size={13} /> Salvar
            </button>
            <button type="button" onClick={handleLoadState} disabled={!hasQuickSave} title="Carregar estado rápido" className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-slate-900 px-2.5 py-1.5 text-[10px] font-bold text-slate-200 hover:border-white/20 disabled:opacity-40">
              <Sparkles size={13} /> Carregar
            </button>
            <button type="button" onClick={handleTakeScreenshot} title="Capturar tela do jogo" className="flex items-center gap-1.5 rounded-lg border border-cyan-400/30 bg-cyan-500/10 px-2.5 py-1.5 text-[10px] font-bold text-cyan-200 hover:bg-cyan-500/20">
              <Camera size={13} /> Capturar
            </button>
            <button type="button" onClick={handleClose} title="Encerrar sessão" className="rounded-lg border border-rose-400/30 bg-rose-500/10 px-2.5 py-1.5 text-[10px] font-bold text-rose-200 hover:bg-rose-500/20">Encerrar</button>
          </>}
          <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-slate-900/60 px-2 py-1">
            {volume === 0 ? <VolumeX size={13} className="text-slate-400" /> : <Volume2 size={13} className="text-slate-300" />}
            <input aria-label="Volume do jogo" type="range" min="0" max="100" value={volume} onChange={(event) => setVolume(Number(event.target.value))} className="w-20 accent-cyan-400" />
          </div>
          <button type="button" onClick={() => setIsLibraryOpen(true)} title="Abrir biblioteca de ROMs" className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-slate-900/60 px-2.5 py-1.5 text-[10px] font-bold text-slate-300 hover:border-electric/50 hover:text-white">
            <FolderSearch size={13} /> ROMs
          </button>
        </div>
      </div>

      {error && <p role="alert" className="mt-2 text-[10px] font-bold text-rose-300">{error}</p>}
      {message && <p role="status" className="mt-2 text-[10px] font-bold text-emerald-300">{message}</p>}
      {saveStatus && <p role="status" className="mt-1 text-[10px] text-slate-400">{saveStatus}</p>}

      <RomLibraryModal isOpen={isLibraryOpen} onClose={() => setIsLibraryOpen(false)} onSelectRom={handleSelectRom} targetGameTitle={gameTitle} targetConsole={gameConsole} />
      <ScreenshotCaptureModal isOpen={isCaptureModalOpen} onClose={() => setIsCaptureModalOpen(false)} screenshot={capturedScreenshot} gameTitle={gameTitle} club={club} />
    </section>
  )
}