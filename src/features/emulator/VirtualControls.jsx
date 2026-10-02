import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Circle, Gamepad2, Square } from 'lucide-react'
import { useEffect, useState } from 'react'

const keyMap = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  z: 'a',
  x: 'b',
  Enter: 'start',
}

function emitInput(button, pressed) {
  window.dispatchEvent(new CustomEvent('zerei:input', { detail: { button, pressed } }))
}

function isTextEntryEvent(event) {
  const selector = 'input, textarea, select, [contenteditable]:not([contenteditable="false"])'
  const activeElement = document.activeElement
  if (activeElement instanceof HTMLElement && activeElement.matches(selector)) return true

  return event.composedPath().some((target) =>
    target instanceof HTMLElement && (target.matches(selector) || target.isContentEditable)
  )
}

function ControlButton({ label, icon: Icon, className = '', onPress }) {
  return <button aria-label={label} className={`flex h-10 w-10 touch-none items-center justify-center rounded-xl border border-white/15 bg-slate-950/70 text-slate-300 shadow-lg transition active:scale-90 active:bg-electric/20 active:text-electric ${className}`} onPointerDown={(event) => { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); onPress(true) }} onPointerUp={(event) => { onPress(false); event.currentTarget.releasePointerCapture?.(event.pointerId) }} onPointerCancel={() => onPress(false)}><Icon size={16} /></button>
}

export default function VirtualControls({ enabled = true }) {
  const [pressed, setPressed] = useState(null)

  useEffect(() => {
    if (!enabled) {
      Object.values(keyMap).forEach((button) => emitInput(button, false))
      setPressed(null)
      return undefined
    }

    function handleKeyDown(event) {
      const button = keyMap[event.key]
      if (!button || event.repeat) return
      if (isTextEntryEvent(event)) return
      event.preventDefault()
      event.stopPropagation()
      setPressed(button)
      emitInput(button, true)
    }

    function handleKeyUp(event) {
      const button = keyMap[event.key]
      if (!button) return
      if (isTextEntryEvent(event)) return
      event.preventDefault()
      event.stopPropagation()
      setPressed(null)
      emitInput(button, false)
    }

    function releaseAllInputs() {
      Object.values(keyMap).forEach((button) => emitInput(button, false))
      setPressed(null)
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    window.addEventListener('blur', releaseAllInputs)
    document.addEventListener('visibilitychange', releaseAllInputs)

    return () => {
      releaseAllInputs()
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      window.removeEventListener('blur', releaseAllInputs)
      document.removeEventListener('visibilitychange', releaseAllInputs)
    }
  }, [enabled])

  const press = (button) => (isPressed) => { setPressed(isPressed ? button : null); emitInput(button, isPressed) }

  return <div className="rounded-2xl border border-white/10 bg-slate-950/35 p-4"><div className="mb-3 flex items-center justify-between"><span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400"><Gamepad2 size={14} className="text-electric" /> Controles virtuais</span><span className="text-[9px] text-slate-600">teclado ou toque</span></div><div className="flex items-center justify-between gap-6"><div className="relative grid h-[104px] w-[120px] grid-cols-3 grid-rows-3"><ControlButton label="Cima" icon={ArrowUp} className="col-start-2 row-start-1" onPress={press('up')} /><ControlButton label="Esquerda" icon={ArrowLeft} className="col-start-1 row-start-2" onPress={press('left')} /><span className="col-start-2 row-start-2 flex items-center justify-center text-slate-700"><Square size={18} fill="currentColor" /></span><ControlButton label="Direita" icon={ArrowRight} className="col-start-3 row-start-2" onPress={press('right')} /><ControlButton label="Baixo" icon={ArrowDown} className="col-start-2 row-start-3" onPress={press('down')} /></div><div className="flex items-center gap-3"><ControlButton label="Botão B" icon={Circle} className={`h-12 w-12 rounded-full border-gold/40 text-gold ${pressed === 'b' ? 'bg-gold/20' : ''}`} onPress={press('b')} /><ControlButton label="Botão A" icon={Circle} className={`h-12 w-12 rounded-full border-neon/40 text-neon ${pressed === 'a' ? 'bg-neon/20' : ''}`} onPress={press('a')} /></div></div><div className="mt-3 flex justify-center"><ControlButton label="Start" icon={Square} className="h-7 w-14 rounded-full text-[9px]" onPress={press('start')} /></div></div>
}
