'use client'

import { useEffect, useRef } from 'react'
import { useDisconnect, useAccount } from 'wagmi'

const INACTIVITY_MS = 30 * 60 * 1000 // 30 minutes

export function useAutoDisconnect() {
  const { isConnected } = useAccount()
  const { disconnect } = useDisconnect()
  const timer = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    if (!isConnected) return

    const reset = () => {
      clearTimeout(timer.current)
      timer.current = setTimeout(() => disconnect(), INACTIVITY_MS)
    }

    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart']
    events.forEach(e => window.addEventListener(e, reset, { passive: true }))
    reset()

    return () => {
      clearTimeout(timer.current)
      events.forEach(e => window.removeEventListener(e, reset))
    }
  }, [isConnected, disconnect])
}
