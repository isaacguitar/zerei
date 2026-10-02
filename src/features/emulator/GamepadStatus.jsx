import { Gamepad2 } from 'lucide-react'
import { useEffect, useState } from 'react'

export default function GamepadStatus() {
  const [gamepads, setGamepads] = useState([])

  useEffect(() => {
    function refreshGamepads() {
      setGamepads(Array.from(navigator.getGamepads?.() ?? []).filter(Boolean))
    }

    refreshGamepads()
    window.addEventListener('gamepadconnected', refreshGamepads)
    window.addEventListener('gamepaddisconnected', refreshGamepads)
    const pollingId = window.setInterval(refreshGamepads, 500)
    return () => {
      window.removeEventListener('gamepadconnected', refreshGamepads)
      window.removeEventListener('gamepaddisconnected', refreshGamepads)
      window.clearInterval(pollingId)
    }
  }, [])

  const connected = gamepads.length > 0
  return <span className={`flex items-center gap-1.5 text-[9px] font-bold uppercase ${connected ? 'text-emerald-300' : 'text-slate-500'}`} title={connected ? gamepads.map((gamepad) => gamepad.id).join(' | ') : undefined}><Gamepad2 size={12} /> {connected ? `${gamepads.length} controle${gamepads.length > 1 ? 's' : ''} detectado${gamepads.length > 1 ? 's' : ''}` : 'Controle não conectado'}</span>
}

export function GamepadIcon() {
  return <Gamepad2 size={14} />
}