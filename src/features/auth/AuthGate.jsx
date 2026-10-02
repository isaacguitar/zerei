import { useEffect, useState } from 'react'
import AuthScreen from './AuthScreen'
import { signInDemo, subscribeToAuth } from './authService'

export default function AuthGate({ children }) {
  const [session, setSession] = useState(undefined)

  useEffect(() => {
    return subscribeToAuth(setSession)
  }, [])

  if (session === undefined) {
    return <div className="min-h-screen bg-ink" />
  }

  if (!session) {
    return <AuthScreen onDemoSignIn={() => setSession(signInDemo())} />
  }

  return children
}
