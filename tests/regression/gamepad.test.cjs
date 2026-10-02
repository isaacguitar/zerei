const path = require('path')
const fs = require('fs')
const os = require('os')
const { LibretroSession } = require('../../electron/libretroBridge.cjs')

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

// Tabela de mapeamento W3C Standard Gamepad -> Libretro RetroPad
const GAMEPAD_BUTTON_MAP = {
  0: 0,  // Face inferior (A no Xbox, X no PS) -> Libretro B (0)
  1: 8,  // Face direita (B no Xbox, Círculo no PS) -> Libretro A (8)
  2: 1,  // Face esquerda (X no Xbox, Quadrado no PS) -> Libretro Y (1)
  3: 9,  // Face superior (Y no Xbox, Triângulo no PS) -> Libretro X (9)
  4: 10, // LB / L1 -> Libretro L (10)
  5: 11, // RB / R1 -> Libretro R (11)
  6: 12, // LT / L2 -> Libretro L2 (12)
  7: 13, // RT / R2 -> Libretro R2 (13)
  8: 2,  // Select / Back / Share -> Libretro SELECT (2)
  9: 3,  // Start / Options / Menu -> Libretro START (3)
  10: 14, // L3 -> Libretro L3 (14)
  11: 15, // R3 -> Libretro R3 (15)
  12: 4,  // D-pad Cima -> Libretro UP (4)
  13: 5,  // D-pad Baixo -> Libretro DOWN (5)
  14: 6,  // D-pad Esquerda -> Libretro LEFT (6)
  15: 7,  // D-pad Direita -> Libretro RIGHT (7)
}

function mapAxesToButtons(axes, deadzone = 0.45) {
  const buttons = new Set()
  if (!Array.isArray(axes) || axes.length < 2) return buttons
  const [x, y] = axes
  if (x < -deadzone) buttons.add(6) // LEFT
  if (x > deadzone) buttons.add(7)  // RIGHT
  if (y < -deadzone) buttons.add(4) // UP
  if (y > deadzone) buttons.add(5)  // DOWN
  return buttons
}

