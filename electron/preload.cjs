const { contextBridge, ipcRenderer } = require('electron')

function subscribe(channel, callback) {
  const handler = (_event, payload) => callback(payload)
  ipcRenderer.on(channel, handler)
  return () => ipcRenderer.removeListener(channel, handler)
}

contextBridge.exposeInMainWorld('zereiNative', {
  isNativeApp: true,
  pickRomFolder: () => ipcRenderer.invoke('dialog:pickRomFolder'),
  pickRomFile: () => ipcRenderer.invoke('dialog:pickRomFile'),
  scanRomFolder: (folderPath) => ipcRenderer.invoke('rom:scanFolder', folderPath),
  readRomBuffer: (filePath) => ipcRenderer.invoke('rom:readBuffer', filePath),
  hashRomFile: (filePath) => ipcRenderer.invoke('rom:hashFile', filePath),
  launchEmulator: (options) => ipcRenderer.invoke('emulator:launch', options),
  setFpsLimit: (fps) => ipcRenderer.send('emulator:setFpsLimit', fps),
  sendInput: (buttonId, isPressed) => ipcRenderer.send('emulator:input', { buttonId, isPressed }),
  pauseEmulator: () => ipcRenderer.invoke('emulator:pause'),
  resetEmulator: () => ipcRenderer.invoke('emulator:reset'),
  closeEmulator: () => ipcRenderer.invoke('emulator:close'),
  saveState: () => ipcRenderer.invoke('emulator:saveState'),
  loadState: (state) => ipcRenderer.invoke('emulator:loadState', state),
  connectRetroAchievements: (credentials) => ipcRenderer.invoke('retroachievements:login', credentials),
  disconnectRetroAchievements: (username) => ipcRenderer.invoke('retroachievements:disconnect', username),
  readMemory: (typeId) => ipcRenderer.invoke('emulator:readMemory', typeId),
  writeSaveRam: (data) => ipcRenderer.invoke('emulator:writeMemory', { typeId: 0, data }),
  onFrame: (callback) => subscribe('emulator:frame', callback),
  onAudio: (callback) => subscribe('emulator:audio', callback),
  onEmulatorStateChange: (callback) => subscribe('emulator:stateChange', callback),
  onRetroAchievementsEvent: (callback) => subscribe('retroachievements:event', callback),
  windowMinimize: () => ipcRenderer.send('window:minimize'),
  windowMaximize: () => ipcRenderer.send('window:maximize'),
  windowClose: () => ipcRenderer.send('window:close'),
  getAppVersion: () => ipcRenderer.invoke('app:getVersion'),
  onUpdaterStatus: (callback) => subscribe('updater:status', callback),
  installUpdate: () => ipcRenderer.invoke('updater:install'),
  checkUpdate: () => ipcRenderer.invoke('updater:check'),
})