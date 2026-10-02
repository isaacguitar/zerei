import { collection, doc, getDoc, getDocs, query, setDoc, where } from 'firebase/firestore'
import { firestore } from '../../firebaseClient'
import { getCurrentUser } from '../auth/authService'
import { fetchUserRetroAchievementsShelf } from '../retro-achievements/retroAchievementsService'

const SHELF_STORAGE_KEY_PREFIX = 'zerei_shelf_'

/**
 * Catálogo de referência rápida de clássicos retrô para adicionar ao Top 10 ou Favoritos
 */
export const POPULAR_RETRO_GAMES = [
  {
    id: 'super-mario-world',
    title: 'Super Mario World',
    console: 'SNES',
    coverUrl: 'https://media.retroachievements.org/Images/000100.png',
    iconUrl: 'https://media.retroachievements.org/Images/034567.png',
    releaseYear: 1990,
  },
  {
    id: 'sonic-the-hedgehog-2',
    title: 'Sonic the Hedgehog 2',
    console: 'Mega Drive',
    coverUrl: 'https://media.retroachievements.org/Images/000001.png',
    iconUrl: 'https://media.retroachievements.org/Images/011200.png',
    releaseYear: 1992,
  },
  {
    id: 'chrono-trigger',
    title: 'Chrono Trigger',
    console: 'SNES',
    coverUrl: 'https://media.retroachievements.org/Images/000101.png',
    iconUrl: 'https://media.retroachievements.org/Images/034568.png',
    releaseYear: 1995,
  },
  {
    id: 'pokemon-firered-version',
    title: 'Pokémon FireRed Version',
    console: 'GBA',
    coverUrl: 'https://media.retroachievements.org/Images/000021.png',
    iconUrl: 'https://media.retroachievements.org/Images/105044.png',
    releaseYear: 2004,
  },
  {
    id: 'the-legend-of-zelda-the-minish-cap',
    title: 'The Legend of Zelda: The Minish Cap',
    console: 'GBA',
    coverUrl: 'https://media.retroachievements.org/Images/000156.png',
    iconUrl: 'https://media.retroachievements.org/Images/113471.png',
    releaseYear: 2004,
  },
  {
    id: 'pokemon-emerald',
    title: 'Pokémon Emerald Version',
    console: 'GBA',
    coverUrl: 'https://media.retroachievements.org/Images/000023.png',
    iconUrl: 'https://media.retroachievements.org/Images/105042.png',
    releaseYear: 2004,
  },
  {
    id: 'super-metroid',
    title: 'Super Metroid',
    console: 'SNES',
    coverUrl: 'https://media.retroachievements.org/Images/034571.png',
    iconUrl: 'https://media.retroachievements.org/Images/034571.png',
    releaseYear: 1994,
  },
  {
    id: 'donkey-kong-country-2',
    title: "Donkey Kong Country 2: Diddy's Kong Quest",
    console: 'SNES',
    coverUrl: 'https://media.retroachievements.org/Images/034570.png',
    iconUrl: 'https://media.retroachievements.org/Images/034570.png',
    releaseYear: 1995,
  },
  {
    id: 'mega-man-x',
    title: 'Mega Man X',
    console: 'SNES',
    coverUrl: 'https://media.retroachievements.org/Images/034572.png',
    iconUrl: 'https://media.retroachievements.org/Images/034572.png',
    releaseYear: 1993,
  },
  {
    id: 'castlevania-aria-of-sorrow',
    title: 'Castlevania: Aria of Sorrow',
    console: 'GBA',
    coverUrl: 'https://media.retroachievements.org/Images/021202.png',
    iconUrl: 'https://media.retroachievements.org/Images/021202.png',
    releaseYear: 2003,
  },
  {
    id: 'street-fighter-ii-turbo',
    title: 'Street Fighter II Turbo',
    console: 'SNES',
    coverUrl: 'https://media.retroachievements.org/Images/034575.png',
    iconUrl: 'https://media.retroachievements.org/Images/034575.png',
    releaseYear: 1993,
  },
  {
    id: 'the-legend-of-zelda-a-link-to-the-past',
    title: 'The Legend of Zelda: A Link to the Past',
    console: 'SNES',
    coverUrl: 'https://media.retroachievements.org/Images/034573.png',
    iconUrl: 'https://media.retroachievements.org/Images/034573.png',
    releaseYear: 1991,
  },
]

function getLocalData(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function setLocalData(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val))
  } catch {}
}

/**
 * Retorna o formato limpo e real da estante (sem dados fictícios / mockups)
 */
export function getDefaultShelfData() {
  return {
    beatenGames: [],
    inProgressGames: [],
    playedGames: [],
    top10: [],
    favorites: [],
    dedications: {},
  }
}

const LEGACY_MOCK_GAME_IDS = new Set([
  'super-mario-world',
  'sonic-the-hedgehog-2',
  'chrono-trigger',
  'pokemon-firered-version',
])

