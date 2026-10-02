const koffi = require('koffi')
const path = require('path')
const fs = require('fs')

function selectSaveRamForLaunch({ initialSaveRam, savedAt, source, localSavePaths = [] }) {
  const cloudBytes = initialSaveRam?.length ? Buffer.from(initialSaveRam) : null
  const savedAtMs = Date.parse(savedAt || '')
  const newestLocal = localSavePaths
    .filter((candidate) => candidate?.path && fs.existsSync(candidate.path))
    .map((candidate) => ({ ...candidate, modifiedAt: fs.statSync(candidate.path).mtimeMs }))
    .sort((left, right) => right.modifiedAt - left.modifiedAt)[0]

  if (newestLocal && (!cloudBytes || !Number.isFinite(savedAtMs) || newestLocal.modifiedAt > savedAtMs)) {
    return { data: fs.readFileSync(newestLocal.path), source: newestLocal.source }
  }

  return { data: cloudBytes, source: cloudBytes ? (source || 'cloud') : null }
}

// Definições de estruturas Libretro via Koffi
const RetroGameGeometry = koffi.struct('RetroGameGeometry', {
  base_width: 'uint32_t',
  base_height: 'uint32_t',
  max_width: 'uint32_t',
  max_height: 'uint32_t',
  aspect_ratio: 'float',
})

const RetroSystemTiming = koffi.struct('RetroSystemTiming', {
  fps: 'double',
  sample_rate: 'double',
})

const RetroSystemAvInfo = koffi.struct('RetroSystemAvInfo', {
  geometry: RetroGameGeometry,
  timing: RetroSystemTiming,
})

const RetroGameInfo = koffi.struct('RetroGameInfo', {
  path: 'str',
  data: 'void *',
  size: 'size_t',
  meta: 'str',
})

const RetroSystemInfo = koffi.struct('RetroSystemInfo', {
  library_name: 'str',
  library_version: 'str',
  valid_extensions: 'str',
  need_fullpath: 'bool',
  block_extract: 'bool',
})

const RetroVariable = koffi.struct('RetroVariable', {
  key: 'void *',
  value: 'void *',
})

// Callbacks
const EnvCb = koffi.proto('bool EnvCb(uint32_t cmd, void *data)')
const VideoCb = koffi.proto('void VideoCb(void *data, uint32_t width, uint32_t height, size_t pitch)')
const AudioCb = koffi.proto('void AudioCb(int16_t left, int16_t right)')
const AudioBatchCb = koffi.proto('size_t AudioBatchCb(int16_t *data, size_t frames)')
const InputPollCb = koffi.proto('void InputPollCb()')
const InputStateCb = koffi.proto('int16_t InputStateCb(uint32_t port, uint32_t device, uint32_t index, uint32_t id)')

// Mapeamento de botões do RetroPad (Libretro)
const RETRO_DEVICE_ID_JOYPAD = {
  B: 0,
  Y: 1,
  SELECT: 2,
  START: 3,
  UP: 4,
  DOWN: 5,
  LEFT: 6,
  RIGHT: 7,
  A: 8,
  X: 9,
  L: 10,
  R: 11,
  L2: 12,
  R2: 13,
  L3: 14,
  R3: 15,
}

// Mapeamento de consoles para núcleos Libretro bundled
const CORE_MAPPING = {
  'SNES': 'snes9x_libretro.dll',
  'Super Famicom': 'snes9x_libretro.dll',
  'Super Nintendo': 'snes9x_libretro.dll',
  'GBA': 'mgba_libretro.dll',
  'Game Boy Advance': 'mgba_libretro.dll',
  'GB': 'gambatte_libretro.dll',
  'Game Boy': 'gambatte_libretro.dll',
  'GBC': 'gambatte_libretro.dll',
  'Game Boy Color': 'gambatte_libretro.dll',
  'NES': 'nestopia_libretro.dll',
  'Famicom Disk System': 'nestopia_libretro.dll',
  'Nintendo (NES)': 'nestopia_libretro.dll',
  'Mega Drive / Genesis': 'genesis_plus_gx_libretro.dll',
  'Mega Drive': 'genesis_plus_gx_libretro.dll',
  'Genesis': 'genesis_plus_gx_libretro.dll',
  'PS1': 'pcsx_rearmed_libretro.dll',
  'PlayStation': 'pcsx_rearmed_libretro.dll',
  'PlayStation / CD': 'mednafen_psx_hw_libretro.dll',
  'N64': 'mupen64plus_next_libretro.dll',
  'Nintendo 64': 'mupen64plus_next_libretro.dll',
  'NDS': 'melonds_libretro.dll',
  'Nintendo DS': 'desmume_libretro.dll',
}

