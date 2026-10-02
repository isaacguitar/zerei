const fs = require('fs')
const path = require('path')
const os = require('os')
const { LibretroSession, selectSaveRamForLaunch } = require('../../electron/libretroBridge.cjs')
const { RetroAchievementsRuntime } = require('../../electron/retroAchievementsRuntime.cjs')

const DEV_CORES_DIR = path.resolve('desktop/ZereiDesktop.App/cores')
const PACKAGED_CORES_DIR = path.resolve('dist-electron/win-unpacked/resources/cores')

const EXPECTED_CORES = [
  'citra_libretro.dll',
  'desmume_libretro.dll',
  'fceumm_libretro.dll',
  'gambatte_libretro.dll',
  'genesis_plus_gx_libretro.dll',
  'mednafen_psx_hw_libretro.dll',
  'melonds_libretro.dll',
  'mgba_libretro.dll',
  'mupen64plus_next_libretro.dll',
  'nestopia_libretro.dll',
  'pcsx_rearmed_libretro.dll',
  'ppsspp_libretro.dll',
  'sameboy_libretro.dll',
  'snes9x_libretro.dll',
]

// Utilitários de teste
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

function createMinimalNesRom(filePath) {
  // Cabeçalho iNES padrão: 16 bytes cabeçalho + 16KB PRG ROM
  const rom = Buffer.alloc(16 + 16384)
  rom.write('NES\x1a', 0, 'binary')
  rom[4] = 1 // 1x 16KB PRG ROM
  rom[5] = 0 // 0x CHR ROM (usa CHR RAM)
  rom[6] = 2 // Bateria SRAM presente (bit 1 = 1)
  // Código 6502 mínimo: loop infinito JMP $8000
  rom[16] = 0x4c // JMP
  rom[17] = 0x00
  rom[18] = 0x80
  // Vetores de interrupção (NMI, RESET, IRQ/BRK em $FFFA, $FFFC, $FFFE)
  for (const offset of [0x3ffa, 0x3ffc, 0x3ffe]) {
    rom[16 + offset] = 0x00
    rom[16 + offset + 1] = 0x80
  }
  fs.writeFileSync(filePath, rom)
  return rom
}

function createMinimalGbRom(filePath) {
  // ROM Game Boy mínima: 32 KB com header padrão
  const rom = Buffer.alloc(32768)
  // Entry point $0100: NOP; JP $0150
  rom[0x0100] = 0x00 // NOP
  rom[0x0101] = 0xc3 // JP
  rom[0x0102] = 0x50
  rom[0x0103] = 0x01
  // Título em $0134: ZEREITEST
  Buffer.from('ZEREITEST').copy(rom, 0x0134)
  // Cartridge type: $00 (ROM ONLY) ou $03 (MBC1+RAM+BATTERY)
  rom[0x0147] = 0x03
  rom[0x0148] = 0x00 // 32KB
  rom[0x0149] = 0x02 // 8KB RAM
  rom[0x014a] = 0x01 // Não Japão
  rom[0x014b] = 0x33
  // Loop no $0150: JR $FE (loop infinito)
  rom[0x0150] = 0x18
  rom[0x0151] = 0xfe
  fs.writeFileSync(filePath, rom)
  return rom
}

function createMinimalGbaRom(filePath) {
  // ROM GBA mínima: 192 bytes cabeçalho
  const rom = Buffer.alloc(512)
  // Entry point: B $080000C0
  rom[0] = 0x2e
  rom[1] = 0x00
  rom[2] = 0x00
  rom[3] = 0xea
  Buffer.from('ZEREIGBA').copy(rom, 0xa0)
  Buffer.from('TEST').copy(rom, 0xac)
  Buffer.from('01').copy(rom, 0xb0)
  rom[0xb2] = 0x96
  rom[0xbd] = 0xf0
  fs.writeFileSync(filePath, rom)
  return rom
}