function isMockGame(game) {
  if (!game) return false
  const idStr = String(game.id || '').toLowerCase()
  return LEGACY_MOCK_GAME_IDS.has(idStr)
}

/**
 * Retorna os dados da estante do usuário:
 * { beatenGames: [], inProgressGames: [], playedGames: [], top10: [], favorites: [], dedications: {} }
 */
export async function getUserShelfData(userId, raUsername = null) {
  if (!userId) return getDefaultShelfData()

  let shelf = getDefaultShelfData()
  let realUid = userId

  // 1. Tentar ler do Firestore
  if (firestore) {
    try {
      let snap = await getDoc(doc(firestore, 'shelves', userId))
      
      // Se não encontrou pelo ID direto, pode ser que userId seja o displayName (ex: 'Ferdinando')
      if (!snap.exists()) {
        const usersQuery = query(collection(firestore, 'users'), where('displayName', '==', userId))
        const userMatches = await getDocs(usersQuery)
        if (!userMatches.empty) {
          realUid = userMatches.docs[0].id
          snap = await getDoc(doc(firestore, 'shelves', realUid))
        }
      }

      if (snap && snap.exists()) {
        const data = snap.data()
        shelf = {
          beatenGames: Array.isArray(data.beatenGames) ? data.beatenGames : [],
          inProgressGames: Array.isArray(data.inProgressGames) ? data.inProgressGames : [],
          playedGames: Array.isArray(data.playedGames) ? data.playedGames : [],
          top10: Array.isArray(data.top10) ? data.top10 : [],
          favorites: Array.isArray(data.favorites) ? data.favorites : [],
          dedications: data.dedications || {},
        }
      }
    } catch (err) {
      console.warn('Erro ao ler estante do Firestore, buscando fallback local:', err)
    }
  }

  // 2. Mesclar com LocalStorage se presente (tenta pelo userId e pelo realUid)
  const local = getLocalData(`${SHELF_STORAGE_KEY_PREFIX}${userId}`, null) || (realUid !== userId ? getLocalData(`${SHELF_STORAGE_KEY_PREFIX}${realUid}`, null) : null)
  if (local) {
    shelf = {
      beatenGames: shelf.beatenGames.length > 0 ? shelf.beatenGames : (Array.isArray(local.beatenGames) ? local.beatenGames : []),
      inProgressGames: shelf.inProgressGames.length > 0 ? shelf.inProgressGames : (Array.isArray(local.inProgressGames) ? local.inProgressGames : []),
      playedGames: shelf.playedGames.length > 0 ? shelf.playedGames : (Array.isArray(local.playedGames) ? local.playedGames : []),
      top10: shelf.top10.length > 0 ? shelf.top10 : (Array.isArray(local.top10) ? local.top10 : []),
      favorites: shelf.favorites.length > 0 ? shelf.favorites : (Array.isArray(local.favorites) ? local.favorites : []),
      dedications: { ...(local.dedications || {}), ...(shelf.dedications || {}) },
    }
  }

  // 3. Limpeza automática de jogos fictícios (mockups antigos não jogados pelo usuário)
  const hadMocks =
    shelf.beatenGames.some(isMockGame) ||
    shelf.inProgressGames.some(isMockGame) ||
    shelf.playedGames.some(isMockGame)

  if (hadMocks) {
    shelf.beatenGames = shelf.beatenGames.filter((g) => !isMockGame(g))
    shelf.inProgressGames = shelf.inProgressGames.filter((g) => !isMockGame(g))
    shelf.playedGames = shelf.playedGames.filter((g) => !isMockGame(g))
    // Salva imediatamente para persistir a exclusão no Firestore e localStorage
    saveUserShelfData(userId, shelf).catch(() => {})
  }

  // 4. Se o usuário tiver conta do RetroAchievements conectada e as listas estiverem vazias ou precisarem de sync
  if (raUsername && shelf.beatenGames.length === 0 && shelf.inProgressGames.length === 0) {
    try {
      const raGames = await fetchUserRetroAchievementsShelf(raUsername)
      if (raGames.beatenGames.length > 0 || raGames.inProgressGames.length > 0) {
        // Enriquecer com dedicatórias existentes
        const enrichedBeaten = raGames.beatenGames.map((g) => ({
          ...g,
          dedication: shelf.dedications[g.id] || g.dedication || '',
        }))
        shelf.beatenGames = enrichedBeaten
        shelf.inProgressGames = raGames.inProgressGames
        shelf.playedGames = [...shelf.beatenGames, ...shelf.inProgressGames]

        // Salva para persistir
        setLocalData(`${SHELF_STORAGE_KEY_PREFIX}${userId}`, shelf)
      }
    } catch (err) {
      console.warn('Erro ao puxar dados da estante do RA:', err)
    }
  }

  // Aplicar dedicatórias salvas em cada jogo de beatenGames
  shelf.beatenGames = shelf.beatenGames.map((g) => ({
    ...g,
    dedication: shelf.dedications[g.id] || g.dedication || '',
  }))

  return shelf
}

/**
 * Salva a estante completa do usuário
 */