class LibretroSession {
  constructor(coresBaseDir, dataBaseDir = path.join(coresBaseDir, 'userdata')) {
    this.coresBaseDir = coresBaseDir
    this.systemDirectory = path.join(dataBaseDir, 'system')
    this.saveDirectory = path.join(dataBaseDir, 'saves')
    fs.mkdirSync(this.systemDirectory, { recursive: true })
    fs.mkdirSync(this.saveDirectory, { recursive: true })
    this.lib = null
    this.corePath = null
    this.isLoaded = false
    this.isLoadingGame = false
    this.isRunning = false
    this.isPaused = false
    this.pixelFormat = 0 // 0=0RGB1555, 1=XRGB8888, 2=RGB565
    this.avInfo = null
    this.sysInfo = null
    this.memoryMapPointer = null
    this.retroAchievementsRuntime = null
    this.retroAchievementsConsoleName = ''
    this.currentRomPath = null
    this.currentRomPathBuffer = null
    this.currentRomBuffer = null
    this.saveRamPath = null
    this.pendingSaveRam = null
    this.pendingSaveRamSource = null
    this.saveRamRestoreStatus = { status: 'not-loaded' }
    this.lastSaveRamWriteAt = 0

    // Callbacks do host
    this.onFrameCallback = null
    this.onAudioCallback = null
    this.pendingAudio = []

    // Estado de input do jogador (port 0)
    // Suporta até 16 botões por porta
    this.inputState = new Int16Array(16)

    // Intervalo do loop de emulação
    this.loopTimer = null
    this.targetFps = 60.0
    this.maxFps = 60.0 // Limitador flexível (pode ser ajustado dinamicamente: 60, 120, uncapped)
    this.lastFrameTime = 0
    this.measuredFps = 0
    this.frameCounter = 0
    this.fpsTimer = Date.now()

    this._setupNativeCallbacks()
  }

  _setupNativeCallbacks() {
    this.envCallback = koffi.register((cmd, data) => {
      if (cmd === 10) {
        // RETRO_ENVIRONMENT_SET_PIXEL_FORMAT
        this.pixelFormat = koffi.decode(data, 'uint32_t')
        return true
      }
      if (cmd === 9 || cmd === 31) {
        if (!data) return false
        const directory = cmd === 9 ? this.systemDirectory : this.saveDirectory
        koffi.encode(data, 'char *', directory)
        return true
      }
      if (cmd === 3) {
        if (!data) return false
        koffi.encode(data, 'bool', true)
        return true
      }
      if (cmd === 15) {
        if (data) {
          const variable = koffi.decode(data, RetroVariable)
          koffi.encode(data, RetroVariable, { key: variable.key, value: null })
        }
        return false
      }
      if (cmd === 17) {
        if (!data) return false
        koffi.encode(data, 'bool', false)
        return true
      }
      if (cmd === 18) return true
      if (cmd === 36) {
        this.memoryMapPointer = data || null
        return Boolean(data)
      }
      if (cmd === 42) return Boolean(this.retroAchievementsRuntime?.username)
      if (cmd === 52) {
        if (!data) return false
        koffi.encode(data, 'uint32_t', 1)
        return true
      }
      return false
    }, koffi.pointer(EnvCb))

    this.videoCallback = koffi.register((data, width, height, pitch) => {
      if (!data || width === 0 || height === 0) return

      // Converte pixels brutos do frame em RGBA 32-bit para o Canvas do HTML5
      const byteLength = pitch * height
      const rawBytes = koffi.decode(data, koffi.array('uint8_t', byteLength))
      const rgbaBuffer = this._convertFrameToRGBA(rawBytes, width, height, pitch, this.pixelFormat)

      if (this.onFrameCallback) {
        this.onFrameCallback({
          rgbaBuffer,
          width,
          height,
          pixelFormat: this.pixelFormat,
        })
      }
    }, koffi.pointer(VideoCb))

    this.audioCallback = koffi.register((left, right) => {
      this.pendingAudio.push(left, right)
    }, koffi.pointer(AudioCb))

    this.audioBatchCallback = koffi.register((data, frames) => {
      if (data && frames > 0 && this.onAudioCallback) {
        const samples = koffi.decode(data, koffi.array('int16_t', frames * 2))
        this.pendingAudio.push(...samples)
      }
      return frames
    }, koffi.pointer(AudioBatchCb))

    this.inputPollCallback = koffi.register(() => {
      // Input polling
    }, koffi.pointer(InputPollCb))

    this.inputStateCallback = koffi.register((port, device, index, id) => {
      if (port === 0 && device === 1 && id < 16) {
        return this.inputState[id] || 0
      }
      return 0
    }, koffi.pointer(InputStateCb))
  }