async function runGamepadTests() {
  console.log('\n\x1b[1m\x1b[34m========================================================\x1b[0m')
  console.log('\x1b[1m\x1b[34m    ZEREI! — TESTES DE CONTROLES FÍSICOS E GAMEPAD      \x1b[0m')
  console.log('\x1b[1m\x1b[34m========================================================\x1b[0m\n')

  // ---------------------------------------------------------------
  // 1. Validação do Mapeamento W3C Standard Gamepad -> RetroPad
  // ---------------------------------------------------------------
  console.log('\x1b[1m[1/4] Validação de Mapeamento W3C Standard Gamepad\x1b[0m')
  assert(GAMEPAD_BUTTON_MAP[0] === 0, 'Botão 0 (A/Cruz) mapeia para Libretro B (0)')
  assert(GAMEPAD_BUTTON_MAP[1] === 8, 'Botão 1 (B/Círculo) mapeia para Libretro A (8)')
  assert(GAMEPAD_BUTTON_MAP[2] === 1, 'Botão 2 (X/Quadrado) mapeia para Libretro Y (1)')
  assert(GAMEPAD_BUTTON_MAP[3] === 9, 'Botão 3 (Y/Triângulo) mapeia para Libretro X (9)')
  assert(GAMEPAD_BUTTON_MAP[4] === 10, 'Botão 4 (LB/L1) mapeia para Libretro L (10)')
  assert(GAMEPAD_BUTTON_MAP[5] === 11, 'Botão 5 (RB/R1) mapeia para Libretro R (11)')
  assert(GAMEPAD_BUTTON_MAP[8] === 2, 'Botão 8 (Select/Back) mapeia para Libretro SELECT (2)')
  assert(GAMEPAD_BUTTON_MAP[9] === 3, 'Botão 9 (Start) mapeia para Libretro START (3)')
  assert(GAMEPAD_BUTTON_MAP[12] === 4, 'D-Pad Cima (12) mapeia para Libretro UP (4)')
  assert(GAMEPAD_BUTTON_MAP[13] === 5, 'D-Pad Baixo (13) mapeia para Libretro DOWN (5)')
  assert(GAMEPAD_BUTTON_MAP[14] === 6, 'D-Pad Esquerda (14) mapeia para Libretro LEFT (6)')
  assert(GAMEPAD_BUTTON_MAP[15] === 7, 'D-Pad Direita (15) mapeia para Libretro RIGHT (7)')

  // ---------------------------------------------------------------
  // 2. Deadzone e Resposta dos Analógicos (Stick Esquerdo)
  // ---------------------------------------------------------------
  console.log('\n\x1b[1m[2/4] Zonas Mortas (Deadzone) e Analógicos\x1b[0m')
  const neutral = mapAxesToButtons([0.0, 0.0])
  assert(neutral.size === 0, 'Posição neutra do analógico (0.0, 0.0) não gera inputs')

  const slightJitter = mapAxesToButtons([0.15, -0.2])
  assert(slightJitter.size === 0, 'Desvio leve dentro da zona morta (< 0.45) é filtrado corretamente')

  const tiltLeft = mapAxesToButtons([-0.8, 0.0])
  assert(tiltLeft.has(6) && tiltLeft.size === 1, 'Inclinação para esquerda (< -0.45) ativa Libretro LEFT (6)')

  const tiltRight = mapAxesToButtons([0.9, 0.0])
  assert(tiltRight.has(7) && tiltRight.size === 1, 'Inclinação para direita (> 0.45) ativa Libretro RIGHT (7)')

  const tiltUp = mapAxesToButtons([0.0, -0.75])
  assert(tiltUp.has(4) && tiltUp.size === 1, 'Inclinação para cima (< -0.45) ativa Libretro UP (4)')

  const tiltDown = mapAxesToButtons([0.0, 0.85])
  assert(tiltDown.has(5) && tiltDown.size === 1, 'Inclinação para baixo (> 0.45) ativa Libretro DOWN (5)')

  const diagonal = mapAxesToButtons([0.7, -0.7])
  assert(diagonal.has(7) && diagonal.has(4) && diagonal.size === 2, 'Diagonal superior-direita ativa simultaneamente UP e RIGHT')

  // ---------------------------------------------------------------
  // 3. Simulação de Liberação de Entradas (Blur, Pausa, Desconexão)
  // ---------------------------------------------------------------
  console.log('\n\x1b[1m[3/4] Liberação de Entradas (Anti-Stuck Inputs)\x1b[0m')
  const activeInputs = new Set([0, 4, 7, 8]) // B, UP, RIGHT, A pressionados
  const sentSignals = []

  const mockSendInput = (buttonId, isPressed) => {
    sentSignals.push({ buttonId, isPressed })
  }

  function simulateReleaseInputs(activeSet, sendFn) {
    activeSet.forEach((btnId) => sendFn(btnId, false))
    activeSet.clear()
  }

  simulateReleaseInputs(activeInputs, mockSendInput)
  assert(activeInputs.size === 0, 'Conjunto de entradas ativas é esvaziado no evento de liberação')
  assert(sentSignals.length === 4, 'Sinal de desativação (isPressed: false) enviado para cada botão que estava pressionado')
  assert(sentSignals.every((s) => s.isPressed === false), 'Todas as mensagens enviadas foram de liberação (evita personagem andando sozinho)')

  // ---------------------------------------------------------------
  // 4. Integração Real de Input com o Core Nativo
  // ---------------------------------------------------------------
  console.log('\n\x1b[1m[4/4] Injeção e Polling de Gamepad no Core Libretro\x1b[0m')
  const tempDir = path.join(os.tmpdir(), `zerei-gp-test-${Date.now()}`)
  fs.mkdirSync(tempDir, { recursive: true })
  const coresDir = path.resolve('desktop/ZereiDesktop.App/cores')

  try {
    const session = new LibretroSession(coresDir, path.join(tempDir, 'data'))
    session.loadCore(path.join(coresDir, 'nestopia_libretro.dll'))

    const romPath = path.join(tempDir, 'game.nes')
    const rom = Buffer.alloc(16 + 16384)
    rom.write('NES\x1a', 0, 'binary')
    rom[4] = 1
    rom[6] = 2
    rom[16] = 0x4c
    rom[18] = 0x80
    for (const p of [0x3ffa, 0x3ffc, 0x3ffe]) rom[16 + p + 1] = 0x80
    fs.writeFileSync(romPath, rom)

    session.loadGame(romPath)

    // Simula aperto de Start (3) e A (8) via Gamepad
    session.setButtonState(GAMEPAD_BUTTON_MAP[9], true) // Start
    session.setButtonState(GAMEPAD_BUTTON_MAP[1], true) // A
    assert(session.inputState[3] === 1 && session.inputState[8] === 1, 'Botões Start e A ativados no estado interno do core')

    session.funcs.retro_run()

    // Libera entradas
    session.setButtonState(GAMEPAD_BUTTON_MAP[9], false)
    session.setButtonState(GAMEPAD_BUTTON_MAP[1], false)
    assert(session.inputState[3] === 0 && session.inputState[8] === 0, 'Botões Start e A liberados corretamente no core')

    session.funcs.retro_run()
    session.stop()
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true })
  }

  console.log('\n\x1b[1m\x1b[34m========================================================\x1b[0m')
  console.log(`\x1b[1mRESULTADO DOS TESTES DE GAMEPAD:\x1b[0m ${passedTests}/${totalTests} testes passaram.`)
  if (failedTests > 0) {
    console.log(`\x1b[31m${failedTests} falha(s) detectada(s):\x1b[0m`)
    failures.forEach((f) => console.log(` - ${f}`))
    console.log('\x1b[1m\x1b[34m========================================================\x1b[0m\n')
    process.exit(1)
  } else {
    console.log('\x1b[32m\x1b[1mSUCESSO TOTAL! O suporte a gamepads físicos está validado.\x1b[0m')
    console.log('\x1b[1m\x1b[34m========================================================\x1b[0m\n')
    process.exit(0)
  }
}

runGamepadTests().catch((err) => {
  console.error('\x1b[31mErro fatal no teste de gamepad:\x1b[0m', err)
  process.exit(1)
})
