import { collection, doc, getDoc, getDocs, query, setDoc, where } from 'firebase/firestore'
import { firestore } from '../../firebaseClient'
import { getCurrentUser } from '../auth/authService'
import { fetchUserRetroAchievementsShelf } from '../retro-achievements/retroAchievementsService'
import { listMyGameRooms } from '../game-room/roomService'

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

  // 3. Limpeza e particionamento rigoroso: somente jogos 100% ou comprovadamente zerados ficam em beatenGames
  const reallyBeaten = []
  const inProgress = Array.isArray(shelf.inProgressGames) ? [...shelf.inProgressGames] : []

  for (const g of (shelf.beatenGames || [])) {
    if (isMockGame(g)) continue
    const unlocked = Number(g.achievementsCount || 0)
    const total = Number(g.achievementsTotal || 0)
    const is100Percent = (total > 0 && unlocked >= total) || Number(g.completionPercent) >= 100
    const isActuallyBeaten = is100Percent || g.isBeaten === true || g.beaten === true

    if (isActuallyBeaten) {
      reallyBeaten.push({
        ...g,
        isMastered: is100Percent && total > 0,
        completionPercent: is100Percent ? 100 : (g.completionPercent || 0),
        dedication: shelf.dedications[g.id] || g.dedication || '',
      })
    } else {
      // Jogo com conquistas parciais (ex: 4/18, 1/18) pertence à aba "Jogando"
      inProgress.push({
        ...g,
        completionPercent: total > 0 ? Math.round((unlocked / total) * 100) : (g.completionPercent || 0),
      })
    }
  }

  // 4. Se o usuário tiver conta do RetroAchievements conectada e as listas precisarem de dados
  if (raUsername && reallyBeaten.length === 0 && inProgress.length === 0) {
    try {
      const raGames = await fetchUserRetroAchievementsShelf(raUsername)
      if (raGames.beatenGames?.length > 0 || raGames.inProgressGames?.length > 0) {
        for (const g of (raGames.beatenGames || [])) {
          const unlocked = Number(g.achievementsCount || 0)
          const total = Number(g.achievementsTotal || 0)
          const is100 = (total > 0 && unlocked >= total) || Number(g.completionPercent) >= 100 || g.isMastered
          if (is100) {
            reallyBeaten.push({
              ...g,
              isMastered: true,
              dedication: shelf.dedications[g.id] || g.dedication || '',
            })
          } else {
            inProgress.push(g)
          }
        }
        for (const g of (raGames.inProgressGames || [])) {
          inProgress.push(g)
        }
      }
    } catch (err) {
      console.warn('Erro ao puxar dados da estante do RA:', err)
    }
  }

  // 5. Incluir jogos com salas ativas ou abertas na aba "Jogando" (sem duplicar)
  try {
    const activeRooms = await listMyGameRooms()
    if (Array.isArray(activeRooms)) {
      for (const room of activeRooms) {
        if (!room.gameTitle) continue
        const rId = String(room.retroAchievementsId || room.id || room.gameTitle)
        const titleNormalized = room.gameTitle.trim().toLowerCase()
        const alreadyInBeaten = reallyBeaten.some((g) => String(g.id) === rId || (g.title && g.title.trim().toLowerCase() === titleNormalized))
        const alreadyInProgress = inProgress.some((g) => String(g.id) === rId || (g.title && g.title.trim().toLowerCase() === titleNormalized))

        if (!alreadyInBeaten && !alreadyInProgress) {
          inProgress.push({
            id: rId,
            title: room.gameTitle,
            console: room.gameConsole || 'Retro',
            coverUrl: room.gameCoverUrl || null,
            timePlayed: 'Em andamento na sala',
            completionPercent: 0,
            achievementsCount: 0,
            achievementsTotal: 0,
            isRoomActive: true,
            roomId: room.id,
          })
        }
      }
    }
  } catch {}

  // Desduplica inProgress garantindo um único card por jogo
  const seenInProgress = new Set()
  const uniqueInProgress = []
  for (const g of inProgress) {
    if (isMockGame(g)) continue
    const titleKey = (g.title || g.id || '').trim().toLowerCase()
    if (!titleKey || seenInProgress.has(titleKey)) continue
    seenInProgress.add(titleKey)
    uniqueInProgress.push(g)
  }

  shelf.beatenGames = reallyBeaten
  shelf.inProgressGames = uniqueInProgress
  shelf.playedGames = [...reallyBeaten, ...uniqueInProgress]

  // Salva no cache local para persistir a nova organização correta
  setLocalData(`${SHELF_STORAGE_KEY_PREFIX}${userId}`, shelf)
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
        coverUrl: game.coverUrl || game.imageBoxArt || game.iconUrl || null,
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