  _convertFrameToRGBA(rawBytes, width, height, pitch, format) {
    const rgba = Buffer.alloc(width * height * 4)
    let outIdx = 0

    if (format === 1) {
      // FormatXRGB8888 -> RGBA
      for (let y = 0; y < height; y++) {
        const rowStart = y * pitch
        for (let x = 0; x < width; x++) {
          const inIdx = rowStart + (x << 2)
          rgba[outIdx] = rawBytes[inIdx + 2]     // R
          rgba[outIdx + 1] = rawBytes[inIdx + 1] // G
          rgba[outIdx + 2] = rawBytes[inIdx]     // B
          rgba[outIdx + 3] = 255                 // A
          outIdx += 4
        }
      }
    } else if (format === 2) {
      // FormatRGB565 -> RGBA
      for (let y = 0; y < height; y++) {
        const rowStart = y * pitch
        for (let x = 0; x < width; x++) {
          const inIdx = rowStart + (x << 1)
          const p = rawBytes[inIdx] | (rawBytes[inIdx + 1] << 8)
          const r5 = (p >> 11) & 0x1F
          const g6 = (p >> 5) & 0x3F
          const b5 = p & 0x1F

          rgba[outIdx] = (r5 * 527 + 23) >> 6     // R (8-bit)
          rgba[outIdx + 1] = (g6 * 259 + 33) >> 6 // G (8-bit)
          rgba[outIdx + 2] = (b5 * 527 + 23) >> 6 // B (8-bit)
          rgba[outIdx + 3] = 255                  // A
          outIdx += 4
        }
      }
    } else {
      // Format0RGB1555 -> RGBA
      for (let y = 0; y < height; y++) {
        const rowStart = y * pitch
        for (let x = 0; x < width; x++) {
          const inIdx = rowStart + (x << 1)
          const p = rawBytes[inIdx] | (rawBytes[inIdx + 1] << 8)
          const r5 = (p >> 10) & 0x1F
          const g5 = (p >> 5) & 0x1F
          const b5 = p & 0x1F

          rgba[outIdx] = (r5 * 527 + 23) >> 6     // R
          rgba[outIdx + 1] = (g5 * 527 + 23) >> 6 // G
          rgba[outIdx + 2] = (b5 * 527 + 23) >> 6 // B
          rgba[outIdx + 3] = 255                  // A
          outIdx += 4
        }
      }
    }

    return rgba
  }

  resolveCoreDll(consoleName, romPath) {
    const normalizedConsole = String(consoleName || '').trim().toLowerCase()
    const mappedCore = Object.entries(CORE_MAPPING).find(([name]) => name.toLowerCase() === normalizedConsole)?.[1]
    if (mappedCore) {
      const p = path.join(this.coresBaseDir, mappedCore)
      if (fs.existsSync(p)) return p
    }

    // Heurística de extensão
    const ext = path.extname(romPath || '').toLowerCase()
    if (ext === '.gba') return path.join(this.coresBaseDir, 'mgba_libretro.dll')
    if (ext === '.sfc' || ext === '.smc') return path.join(this.coresBaseDir, 'snes9x_libretro.dll')
    if (ext === '.gb' || ext === '.gbc') return path.join(this.coresBaseDir, 'gambatte_libretro.dll')
    if (ext === '.nes') return path.join(this.coresBaseDir, 'nestopia_libretro.dll')
    if (ext === '.md' || ext === '.gen') return path.join(this.coresBaseDir, 'genesis_plus_gx_libretro.dll')

    return path.join(this.coresBaseDir, 'snes9x_libretro.dll')
  }

