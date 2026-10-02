const { app, BrowserWindow, ipcMain, dialog, safeStorage } = require('electron')
const { autoUpdater } = require('electron-updater')
const path = require('path')
const fs = require('fs')
const crypto = require('crypto')
const { LibretroSession, selectSaveRamForLaunch } = require('./libretroBridge.cjs')
const { RetroAchievementsRuntime } = require('./retroAchievementsRuntime.cjs')

let mainWindow = null
let libretroSession = null
let retroAchievementsRuntime = null
const SAVE_STATE_MAGIC = Buffer.from('ZRA1')

const EXTENSION_MAP = {
  '.sfc': 'Super Nintendo',
  '.smc': 'Super Nintendo',
  '.gba': 'Game Boy Advance',
  '.gb': 'Game Boy',
  '.gbc': 'Game Boy Color',
  '.nes': 'Nintendo (NES)',
  '.fds': 'Famicom Disk System',
  '.md': 'Mega Drive / Genesis',
  '.gen': 'Mega Drive / Genesis',
  '.smd': 'Mega Drive / Genesis',
  '.bin': 'PlayStation / CD',
  '.cue': 'PlayStation / CD',
  '.iso': 'PlayStation / CD',
  '.chd': 'PlayStation / CD',
  '.pbp': 'PlayStation / CD',
  '.z64': 'Nintendo 64',
  '.n64': 'Nintendo 64',
  '.v64': 'Nintendo 64',
  '.nds': 'Nintendo DS',
  '.pce': 'PC Engine',
  '.zip': 'Arcade / ROM Compactada',
  '.7z': 'Arcade / ROM Compactada',
}

function getBundledCoresDir() {
  const candidates = [
    path.join(__dirname, '..', 'desktop', 'ZereiDesktop.App', 'cores'),
    path.join(process.resourcesPath || '', 'cores'),
    path.join(__dirname, 'cores'),
  ]
  for (const c of candidates) {
    if (fs.existsSync(c)) return c
  }
  return candidates[0]
}

function hashRomFile(filePath) {
  return new Promise((resolve, reject) => {
    const digest = crypto.createHash('sha256')
    const stream = fs.createReadStream(filePath)
    stream.on('data', (chunk) => digest.update(chunk))
    stream.on('error', reject)
    stream.on('end', () => resolve(digest.digest('hex')))
  })
}

function safeFileSegment(value) {
  return String(value || 'local').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 100)
}

function getRetroAchievementsCredentialPath(username) {
  const usernameHash = crypto.createHash('sha256').update(String(username).normalize('NFKC').toLowerCase()).digest('hex')
  return path.join(app.getPath('userData'), 'retroachievements', `${usernameHash}.token`)
}

function loadRetroAchievementsToken(username) {
  if (!username || !safeStorage.isEncryptionAvailable()) return null
  try {
    return safeStorage.decryptString(fs.readFileSync(getRetroAchievementsCredentialPath(username)))
  } catch {
    return null
  }
}

function storeRetroAchievementsToken(username, token) {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('O Windows não disponibilizou armazenamento protegido para a sessão do RetroAchievements.')
  }
  const tokenPath = getRetroAchievementsCredentialPath(username)
  fs.mkdirSync(path.dirname(tokenPath), { recursive: true })
  fs.writeFileSync(tokenPath, safeStorage.encryptString(token))
}

function encodeSaveState(coreState, retroAchievementsState) {
  const coreBytes = Buffer.from(coreState)
  const raBytes = Buffer.from(retroAchievementsState || [])
  const header = Buffer.alloc(12)
  SAVE_STATE_MAGIC.copy(header, 0)
  header.writeUInt32LE(coreBytes.length, 4)
  header.writeUInt32LE(raBytes.length, 8)
  return Buffer.concat([header, coreBytes, raBytes])
}

