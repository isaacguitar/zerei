import { Nostalgist } from 'nostalgist'

const LIBRETRO_BUTTON_NAMES = {
  0: 'b',
  1: 'y',
  2: 'select',
  3: 'start',
  4: 'up',
  5: 'down',
  6: 'left',
  7: 'right',
  8: 'a',
  9: 'x',
  10: 'l',
  11: 'r',
  12: 'l2',
  13: 'r2',
  14: 'l3',
  15: 'r3',
}

const EXTENSION_CORE_MAP = {
  '.nes': 'fceumm',
  '.fds': 'fceumm',
  '.sfc': 'snes9x',
  '.smc': 'snes9x',
  '.fig': 'snes9x',
  '.swc': 'snes9x',
  '.gb': 'gambatte',
  '.gbc': 'gambatte',
  '.gba': 'mgba',
  '.sms': 'genesis_plus_gx',
  '.gg': 'genesis_plus_gx',
  '.gen': 'genesis_plus_gx',
  '.md': 'genesis_plus_gx',
  '.smd': 'genesis_plus_gx',
  '.bin': 'genesis_plus_gx',
  '.cue': 'pcsx_rearmed',
  '.pbp': 'pcsx_rearmed',
  '.chd': 'pcsx_rearmed',
  '.iso': 'pcsx_rearmed',
  '.z64': 'mupen64plus_next',
  '.n64': 'mupen64plus_next',
  '.v64': 'mupen64plus_next',
}

const CONSOLE_CORE_MAP = {
  'snes': 'snes9x',
  'super nintendo': 'snes9x',
  'super famicom': 'snes9x',
  'nes': 'fceumm',
  'nintendo (nes)': 'fceumm',
  'famicom': 'fceumm',
  'famicom disk system': 'fceumm',
  'gba': 'mgba',
  'game boy advance': 'mgba',
  'gb': 'gambatte',
  'game boy': 'gambatte',
  'gbc': 'gambatte',
  'game boy color': 'gambatte',
  'mega drive': 'genesis_plus_gx',
  'genesis': 'genesis_plus_gx',
  'mega drive / genesis': 'genesis_plus_gx',
  'sega genesis': 'genesis_plus_gx',
  'master system': 'genesis_plus_gx',
  'game gear': 'genesis_plus_gx',
  'ps1': 'pcsx_rearmed',
  'playstation': 'pcsx_rearmed',
  'psx': 'pcsx_rearmed',
  'n64': 'mupen64plus_next',
  'nintendo 64': 'mupen64plus_next',
  'arcade': 'fbneo',
  'neo geo': 'fbneo',
}

export function resolveWasmCore(consoleName = '', fileName = '') {
  const normConsole = String(consoleName || '').trim().toLowerCase()
  if (normConsole && CONSOLE_CORE_MAP[normConsole]) {
    return CONSOLE_CORE_MAP[normConsole]
  }

  const extMatch = String(fileName || '').match(/\.[a-z0-9]+$/i)
  if (extMatch) {
    const ext = extMatch[0].toLowerCase()
    if (EXTENSION_CORE_MAP[ext]) {
      return EXTENSION_CORE_MAP[ext]
    }
  }

  return 'fceumm'
}

class WasmEmulatorSession {
  constructor() {
    this.nostalgist = null
    this.core = null
    this.isRunning = false
    this.isPaused = false
    this.activeButtons = new Set()
  }

  async launch({
    canvas,
    rom,
    consoleName = '',
    initialSaveRam = null,
    onStateChange,
  }) {
    if (this.nostalgist) {
      await this.close()
    }

    const fileName = rom?.name || 'game.bin'
    const core = resolveWasmCore(consoleName, fileName)
    this.core = core

    const options = {
      core,
      rom,
      element: canvas,
    }

    if (initialSaveRam && initialSaveRam.length > 0) {
      options.sram = new Blob([initialSaveRam], { type: 'application/octet-stream' })
    }

    try {
      this.nostalgist = await Nostalgist.launch(options)
      this.isRunning = true
      this.isPaused = false
      onStateChange?.({ running: true, paused: false, core })
      return { core, timing: { fps: 60, sample_rate: 44100 } }
    } catch (err) {
      this.isRunning = false
      this.nostalgist = null
      throw new Error(`Falha ao iniciar emulador WebAssembly (${core}): ${err.message}`)
    }
  }

  sendInput(buttonId, isDown) {
    if (!this.nostalgist || !this.isRunning) return
    const buttonName = typeof buttonId === 'string' ? buttonId.toLowerCase() : LIBRETRO_BUTTON_NAMES[buttonId]
    if (!buttonName) return

    try {
      if (isDown) {
        if (!this.activeButtons.has(buttonName)) {
          this.activeButtons.add(buttonName)
          this.nostalgist.pressDown(buttonName)
        }
      } else {
        if (this.activeButtons.has(buttonName)) {
          this.activeButtons.delete(buttonName)
          this.nostalgist.pressUp(buttonName)
        }
      }
    } catch {}
  }

  releaseAllInputs() {
    if (!this.nostalgist || !this.isRunning) return
    for (const buttonName of this.activeButtons) {
      try {
        this.nostalgist.pressUp(buttonName)
      } catch {}
    }
    this.activeButtons.clear()
  }

  async pause() {
    if (!this.nostalgist) return { isPaused: false }
    if (this.isPaused) {
      await this.nostalgist.resume()
      this.isPaused = false
    } else {
      await this.nostalgist.pause()
      this.isPaused = true
    }
    return { isPaused: this.isPaused }
  }

  async reset() {
    if (!this.nostalgist) return
    await this.nostalgist.restart()
    this.isPaused = false
  }

  async saveState() {
    if (!this.nostalgist) throw new Error('Emulador não iniciado.')
    const result = await this.nostalgist.saveState()
    const stateBlob = result?.state || result
    if (!stateBlob) throw new Error('Falha ao exportar save state do core Wasm.')
    const arrayBuffer = await stateBlob.arrayBuffer()
    return new Uint8Array(arrayBuffer)
  }

  async loadState(stateBytes) {
    if (!this.nostalgist) throw new Error('Emulador não iniciado.')
    const blob = new Blob([stateBytes], { type: 'application/octet-stream' })
    await this.nostalgist.loadState(blob)
    return true
  }

  async saveSRAM() {
    if (!this.nostalgist) return new Uint8Array(0)
    try {
      const sramBlob = await this.nostalgist.saveSRAM()
      if (!sramBlob) return new Uint8Array(0)
      const buffer = await sramBlob.arrayBuffer()
      return new Uint8Array(buffer)
    } catch {
      return new Uint8Array(0)
    }
  }

  async close() {
    this.releaseAllInputs()
    this.isRunning = false
    this.isPaused = false
    if (this.nostalgist) {
      try {
        await this.nostalgist.exit()
      } catch {}
      this.nostalgist = null
    }
  }
}

export const wasmEmulator = new WasmEmulatorSession()