  loadCore(coreDllPath) {
    this.stop()
    this.memoryMapPointer = null
    if (this.lib) {
      try {
        if (this.funcs?.retro_deinit) this.funcs.retro_deinit()
      } catch {}
      this.lib = null
    }

    if (!fs.existsSync(coreDllPath)) {
      throw new Error(`Núcleo Libretro DLL não encontrado: ${coreDllPath}`)
    }

    this.lib = koffi.load(coreDllPath)
    this.corePath = coreDllPath

    // Vincula exportações padrão do Libretro
    this.funcs = {
      retro_api_version: this.lib.func('uint32_t retro_api_version()'),
      retro_get_system_info: this.lib.func('void retro_get_system_info(_Out_ RetroSystemInfo *info)'),
      retro_get_system_av_info: this.lib.func('void retro_get_system_av_info(_Out_ RetroSystemAvInfo *info)'),
      retro_set_environment: this.lib.func('void retro_set_environment(EnvCb *cb)'),
      retro_set_video_refresh: this.lib.func('void retro_set_video_refresh(VideoCb *cb)'),
      retro_set_audio_sample: this.lib.func('void retro_set_audio_sample(AudioCb *cb)'),
      retro_set_audio_sample_batch: this.lib.func('void retro_set_audio_sample_batch(AudioBatchCb *cb)'),
      retro_set_input_poll: this.lib.func('void retro_set_input_poll(InputPollCb *cb)'),
      retro_set_input_state: this.lib.func('void retro_set_input_state(InputStateCb *cb)'),
      retro_init: this.lib.func('void retro_init()'),
      retro_deinit: this.lib.func('void retro_deinit()'),
      retro_load_game: this.lib.func('bool retro_load_game(_In_ RetroGameInfo *game)'),
      retro_unload_game: this.lib.func('void retro_unload_game()'),
      retro_run: this.lib.func('void retro_run()'),
      retro_reset: this.lib.func('void retro_reset()'),
      retro_serialize_size: this.lib.func('size_t retro_serialize_size()'),
      retro_serialize: this.lib.func('bool retro_serialize(void *data, size_t size)'),
      retro_unserialize: this.lib.func('bool retro_unserialize(void *data, size_t size)'),
      retro_get_memory_data: this.lib.func('void *retro_get_memory_data(uint32_t id)'),
      retro_get_memory_size: this.lib.func('size_t retro_get_memory_size(uint32_t id)'),
    }

    this.funcs.retro_set_environment(this.envCallback)
    this.funcs.retro_set_video_refresh(this.videoCallback)
    this.funcs.retro_set_audio_sample(this.audioCallback)
    this.funcs.retro_set_audio_sample_batch(this.audioBatchCallback)
    this.funcs.retro_set_input_poll(this.inputPollCallback)
    this.funcs.retro_set_input_state(this.inputStateCallback)

    this.funcs.retro_init()

    this.sysInfo = {}
    this.funcs.retro_get_system_info(this.sysInfo)
    return this.sysInfo
  }

  loadGame(romPath, {
    saveRamPath = null,
    initialSaveRam = null,
    initialSaveRamSource = 'cloud',
  } = {}) {
    if (!this.lib || !this.funcs) {
      throw new Error('Nenhum núcleo Libretro carregado.')
    }
    if (!fs.existsSync(romPath)) {
      throw new Error(`Arquivo de ROM não encontrado: ${romPath}`)
    }

    this.currentRomPath = romPath
    this.currentRomPathBuffer = Buffer.from(`${romPath}\0`, 'utf8')
    const romBuffer = this.sysInfo?.need_fullpath ? null : fs.readFileSync(romPath)
    this.currentRomBuffer = romBuffer

    const gameInfo = {
      path: this.currentRomPathBuffer,
      data: romBuffer,
      size: romBuffer?.length || 0,
      meta: null,
    }

    this.isLoadingGame = true
    let loaded
    try {
      loaded = this.funcs.retro_load_game(gameInfo)
    } finally {
      this.isLoadingGame = false
    }
    if (!loaded) {
      throw new Error('O núcleo Libretro falhou ao inicializar a ROM.')
    }

    this.isLoaded = true
    this.saveRamPath = saveRamPath
    this.pendingSaveRam = initialSaveRam?.length ? Buffer.from(initialSaveRam) : null
    this.pendingSaveRamSource = this.pendingSaveRam ? initialSaveRamSource : null
    if (!this.pendingSaveRam && this.saveRamPath && fs.existsSync(this.saveRamPath)) {
      this.pendingSaveRam = fs.readFileSync(this.saveRamPath)
      this.pendingSaveRamSource = 'room-local'
    }
    this.saveRamRestoreStatus = this.pendingSaveRam
      ? { status: 'pending', reason: 'waiting-first-frame', source: this.pendingSaveRamSource, saveBytes: this.pendingSaveRam.length }
      : { status: 'missing' }
    this.avInfo = {}
    this.funcs.retro_get_system_av_info(this.avInfo)

    // Ajusta o FPS alvo de acordo com o console (ex: 59.72 para GBA, 60.09 para SNES)
    const timingFps = this.avInfo?.timing?.fps
    this.targetFps = (timingFps > 20 && timingFps < 240) ? timingFps : 60.0

    return {
      loaded: true,
      geometry: this.avInfo.geometry,
      timing: this.avInfo.timing,
      sysInfo: this.sysInfo,
    }
  }

