/**
 * liveTelemetryService.js
 * 
 * Motor de telemetria em segundo plano para emuladores Libretro / WebAssembly.
 * 
 * Opera silenciosamente sem poluir a tela do jogador, coletando dados essenciais:
 * - Tempo de gameplay acumulado
 * - Contador de mortes
 * - Pontuação do jogo
 * - Detecção de jogo zerado (Game Beaten / Credits / Final Boss)
 * - Detecção de zeramento para o progresso interno do ZEREI!
 */

import { playAchievementSound } from '../retro-achievements/retroAchievementsService'
import { logActivity } from '../feed/activityService'

// Perfis conhecidos de memória RAM para consoles e jogos clássicos
const GAME_RAM_PROFILES = {
  // Super Mario World (SNES)
  'super mario world': {
    system: 'snes',
    detect(ram) {
      if (!ram || ram.length < 0x2000) return null
      const lives = ram[0x0DBE] // Vidas (normalmente 4 ou 5)
      const animState = ram[0x0071] // 0x09 = animação de morte
      const gameMode = ram[0x0100] // 0x14 = jogando, 0x19 = créditos / Bowser vencido
      const exits = ram[0x1F2E] // Número de saídas concluídas
      const score = (ram[0x0F36] << 16) | (ram[0x0F35] << 8) | ram[0x0F34]

      return {
        lives: lives > 0 && lives <= 99 ? lives : null,
        isDying: animState === 0x09,
        score: score >= 0 ? score * 10 : null,
        isBeaten: gameMode === 0x19 || exits >= 96,
      }
    },
  },

  // Sonic The Hedgehog (Mega Drive)
  'sonic the hedgehog': {
    system: 'genesis',
    detect(ram) {
      if (!ram || ram.length < 0x10000) return null
      const lives = ram[0xFE12]
      const rings = (ram[0xFE20] << 8) | ram[0xFE21]
      const score = (ram[0xFE26] << 24) | (ram[0xFE27] << 16) | (ram[0xFE28] << 8) | ram[0xFE29]
      const zone = ram[0xFE10] // Zona atual
      const act = ram[0xFE11]
      const isBeaten = zone >= 5 && act >= 1 && ram[0xFE2E] === 0x01 // Final Zone boss clear

      return {
        lives: lives >= 0 && lives <= 99 ? lives : null,
        score: score >= 0 && score < 10000000 ? score : null,
        rings: rings >= 0 ? rings : 0,
        isBeaten: Boolean(isBeaten),
      }
    },
  },

  // Sonic The Hedgehog 2 (Mega Drive)
  'sonic the hedgehog 2': {
    system: 'genesis',
    detect(ram) {
      if (!ram || ram.length < 0x10000) return null
      const lives = ram[0xFE12]
      const isBeaten = ram[0xFE10] === 0x0E // Death Egg beaten
      return {
        lives: lives >= 0 && lives <= 99 ? lives : null,
        isBeaten: Boolean(isBeaten),
      }
    },
  },

  // Mega Man X (SNES)
  'mega man x': {
    system: 'snes',
    detect(ram) {
      if (!ram || ram.length < 0x2000) return null
      const hp = ram[0x0BCF]
      const lives = ram[0x1F80] || ram[0x0BCB]
      const sigmaDefeated = ram[0x1F8B] === 0x01

      return {
        lives: lives >= 0 && lives <= 9 ? lives : null,
        isDying: hp === 0,
        isBeaten: Boolean(sigmaDefeated),
      }
    },
  },

  // The Legend of Zelda: The Minish Cap (GBA)
  'the legend of zelda: the minish cap': {
    system: 'gba',
    detect(ram) {
      if (!ram || ram.length < 0x40000) return null
      const hearts = ram[0x1008] // Heart containers
      const vaatiDefeated = ram[0x1020] === 0x01
      return {
        lives: hearts > 0 ? hearts : 3,
        isBeaten: Boolean(vaatiDefeated),
      }
    },
  },

  // Metroid (NES)
  'metroid': {
    system: 'nes',
    detect(ram) {
      if (!ram || ram.length < 0x80) return null
      const hpLow = ram[0x006E] || 0
      const hpHigh = ram[0x006F] || 0
      const hp = hpHigh * 100 + hpLow
      const bossFlags = ram[0x0018] || 0
      // Mother Brain derrotada - bit 2 de bossFlags
      const isBeaten = (bossFlags & 0x04) !== 0

      return {
        lives: hp > 0 ? Math.ceil(hp / 99) : 0,
        isDying: hp === 0 && hpLow === 0,
        score: null,
        isBeaten: Boolean(isBeaten),
      }
    },
  },
}

