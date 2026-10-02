const path = require('path')
const koffi = require('koffi')

const RA_EVENT_LOGIN = 100
const RA_EVENT_GAME_LOADED = 101

const CONSOLE_IDS = new Map([
  ['snes', 3],
  ['super famicom', 3],
  ['super nintendo', 3],
  ['gba', 5],
  ['game boy advance', 5],
  ['gb', 4],
  ['game boy', 4],
  ['gbc', 6],
  ['game boy color', 6],
  ['nes', 7],
  ['nintendo (nes)', 7],
  ['famicom disk system', 81],
  ['mega drive', 1],
  ['mega drive / genesis', 1],
  ['genesis', 1],
  ['ps1', 12],
  ['playstation', 12],
  ['playstation / cd', 12],
  ['n64', 2],
  ['nintendo 64', 2],
  ['nds', 18],
  ['nintendo ds', 18],
])

function getConsoleId(consoleName) {
  return CONSOLE_IDS.get(String(consoleName || '').trim().toLowerCase()) || 0
}

class RetroAchievementsRuntime {
  constructor({ nativeLibraryPath, getCoreMemoryInfo, fetchImpl = globalThis.fetch }) {
    this.library = koffi.load(nativeLibraryPath || path.join(__dirname, '..', 'build', 'native', 'rcheevos.dll'))
    this.fetch = fetchImpl
    this.getCoreMemoryInfo = getCoreMemoryInfo
    this.client = null
    this.username = null
    this.onEvent = null
    this.pendingLogin = null

    this.CoreMemoryInfo = koffi.struct('ZereiRaCoreMemoryInfo', {
      data: 'void *',
      size: 'size_t',
    })

    const httpProto = koffi.proto('void RaHttpCallback(const char *url, const char *postData, const char *contentType, void *requestHandle)')
    const eventProto = koffi.proto('void RaEventCallback(int type, int result, uint32_t id, uint32_t points, const char *title, const char *description, const char *badgeUrl, const char *message, const char *username, const char *token)')
    const memoryProto = koffi.proto('void RaCoreMemoryCallback(uint32_t id, void *info, void *userdata)')

    this.httpCallback = koffi.register((url, postData, contentType, requestHandle) => {
      void this._sendRequest(url, postData, contentType, requestHandle)
    }, koffi.pointer(httpProto))

    this.eventCallback = koffi.register((type, result, id, points, title, description, badgeUrl, message, username, token) => {
      this._handleNativeEvent({
        type: Number(type),
        result: Number(result),
        id: Number(id),
        points: Number(points),
        title: title || '',
        description: description || '',
        badgeUrl: badgeUrl || '',
        message: message || '',
        username: username || '',
        token: token || '',
      })
    }, koffi.pointer(eventProto))

    this.coreMemoryCallback = koffi.register((id, infoPointer) => {
      let memoryInfo = { data: null, size: 0 }
      try {
        memoryInfo = this.getCoreMemoryInfo?.(Number(id)) || memoryInfo
      } catch {}
      koffi.encode(infoPointer, this.CoreMemoryInfo, memoryInfo)
    }, koffi.pointer(memoryProto))

    this.native = {
      create: this.library.func('void * zerei_ra_client_create(void *, void *, void *, void *)'),
      destroy: this.library.func('void zerei_ra_client_destroy(void *)'),
      loginWithPassword: this.library.func('int zerei_ra_login_with_password(void *, const char *, const char *)'),
      loginWithToken: this.library.func('int zerei_ra_login_with_token(void *, const char *, const char *)'),
      logout: this.library.func('void zerei_ra_logout(void *)'),
      setMemoryMap: this.library.func('int zerei_ra_set_memory_map(void *, void *, uint32_t)'),
      readMemory: this.library.func('uint32_t zerei_ra_read_memory(void *, uint32_t, void *, uint32_t)'),
      loadGame: this.library.func('int zerei_ra_load_game(void *, uint32_t, const char *)'),
      setHardcore: this.library.func('void zerei_ra_set_hardcore_enabled(void *, int)'),
      doFrame: this.library.func('void zerei_ra_do_frame(void *)'),
      idle: this.library.func('void zerei_ra_idle(void *)'),
      reset: this.library.func('void zerei_ra_reset(void *)'),
      progressSize: this.library.func('size_t zerei_ra_progress_size(void *)'),
      serializeProgress: this.library.func('int zerei_ra_serialize_progress(void *, void *, size_t)'),
      deserializeProgress: this.library.func('int zerei_ra_deserialize_progress(void *, const void *, size_t)'),
      unloadGame: this.library.func('void zerei_ra_unload_game(void *)'),
      completeRequest: this.library.func('void zerei_ra_complete_request(void *, int, const char *, size_t)'),
    }
  }