  setRetroAchievementsRuntime(runtime, consoleName = '') {
    this.retroAchievementsRuntime = runtime || null
    this.retroAchievementsConsoleName = consoleName || ''
  }

  getCoreMemoryInfo(typeId) {
    if ((!this.isLoaded && !this.isLoadingGame) || !this.funcs) return { data: null, size: 0 }
    return {
      data: this.funcs.retro_get_memory_data(Number(typeId)),
      size: Number(this.funcs.retro_get_memory_size(Number(typeId)) || 0),
    }
  }

  restoreSaveRam() {
    const bytes = this.pendingSaveRam
    if (!bytes?.length) {
      this.saveRamRestoreStatus = { status: 'missing' }
      return false
    }

    const size = Number(this.funcs?.retro_get_memory_size?.(0) || 0)
    const pointer = this.funcs?.retro_get_memory_data?.(0)
    if (!size || !pointer) {
      this.saveRamRestoreStatus = {
        status: 'pending',
        reason: 'core-memory-not-ready',
        source: this.pendingSaveRamSource,
        saveBytes: bytes.length,
      }
      return false
    }

    const restoredBytes = Buffer.alloc(size)
    bytes.copy(restoredBytes, 0, 0, Math.min(bytes.length, size))
    koffi.encode(pointer, koffi.array('uint8_t', size), restoredBytes)
    this.pendingSaveRam = null
    this.saveRamRestoreStatus = {
      status: bytes.length === size ? 'restored' : 'restored-partial',
      source: this.pendingSaveRamSource,
      sourceBytes: bytes.length,
      coreBytes: size,
    }
    this.pendingSaveRamSource = null
    return true
  }

  getSaveRamRestoreStatus() {
    return { ...this.saveRamRestoreStatus }
  }

  runFrame() {
    if (!this.isLoaded || !this.funcs) return false
    this.funcs.retro_run()
    if (this.pendingSaveRam) this.restoreSaveRam()
    if (this.retroAchievementsRuntime?.username) this.retroAchievementsRuntime.doFrame()
    return true
  }

  saveSaveRamToDisk() {
    if (!this.isLoaded || !this.saveRamPath || this.pendingSaveRam) return false
    const bytes = this.getMemory(0)
    if (!bytes?.length) return false
    try {
      fs.mkdirSync(path.dirname(this.saveRamPath), { recursive: true })
      const temporaryPath = `${this.saveRamPath}.tmp`
      fs.writeFileSync(temporaryPath, Buffer.from(bytes))
      fs.renameSync(temporaryPath, this.saveRamPath)
      return true
    } catch (error) {
      console.warn('Não foi possível salvar SRAM localmente:', error.message)
      return false
    }
  }

  setFpsLimit(limit) {
    // 0 = destravado (máxima velocidade), ou valor específico (ex: 30, 60, 120)
    const parsedLimit = Number(limit)
    this.maxFps = Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : 0
  }

