/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        pixel: ['"Press Start 2P"', 'monospace'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui'],
      },
      colors: {
        // Legacy aliases (mantidos para compatibilidade)
        ink: '#060913',
        panel: '#0f1829',
        panelLight: '#182442',
        neon: '#a855f7',
        electric: '#00d4ff',
        gold: '#ffc72c',
        // Paleta arcade ampliada
        crtVoid: '#060913',
        arcadeCyan: '#00d4ff',
        coinGold: '#ffc72c',
        synthwave: '#a855f7',
        oneUp: '#10B981',
        pixelRed: '#ef4444',
        // Painéis
        panelDeep: '#0a1020',
        panelBorder: 'rgba(255,255,255,0.08)',
      },
      boxShadow: {
        // Legacy
        pixel: '0 5px 0 rgba(4, 7, 18, 0.45)',
        neon: '0 0 20px rgba(168, 85, 247, 0.25)',
        // Novos — táteis 3D
        'arcade-cyan': '0 0 20px rgba(0, 212, 255, 0.3)',
        'arcade-gold': '0 0 20px rgba(255, 199, 44, 0.35)',
        'btn-3d': '0 4px 0 rgba(0,0,0,0.6)',
        'btn-3d-cyan': '0 4px 0 rgba(0,100,140,0.7)',
        'btn-3d-gold': '0 4px 0 rgba(120,80,0,0.7)',
        'btn-3d-purple': '0 4px 0 rgba(80,20,130,0.7)',
        'inset-active': 'inset 0 2px 4px rgba(0,0,0,0.5)',
        'crt-glow': '0 0 40px rgba(0, 212, 255, 0.08)',
      },
      spacing: {
        88: '22rem',
      },
      animation: {
        'scanline': 'scanline 8s linear infinite',
        'marquee': 'marquee 28s linear infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4,0,0.6,1) infinite',
        'blink': 'blink 1s step-end infinite',
      },
      keyframes: {
        scanline: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
      },
    },
  },
  plugins: [],
}