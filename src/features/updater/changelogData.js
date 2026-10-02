/**
 * changelogData.js
 *
 * Histórico de notas de versão e novidades do ZEREI!.
 * Exibido automaticamente para o jogador quando uma nova versão é iniciada.
 */

export const CURRENT_APP_VERSION = '1.0.1'

export const CHANGELOG_HISTORY = {
  '1.0.1': {
    version: '1.0.1',
    date: 'Outubro de 2026',
    title: 'Atualizações Automáticas & Compatibilidade de ROMs',
    highlights: [
      {
        tag: 'NOVIDADE',
        color: 'cyan',
        title: 'Atualizações Automáticas sem Reinstalação',
        description: 'O ZEREI! agora baixa atualizações oficiais em segundo plano pelo GitHub. Seus amigos não precisam mais baixar novos instaladores manuais.',
      },
      {
        tag: 'MELHORIA',
        color: 'amber',
        title: 'Aviso Inteligente para ROMs Traduzidas / Hacks',
        description: 'Ao carregar uma ROM sem suporte a conquistas no RetroAchievements, um aviso claro permite continuar jogando mesmo assim ou trocar de ROM.',
      },
      {
        tag: 'RECURSO',
        color: 'emerald',
        title: 'Tempo de Jogo em Tempo Real na Barra de Telemetria',
        description: 'Acompanhamento do tempo de jogo acumulado na sala, mesmo quando o painel de conquistas está desativado.',
      },
      {
        tag: 'CORREÇÃO',
        color: 'purple',
        title: 'Redundância e Sincronização de Saves na Nuvem',
        description: 'Saves de cartucho (SRAM) e save states rápidos sincronizados e preservados com fallback local.',
      },
    ],
  },
  '1.0.0': {
    version: '1.0.0',
    date: 'Setembro de 2026',
    title: 'Lançamento Oficial ZEREI! Desktop',
    highlights: [
      {
        tag: 'LANÇAMENTO',
        color: 'gold',
        title: 'Motor Libretro Nativo Canvas',
        description: 'Emulação clássica de alta fidelidade para SNES, GBA, Mega Drive, NES e Game Boy.',
      },
      {
        tag: 'OFICIAL',
        color: 'emerald',
        title: 'Integração Oficial com RetroAchievements (rcheevos)',
        description: 'Autenticação segura, avaliação oficial de conquistas por frame e leaderboard.',
      },
    ],
  },
}