async function runTestSuite() {
  console.log('\n\x1b[1m\x1b[36m========================================================\x1b[0m')
  console.log('\x1b[1m\x1b[36m    ZEREI! — SUÍTE DE TESTES DE REGRESSÃO DO EMULADOR   \x1b[0m')
  console.log('\x1b[1m\x1b[36m========================================================\x1b[0m\n')

  const tempDir = path.join(os.tmpdir(), `zerei-regression-${Date.now()}`)
  fs.mkdirSync(tempDir, { recursive: true })

  try {
    const roomLocalSavePath = path.join(tempDir, 'room-local.srm')
    fs.writeFileSync(roomLocalSavePath, Buffer.from([0x11, 0x22]))
    fs.utimesSync(roomLocalSavePath, new Date(0), new Date(0))
    const newerCloudSave = selectSaveRamForLaunch({
      initialSaveRam: Buffer.from([0x33, 0x44]),
      savedAt: new Date(Date.now()).toISOString(),
      source: 'cloud',
      localSavePaths: [{ path: roomLocalSavePath, source: 'room-local' }],
    })
    assert(newerCloudSave.source === 'cloud' && newerCloudSave.data[0] === 0x33,
      'Save cloud mais recente vence uma cópia local antiga')

    fs.utimesSync(roomLocalSavePath, new Date(), new Date())
    const newerLocalSave = selectSaveRamForLaunch({
      initialSaveRam: Buffer.from([0x33, 0x44]),
      savedAt: new Date(0).toISOString(),
      source: 'cloud',
      localSavePaths: [{ path: roomLocalSavePath, source: 'room-local' }],
    })
    assert(newerLocalSave.source === 'room-local' && newerLocalSave.data[0] === 0x11,
      'Cópia local mais recente vence save cloud antigo para continuar offline')

    // ---------------------------------------------------------------
    // 1. Verificação de Cores em Desenvolvimento e Empacotado
    // ---------------------------------------------------------------
    console.log('\x1b[1m[1/6] Verificação de Integridade dos Cores\x1b[0m')
    assert(fs.existsSync(DEV_CORES_DIR), `Diretório de cores dev existe: ${DEV_CORES_DIR}`)
    assert(fs.existsSync(PACKAGED_CORES_DIR), `Diretório de cores empacotado existe: ${PACKAGED_CORES_DIR}`)

    let devCoresFound = 0
    let packagedCoresFound = 0
    for (const core of EXPECTED_CORES) {
      const devPath = path.join(DEV_CORES_DIR, core)
      const packagedPath = path.join(PACKAGED_CORES_DIR, core)
      if (fs.existsSync(devPath) && fs.statSync(devPath).size > 100_000) devCoresFound++
      if (fs.existsSync(packagedPath) && fs.statSync(packagedPath).size > 100_000) packagedCoresFound++
    }
    assert(devCoresFound === EXPECTED_CORES.length, `Todos os 14 cores presentes em dev (${devCoresFound}/${EXPECTED_CORES.length})`)
    assert(packagedCoresFound === EXPECTED_CORES.length, `Todos os 14 cores presentes no pacote final (${packagedCoresFound}/${EXPECTED_CORES.length})`)

    // ---------------------------------------------------------------
    // 2. Carregamento de Cores e Metadados via FFI
    // ---------------------------------------------------------------
    console.log('\n\x1b[1m[2/6] Carregamento FFI e Metadados de Sistema\x1b[0m')
    const session = new LibretroSession(DEV_CORES_DIR, path.join(tempDir, 'data'))
    const nestopiaDll = path.join(DEV_CORES_DIR, 'nestopia_libretro.dll')
    const sysInfo = session.loadCore(nestopiaDll)
    assert(Boolean(sysInfo), 'Core Nestopia inicializado via FFI com sucesso')
    assert(session.funcs.retro_api_version() === 1, 'Libretro API versão 1 reportada corretamente')

    // ---------------------------------------------------------------
    // 3. Ciclo de Emulação, Vídeo, Áudio e FPS Limiter
    // ---------------------------------------------------------------
    console.log('\n\x1b[1m[3/6] Ciclo de Emulação, Vídeo, Áudio e Limitação de FPS\x1b[0m')
    const nesRomPath = path.join(tempDir, 'game.nes')
    createMinimalNesRom(nesRomPath)

    const sramPath = path.join(tempDir, 'saves', 'game.srm')
    const gameMeta = session.loadGame(nesRomPath, { saveRamPath: sramPath })
    assert(session.isLoaded === true, 'ROM NES carregada na sessão do core')
    assert(gameMeta.geometry.base_width > 0, `Geometria base de vídeo válida (${gameMeta.geometry.base_width}x${gameMeta.geometry.base_height})`)

    const raRuntime = new RetroAchievementsRuntime({ getCoreMemoryInfo: (typeId) => session.getCoreMemoryInfo(typeId) })
    raRuntime.createClient()
    assert(raRuntime.setMemoryMap(session.memoryMapPointer, 'NES'), 'Runtime RA mapeou memória do core Nestopia')
    assert(raRuntime.readMemory(0, 4).length === 4, 'Runtime RA leu memória do console pelo endereço oficial')
    raRuntime.destroy()

    let receivedFrames = 0
    let lastFrameData = null
    session.onFrameCallback = (frame) => {
      receivedFrames++
      lastFrameData = frame
    }

    let receivedAudioSamples = 0
    session.onAudioCallback = (samples) => {
      receivedAudioSamples += samples.length
    }

    // Executa 20 frames de emulação
    for (let i = 0; i < 20; i++) {
      session.funcs.retro_run()
    }

    assert(receivedFrames > 0, `Callback de vídeo acionado com sucesso (${receivedFrames} frames gerados)`)
    assert(lastFrameData && lastFrameData.rgbaBuffer?.length === lastFrameData.width * lastFrameData.height * 4,
      `Buffer de vídeo convertido para RGBA 32-bit com sucesso (${lastFrameData?.width}x${lastFrameData?.height}, ${lastFrameData?.rgbaBuffer?.length} bytes)`)

    // Teste de controle de FPS
    session.setFpsLimit(30)
    assert(session.maxFps === 30, 'Limite de FPS configurado para 30 FPS')
    session.setFpsLimit(60)
    assert(session.maxFps === 60, 'Limite de FPS configurado para 60 FPS')
    session.setFpsLimit(0)
    assert(session.maxFps === 0, 'Limite de FPS configurado para sem limite (uncapped)')
    session.setFpsLimit(60)

    // ---------------------------------------------------------------
    // 4. Mapeamento de Controles, Pausa e Reset
    // ---------------------------------------------------------------
    console.log('\n\x1b[1m[4/6] Mapeamento de Controles, Pausa e Reset\x1b[0m')
    // Pressiona Botão A (id 8) e D-Pad Direita (id 7)
    session.setButtonState(8, true)
    session.setButtonState(7, true)
    assert(session.inputState[8] === 1 && session.inputState[7] === 1, 'Estados de botões A e Direita registrados')
    session.funcs.retro_run()
    session.setButtonState(8, false)
    session.setButtonState(7, false)
    assert(session.inputState[8] === 0 && session.inputState[7] === 0, 'Liberação de botões efetuada sem retenção indevida')

    const paused = session.pause()
    assert(paused === true && session.isPaused === true, 'Pausa do emulador acionada com sucesso')
    const resumed = session.pause()
    assert(resumed === false && session.isPaused === false, 'Retomada do emulador acionada com sucesso')

    session.reset()
    assert(true, 'Reset do core executado sem falhas')

    // ---------------------------------------------------------------
    // 5. Persistência de Save States e SRAM (Bateria)
    // ---------------------------------------------------------------
    console.log('\n\x1b[1m[5/6] Persistência de Save States e Memória de Bateria (SRAM)\x1b[0m')
    const stateBuffer = session.saveState()
    assert(Buffer.isBuffer(stateBuffer) && stateBuffer.length > 0, `Save state rápido gerado com sucesso (${stateBuffer?.length} bytes)`)

    // Executa alguns frames para mudar o estado interno
    for (let i = 0; i < 5; i++) session.funcs.retro_run()

    const stateRestored = session.loadState(stateBuffer)
    assert(stateRestored === true, 'Save state restaurado com sucesso no core')

    // Teste de SRAM (Save RAM)
    const sramSize = Number(session.funcs.retro_get_memory_size(0))
    assert(sramSize === 8192, `Tamanho da SRAM reportado pelo core: ${sramSize} bytes`)

    const testPattern = Buffer.alloc(sramSize, 0xa5)
    const wroteSram = session.writeMemory(0, testPattern)
    assert(wroteSram === true, 'Escrita direta na SRAM concluída com sucesso')

    const memoryRead = session.getMemory(0)
    assert(memoryRead && memoryRead[0] === 0xa5 && memoryRead[sramSize - 1] === 0xa5, 'Leitura de SRAM confirma dados gravados em memória')

    // Salva em disco e encerra primeira sessão
    session.stop()
    assert(fs.existsSync(sramPath), `Arquivo SRAM salvo fisicamente no disco: ${path.basename(sramPath)}`)

    // Segunda sessão: recria o emulador e valida se os dados persistem do arquivo
    const secondSession = new LibretroSession(DEV_CORES_DIR, path.join(tempDir, 'data2'))
    secondSession.loadCore(nestopiaDll)
    const cloudSram = Buffer.alloc(sramSize, 0x3c)
    const originalRun = secondSession.funcs.retro_run
    secondSession.funcs.retro_run = (...args) => {
      originalRun(...args)
      secondSession.writeMemory(0, Buffer.alloc(sramSize))
    }
    secondSession.loadGame(nesRomPath, {
      saveRamPath: sramPath,
      initialSaveRam: cloudSram,
      initialSaveRamSource: 'cloud',
    })
    secondSession.start()
    const restoredMemory = secondSession.getMemory(0)
    assert(
      restoredMemory && restoredMemory[0] === 0x3c && restoredMemory[sramSize - 1] === 0x3c,
      'SRAM cloud foi aplicada depois que o primeiro frame inicializou a memória'
    )
    assert(secondSession.getSaveRamRestoreStatus().status === 'restored', 'Bridge confirmou a restauração integral da SRAM cloud')
    secondSession.stop()

    const resizedSession = new LibretroSession(DEV_CORES_DIR, path.join(tempDir, 'data3'))
    resizedSession.loadCore(nestopiaDll)
    const getResizedSaveRamSize = resizedSession.funcs.retro_get_memory_size
    let resizedSaveRamAvailable = false
    resizedSession.funcs.retro_get_memory_size = (typeId) =>
      Number(typeId) === 0 && !resizedSaveRamAvailable ? 0 : getResizedSaveRamSize(typeId)
    resizedSession.loadGame(nesRomPath, { initialSaveRam: Buffer.alloc(sramSize / 2, 0x6b) })
    resizedSaveRamAvailable = true
    resizedSession.start()
    const resizedMemory = resizedSession.getMemory(0)
    assert(
      resizedMemory && resizedMemory[0] === 0x6b && resizedMemory[sramSize / 2] === 0,
      'SRAM cloud de tamanho diferente foi copiada com padding seguro'
    )
    assert(resizedSession.getSaveRamRestoreStatus().status === 'restored-partial', 'Bridge reportou diferença de tamanho na SRAM')
    resizedSession.stop()

    // ---------------------------------------------------------------
    // 6. Testes Cruzados de Múltiplos Cores (Gambatte e mGBA)
    // ---------------------------------------------------------------
    console.log('\n\x1b[1m[6/6] Validação Cruzada com Outros Cores (Gambatte & mGBA)\x1b[0m')
    
    // Teste Gambatte (Game Boy)
    const gambatteDll = path.join(DEV_CORES_DIR, 'gambatte_libretro.dll')
    const gbSession = new LibretroSession(DEV_CORES_DIR, path.join(tempDir, 'data_gb'))
    gbSession.loadCore(gambatteDll)
    const gbRomPath = path.join(tempDir, 'game.gb')
    createMinimalGbRom(gbRomPath)
    const gbMeta = gbSession.loadGame(gbRomPath)
    assert(gbSession.isLoaded === true, `Gambatte (Game Boy) inicializou com sucesso (${gbMeta.geometry.base_width}x${gbMeta.geometry.base_height})`)
    for (let i = 0; i < 10; i++) gbSession.funcs.retro_run()
    gbSession.stop()

    // Teste mGBA (Game Boy Advance)
    const mgbaDll = path.join(DEV_CORES_DIR, 'mgba_libretro.dll')
    const gbaSession = new LibretroSession(DEV_CORES_DIR, path.join(tempDir, 'data_gba'))
    gbaSession.loadCore(mgbaDll)
    const gbaRomPath = path.join(tempDir, 'game.gba')
    createMinimalGbaRom(gbaRomPath)
    const gbaMeta = gbaSession.loadGame(gbaRomPath)
    assert(gbaSession.isLoaded === true, `mGBA (Game Boy Advance) inicializou com sucesso (${gbaMeta.geometry.base_width}x${gbaMeta.geometry.base_height})`)
    for (let i = 0; i < 10; i++) gbaSession.funcs.retro_run()
    gbaSession.stop()

  } finally {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true })
    } catch {}
  }

  console.log('\n\x1b[1m\x1b[36m========================================================\x1b[0m')
  console.log(`\x1b[1mRESULTADO FINAL:\x1b[0m ${passedTests}/${totalTests} testes passaram.`)
  if (failedTests > 0) {
    console.log(`\x1b[31m${failedTests} falha(s) detectada(s):\x1b[0m`)
    failures.forEach((f) => console.log(` - ${f}`))
    console.log('\x1b[1m\x1b[36m========================================================\x1b[0m\n')
    process.exit(1)
  } else {
    console.log('\x1b[32m\x1b[1mSUCESSO TOTAL! Todos os critérios de regressão foram validados.\x1b[0m')
    console.log('\x1b[1m\x1b[36m========================================================\x1b[0m\n')
    process.exit(0)
  }
}

runTestSuite().catch((err) => {
  console.error('\x1b[31mErro fatal na execução dos testes de regressão:\x1b[0m', err)
  process.exit(1)
})
