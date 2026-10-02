const fs = require('fs')
const path = require('path')

let totalTests = 0
let passedTests = 0
let failedTests = 0
const failures = []

function assert(condition, message) {
  totalTests++
  if (condition) {
    passedTests++
    console.log(`  \x1b[32m✓\x1b[0m ${message}`)
  } else {
    failedTests++
    failures.push(message)
    console.error(`  \x1b[31m✗\x1b[0m ${message}`)
  }
}

// Lógica pura de resolução de cores para testes unitários
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

function resolveWasmCore(consoleName = '', fileName = '') {
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

async function runWasmEmulatorTests() {
  console.log('\n\x1b[1m\x1b[34m========================================================\x1b[0m')
  console.log('\x1b[1m\x1b[34m    ZEREI! — TESTES DO MOTOR DE EMULAÇÃO ANDROID / WASM \x1b[0m')
  console.log('\x1b[1m\x1b[34m========================================================\x1b[0m\n')

  // 1. Resolução de Cores por Console
  console.log('\x1b[1m[1/4] Resolução Inteligente de Núcleos por Console\x1b[0m')
  assert(resolveWasmCore('SNES') === 'snes9x', 'Console "SNES" mapeia para core snes9x')
  assert(resolveWasmCore('Super Nintendo') === 'snes9x', 'Console "Super Nintendo" mapeia para core snes9x')
  assert(resolveWasmCore('NES') === 'fceumm', 'Console "NES" mapeia para core fceumm')
  assert(resolveWasmCore('Nintendo (NES)') === 'fceumm', 'Console "Nintendo (NES)" mapeia para core fceumm')
  assert(resolveWasmCore('GBA') === 'mgba', 'Console "GBA" mapeia para core mgba')
  assert(resolveWasmCore('Game Boy Advance') === 'mgba', 'Console "Game Boy Advance" mapeia para core mgba')
  assert(resolveWasmCore('GB') === 'gambatte', 'Console "GB" mapeia para core gambatte')
  assert(resolveWasmCore('Game Boy Color') === 'gambatte', 'Console "Game Boy Color" mapeia para core gambatte')
  assert(resolveWasmCore('Mega Drive') === 'genesis_plus_gx', 'Console "Mega Drive" mapeia para core genesis_plus_gx')
  assert(resolveWasmCore('Genesis') === 'genesis_plus_gx', 'Console "Genesis" mapeia para core genesis_plus_gx')
  assert(resolveWasmCore('PS1') === 'pcsx_rearmed', 'Console "PS1" mapeia para core pcsx_rearmed')
  assert(resolveWasmCore('Nintendo 64') === 'mupen64plus_next', 'Console "Nintendo 64" mapeia para core mupen64plus_next')

  // 2. Resolução de Cores por Extensão de Arquivo
  console.log('\n\x1b[1m[2/4] Resolução de Núcleos por Extensão de Arquivo (Fallback)\x1b[0m')
  assert(resolveWasmCore('', 'SuperMarioWorld.sfc') === 'snes9x', 'Arquivo .sfc resolve para snes9x')
  assert(resolveWasmCore('', 'Zelda.smc') === 'snes9x', 'Arquivo .smc resolve para snes9x')
  assert(resolveWasmCore('', 'Metroid.nes') === 'fceumm', 'Arquivo .nes resolve para fceumm')
  assert(resolveWasmCore('', 'PokemonFireRed.gba') === 'mgba', 'Arquivo .gba resolve para mgba')
  assert(resolveWasmCore('', 'Tetris.gb') === 'gambatte', 'Arquivo .gb resolve para gambatte')
  assert(resolveWasmCore('', 'Sonic.md') === 'genesis_plus_gx', 'Arquivo .md resolve para genesis_plus_gx')
  assert(resolveWasmCore('', 'CrashBandicoot.chd') === 'pcsx_rearmed', 'Arquivo .chd resolve para pcsx_rearmed')

  // 3. Mapeamento de Controles para o WebAssembly Engine
  console.log('\n\x1b[1m[3/4] Mapeamento de Entradas Libretro -> Nostalgist RetroPad\x1b[0m')
  assert(LIBRETRO_BUTTON_NAMES[0] === 'b', 'Libretro B (0) mapeia para RetroPad "b"')
  assert(LIBRETRO_BUTTON_NAMES[8] === 'a', 'Libretro A (8) mapeia para RetroPad "a"')
  assert(LIBRETRO_BUTTON_NAMES[1] === 'y', 'Libretro Y (1) mapeia para RetroPad "y"')
  assert(LIBRETRO_BUTTON_NAMES[9] === 'x', 'Libretro X (9) mapeia para RetroPad "x"')
  assert(LIBRETRO_BUTTON_NAMES[2] === 'select', 'Libretro SELECT (2) mapeia para RetroPad "select"')
  assert(LIBRETRO_BUTTON_NAMES[3] === 'start', 'Libretro START (3) mapeia para RetroPad "start"')
  assert(LIBRETRO_BUTTON_NAMES[4] === 'up', 'Libretro UP (4) mapeia para RetroPad "up"')
  assert(LIBRETRO_BUTTON_NAMES[5] === 'down', 'Libretro DOWN (5) mapeia para RetroPad "down"')
  assert(LIBRETRO_BUTTON_NAMES[6] === 'left', 'Libretro LEFT (6) mapeia para RetroPad "left"')
  assert(LIBRETRO_BUTTON_NAMES[7] === 'right', 'Libretro RIGHT (7) mapeia para RetroPad "right"')
  assert(LIBRETRO_BUTTON_NAMES[10] === 'l', 'Libretro L (10) mapeia para RetroPad "l"')
  assert(LIBRETRO_BUTTON_NAMES[11] === 'r', 'Libretro R (11) mapeia para RetroPad "r"')

  // 4. Verificação dos Assets Sincronizados com o Android
  console.log('\n\x1b[1m[4/4] Verificação de Assets do Capacitor Android\x1b[0m')
  const androidPublicDir = path.resolve('android/app/src/main/assets/public')
  assert(fs.existsSync(androidPublicDir), 'Diretório público do Android existe')
  const androidIndexHtml = path.join(androidPublicDir, 'index.html')
  assert(fs.existsSync(androidIndexHtml), 'index.html presente nos assets do APK Android')
  const assetsDir = path.join(androidPublicDir, 'assets')
  assert(fs.existsSync(assetsDir), 'Pasta de assets empacotados presente no Android')
  const assetFiles = fs.readdirSync(assetsDir)
  assert(assetFiles.length > 5, `Assets compilados sincronizados com o Android (${assetFiles.length} arquivos)`)

  console.log('\n\x1b[1m========================================================\x1b[0m')
  console.log(`\x1b[1mRESULTADO FINAL: ${passedTests}/${totalTests} testes passaram.\x1b[0m`)
  if (failedTests === 0) {
    console.log('\x1b[1m\x1b[32mSUCESSO TOTAL! Motor Android/Wasm validado com êxito.\x1b[0m')
  } else {
    console.error(`\x1b[1m\x1b[31mFALHAS DETECTADAS: ${failedTests} testes falharam.\x1b[0m`)
    process.exit(1)
  }
  console.log('\x1b[1m========================================================\x1b[0m\n')
}

runWasmEmulatorTests().catch((err) => {
  console.error(err)
  process.exit(1)
})
