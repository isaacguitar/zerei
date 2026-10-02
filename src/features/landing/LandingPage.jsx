import React, { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Gamepad2,
  Trophy,
  Users,
  Sparkles,
  Download,
  Laptop,
  Smartphone,
  CheckCircle2,
  ShieldCheck,
  Flame,
  Volume2,
  BookOpenText,
  HelpCircle,
  ExternalLink,
  Play,
  ArrowRight,
  Disc3,
  Cpu,
  Tv,
  Radio,
  ChevronRight,
  Star,
  Layers,
} from 'lucide-react'

export default function LandingPage({
  onOpenAuth,
  onExploreWeb,
  userProfile,
  onNavigateToApp,
}) {
  const [activeFaq, setActiveFaq] = useState(null)
  const [downloadNotice, setDownloadNotice] = useState(null)

  const handleDownloadClick = (platform) => {
    setDownloadNotice(platform)
    setTimeout(() => setDownloadNotice(null), 5000)
  }

  const consoles = [
    { name: 'Super Nintendo', gen: '16-bit', color: 'border-purple-500/30 text-purple-400 bg-purple-500/10', icon: 'SNES' },
    { name: 'Mega Drive / Genesis', gen: '16-bit', color: 'border-blue-500/30 text-blue-400 bg-blue-500/10', icon: 'MD' },
    { name: 'NES / Famicom', gen: '8-bit', color: 'border-red-500/30 text-red-400 bg-red-500/10', icon: 'NES' },
    { name: 'Master System', gen: '8-bit', color: 'border-sky-500/30 text-sky-400 bg-sky-500/10', icon: 'SMS' },
    { name: 'Game Boy Advance', gen: '32-bit', color: 'border-indigo-500/30 text-indigo-400 bg-indigo-500/10', icon: 'GBA' },
    { name: 'PlayStation 1', gen: '32-bit', color: 'border-amber-500/30 text-amber-400 bg-amber-500/10', icon: 'PS1' },
    { name: 'Arcade / Neo Geo', gen: 'Arcade', color: 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10', icon: 'MAME' },
    { name: 'Game Boy / Color', gen: 'Portátil', color: 'border-yellow-500/30 text-yellow-400 bg-yellow-500/10', icon: 'GB' },
  ]

  const faqs = [
    {
      q: 'Preciso instalar algum programa separado para jogar?',
      a: 'Não. A versão desktop do Zerei! inclui o motor de emulação e os núcleos compatíveis. Você só precisa selecionar uma ROM local que já tenha.',
    },
    {
      q: 'Como funcionam as conquistas do RetroAchievements?',
      a: 'Basta vincular seu nome de usuário do RetroAchievements no Zerei!. Ao jogar no aplicativo, ele identifica e valida as conquistas em tempo real, disparando as notificações comemorativas na tela e somando os pontos no ranking do seu clube.',
    },
    {
      q: 'O que são os Clubes de Zeramento?',
      a: 'Funcionam exatamente como um clube do livro: um grupo de amigos escolhe um jogo para a rodada (por votação ou escolha do líder), jogam ao longo do mês e compartilham progresso, dicas no diário de bordo e disputam quem zera primeiro.',
    },
    {
      q: 'Como funcionam o Modo Campanha e o Modo Casual?',
      a: 'No Modo Campanha, a sala estabelece uma meta de zeramento com porcentagem e ranking. No Modo Casual, não há pressão de progresso: você joga no seu tempo, conversa com a galera e ganha medalhas livremente.',
    },
    {
      q: 'Onde consigo as ROMs dos jogos?',
      a: 'O Zerei! é uma plataforma social e emulador comunitário. Você utiliza os arquivos de backup das ROMs da sua própria coleção pessoal (.smc, .sfc, .nes, .md, .bin, .iso).',
    },
    {
      q: 'Posso usar controles de videogame (joysticks)?',
      a: 'Sim! Tanto no PC quanto no Android há suporte nativo para controles USB e Bluetooth (Xbox, PlayStation, 8BitDo e genéricos), com mapeamento automático de botões.',
    },
  ]

  return (
    <div className="min-h-screen bg-ink text-slate-100 selection:bg-electric selection:text-ink font-sans">
      {/* Scanline CRT overlay decorativo */}
      <div className="fixed inset-0 pointer-events-none opacity-20 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent via-black/40 to-black/90 z-40" />

      {/* ── NAVBAR ────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-panel/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-electric/40 bg-electric/10 text-electric shadow-arcade-cyan">
              <Gamepad2 size={22} className="animate-pulse" />
            </div>
            <div>
              <span className="font-pixel text-sm tracking-wider text-white">
                ZEREI<span className="text-electric">!</span>
              </span>
              <span className="block text-[9px] font-bold uppercase tracking-widest text-slate-400">
                Retrogaming Club
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-300">
            <a href="#como-funciona" className="hover:text-electric transition">Como Funciona</a>
            <a href="#recursos" className="hover:text-electric transition">Recursos</a>
            <a href="#consoles" className="hover:text-electric transition">Consoles</a>
            <a href="#downloads" className="hover:text-electric transition">Downloads</a>
            <a href="#faq" className="hover:text-electric transition">FAQ</a>
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            {userProfile?.id ? (
              <button
                type="button"
                onClick={onNavigateToApp}
                className="flex items-center gap-2 rounded-xl border border-electric/40 bg-electric/20 px-4 py-2 text-xs font-pixel text-white hover:bg-electric/30 transition shadow-arcade-cyan"
              >
                <span>Entrar no App</span>
                <ArrowRight size={14} />
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => onOpenAuth('email')}
                  className="rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-300 hover:text-white transition"
                >
                  Entrar
                </button>
                <button
                  type="button"
                  onClick={() => onOpenAuth('register')}
                  className="flex items-center gap-1.5 rounded-xl border border-electric/50 bg-electric px-3.5 py-2 text-xs font-bold text-ink hover:bg-cyan-300 transition shadow-arcade-cyan"
                >
                  <Sparkles size={14} />
                  <span>Criar Conta</span>
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <main>
        {/* ── HERO SECTION ──────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden px-4 pt-12 pb-20 sm:px-6 lg:pt-20 lg:pb-28">
          {/* Background Glows */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-electric/15 blur-[120px] rounded-full pointer-events-none" />
          <div className="absolute top-1/3 left-1/4 w-[400px] h-[250px] bg-purple-600/10 blur-[100px] rounded-full pointer-events-none" />

          <div className="relative mx-auto max-w-5xl text-center">
            {/* Pill Badge */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 rounded-full border border-electric/30 bg-panel px-4 py-1.5 text-xs text-electric shadow-arcade-cyan"
            >
              <Radio size={13} className="text-oneUp animate-pulse" />
              <span className="font-pixel text-[9px] tracking-wider uppercase">Plataforma Cross-Platform Oficial</span>
              <span className="rounded-full bg-electric/20 px-2 py-0.5 text-[10px] font-bold">PC & Android</span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="mt-6 text-3xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl font-sans"
            >
              O clube do livro definitivo, <br />
              <span className="bg-gradient-to-r from-electric via-cyan-200 to-gold bg-clip-text text-transparent">
                só que para quem ama zerar jogos retrô.
              </span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mx-auto mt-6 max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-base"
            >
              Crie clubes mensais com seus amigos, jogue com emulação integrada de alta fidelidade, 
              destranque conquistas do <strong>RetroAchievements</strong> em tempo real e converse por voz durante a jogatina.
            </motion.p>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="mt-8 flex flex-wrap items-center justify-center gap-3 sm:gap-4"
            >
              <a
                href="#downloads"
                className="flex items-center gap-2.5 rounded-2xl border-2 border-electric bg-electric px-6 py-3.5 text-xs font-pixel uppercase tracking-wide text-ink shadow-arcade-cyan hover:bg-cyan-300 transition"
              >
                <Download size={18} />
                <span>Baixar Aplicativo</span>
              </a>

              <button
                type="button"
                onClick={onExploreWeb}
                className="flex items-center gap-2 rounded-2xl border border-white/15 bg-panel/80 px-6 py-3.5 text-xs font-bold text-slate-200 hover:border-electric/40 hover:bg-panel transition shadow-lg"
              >
                <Play size={16} className="text-electric" />
                <span>Ver Prévia no Navegador</span>
              </button>
            </motion.div>

            {/* Aviso de Download ao Clicar */}
            {downloadNotice && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mx-auto mt-4 max-w-md rounded-xl border border-gold/40 bg-gold/10 p-3 text-xs text-gold flex items-center justify-center gap-2"
              >
                <Sparkles size={16} />
                <span>Pacote {downloadNotice} em preparação! Faça login para salvar seus dados.</span>
              </motion.div>
            )}

            {/* ── MOCKUP VISUAL INTERATIVO DA PLATAFORMA ─────────────────────── */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="relative mx-auto mt-14 max-w-4xl rounded-3xl border border-white/15 bg-panel p-2 shadow-2xl sm:p-4"
            >
              {/* Moldura estilo tela CRT/Monitor */}
              <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950">
                {/* Barra de título do app */}
                <div className="flex items-center justify-between border-b border-white/10 bg-panelDeep px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-red-500/80" />
                    <span className="h-3 w-3 rounded-full bg-yellow-500/80" />
                    <span className="h-3 w-3 rounded-full bg-emerald-500/80" />
                    <span className="ml-2 font-pixel text-[9px] text-slate-400">
                      ZEREI! — Super Metroid [SNES] • Sala Oficial do Clube
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[9px] font-bold text-emerald-400 border border-emerald-500/30">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                      4 Jogadores Online
                    </span>
                  </div>
                </div>

                {/* Conteúdo simulado da sala */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-0">
                  {/* Canvas do Jogo */}
                  <div className="lg:col-span-2 relative aspect-video bg-black flex flex-col items-center justify-center p-6 border-b lg:border-b-0 lg:border-r border-white/10 overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/40 pointer-events-none" />
                    
                    {/* Game Visual Preview */}
                    <div className="relative text-center z-10">
                      <div className="inline-flex p-4 rounded-2xl bg-panel/80 border border-white/10 backdrop-blur-md mb-3 shadow-neon">
                        <Gamepad2 size={48} className="text-electric animate-pulse" />
                      </div>
                      <p className="font-pixel text-xs text-white">Super Metroid (SNES)</p>
                      <p className="text-[11px] text-slate-400 mt-1">Sessão Ativa • 60 FPS cravados</p>
                    </div>

                    {/* Pop-up simulado de conquista do RetroAchievements */}
                    <div className="absolute top-4 left-4 z-20 flex items-center gap-3 rounded-xl border border-gold/40 bg-black/90 p-2.5 backdrop-blur-md shadow-arcade-gold animate-bounce">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gold/20 text-gold border border-gold/50">
                        <Trophy size={18} />
                      </div>
                      <div className="text-left">
                        <p className="font-pixel text-[8px] uppercase tracking-wider text-gold">Conquista Desbloqueada!</p>
                        <p className="font-bold text-xs text-white">Morphing Sphere Acquired</p>
                        <p className="text-[9px] text-slate-400">+5 Pontos RA • Sincronizado</p>
                      </div>
                    </div>

                    {/* Barra de controle inferior */}
                    <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-[10px] text-slate-400 bg-panel/70 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10">
                      <span className="flex items-center gap-1.5 text-oneUp">
                        <Volume2 size={12} /> Voz Conectada: Sala #1
                      </span>
                      <span className="font-mono">Modo Casual • Sem cobrança de zeramento</span>
                    </div>
                  </div>

                  {/* Painel Lateral da Sala (Membros & Chat) */}
                  <div className="bg-panel p-4 flex flex-col justify-between space-y-4">
                    <div>
                      <div className="flex items-center justify-between pb-2 border-b border-white/10">
                        <span className="font-pixel text-[9px] text-white">Mural da Rodada</span>
                        <span className="text-[10px] text-electric font-bold">12 Conquistas</span>
                      </div>

                      {/* Membros na sala */}
                      <div className="mt-3 space-y-2">
                        {[
                          { name: 'SamusHunter', progress: 'Zerou!', status: 'Líder do Clube', pts: '450 pts' },
                          { name: 'RetroGamer99', progress: '85%', status: 'Nível 14', pts: '320 pts' },
                          { name: 'PixelKnight', progress: '42%', status: 'Explorando', pts: '190 pts' },
                        ].map((m, i) => (
                          <div key={i} className="flex items-center justify-between rounded-lg bg-slate-900/60 p-2 border border-white/5 text-xs">
                            <div className="flex items-center gap-2">
                              <div className="h-6 w-6 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold text-[10px] border border-purple-500/30">
                                {m.name[0]}
                              </div>
                              <div>
                                <p className="font-bold text-slate-200 text-[11px]">{m.name}</p>
                                <p className="text-[9px] text-slate-500">{m.status}</p>
                              </div>
                            </div>
                            <span className="font-pixel text-[9px] text-gold">{m.pts}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Mensagem rápida do chat */}
                    <div className="rounded-xl bg-slate-950/60 p-2.5 border border-white/10 text-left">
                      <p className="text-[9px] font-bold text-electric">RetroGamer99 (Chat de Voz):</p>
                      <p className="text-[10px] text-slate-300 mt-0.5">"Achei a Super Missil atrás da parede falsa em Brinstar!"</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ── COMO FUNCIONA (3 PASSOS SIMPLES) ──────────────────────────────── */}
        <section id="como-funciona" className="border-t border-white/10 bg-panelDeep px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-5xl">
            <div className="text-center">
              <span className="font-pixel text-[10px] text-electric uppercase tracking-widest">
                Experiência Sem Complicações
              </span>
              <h2 className="mt-2 text-2xl font-black text-white sm:text-4xl font-sans">
                Como Funciona o Zerei!
              </h2>
              <p className="mt-3 text-xs sm:text-sm text-slate-400 max-w-xl mx-auto">
                Desenvolvido para que você passe mais tempo jogando e interagindo, e zero tempo configurando arquivos e portas.
              </p>
            </div>

            <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-3">
              {[
                {
                  step: '01',
                  title: 'Crie sua Conta & Vincule o RA',
                  desc: 'Cadastre-se com Google ou E-mail e informe seu usuário do RetroAchievements para ativar a telemetria oficial.',
                  icon: Trophy,
                  accent: 'border-gold/40 text-gold bg-gold/10',
                },
                {
                  step: '02',
                  title: 'Baixe o App no PC ou Celular',
                  desc: 'Um aplicativo único e leve com motor de emulação nativo já embutido. Não é necessário instalar um programa de emulação separado.',
                  icon: Download,
                  accent: 'border-electric/40 text-electric bg-electric/10',
                },
                {
                  step: '03',
                  title: 'Entre no Clube e Zere!',
                  desc: 'Selecione a ROM do jogo do mês, entre na sala sincronizada, converse por voz com seus amigos e dispute o pódio.',
                  icon: Flame,
                  accent: 'border-purple-500/40 text-purple-400 bg-purple-500/10',
                },
              ].map((item, idx) => {
                const Icon = item.icon
                return (
                  <div
                    key={idx}
                    className="relative rounded-3xl border border-white/10 bg-panel p-6 shadow-lg transition hover:border-white/20"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-pixel text-xl text-slate-600">{item.step}</span>
                      <div className={`flex h-10 w-10 items-center justify-center rounded-xl border ${item.accent}`}>
                        <Icon size={20} />
                      </div>
                    </div>
                    <h3 className="mt-5 font-bold text-white text-base font-sans">{item.title}</h3>
                    <p className="mt-2 text-xs leading-relaxed text-slate-400">{item.desc}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* ── RECURSOS DA PLATAFORMA ────────────────────────────────────────── */}
        <section id="recursos" className="px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-6xl">
            <div className="text-center">
              <span className="font-pixel text-[10px] text-gold uppercase tracking-widest">
                Tudo em um único lugar
              </span>
              <h2 className="mt-2 text-2xl font-black text-white sm:text-4xl font-sans">
                Tudo que um Retrogamer Precisa
              </h2>
            </div>

            <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  title: 'Clubes Retrô Democráticos',
                  desc: 'Votações mensais para escolher o próximo clássico, prazos de rodada e divisão entre Modo Campanha e Modo Casual livre.',
                  icon: Users,
                  tag: 'Social',
                },
                {
                  title: 'Conquistas em Tempo Real',
                  desc: 'Telemetria nativa conectada ao RetroAchievements. Ao cumprir uma façanha no jogo, o troféu sobe imediatamente na tela.',
                  icon: Trophy,
                  tag: 'Telemetria',
                },
                {
                  title: 'Chat de Voz & Mensagens P2P',
                  desc: 'Canais de voz integrados diretamente no app. Converse com a galera da sala sem precisar abrir o Discord.',
                  icon: Volume2,
                  tag: 'Voz Nativa',
                },
                {
                  title: 'Capturas de Tela Perfeitas',
                  desc: 'Registre seus momentos épicos de jogatina com um clique. Captura em alta definição direta do frame do jogo sem tela preta.',
                  icon: Tv,
                  tag: 'Mídia',
                },
                {
                  title: 'Diário de Bordo & Dicas',
                  desc: 'Registre suas anotações, mapas, passwords e macetes para ajudar outros membros do clube a superar partes difíceis.',
                  icon: BookOpenText,
                  tag: 'Comunidade',
                },
                {
                  title: 'Ranking & Gamificação',
                  desc: 'Ganhe XP, suba de nível no Zerei!, conquiste medalhas personalizadas e dispute o topo do ranking da comunidade.',
                  icon: Flame,
                  tag: 'XP & Níveis',
                },
              ].map((f, i) => {
                const Icon = f.icon
                return (
                  <div
                    key={i}
                    className="rounded-3xl border border-white/10 bg-panel p-6 transition hover:border-electric/30 hover:shadow-arcade-cyan"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-electric/30 bg-electric/10 text-electric">
                        <Icon size={22} />
                      </div>
                      <span className="rounded-full bg-white/5 px-2.5 py-1 text-[9px] font-bold text-slate-400 border border-white/10 uppercase">
                        {f.tag}
                      </span>
                    </div>
                    <h3 className="mt-5 font-bold text-white text-base">{f.title}</h3>
                    <p className="mt-2 text-xs leading-relaxed text-slate-400">{f.desc}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* ── CONSOLES SUPORTADOS ───────────────────────────────────────────── */}
        <section id="consoles" className="border-t border-white/10 bg-panelDeep px-4 py-16 sm:px-6">
          <div className="mx-auto max-w-5xl text-center">
            <span className="font-pixel text-[10px] text-electric uppercase tracking-widest">
              Da 3ª à 5ª Geração & Arcades
            </span>
            <h2 className="mt-2 text-2xl font-black text-white sm:text-3xl font-sans">
              Consoles e Núcleos Suportados
            </h2>
            <p className="mt-2 text-xs text-slate-400">
              Compatibilidade ampla com os sistemas mais amados da história dos videogames.
            </p>

            <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {consoles.map((c, i) => (
                <div
                  key={i}
                  className={`flex flex-col items-center justify-center rounded-2xl border p-4 transition hover:scale-[1.02] ${c.color}`}
                >
                  <span className="font-pixel text-xs">{c.icon}</span>
                  <span className="mt-2 font-bold text-xs text-white">{c.name}</span>
                  <span className="mt-1 text-[9px] opacity-70 uppercase tracking-widest font-bold">{c.gen}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── DOWNLOADS SECTION (WINDOWS & ANDROID) ─────────────────────────── */}
        <section id="downloads" className="relative px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-5xl">
            <div className="text-center">
              <span className="font-pixel text-[10px] text-gold uppercase tracking-widest">
                Instalação em 1 Clique
              </span>
              <h2 className="mt-2 text-3xl font-black text-white sm:text-4xl font-sans">
                Baixe o Zerei! para sua Plataforma
              </h2>
              <p className="mt-3 text-xs sm:text-sm text-slate-300 max-w-lg mx-auto">
                Escolha sua plataforma abaixo. O aplicativo já vem pronto para uso, com motor de emulação embutido e suporte a controles.
              </p>
            </div>

            <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2">
              {/* Card Windows */}
              <div className="relative rounded-3xl border-2 border-electric/40 bg-panel p-8 shadow-arcade-cyan flex flex-col justify-between">
                <div className="absolute -top-3.5 right-6 rounded-full border border-electric bg-electric px-3 py-1 font-pixel text-[9px] uppercase tracking-wider text-ink font-bold">
                  Recomendado para PC
                </div>

                <div>
                  <div className="flex items-center gap-3">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-electric/40 bg-electric/15 text-electric">
                      <Laptop size={32} />
                    </div>
                    <div>
                      <h3 className="font-pixel text-base text-white">Zerei! Desktop</h3>
                      <p className="text-xs text-slate-400">Windows 10 / 11 (64-bit)</p>
                    </div>
                  </div>

                  <ul className="mt-6 space-y-2.5 text-xs text-slate-300">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-oneUp shrink-0" />
                      <span>Motor de emulação e núcleos já embutidos</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-oneUp shrink-0" />
                      <span>Telemetria do RetroAchievements automática</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-oneUp shrink-0" />
                      <span>Suporte nativo a controles Xbox e PlayStation</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-oneUp shrink-0" />
                      <span>Captura de tela instantânea sem tela preta</span>
                    </li>
                  </ul>
                </div>

                <div className="mt-8 pt-6 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => handleDownloadClick('Windows (Zerei-Setup.exe)')}
                    className="w-full flex items-center justify-center gap-2 rounded-2xl border-2 border-electric bg-electric py-3.5 text-xs font-pixel uppercase tracking-wide text-ink hover:bg-cyan-300 transition shadow-arcade-cyan"
                  >
                    <Download size={18} />
                    <span>Baixar para Windows (.exe)</span>
                  </button>
                  <p className="mt-2 text-center text-[10px] text-slate-500">Versão 1.0.0 • Instalador Completo • Seguro</p>
                </div>
              </div>

              {/* Card Android */}
              <div className="relative rounded-3xl border border-white/15 bg-panel p-8 shadow-xl flex flex-col justify-between">
                <div className="absolute -top-3.5 right-6 rounded-full border border-oneUp/40 bg-oneUp/20 px-3 py-1 font-pixel text-[9px] uppercase tracking-wider text-oneUp font-bold">
                  Mobile & Portáteis
                </div>

                <div>
                  <div className="flex items-center gap-3">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-oneUp/40 bg-oneUp/15 text-oneUp">
                      <Smartphone size={32} />
                    </div>
                    <div>
                      <h3 className="font-pixel text-base text-white">Zerei! Mobile</h3>
                      <p className="text-xs text-slate-400">Android 8.0 ou superior</p>
                    </div>
                  </div>

                  <ul className="mt-6 space-y-2.5 text-xs text-slate-300">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-oneUp shrink-0" />
                      <span>Smartphones, Tablets e TV Box</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-oneUp shrink-0" />
                      <span>Compatível com portáteis (Anbernic, Retroid, Odin)</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-oneUp shrink-0" />
                      <span>Controles na tela com vibração tátil ou Bluetooth</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-oneUp shrink-0" />
                      <span>Sincronização na nuvem com a versão de PC</span>
                    </li>
                  </ul>
                </div>

                <div className="mt-8 pt-6 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => handleDownloadClick('Android (Zerei.apk)')}
                    className="w-full flex items-center justify-center gap-2 rounded-2xl border border-oneUp bg-oneUp/20 py-3.5 text-xs font-pixel uppercase tracking-wide text-oneUp hover:bg-oneUp/30 transition shadow-lg"
                  >
                    <Download size={18} />
                    <span>Baixar para Android (.apk)</span>
                  </button>
                  <p className="mt-2 text-center text-[10px] text-slate-500">Versão 1.0.0 • Pacote APK Direto</p>
                </div>
              </div>
            </div>

            {/* Banner de Teste no Navegador */}
            <div className="mt-8 rounded-2xl border border-white/10 bg-panelDeep p-5 text-center flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-left">
                <p className="font-bold text-sm text-white">Prefere testar antes pelo navegador?</p>
                <p className="text-xs text-slate-400">Você pode navegar pelos clubes, salas e estante diretamente pela Web.</p>
              </div>
              <button
                type="button"
                onClick={onExploreWeb}
                className="shrink-0 flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-xs font-bold text-slate-200 hover:bg-white/10 transition"
              >
                <span>Acessar Web</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </section>

        {/* ── FAQ SECTION ──────────────────────────────────────────────────── */}
        <section id="faq" className="border-t border-white/10 bg-panelDeep px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-4xl">
            <div className="text-center">
              <span className="font-pixel text-[10px] text-electric uppercase tracking-widest">
                Tire suas dúvidas
              </span>
              <h2 className="mt-2 text-2xl font-black text-white sm:text-3xl font-sans">
                Perguntas Frequentes
              </h2>
            </div>

            <div className="mt-12 space-y-3">
              {faqs.map((faq, i) => {
                const isOpen = activeFaq === i
                return (
                  <div
                    key={i}
                    className="overflow-hidden rounded-2xl border border-white/10 bg-panel transition"
                  >
                    <button
                      type="button"
                      onClick={() => setActiveFaq(isOpen ? null : i)}
                      className="w-full flex items-center justify-between p-5 text-left text-xs sm:text-sm font-bold text-white hover:text-electric transition"
                    >
                      <span>{faq.q}</span>
                      <ChevronRight
                        size={18}
                        className={`text-slate-400 transition-transform ${isOpen ? 'rotate-90 text-electric' : ''}`}
                      />
                    </button>
                    {isOpen && (
                      <div className="px-5 pb-5 pt-1 text-xs leading-relaxed text-slate-300 border-t border-white/5">
                        {faq.a}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </section>
      </main>

      {/* ── FOOTER ────────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/10 bg-black px-4 py-12 text-center text-xs text-slate-500 sm:px-6">
        <div className="mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-electric/30 bg-electric/10 text-electric">
              <Gamepad2 size={16} />
            </div>
            <div className="text-left">
              <span className="font-pixel text-xs text-white">ZEREI!</span>
              <p className="text-[10px] text-slate-500">Retrogaming Club © 2026</p>
            </div>
          </div>

          <p className="text-[11px] text-slate-500 max-w-md text-center">
            Zerei! é um projeto comunitário independente. Conquistas sincronizadas via{' '}
            <a
              href="https://retroachievements.org"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gold hover:underline"
            >
              RetroAchievements.org
            </a>
            .
          </p>

          <div className="flex items-center gap-4 text-xs font-semibold">
            <button type="button" onClick={() => onOpenAuth('email')} className="hover:text-white transition">
              Entrar
            </button>
            <button type="button" onClick={onExploreWeb} className="hover:text-white transition">
              Plataforma Web
            </button>
            <a href="#downloads" className="text-electric hover:underline">
              Downloads
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}

