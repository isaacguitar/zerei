/**
 * changelogData.js
 *
 * Histórico de notas de versão e novidades do ZEREI!.
 * Exibido automaticamente para o jogador quando uma nova versão é iniciada.
 */

export const CURRENT_APP_VERSION = '1.0.4'

export const CHANGELOG_HISTORY = {
  '1.0.4': {
    version: '1.0.4',
    date: '02 de Outubro de 2026',
    title: 'Exclusão de Posts no Feed e Estante RA Aperfeiçoada',
    highlights: [
      {
        tag: 'NOVIDADE',
        color: 'emerald',
        title: 'Exclusão de Publicações no Feed',
        description: 'Menu discreto de três pontinhos em suas publicações para apagar postagens antigas com facilidade.',
      },
      {
        tag: 'AJUSTE',
        color: 'cyan',
        title: 'Estante 100% Sincronizada com RA',
        description: 'Detecção automática e consistente da sua conta vinculada do RetroAchievements, sem avisos de importação indevidos.',
      },
      {
        tag: 'MELHORIA',
        color: 'gold',
        title: 'Indicador de Versão na Barra Lateral',
        description: 'Exibição discreta da versão do executável na parte inferior do menu lateral para facilitar o acompanhamento de atualizações.',
      },
    ],
  },
  '1.0.3': {
    version: '1.0.3',
    date: '02 de Outubro de 2026',
    title: 'Identificador de Versão Ativa e Atualizações Estáveis',
    highlights: [
      {
        tag: 'NOVIDADE',
        color: 'cyan',
        title: 'Indicador de Versão na Barra Lateral',
        description: 'Exibição discreta da versão do executável na parte inferior do menu lateral para facilitar o acompanhamento de atualizações.',
      },
    ],
  },
  '1.0.2': {
    version: '1.0.2',
    date: '02 de Outubro de 2026',
    title: 'Desempenho de Áudio, Hotplug de Gamepad e Estante Limpa',
    highlights: [
      {
        tag: 'MELHORIA',
        color: 'emerald',
        title: 'Áudio e Vídeo Sem Travamentos',
        description: 'Sincronização de alta fidelidade e buffer adaptativo eliminando slow downs e chiados/estalos no som.',
      },
      {
        tag: 'NOVIDADE',
        color: 'cyan',
        title: 'Hotplug de Gamepad em Tempo Real',
        description: 'Ligue ou conecte seu controle USB ou Bluetooth no meio da partida sem precisar reiniciar ou pausar a emulação.',
      },
      {
        tag: 'RECURSO',
        color: 'gold',
        title: 'Estante Retrô Sem Informações Fictícias',
        description: 'Separação estrita entre Jogos Zerados reais e Jogando. Todos os dados fictícios e pontuações simuladas foram removidos.',
      },
      {
        tag: 'NOVIDADE',
        color: 'amber',
        title: 'Salas Ativas na Estante',
        description: 'Seus jogos com salas de jogatina abertas agora aparecem automaticamente destacados na aba Jogando.',
      },
      {
        tag: 'AJUSTE',
        color: 'purple',
        title: 'Feed da Comunidade Moderado',
        description: 'Silenciadas notificações excessivas de salas avulsas e conexões de contas, mantendo apenas conquistas, zeramentos e momentos épicos.',
      },
    ],
  },
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