  createClient() {
    if (this.client) return this.client
    this.client = this.native.create(this.httpCallback, this.eventCallback, this.coreMemoryCallback, null)
    if (!this.client) throw new Error('Não foi possível iniciar o runtime do RetroAchievements.')
    this.native.setHardcore(this.client, 0)
    return this.client
  }

  loginWithPassword(username, password) {
    this.createClient()
    if (this.pendingLogin) throw new Error('Já existe uma autenticação do RetroAchievements em andamento.')
    this.username = null

    return new Promise((resolve, reject) => {
      this.pendingLogin = { resolve, reject }
      if (!this.native.loginWithPassword(this.client, username, password)) {
        this.pendingLogin = null
        reject(new Error('O runtime não conseguiu iniciar o login no RetroAchievements.'))
      }
    })
  }

  loginWithToken(username, token) {
    this.createClient()
    if (this.username === username) return Promise.resolve({ username })
    if (this.pendingLogin) throw new Error('Já existe uma autenticação do RetroAchievements em andamento.')
    this.username = null

    return new Promise((resolve, reject) => {
      this.pendingLogin = { resolve, reject }
      if (!this.native.loginWithToken(this.client, username, token)) {
        this.pendingLogin = null
        reject(new Error('O runtime não conseguiu iniciar a sessão do RetroAchievements.'))
      }
    })
  }

  setMemoryMap(memoryMap, consoleName) {
    if (!this.client) return false
    return Boolean(this.native.setMemoryMap(this.client, memoryMap || null, getConsoleId(consoleName)))
  }

  readMemory(address, length) {
    if (!this.client || !Number.isInteger(address) || !Number.isInteger(length) || length <= 0) return Buffer.alloc(0)
    const bytes = Buffer.alloc(length)
    const read = Number(this.native.readMemory(this.client, address, bytes, length))
    return bytes.subarray(0, read)
  }

  loadGame(consoleName, romPath) {
    if (!this.client || !this.username) return false
    return Boolean(this.native.loadGame(this.client, getConsoleId(consoleName), romPath))
  }

  doFrame() {
    if (this.client && this.username) this.native.doFrame(this.client)
  }

  idle() {
    if (this.client && this.username) this.native.idle(this.client)
  }

  reset() {
    if (this.client && this.username) this.native.reset(this.client)
  }

  serializeProgress() {
    if (!this.client || !this.username) return Buffer.alloc(0)
    const size = Number(this.native.progressSize(this.client))
    if (!size) return Buffer.alloc(0)
    const buffer = Buffer.alloc(size)
    return this.native.serializeProgress(this.client, buffer, size) === 0 ? buffer : Buffer.alloc(0)
  }

  deserializeProgress(buffer) {
    if (!this.client || !this.username || !buffer?.length) return false
    return this.native.deserializeProgress(this.client, buffer, buffer.length) === 0
  }

  unloadGame() {
    if (this.client) this.native.unloadGame(this.client)
  }

  logout() {
    if (!this.client) return
    this.native.logout(this.client)
    this.username = null
  }

  destroy() {
    if (this.pendingLogin) {
      this.pendingLogin.reject(new Error('A sessão do RetroAchievements foi encerrada.'))
      this.pendingLogin = null
    }
    if (this.client) {
      this.native.destroy(this.client)
      this.client = null
    }
    this.username = null
  }

  async _sendRequest(url, postData, contentType, requestHandle) {
    try {
      const headers = { 'User-Agent': 'ZEREI/1.0.0 (Windows) rcheevos/12.5' }
      if (postData && contentType) headers['Content-Type'] = contentType
      const response = await this.fetch(url, {
        method: postData ? 'POST' : 'GET',
        headers,
        body: postData || undefined,
      })
      const body = Buffer.from(await response.arrayBuffer())
      this.native.completeRequest(requestHandle, response.status, body, body.length)
    } catch {
      this.native.completeRequest(requestHandle, 0, null, 0)
    }
  }

  _handleNativeEvent(event) {
    if (event.type === RA_EVENT_LOGIN) {
      const pending = this.pendingLogin
      this.pendingLogin = null
      if (event.result === 0 && event.username && event.token) {
        this.username = event.username
        pending?.resolve({ username: event.username, displayName: event.title, points: event.id, token: event.token })
      } else {
        this.username = null
        pending?.reject(new Error(event.message || 'Falha na autenticação do RetroAchievements.'))
      }
      return
    }

    this.onEvent?.({
      ...event,
      source: 'retroachievements',
      gameId: event.type === RA_EVENT_GAME_LOADED ? event.id : undefined,
    })
  }
}

module.exports = { RetroAchievementsRuntime, getConsoleId }