'use client'

import { useState, useCallback } from 'react'
import { useWalletClient } from 'wagmi'
import { isNewUser, postExchange } from '@/lib/hyperliquid'
import { signApproveBuilderFee } from '@/lib/signing'

type OnboardState = 'idle' | 'checking' | 'approving' | 'done' | 'error' | 'cancelled'

const STORAGE_KEY = 'ht_builder_approved'

export function useOnboarding() {
  const { data: walletClient } = useWalletClient()
  const [state, setState] = useState<OnboardState>('idle')
  const [error, setError] = useState<string | null>(null)
  const [isNew, setIsNew] = useState(false)

  const isApproved = useCallback((address: string): boolean => {
    if (typeof window === 'undefined') return false
    const approved = localStorage.getItem(STORAGE_KEY)
    if (!approved) return false
    try {
      const list: string[] = JSON.parse(approved)
      return list.includes(address.toLowerCase())
    } catch { return false }
  }, [])

  const markApproved = useCallback((address: string) => {
    if (typeof window === 'undefined') return
    const existing = localStorage.getItem(STORAGE_KEY)
    let list: string[] = []
    try { list = existing ? JSON.parse(existing) : [] } catch { list = [] }
    if (!list.includes(address.toLowerCase())) {
      list.push(address.toLowerCase())
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
    }
  }, [])

  const reset = useCallback(() => {
    setState('idle')
    setError(null)
  }, [])

  const runOnboarding = useCallback(async (address: string) => {
    if (!walletClient) return
    if (isApproved(address)) return
    // Don't re-trigger if already in progress or cancelled
    if (state === 'checking' || state === 'approving' || state === 'cancelled') return

    setState('checking')
    setError(null)

    try {
      const newUser = await isNewUser(address)
      setIsNew(newUser)

      setState('approving')

      const { action, nonce, signature } = await signApproveBuilderFee(walletClient)

      console.log('Sending to HL exchange:', JSON.stringify({ action, nonce, signature }, null, 2))

      const result = await postExchange(action, nonce, signature)

      console.log('HL exchange result:', result)

      if (result?.status === 'ok') {
        markApproved(address)
        setState('done')
      } else {
        throw new Error(JSON.stringify(result?.response) || 'ApproveBuilderFee failed')
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error'
      console.error('Onboarding error:', msg)
      if (msg.includes('rejected') || msg.includes('denied') || msg.includes('cancelled') || msg.includes('cancel') || msg.includes('User rejected')) {
        setState('cancelled') // Stop retrying — user explicitly cancelled
      } else {
        setError(msg)
        setState('error')
      }
    }
  }, [walletClient, isApproved, markApproved, state])

  return { state, error, isNew, runOnboarding, isApproved, reset }
}
