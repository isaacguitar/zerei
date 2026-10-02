/**
 * gameMediaService.js
 * Centralizador de mídia oficial e autêntica de retrogaming.
 * Integração com RetroAchievements e Libretro Database.
 */

import raCanonGames from './raCanonGames.js'

export function normalizeKey(s) {
  return (s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

/**
 * Catálogo com curadoria especial dos jogos mais populares com artes verificadas:
 * - iconUrl: Ícone pixel art oficial do RetroAchievements
 * - boxArtUrl: Box art oficial do Libretro
 * - bannerUrl: Banner horizontal panorâmico do jogo (Title/Snap autêntico)
 * - titleUrl: Tela de título do jogo
 * - ingameUrl: Tela de jogabilidade
 */
export const CURATED_GAMES = {
  supermarioworld: {
    id: 228,
    title: 'Super Mario World',
    console: 'SNES',
    iconUrl: 'https://media.retroachievements.org/Images/126558.png',
    boxArtUrl: 'https://raw.githubusercontent.com/libretro-thumbnails/Nintendo_-_Super_Nintendo_Entertainment_System/master/Named_Boxarts/Super%20Mario%20World%20(USA).png',
    bannerUrl: 'https://raw.githubusercontent.com/libretro-thumbnails/Nintendo_-_Super_Nintendo_Entertainment_System/master/Named_Titles/Super%20Mario%20World%20(USA).png',
    titleUrl: 'https://raw.githubusercontent.com/libretro-thumbnails/Nintendo_-_Super_Nintendo_Entertainment_System/master/Named_Titles/Super%20Mario%20World%20(USA).png',
    ingameUrl: 'https://raw.githubusercontent.com/libretro-thumbnails/Nintendo_-_Super_Nintendo_Entertainment_System/master/Named_Snaps/Super%20Mario%20World%20(USA).png',
  },
  chronotrigger: {
    id: 319,
    title: 'Chrono Trigger',
    console: 'SNES',
    iconUrl: 'https://media.retroachievements.org/Images/156655.png',
    boxArtUrl: 'https://raw.githubusercontent.com/libretro-thumbnails/Nintendo_-_Super_Nintendo_Entertainment_System/master/Named_Boxarts/Chrono%20Trigger%20(USA).png',
    bannerUrl: 'https://raw.githubusercontent.com/libretro-thumbnails/Nintendo_-_Super_Nintendo_Entertainment_System/master/Named_Titles/Chrono%20Trigger%20(USA).png',
    titleUrl: 'https://raw.githubusercontent.com/libretro-thumbnails/Nintendo_-_Super_Nintendo_Entertainment_System/master/Named_Titles/Chrono%20Trigger%20(USA).png',
    ingameUrl: 'https://raw.githubusercontent.com/libretro-thumbnails/Nintendo_-_Super_Nintendo_Entertainment_System/master/Named_Snaps/Chrono%20Trigger%20(USA).png',
  },
  pokemonfireredversion: {
    id: 515,
    title: 'Pokémon FireRed Version',
    console: 'GBA',
    iconUrl: 'https://media.retroachievements.org/Images/105044.png',
    boxArtUrl: 'https://raw.githubusercontent.com/libretro-thumbnails/Nintendo_-_Game_Boy_Advance/master/Named_Boxarts/Pokemon%20-%20FireRed%20Version%20(USA).png',
    bannerUrl: 'https://raw.githubusercontent.com/libretro-thumbnails/Nintendo_-_Game_Boy_Advance/master/Named_Titles/Pokemon%20-%20FireRed%20Version%20(USA).png',
    titleUrl: 'https://raw.githubusercontent.com/libretro-thumbnails/Nintendo_-_Game_Boy_Advance/master/Named_Titles/Pokemon%20-%20FireRed%20Version%20(USA).png',
    ingameUrl: 'https://raw.githubusercontent.com/libretro-thumbnails/Nintendo_-_Game_Boy_Advance/master/Named_Snaps/Pokemon%20-%20FireRed%20Version%20(USA).png',
  },
  pokemonfirered: {
    id: 515,
    title: 'Pokémon FireRed Version',
    console: 'GBA',
    iconUrl: 'https://media.retroachievements.org/Images/105044.png',
    boxArtUrl: 'https://raw.githubusercontent.com/libretro-thumbnails/Nintendo_-_Game_Boy_Advance/master/Named_Boxarts/Pokemon%20-%20FireRed%20Version%20(USA).png',
    bannerUrl: 'https://raw.githubusercontent.com/libretro-thumbnails/Nintendo_-_Game_Boy_Advance/master/Named_Titles/Pokemon%20-%20FireRed%20Version%20(USA).png',
  },
  pokemonemeraldversion: {
    id: 668,
    title: 'Pokémon Emerald Version',
    console: 'GBA',
    iconUrl: 'https://media.retroachievements.org/Images/126553.png',
    boxArtUrl: 'https://raw.githubusercontent.com/libretro-thumbnails/Nintendo_-_Game_Boy_Advance/master/Named_Boxarts/Pokemon%20-%20Emerald%20Version%20(USA%2C%20Europe).png',
    bannerUrl: 'https://raw.githubusercontent.com/libretro-thumbnails/Nintendo_-_Game_Boy_Advance/master/Named_Titles/Pokemon%20-%20Emerald%20Version%20(USA%2C%20Europe).png',
    titleUrl: 'https://raw.githubusercontent.com/libretro-thumbnails/Nintendo_-_Game_Boy_Advance/master/Named_Titles/Pokemon%20-%20Emerald%20Version%20(USA%2C%20Europe).png',
    ingameUrl: 'https://raw.githubusercontent.com/libretro-thumbnails/Nintendo_-_Game_Boy_Advance/master/Named_Snaps/Pokemon%20-%20Emerald%20Version%20(USA%2C%20Europe).png',
  },
  pokemonemerald: {
    id: 668,
    title: 'Pokémon Emerald Version',
    console: 'GBA',
    iconUrl: 'https://media.retroachievements.org/Images/126553.png',
    boxArtUrl: 'https://raw.githubusercontent.com/libretro-thumbnails/Nintendo_-_Game_Boy_Advance/master/Named_Boxarts/Pokemon%20-%20Emerald%20Version%20(USA%2C%20Europe).png',
    bannerUrl: 'https://raw.githubusercontent.com/libretro-thumbnails/Nintendo_-_Game_Boy_Advance/master/Named_Titles/Pokemon%20-%20Emerald%20Version%20(USA%2C%20Europe).png',
  },
  metalslugsupervehicle001: {
    id: 14492,
    title: 'Metal Slug: Super Vehicle - 001',
    console: 'Neo Geo / Arcade',
    iconUrl: 'https://media.retroachievements.org/Images/061942.png',
    boxArtUrl: 'https://raw.githubusercontent.com/libretro-thumbnails/SNK_-_Neo_Geo/master/Named_Boxarts/Metal%20Slug%20-%20Super%20Vehicle-001.png',
    bannerUrl: 'https://raw.githubusercontent.com/libretro-thumbnails/SNK_-_Neo_Geo/master/Named_Titles/Metal%20Slug%20-%20Super%20Vehicle-001.png',
    titleUrl: 'https://raw.githubusercontent.com/libretro-thumbnails/SNK_-_Neo_Geo/master/Named_Titles/Metal%20Slug%20-%20Super%20Vehicle-001.png',
    ingameUrl: 'https://raw.githubusercontent.com/libretro-thumbnails/SNK_-_Neo_Geo/master/Named_Snaps/Metal%20Slug%20-%20Super%20Vehicle-001.png',
  },
  metalslug: {
    id: 14492,
    title: 'Metal Slug: Super Vehicle - 001',
    console: 'Neo Geo / Arcade',
    iconUrl: 'https://media.retroachievements.org/Images/061942.png',
    boxArtUrl: 'https://raw.githubusercontent.com/libretro-thumbnails/SNK_-_Neo_Geo/master/Named_Boxarts/Metal%20Slug%20-%20Super%20Vehicle-001.png',
    bannerUrl: 'https://raw.githubusercontent.com/libretro-thumbnails/SNK_-_Neo_Geo/master/Named_Titles/Metal%20Slug%20-%20Super%20Vehicle-001.png',
  },
  sonicthehedgehog2: {
    id: 9997,
    title: 'Sonic the Hedgehog 2',
    console: 'Mega Drive',
    iconUrl: 'https://media.retroachievements.org/Images/107957.png',
    boxArtUrl: 'https://raw.githubusercontent.com/libretro-thumbnails/Sega_-_Mega_Drive_-_Genesis/master/Named_Boxarts/Sonic%20The%20Hedgehog%202%20(World).png',
    bannerUrl: 'https://raw.githubusercontent.com/libretro-thumbnails/Sega_-_Mega_Drive_-_Genesis/master/Named_Titles/Sonic%20The%20Hedgehog%202%20(World).png',
    titleUrl: 'https://raw.githubusercontent.com/libretro-thumbnails/Sega_-_Mega_Drive_-_Genesis/master/Named_Titles/Sonic%20The%20Hedgehog%202%20(World).png',
    ingameUrl: 'https://raw.githubusercontent.com/libretro-thumbnails/Sega_-_Mega_Drive_-_Genesis/master/Named_Snaps/Sonic%20The%20Hedgehog%202%20(World).png',
  },
  sonic2: {
    id: 9997,
    title: 'Sonic the Hedgehog 2',
    console: 'Mega Drive',
    iconUrl: 'https://media.retroachievements.org/Images/107957.png',
    boxArtUrl: 'https://raw.githubusercontent.com/libretro-thumbnails/Sega_-_Mega_Drive_-_Genesis/master/Named_Boxarts/Sonic%20The%20Hedgehog%202%20(World).png',
    bannerUrl: 'https://raw.githubusercontent.com/libretro-thumbnails/Sega_-_Mega_Drive_-_Genesis/master/Named_Titles/Sonic%20The%20Hedgehog%202%20(World).png',
  },
  thelegendofzeldaalinktothepast: {
    id: 355,
    title: 'The Legend of Zelda: A Link to the Past',
    console: 'SNES',
    iconUrl: 'https://media.retroachievements.org/Images/059119.png',
    boxArtUrl: 'https://raw.githubusercontent.com/libretro-thumbnails/Nintendo_-_Super_Nintendo_Entertainment_System/master/Named_Boxarts/Legend%20of%20Zelda%2C%20The%20-%20A%20Link%20to%20the%20Past%20(USA).png',
    bannerUrl: 'https://raw.githubusercontent.com/libretro-thumbnails/Nintendo_-_Super_Nintendo_Entertainment_System/master/Named_Titles/Legend%20of%20Zelda%2C%20The%20-%20A%20Link%20to%20the%20Past%20(USA).png',
    titleUrl: 'https://raw.githubusercontent.com/libretro-thumbnails/Nintendo_-_Super_Nintendo_Entertainment_System/master/Named_Titles/Legend%20of%20Zelda%2C%20The%20-%20A%20Link%20to%20the%20Past%20(USA).png',
    ingameUrl: 'https://raw.githubusercontent.com/libretro-thumbnails/Nintendo_-_Super_Nintendo_Entertainment_System/master/Named_Snaps/Legend%20of%20Zelda%2C%20The%20-%20A%20Link%20to%20the%20Past%20(USA).png',
  },
  zeldaalinktothepast: {
    id: 355,
    title: 'The Legend of Zelda: A Link to the Past',
    console: 'SNES',
    iconUrl: 'https://media.retroachievements.org/Images/059119.png',
    boxArtUrl: 'https://raw.githubusercontent.com/libretro-thumbnails/Nintendo_-_Super_Nintendo_Entertainment_System/master/Named_Boxarts/Legend%20of%20Zelda%2C%20The%20-%20A%20Link%20to%20the%20Past%20(USA).png',
    bannerUrl: 'https://raw.githubusercontent.com/libretro-thumbnails/Nintendo_-_Super_Nintendo_Entertainment_System/master/Named_Titles/Legend%20of%20Zelda%2C%20The%20-%20A%20Link%20to%20the%20Past%20(USA).png',
  },
  thelegendofzeldatheminishcap: {
    id: 559,
    title: 'The Legend of Zelda: The Minish Cap',
    console: 'GBA',
    iconUrl: 'https://media.retroachievements.org/Images/113471.png',
    boxArtUrl: 'https://raw.githubusercontent.com/libretro-thumbnails/Nintendo_-_Game_Boy_Advance/master/Named_Boxarts/Legend%20of%20Zelda%2C%20The%20-%20The%20Minish%20Cap%20(USA).png',
    bannerUrl: 'https://raw.githubusercontent.com/libretro-thumbnails/Nintendo_-_Game_Boy_Advance/master/Named_Titles/Legend%20of%20Zelda%2C%20The%20-%20The%20Minish%20Cap%20(USA).png',
    titleUrl: 'https://raw.githubusercontent.com/libretro-thumbnails/Nintendo_-_Game_Boy_Advance/master/Named_Titles/Legend%20of%20Zelda%2C%20The%20-%20The%20Minish%20Cap%20(USA).png',
    ingameUrl: 'https://raw.githubusercontent.com/libretro-thumbnails/Nintendo_-_Game_Boy_Advance/master/Named_Snaps/Legend%20of%20Zelda%2C%20The%20-%20The%20Minish%20Cap%20(USA).png',
  },
  minishcap: {
    id: 559,
    title: 'The Legend of Zelda: The Minish Cap',
    console: 'GBA',
    iconUrl: 'https://media.retroachievements.org/Images/113471.png',
    boxArtUrl: 'https://raw.githubusercontent.com/libretro-thumbnails/Nintendo_-_Game_Boy_Advance/master/Named_Boxarts/Legend%20of%20Zelda%2C%20The%20-%20The%20Minish%20Cap%20(USA).png',
    bannerUrl: 'https://raw.githubusercontent.com/libretro-thumbnails/Nintendo_-_Game_Boy_Advance/master/Named_Titles/Legend%20of%20Zelda%2C%20The%20-%20The%20Minish%20Cap%20(USA).png',
  },
  supermetroid: {
    id: 325,
    title: 'Super Metroid',
    console: 'SNES',
    iconUrl: 'https://media.retroachievements.org/Images/156667.png',
    boxArtUrl: 'https://raw.githubusercontent.com/libretro-thumbnails/Nintendo_-_Super_Nintendo_Entertainment_System/master/Named_Boxarts/Super%20Metroid%20(Japan%2C%20USA)%20(En%2CJa).png',
    bannerUrl: 'https://raw.githubusercontent.com/libretro-thumbnails/Nintendo_-_Super_Nintendo_Entertainment_System/master/Named_Titles/Super%20Metroid%20(Japan%2C%20USA)%20(En%2CJa).png',
    titleUrl: 'https://raw.githubusercontent.com/libretro-thumbnails/Nintendo_-_Super_Nintendo_Entertainment_System/master/Named_Titles/Super%20Metroid%20(Japan%2C%20USA)%20(En%2CJa).png',
    ingameUrl: 'https://raw.githubusercontent.com/libretro-thumbnails/Nintendo_-_Super_Nintendo_Entertainment_System/master/Named_Snaps/Super%20Metroid%20(Japan%2C%20USA)%20(En%2CJa).png',
  },
  donkeykongcountry: {
    id: 236,
    title: 'Donkey Kong Country',
    console: 'SNES',
    iconUrl: 'https://media.retroachievements.org/Images/126560.png',
    boxArtUrl: 'https://raw.githubusercontent.com/libretro-thumbnails/Nintendo_-_Super_Nintendo_Entertainment_System/master/Named_Boxarts/Donkey%20Kong%20Country%20(USA).png',
    bannerUrl: 'https://raw.githubusercontent.com/libretro-thumbnails/Nintendo_-_Super_Nintendo_Entertainment_System/master/Named_Titles/Donkey%20Kong%20Country%20(USA).png',
  },
  donkeykongcountry2: {
    id: 237,
    title: "Donkey Kong Country 2: Diddy's Kong Quest",
    console: 'SNES',
    iconUrl: 'https://media.retroachievements.org/Images/126561.png',
    boxArtUrl: "https://raw.githubusercontent.com/libretro-thumbnails/Nintendo_-_Super_Nintendo_Entertainment_System/master/Named_Boxarts/Donkey%20Kong%20Country%202%20-%20Diddy's%20Kong%20Quest%20(USA).png",
    bannerUrl: "https://raw.githubusercontent.com/libretro-thumbnails/Nintendo_-_Super_Nintendo_Entertainment_System/master/Named_Titles/Donkey%20Kong%20Country%202%20-%20Diddy's%20Kong%20Quest%20(USA).png",
  },
  megamanx: {
    id: 251,
    title: 'Mega Man X',
    console: 'SNES',
    iconUrl: 'https://media.retroachievements.org/Images/126562.png',
    boxArtUrl: 'https://raw.githubusercontent.com/libretro-thumbnails/Nintendo_-_Super_Nintendo_Entertainment_System/master/Named_Boxarts/Mega%20Man%20X%20(USA).png',
    bannerUrl: 'https://raw.githubusercontent.com/libretro-thumbnails/Nintendo_-_Super_Nintendo_Entertainment_System/master/Named_Titles/Mega%20Man%20X%20(USA).png',
  },
  streetfighteriiturbo: {
    id: 260,
    title: 'Street Fighter II Turbo: Hyper Fighting',
    console: 'SNES',
    iconUrl: 'https://media.retroachievements.org/Images/126563.png',
    boxArtUrl: 'https://raw.githubusercontent.com/libretro-thumbnails/Nintendo_-_Super_Nintendo_Entertainment_System/master/Named_Boxarts/Street%20Fighter%20II%20Turbo%20-%20Hyper%20Fighting%20(USA).png',
    bannerUrl: 'https://raw.githubusercontent.com/libretro-thumbnails/Nintendo_-_Super_Nintendo_Entertainment_System/master/Named_Titles/Street%20Fighter%20II%20Turbo%20-%20Hyper%20Fighting%20(USA).png',
  },
  mortalkombat: {
    id: 11947,
    title: 'Mortal Kombat',
    console: 'Mega Drive / Arcade',
    iconUrl: 'https://media.retroachievements.org/Images/106629.png',
    boxArtUrl: 'https://raw.githubusercontent.com/libretro-thumbnails/Sega_-_Mega_Drive_-_Genesis/master/Named_Boxarts/Mortal%20Kombat%20(World).png',
    bannerUrl: 'https://raw.githubusercontent.com/libretro-thumbnails/Sega_-_Mega_Drive_-_Genesis/master/Named_Titles/Mortal%20Kombat%20(World).png',
  },
  mortalkombat2: {
    id: 10738,
    title: 'Mortal Kombat II',
    console: 'Mega Drive / Arcade',
    iconUrl: 'https://media.retroachievements.org/Images/153437.png',
    boxArtUrl: 'https://raw.githubusercontent.com/libretro-thumbnails/Sega_-_Mega_Drive_-_Genesis/master/Named_Boxarts/Mortal%20Kombat%20II%20(World).png',
    bannerUrl: 'https://raw.githubusercontent.com/libretro-thumbnails/Sega_-_Mega_Drive_-_Genesis/master/Named_Titles/Mortal%20Kombat%20II%20(World).png',
  },
  castlevaniaariaofsorrow: {
    id: 566,
    title: 'Castlevania: Aria of Sorrow',
    console: 'GBA',
    iconUrl: 'https://media.retroachievements.org/Images/126554.png',
    boxArtUrl: 'https://raw.githubusercontent.com/libretro-thumbnails/Nintendo_-_Game_Boy_Advance/master/Named_Boxarts/Castlevania%20-%20Aria%20of%20Sorrow%20(USA).png',
    bannerUrl: 'https://raw.githubusercontent.com/libretro-thumbnails/Nintendo_-_Game_Boy_Advance/master/Named_Titles/Castlevania%20-%20Aria%20of%20Sorrow%20(USA).png',
  },
}

/**
 * Retorna as artes oficiais e autênticas para qualquer jogo pelo título ou ID.
 */
export function getGameRetroMedia(title = '', explicitId = null) {
  const cleanTitle = (title || '').trim()
  const key = normalizeKey(cleanTitle)

  // 1. Checa o catálogo curado (prioridade máxima por ter artes HD verificadas)
  if (key && CURATED_GAMES[key]) {
    return CURATED_GAMES[key]
  }

  // 2. Busca parcial no catálogo curado
  for (const [k, data] of Object.entries(CURATED_GAMES)) {
    if (key && (key.includes(k) || k.includes(key))) {
      return data
    }
  }

  // 3. Busca no banco de 4.633 jogos canônicos do RetroAchievements (ra_canon_games.json)
  if (key) {
    let canon = raCanonGames[key]
    if (!canon) {
      // Procura por prefixo ou inclusão no ra_canon_games
      const allKeys = Object.keys(raCanonGames)
      const foundKey = allKeys.find((k) => k.startsWith(key) || key.startsWith(k)) || allKeys.find((k) => k.includes(key) || key.includes(k))
      if (foundKey) {
        canon = raCanonGames[foundKey]
      }
    }

    if (canon) {
      const [id, iconId, consoleName, gameTitle] = canon
      const iconUrl = iconId ? `https://media.retroachievements.org/Images/${iconId}.png` : null

      return {
        id,
        title: gameTitle,
        console: consoleName,
        iconUrl,
        boxArtUrl: iconUrl,
        bannerUrl: iconUrl,
        titleUrl: iconUrl,
        ingameUrl: iconUrl,
      }
    }
  }

  // 4. Fallback temático retrô (sem fotos genéricas)
  return {
    id: explicitId || null,
    title: cleanTitle || 'Jogo Retrô',
    console: 'Retrô',
    iconUrl: null,
    boxArtUrl: null,
    bannerUrl: null,
    titleUrl: null,
    ingameUrl: null,
  }
}