function decodeSaveState(stateData) {
  const bytes = Buffer.from(stateData)
  if (bytes.length < 12 || !bytes.subarray(0, 4).equals(SAVE_STATE_MAGIC)) {
    return { coreState: bytes, retroAchievementsState: null }
  }

  const coreLength = bytes.readUInt32LE(4)
  const raLength = bytes.readUInt32LE(8)
  if (12 + coreLength + raLength !== bytes.length) {
    throw new Error('O save state possui dados de runtime RA inválidos.')
  }

  return {
    coreState: bytes.subarray(12, 12 + coreLength),
    retroAchievementsState: bytes.subarray(12 + coreLength),
  }
}

function getRetroAchievementsRuntime() {
  if (retroAchievementsRuntime) return retroAchievementsRuntime

  const nativeLibraryPath = app.isPackaged
    ? path.join(process.resourcesPath, 'native', 'rcheevos.dll')
    : path.join(__dirname, '..', 'build', 'native', 'rcheevos.dll')
  retroAchievementsRuntime = new RetroAchievementsRuntime({
    nativeLibraryPath,
    getCoreMemoryInfo: (typeId) => libretroSession?.getCoreMemoryInfo(typeId) || { data: null, size: 0 },
  })
  retroAchievementsRuntime.onEvent = (event) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('retroachievements:event', event)
    }
  }
  return retroAchievementsRuntime
}

function createWindow() {
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

  mainWindow = new BrowserWindow({
    width: 1360,
    height: 780,
    minWidth: 1050,
    minHeight: 650,
    title: 'ZEREI! [Libretro Nativo Canvas]',
    frame: true,
    autoHideMenuBar: true,
    backgroundColor: '#070d17',
    icon: path.join(__dirname, '..', 'public', 'favicon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
      backgroundThrottling: false,
    },
    show: false,
  })

  if (isDev && process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    const distPath = path.join(__dirname, '..', 'dist', 'index.html')
    if (fs.existsSync(distPath)) {
      mainWindow.loadFile(distPath)
    } else {
      mainWindow.loadURL('http://localhost:5173')
    }
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
    if (app.isPackaged) {
      setTimeout(() => {
        autoUpdater.checkForUpdates().catch((err) => {
          console.warn('[AutoUpdater Check Failed]', err?.message || err)
        })
      }, 5000)
    }
  })

  mainWindow.on('closed', () => {
    if (libretroSession) {
      libretroSession.stop()
      libretroSession = null
    }
    mainWindow = null
  })
}

function setupAutoUpdater() {
  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('checking-for-update', () => {
    mainWindow?.webContents.send('updater:status', { status: 'checking' })
  })

  autoUpdater.on('update-available', (info) => {
    mainWindow?.webContents.send('updater:status', {
      status: 'available',
      version: info.version,
      releaseNotes: info.releaseNotes,
    })
  })

  autoUpdater.on('update-not-available', () => {
    mainWindow?.webContents.send('updater:status', { status: 'not-available' })
  })

  autoUpdater.on('download-progress', (progress) => {
    mainWindow?.webContents.send('updater:status', {
      status: 'downloading',
      percent: Math.round(progress.percent || 0),
      transferred: progress.transferred,
      total: progress.total,
    })
  })

  autoUpdater.on('update-downloaded', (info) => {
    mainWindow?.webContents.send('updater:status', {
      status: 'downloaded',
      version: info.version,
      releaseNotes: info.releaseNotes,
    })
  })

  autoUpdater.on('error', (err) => {
    console.error('[AutoUpdater Error]', err)
    mainWindow?.webContents.send('updater:status', {
      status: 'error',
      message: err?.message || String(err),
    })
  })
}