class LiveTelemetryService {
  constructor() {
    this.timerId = null
    this.gameplayIntervalId = null
    this.activeGameTitle = ''
    this.roomId = null
    this.userId = null
    this.userDisplayName = ''
    this.onProgressCallback = null
    this.memoryRequestPending = false

    // Estado da telemetria
    this.state = {
      gameplaySeconds: 0,
      deaths: 0,
      score: 0,
      lives: null,
      isBeaten: false,
      lastLives: null,
      lastDyingState: false,
    }

    this.ramProfile = null
  }

  /**
   * Inicia o monitoramento de telemetria em segundo plano
   */
  start({ gameTitle = '', roomId = null, userId = null, userDisplayName = '', initialData = {}, onProgress = null }) {
    this.stop()

    this.activeGameTitle = gameTitle || ''
    this.roomId = roomId
    this.userId = userId
    this.userDisplayName = userDisplayName || 'Jogador'
    this.onProgressCallback = onProgress

    // Carrega dados persistidos da sessão
    const storageKey = `zerei:telemetry:${roomId || 'solo'}:${this.activeGameTitle.toLowerCase().trim()}`
    let saved = null
    try {
      saved = JSON.parse(localStorage.getItem(storageKey) || '{}')
    } catch {}

    this.state = {
      gameplaySeconds: Number(initialData?.gameplaySeconds ?? saved?.gameplaySeconds ?? 0),
      deaths: Number(initialData?.deaths ?? saved?.deaths ?? 0),
      score: Number(initialData?.score ?? saved?.score ?? 0),
      lives: null,
      isBeaten: Boolean(initialData?.isCompleted ?? saved?.isBeaten ?? false),
      lastLives: null,
      lastDyingState: false,
    }

    // Identifica se há perfil de RAM específico para este jogo
    this.ramProfile = this._resolveRamProfile(this.activeGameTitle)

    // 1. Cronômetro de tempo de gameplay (roda a cada 1 segundo enquanto emulado)
    this.gameplayIntervalId = window.setInterval(() => {
      this.state.gameplaySeconds += 1

      // A cada 10 segundos, persiste e sincroniza
      if (this.state.gameplaySeconds % 10 === 0) {
        this._saveAndNotify()
      }
    }, 1000)

    // 2. Loop de inspeção de RAM (roda a 5Hz - 200ms - leve e imperceptível para a CPU)
    this.timerId = window.setInterval(() => {
      this._pollMemory()
    }, 200)

    this._notifyUpdate()
  }

  /**
   * Pausa ou encerra o monitoramento
   */
  stop() {
    if (this.timerId) {
      clearInterval(this.timerId)
      this.timerId = null
    }
    if (this.gameplayIntervalId) {
      clearInterval(this.gameplayIntervalId)
      this.gameplayIntervalId = null
    }

    this._saveAndNotify()
  }

  /**
   * Retorna os dados atuais da telemetria
   */
  getTelemetry() {
    return {
      gameplaySeconds: this.state.gameplaySeconds,
      deaths: this.state.deaths,
      score: this.state.score,
      lives: this.state.lives,
      isBeaten: this.state.isBeaten,
      gameTitle: this.activeGameTitle,
    }
  }