  start() {
    if (!this.isLoaded || this.isRunning) return
    this.isRunning = true
    this.isPaused = false
    this.lastFrameTime = 0

    const step = () => {
      if (!this.isRunning) return

      if (this.isPaused) {
        if (Date.now() - this.lastRaIdleAt >= 1000) {
          this.retroAchievementsRuntime?.idle()
          this.lastRaIdleAt = Date.now()
        }
        this.loopTimer = setTimeout(step, 16)
        return
      }

      const now = performance.now()
      const effectiveFps = this.maxFps > 0 ? Math.min(this.targetFps, this.maxFps) : 0
      const targetDelta = effectiveFps > 0 ? 1000 / effectiveFps : 0
      const elapsed = now - this.lastFrameTime

      if (targetDelta === 0 || elapsed >= targetDelta) {
        // Executa 1 frame no Libretro nativo
        this.runFrame()
        this.lastFrameTime = targetDelta > 0 ? now - (elapsed % targetDelta) : now

        if (this.pendingAudio.length && this.onAudioCallback) {
          this.onAudioCallback(Int16Array.from(this.pendingAudio))
          this.pendingAudio.length = 0
        }

        if (now - this.lastSaveRamWriteAt >= 15000) {
          this.saveSaveRamToDisk()
          this.lastSaveRamWriteAt = now
        }

        this.frameCounter++
        if (now - this.fpsTimer >= 1000) {
          this.measuredFps = Math.round((this.frameCounter * 1000) / (now - this.fpsTimer))
          this.frameCounter = 0
          this.fpsTimer = now
        }
      }

      // Agenda próxima iteração de forma elástica para evitar 100% de uso de CPU
      const delay = targetDelta === 0
        ? 0
        : Math.max(1, Math.floor((targetDelta - (performance.now() - this.lastFrameTime)) * 0.7))
      this.loopTimer = setTimeout(step, delay)
    }

    step()
  }

  pause() {
    this.isPaused = !this.isPaused
    return this.isPaused
  }

  reset() {
    if (this.isLoaded && this.funcs?.retro_reset) {
      this.funcs.retro_reset()
      this.retroAchievementsRuntime?.reset()
    }
  }

  stop() {
    this.isRunning = false
    this.isPaused = false
    if (this.loopTimer) {
      clearTimeout(this.loopTimer)
      this.loopTimer = null
    }
    this.retroAchievementsRuntime?.unloadGame()
    this.saveSaveRamToDisk()
    if (this.isLoaded && this.funcs?.retro_unload_game) {
      try {
        this.funcs.retro_unload_game()
      } catch {}
      this.isLoaded = false
    }
      this.currentRomBuffer = null
      this.currentRomPathBuffer = null
  }

  // Controle de Botões
  setButtonState(buttonId, isPressed) {
    if (buttonId >= 0 && buttonId < 16) {
      this.inputState[buttonId] = isPressed ? 1 : 0
    }
  }

  // Salvar / Carregar Estados (SaveState)
  saveState() {
    if (!this.isLoaded || !this.funcs?.retro_serialize) return null
    const size = this.funcs.retro_serialize_size()
    if (size === 0) return null
    const buffer = Buffer.alloc(size)
    const ok = this.funcs.retro_serialize(buffer, size)
    return ok ? buffer : null
  }

  loadState(buffer) {
    if (!this.isLoaded || !this.funcs?.retro_unserialize || !buffer) return false
    return this.funcs.retro_unserialize(buffer, buffer.length)
  }

  // Leitura de memória RAM direta para RetroAchievements & Desafios
  getMemory(typeId = 2) {
    // 0 = SaveRam, 2 = SystemRam
    if (!this.isLoaded || !this.funcs?.retro_get_memory_data) return null
    const size = this.funcs.retro_get_memory_size(typeId)
    const ptr = this.funcs.retro_get_memory_data(typeId)
    if (!ptr || size === 0) return null
    return koffi.decode(ptr, koffi.array('uint8_t', size))
  }

  writeMemory(typeId, data) {
    if (!this.isLoaded || !this.funcs?.retro_get_memory_data) return false
    const size = Number(this.funcs.retro_get_memory_size(typeId) || 0)
    const pointer = this.funcs.retro_get_memory_data(typeId)
    const bytes = Buffer.from(data || [])
    if (!pointer || !size || bytes.length !== size) return false
    koffi.encode(pointer, koffi.array('uint8_t', size), bytes)
    if (typeId === 0) this.saveSaveRamToDisk()
    return true
  }
}

module.exports = {
  LibretroSession,
  RETRO_DEVICE_ID_JOYPAD,
  selectSaveRamForLaunch,
}
