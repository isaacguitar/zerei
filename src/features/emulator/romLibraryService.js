// Serviço de gerenciamento de ROMs do jogador
// Salva as pastas selecionadas, o índice dos arquivos e fornece busca e auto-match

const STORAGE_KEY_FOLDERS = 'zerei:rom_folders'
const STORAGE_KEY_INDEX = 'zerei:rom_index'
const STORAGE_KEY_ASSIGNMENTS = 'zerei:game_rom_assignments'

export function isNativeEnvironment() {
  return Boolean(typeof window !== 'undefined' && window.zereiNative?.pickRomFolder)
}

export function getConfiguredRomFolders() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_FOLDERS)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function saveConfiguredRomFolders(folders) {
  try {
    localStorage.setItem(STORAGE_KEY_FOLDERS, JSON.stringify(folders))
  } catch {}
}

export async function autoDetectCommonRomFolders() {
  if (!isNativeEnvironment()) return []
  const existing = getConfiguredRomFolders()
  if (existing.length > 0) return existing

  const candidates = [
    'D:\\Retro Games\\Retrobat\\roms',
    'C:\\Retrobat\\roms',
    'D:\\Retrobat\\roms',
  ]
  for (const dir of candidates) {
    try {
      const roms = await window.zereiNative.scanRomFolder(dir)
      if (roms && roms.length > 0) {
        saveConfiguredRomFolders([dir])
        saveRomIndex(roms)
        return [dir]
      }
    } catch {}
  }
  return []
}

export function getRomIndex() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_INDEX)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function saveRomIndex(index) {
  try {
    localStorage.setItem(STORAGE_KEY_INDEX, JSON.stringify(index))
    window.dispatchEvent(new CustomEvent('zerei:rom_index_updated', { detail: index }))
  } catch {}
}

export function getAssignedRom(gameId) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ASSIGNMENTS)
    const map = raw ? JSON.parse(raw) : {}
    return map[gameId] || null
  } catch {
    return null
  }
}

export function assignRomToGame(gameId, rom) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ASSIGNMENTS)
    const map = raw ? JSON.parse(raw) : {}
    map[gameId] = rom
    localStorage.setItem(STORAGE_KEY_ASSIGNMENTS, JSON.stringify(map))
    window.dispatchEvent(new CustomEvent('zerei:game_rom_assigned', { detail: { gameId, rom } }))
  } catch {}
}

export function unassignRomFromGame(gameId) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ASSIGNMENTS)
    const map = raw ? JSON.parse(raw) : {}
    delete map[gameId]
    localStorage.setItem(STORAGE_KEY_ASSIGNMENTS, JSON.stringify(map))
    window.dispatchEvent(new CustomEvent('zerei:game_rom_assigned', { detail: { gameId, rom: null } }))
  } catch {}
}

// Escaneia todas as pastas configuradas e atualiza o índice
export async function scanAllConfiguredFolders(onProgress) {
  if (!isNativeEnvironment()) return []
  const folders = getConfiguredRomFolders()
  if (!folders.length) return []

  const allRoms = []
  const seenPaths = new Set()

  for (let i = 0; i < folders.length; i++) {
    const folder = folders[i]
    onProgress?.({ current: i + 1, total: folders.length, folder })
    try {
      const roms = await window.zereiNative.scanRomFolder(folder)
      for (const rom of roms) {
        if (!seenPaths.has(rom.filePath)) {
          seenPaths.add(rom.filePath)
          allRoms.push(rom)
        }
      }
    } catch (err) {
      console.warn(`Falha ao escanear pasta ${folder}:`, err)
    }
  }

  saveRomIndex(allRoms)
  return allRoms
}

// Adiciona uma nova pasta e escaneia
export async function addRomFolderAndScan() {
  if (!isNativeEnvironment()) return null
  const folderPath = await window.zereiNative.pickRomFolder()
  if (!folderPath) return null

  const existing = getConfiguredRomFolders()
  if (!existing.includes(folderPath)) {
    const updated = [...existing, folderPath]
    saveConfiguredRomFolders(updated)
  }

  return scanAllConfiguredFolders()
}

// Adiciona um arquivo avulso diretamente
export async function pickSingleRomFile() {
  if (!isNativeEnvironment()) return null
  const rom = await window.zereiNative.pickRomFile()
  if (!rom) return null

  const index = getRomIndex()
  const exists = index.some((item) => item.filePath === rom.filePath)
  if (!exists) {
    const updated = [rom, ...index]
    saveRomIndex(updated)
  }
  return rom
}

// Normaliza strings para busca comparativa tolerante
function cleanForMatching(str) {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
}

// Encontra a melhor ROM correspondente para um jogo da sala
export function findBestRomMatch(gameTitle, gameConsole, romList = null) {
  const list = romList || getRomIndex()
  if (!list.length || !gameTitle) return null

  const cleanTitle = cleanForMatching(gameTitle)
  if (cleanTitle.length < 3) return null

  const cleanConsole = cleanForMatching(gameConsole)

  let bestMatch = null
  let bestScore = 0

  for (const rom of list) {
    const cleanFileName = cleanForMatching(rom.fileName)
    let score = 0

    // Match exato do nome limpo
    if (cleanFileName === cleanTitle) {
      score += 100
    } else if (cleanFileName.startsWith(cleanTitle)) {
      score += 70
    } else if (cleanFileName.includes(cleanTitle)) {
      score += 50
    }

    // Bônus se o console bater
    if (cleanConsole && rom.detectedConsole) {
      const cleanDetected = cleanForMatching(rom.detectedConsole)
      if (cleanDetected === cleanConsole || cleanConsole.includes(cleanDetected) || cleanDetected.includes(cleanConsole)) {
        score += 30
      }
    }

    if (score > bestScore && score >= 50) {
      bestScore = score
      bestMatch = rom
    }
  }

  return bestMatch
}

// Converte a ROM nativa em um objeto File/Blob
export async function getRomFileObject(rom) {
  if (!rom) return null

  // Se já for um arquivo Web File (modo browser)
  if (rom instanceof File || rom instanceof Blob) return rom

  // Se for uma ROM com filePath no aplicativo nativo
  if (rom.filePath && isNativeEnvironment()) {
    const buffer = await window.zereiNative.readRomBuffer(rom.filePath)
    const blob = new Blob([buffer])
    // Cria um objeto File com o nome original
    return new File([blob], rom.fileName, { type: 'application/octet-stream' })
  }

  return null
}