  /**
   * Dispara o evento de jogo zerado
   */
  markGameAsBeaten(reason = 'Meta principal concluída') {
    if (this.state.isBeaten) return
    this.state.isBeaten = true

    // Toca som triunfal
    playAchievementSound()

    // Dispara evento para a interface e componentes
    window.dispatchEvent(
      new CustomEvent('zerei:game_beaten', {
        detail: {
          gameTitle: this.activeGameTitle,
          gameplaySeconds: this.state.gameplaySeconds,
          deaths: this.state.deaths,
          score: this.state.score,
          reason,
        },
      })
    )

    // Registra no feed de atividades
    logActivity({
      type: 'game_beaten',
      action: 'zerou o jogo',
      game: this.activeGameTitle,
      gameTitle: this.activeGameTitle,
      timeSpent: this.state.gameplaySeconds,
      deaths: this.state.deaths,
      score: this.state.score,
      visibility: 'public',
    }).catch(() => {})

    this._saveAndNotify()
  }

  /**
   * Registra uma morte detectada
   */
  recordDeath() {
    this.state.deaths += 1
    window.dispatchEvent(
      new CustomEvent('zerei:death', {
        detail: {
          deaths: this.state.deaths,
          gameTitle: this.activeGameTitle,
        },
      })
    )
    this._saveAndNotify()
  }

  // --- MÉTODOS INTERNOS ---

  _pollMemory() {
    if (!this.ramProfile || this.memoryRequestPending || typeof window === 'undefined') return
    const readMemory = window.zereiNative?.readMemory
    if (typeof readMemory !== 'function') return

    this.memoryRequestPending = true
    Promise.resolve(readMemory(2))
      .then((memory) => {
        const ram = memory instanceof Uint8Array ? memory : new Uint8Array(memory || [])
        if (!ram.length) return
        const detected = this.ramProfile.detect(ram)
        if (!detected) return

        if (detected.lives !== null && detected.lives !== undefined) {
          if (this.state.lastLives !== null && detected.lives < this.state.lastLives) {
            this.recordDeath()
          }
          this.state.lives = detected.lives
          this.state.lastLives = detected.lives
        }

        if (detected.isDying && !this.state.lastDyingState) this.recordDeath()
        this.state.lastDyingState = Boolean(detected.isDying)
        if (detected.isBeaten && !this.state.isBeaten) this.markGameAsBeaten('Objetivo final atingido')
      })
      .catch(() => {})
      .finally(() => { this.memoryRequestPending = false })
  }

  _resolveRamProfile(title) {
    if (!title) return null
    const clean = title.toLowerCase().trim()
    for (const [key, profile] of Object.entries(GAME_RAM_PROFILES)) {
      if (clean.includes(key) || key.includes(clean)) {
        return profile
      }
    }
    return null
  }

  _saveAndNotify() {
    const storageKey = `zerei:telemetry:${this.roomId || 'solo'}:${this.activeGameTitle.toLowerCase().trim()}`
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          gameplaySeconds: this.state.gameplaySeconds,
          deaths: this.state.deaths,
          score: this.state.score,
          isBeaten: this.state.isBeaten,
          updatedAt: new Date().toISOString(),
        })
      )
    } catch {}

    this._notifyUpdate()

    if (typeof this.onProgressCallback === 'function') {
      this.onProgressCallback({
        gameplaySeconds: this.state.gameplaySeconds,
        deaths: this.state.deaths,
        score: this.state.score,
        isCompleted: this.state.isBeaten,
      })
    }
  }

  _notifyUpdate() {
    window.dispatchEvent(
      new CustomEvent('zerei:telemetry_update', {
        detail: {
          gameplaySeconds: this.state.gameplaySeconds,
          deaths: this.state.deaths,
          score: this.state.score,
          lives: this.state.lives,
          isBeaten: this.state.isBeaten,
          gameTitle: this.activeGameTitle,
        },
      })
    )
  }
}

export const liveTelemetry = new LiveTelemetryService()