export async function saveUserShelfData(userId, shelfData) {
  if (!userId) return

  const current = getCurrentUser()
  setLocalData(`${SHELF_STORAGE_KEY_PREFIX}${userId}`, shelfData)
  if (current?.displayName && current.displayName !== userId) {
    setLocalData(`${SHELF_STORAGE_KEY_PREFIX}${current.displayName}`, shelfData)
  }

  window.dispatchEvent(new CustomEvent('zerei:shelf_updated', { detail: { userId, shelfData } }))

  if (firestore) {
    try {
      await setDoc(doc(firestore, 'shelves', userId), shelfData, { merge: true })
      // Se tiver displayName, salva também pelo displayName para visualização pública garantida
      if (current?.displayName && current.displayName !== userId) {
        await setDoc(doc(firestore, 'shelves', current.displayName), shelfData, { merge: true }).catch(() => {})
      }
    } catch (err) {
      console.warn('Erro ao sincronizar estante no Firestore:', err)
    }
  }
}

/**
 * Remove um jogo específico da estante do usuário (zerados, em andamento, top 10, favoritos)
 */
export async function removeGameFromShelf(userId, gameId) {
  if (!userId || !gameId) return getDefaultShelfData()

  const shelf = await getUserShelfData(userId)
  const idStr = String(gameId)

  const updatedShelf = {
    ...shelf,
    beatenGames: (shelf.beatenGames || []).filter((g) => String(g.id) !== idStr),
    inProgressGames: (shelf.inProgressGames || []).filter((g) => String(g.id) !== idStr),
    playedGames: (shelf.playedGames || []).filter((g) => String(g.id) !== idStr),
    top10: (shelf.top10 || []).filter((g) => String(g.id) !== idStr),
    favorites: (shelf.favorites || []).filter((g) => String(g.id) !== idStr),
  }

  if (updatedShelf.dedications && updatedShelf.dedications[gameId]) {
    const newDedications = { ...updatedShelf.dedications }
    delete newDedications[gameId]
    updatedShelf.dedications = newDedications
  }

  await saveUserShelfData(userId, updatedShelf)
  return updatedShelf
}

/**
 * Limpa todos os jogos zerados e em andamento da estante do usuário
 */
export async function clearUserShelfGames(userId) {
  if (!userId) return getDefaultShelfData()

  const shelf = await getUserShelfData(userId)
  const updatedShelf = {
    ...shelf,
    beatenGames: [],
    inProgressGames: [],
    playedGames: [],
    dedications: {},
  }

  await saveUserShelfData(userId, updatedShelf)
  return updatedShelf
}

/**
 * Salva a dedicatória de um jogo específico
 */
export async function updateGameDedication(userId, gameId, dedicationText) {
  if (!userId || !gameId) return

  const shelf = await getUserShelfData(userId)
  const updatedDedications = {
    ...(shelf.dedications || {}),
    [gameId]: dedicationText,
  }

  const updatedBeaten = shelf.beatenGames.map((g) => {
    if (g.id === gameId || String(g.id) === String(gameId)) {
      return { ...g, dedication: dedicationText }
    }
    return g
  })

  const updatedShelf = {
    ...shelf,
    dedications: updatedDedications,
    beatenGames: updatedBeaten,
  }

  await saveUserShelfData(userId, updatedShelf)
  return updatedShelf
}

/**
 * Alterna favorito para o usuário logado
 */
export async function toggleFavoriteGame(game) {
  const current = getCurrentUser()
  if (!current?.id || !game?.id) return false

  const shelf = await getUserShelfData(current.id)
  const isFav = shelf.favorites.some((g) => String(g.id) === String(game.id))

  let updatedFavorites
  if (isFav) {
    updatedFavorites = shelf.favorites.filter((g) => String(g.id) !== String(game.id))
  } else {
    updatedFavorites = [
      ...shelf.favorites,
      {
        id: String(game.id),
        title: game.title,
        console: game.console || game.consoleName || 'Retro',
        coverUrl: game.coverUrl || game.imageBoxArt || game.iconUrl || 'https://images.unsplash.com/photo-1612287230202-1ff1d85d1bdf?auto=format&fit=crop&w=600&q=85',
        favoritedAt: Date.now(),
      },
    ]
  }

  const updatedShelf = { ...shelf, favorites: updatedFavorites }
  await saveUserShelfData(current.id, updatedShelf)
  return !isFav
}

/**
 * Verifica se um jogo está nos favoritos do usuário logado
 */
export function isGameFavorited(favorites = [], gameId) {
  if (!gameId || !Array.isArray(favorites)) return false
  return favorites.some((g) => String(g.id) === String(gameId))
}

/**
 * Salva uma nova ordem do Top 10
 */
export async function saveUserTop10(userId, top10List) {
  const shelf = await getUserShelfData(userId)
  const updatedShelf = { ...shelf, top10: top10List.slice(0, 10) }
  await saveUserShelfData(userId, updatedShelf)
  return updatedShelf.top10
}