app.whenReady().then(() => {
  setupAutoUpdater()
  setupIpcHandlers()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

function setupIpcHandlers() {
  const coresDir = getBundledCoresDir()

  ipcMain.handle('retroachievements:login', async (_event, { username, password } = {}) => {
    const cleanUsername = String(username || '').trim()
    if (!cleanUsername || !password) throw new Error('Informe usuário e senha do RetroAchievements.')

    const account = await getRetroAchievementsRuntime().loginWithPassword(cleanUsername, String(password))
    storeRetroAchievementsToken(account.username, account.token)
    return {
      username: account.username,
      displayName: account.displayName || account.username,
      points: Number(account.points || 0),
      rank: 'Conta autenticada',
    }
  })

  ipcMain.handle('retroachievements:disconnect', async (_event, username) => {
    const cleanUsername = String(username || '').trim()
    if (!cleanUsername) return false
    try {
      fs.rmSync(getRetroAchievementsCredentialPath(cleanUsername), { force: true })
    } catch {}
    if (retroAchievementsRuntime?.username?.toLowerCase() === cleanUsername.toLowerCase()) {
      retroAchievementsRuntime.logout()
    }
    return true
  })

  ipcMain.handle('dialog:pickRomFolder', async () => {
    if (!mainWindow) return null
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Selecione a Pasta de ROMs',
      properties: ['openDirectory'],
    })
    if (!result.canceled && result.filePaths.length > 0) {
      return result.filePaths[0]
    }
    return null
  })

  ipcMain.handle('dialog:pickRomFile', async () => {
    if (!mainWindow) return null
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Selecione sua ROM local',
      properties: ['openFile'],
      filters: [{ name: 'ROMs compatíveis', extensions: Object.keys(EXTENSION_MAP).map((extension) => extension.slice(1)) }],
    })
    if (result.canceled || result.filePaths.length === 0) return null

    const filePath = result.filePaths[0]
    const stats = fs.statSync(filePath)
    return {
      fileName: path.basename(filePath),
      filePath,
      fileSize: stats.size,
      detectedConsole: EXTENSION_MAP[path.extname(filePath).toLowerCase()],
    }
  })

  ipcMain.handle('rom:scanFolder', async (_event, folderPath) => {
    if (!folderPath || !fs.existsSync(folderPath)) return []

    const romList = []
    const scanDir = (dir) => {
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true })
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name)
          if (entry.isDirectory()) {
            scanDir(fullPath)
          } else if (entry.isFile()) {
            const ext = path.extname(entry.name).toLowerCase()
            if (EXTENSION_MAP[ext]) {
              const stats = fs.statSync(fullPath)
              romList.push({
                fileName: entry.name,
                filePath: fullPath,
                fileSize: stats.size,
                detectedConsole: EXTENSION_MAP[ext],
              })
            }
          }
        }
      } catch (err) {
        console.error('Erro ao ler diretório:', dir, err)
      }
    }

    scanDir(folderPath)
    return romList
  })

  ipcMain.handle('rom:readBuffer', async (_event, filePath) => {
    if (typeof filePath !== 'string' || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
      throw new Error('Arquivo de ROM local indisponível.')
    }
    return fs.readFileSync(filePath)
  })

  ipcMain.handle('rom:hashFile', async (_event, filePath) => {
    if (typeof filePath !== 'string' || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
      throw new Error('Arquivo de ROM local indisponível para verificação.')
    }
    return hashRomFile(filePath)
  })

  ipcMain.handle('emulator:getStatus', async () => {
    return {
      ready: fs.existsSync(coresDir),
      path: coresDir,
      isEmbeddedCore: true,
    }
  })

  ipcMain.handle('emulator:launch', async (_event, params) => {
    const {
      romPath,
      consoleName,
      fpsLimit,
      romHash,
      userId,
      saveScope,
      initialSaveRam,
      initialSaveRamSavedAt,
      initialSaveRamSource,
      retroAchievementsUsername,
    } = params || {}
    if (!romPath || !fs.existsSync(romPath)) {
      throw new Error('Arquivo de ROM não encontrado: ' + romPath)
    }
    const actualRomHash = await hashRomFile(romPath)
    if (romHash && romHash !== actualRomHash) {
      throw new Error('A ROM foi alterada desde a verificação. Selecione o arquivo novamente.')
    }

    if (libretroSession) {
      libretroSession.stop()
      libretroSession = null
    }

    let raRuntime = null
    let raAuthenticated = false
    const raUsername = String(retroAchievementsUsername || '').trim()
    if (raUsername) {
      const token = loadRetroAchievementsToken(raUsername)
      if (token) {
        try {
          raRuntime = getRetroAchievementsRuntime()
          await raRuntime.loginWithToken(raUsername, token)
          raAuthenticated = true
        } catch (error) {
          mainWindow?.webContents.send('retroachievements:event', {
            type: 'login-required',
            message: error.message || 'Faça login no RetroAchievements neste dispositivo.',
          })
        }
      } else {
        mainWindow?.webContents.send('retroachievements:event', {
          type: 'login-required',
          username: raUsername,
          message: 'Autentique sua conta do RetroAchievements neste dispositivo para validar conquistas oficiais.',
        })
      }
    } else if (retroAchievementsRuntime?.username) {
      retroAchievementsRuntime.logout()
    }

    libretroSession = new LibretroSession(coresDir, app.getPath('userData'))
    const resolvedConsoleName = consoleName || EXTENSION_MAP[path.extname(romPath).toLowerCase()] || ''
    libretroSession.setRetroAchievementsRuntime(raAuthenticated ? raRuntime : null, resolvedConsoleName)
    const coreDllPath = libretroSession.resolveCoreDll(consoleName, romPath)

    if (!fs.existsSync(coreDllPath)) {
      throw new Error('Núcleo de emulação para ' + consoleName + ' não foi encontrado em: ' + coreDllPath)
    }

    libretroSession.loadCore(coreDllPath)
    if (Number.isFinite(Number(fpsLimit))) {
      libretroSession.setFpsLimit(Number(fpsLimit))
    }

    libretroSession.onFrameCallback = (frame) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('emulator:frame', {
          buffer: frame.rgbaBuffer,
          width: frame.width,
          height: frame.height,
          pixelFormat: frame.pixelFormat,
          fps: libretroSession.measuredFps,
        })
      }
    }

    libretroSession.onAudioCallback = (samples) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('emulator:audio', samples)
      }
    }

    const saveDirectory = path.join(app.getPath('userData'), 'saves')
    const legacySaveRamPath = path.join(saveDirectory, `${safeFileSegment(userId)}-${actualRomHash}.srm`)
    const saveScopeHash = crypto.createHash('sha256').update(String(saveScope || 'default')).digest('hex').slice(0, 16)
    const saveRamPath = path.join(
      saveDirectory,
      `${safeFileSegment(userId)}-${saveScopeHash}-${actualRomHash}.srm`
    )

    const selectedSaveRam = selectSaveRamForLaunch({
      initialSaveRam,
      savedAt: initialSaveRamSavedAt,
      source: initialSaveRamSource,
      localSavePaths: [
        { path: saveRamPath, source: 'room-local' },
        { path: legacySaveRamPath, source: 'legacy-local' },
      ],
    })

    const gameMeta = libretroSession.loadGame(romPath, {
      saveRamPath,
      initialSaveRam: selectedSaveRam.data,
      initialSaveRamSource: selectedSaveRam.source,
    })
    if (raAuthenticated && raRuntime) {
      const memoryReady = raRuntime.setMemoryMap(libretroSession.memoryMapPointer, resolvedConsoleName)
      if (!memoryReady) {
        mainWindow?.webContents.send('retroachievements:event', {
          type: 'game-load-error',
          message: 'O core não expôs um mapa de memória compatível com o RetroAchievements.',
        })
      } else if (!raRuntime.loadGame(resolvedConsoleName, romPath)) {
        mainWindow?.webContents.send('retroachievements:event', {
          type: 'game-load-error',
          message: 'Não foi possível iniciar a sessão oficial deste jogo no RetroAchievements.',
        })
      }
    }
    libretroSession.start()

    const gameTitle = path.basename(romPath, path.extname(romPath))
    const coreName = path.basename(coreDllPath, '_libretro.dll')

    mainWindow?.webContents.send('emulator:stateChange', {
      running: true,
      paused: false,
      core: coreName,
      gameTitle,
      fps: 0,
      aspectRatio: gameMeta.geometry?.aspect_ratio || 1.333,
      baseWidth: gameMeta.geometry?.base_width || 320,
      baseHeight: gameMeta.geometry?.base_height || 240,
    })

    return {
      success: true,
      core: coreName,
      geometry: gameMeta.geometry,
      timing: gameMeta.timing,
      saveRamRestoreStatus: libretroSession.getSaveRamRestoreStatus(),
    }
  })

  ipcMain.on('emulator:setFpsLimit', (_event, fpsLimit) => {
    if (libretroSession) {
      libretroSession.setFpsLimit(fpsLimit)
    }
  })

  ipcMain.on('emulator:input', (_event, { buttonId, isPressed }) => {
    if (libretroSession) {
      libretroSession.setButtonState(buttonId, isPressed)
    }
  })

  ipcMain.handle('emulator:pause', async () => {
    if (libretroSession) {
      const isPaused = libretroSession.pause()
      mainWindow?.webContents.send('emulator:stateChange', {
        running: true,
        paused: isPaused,
        core: path.basename(libretroSession.corePath || '', '_libretro.dll'),
      })
      return { isPaused }
    }
    return { isPaused: false }
  })

  ipcMain.handle('emulator:reset', async () => {
    if (libretroSession) {
      libretroSession.reset()
      mainWindow?.webContents.send('emulator:stateChange', { running: true, paused: false })
      return true
    }
    return false
  })

  ipcMain.handle('emulator:close', async () => {
    if (libretroSession) {
      libretroSession.stop()
      libretroSession = null
    }
    mainWindow?.webContents.send('emulator:stateChange', {
      running: false,
    })
    return true
  })

  ipcMain.handle('emulator:saveState', async () => {
    if (libretroSession) {
      const coreState = libretroSession.saveState()
      if (!coreState) return null
      return encodeSaveState(coreState, retroAchievementsRuntime?.serializeProgress())
    }
    return null
  })

  ipcMain.handle('emulator:loadState', async (_event, stateData) => {
    if (libretroSession && stateData) {
      const saved = decodeSaveState(stateData)
      const loaded = libretroSession.loadState(saved.coreState)
      if (!loaded) return false
      if (saved.retroAchievementsState?.length) {
        if (!retroAchievementsRuntime?.deserializeProgress(saved.retroAchievementsState)) {
          mainWindow?.webContents.send('retroachievements:event', {
            type: 'progress-restore-warning',
            message: 'O jogo foi restaurado, mas o progresso interno de conquistas RA não pôde ser restaurado.',
          })
        }
      }
      else retroAchievementsRuntime?.reset()
      return true
    }
    return false
  })

  ipcMain.handle('emulator:readMemory', async (_event, typeId) => {
    if (libretroSession) {
      return libretroSession.getMemory(typeId || 2)
    }
    return null
  })

  ipcMain.handle('emulator:writeMemory', async (_event, { typeId, data } = {}) => {
    if (!libretroSession || Number(typeId) !== 0) return false
    return libretroSession.writeMemory(0, data)
  })

  ipcMain.on('window:minimize', () => mainWindow?.minimize())
  ipcMain.on('window:maximize', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize()
    } else {
      mainWindow?.maximize()
    }
  })
  ipcMain.on('window:close', () => mainWindow?.close())

  ipcMain.handle('app:getVersion', () => app.getVersion())

  ipcMain.handle('updater:check', async () => {
    if (!app.isPackaged) {
      return { status: 'dev-mode', message: 'Atualizações automáticas só ocorrem no aplicativo empacotado.' }
    }
    return autoUpdater.checkForUpdates()
  })

  ipcMain.handle('updater:install', () => {
    autoUpdater.quitAndInstall()
  })
}

