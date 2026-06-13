'use client'

import { useEffect } from 'react'
import { useAccount } from 'wagmi'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useOnboarding } from '@/hooks/useOnboarding'

const BUILDER_ADDRESS = process.env.NEXT_PUBLIC_BUILDER_ADDRESS
const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || 'Coinbroo'

export function OnboardingModal() {
  const { address, isConnected } = useAccount()
  const { state, error, isNew, runOnboarding, isApproved, reset } = useOnboarding()

  // Auto-trigger only when idle — not when cancelled or in progress
  useEffect(() => {
    if (isConnected && address && !isApproved(address) && state === 'idle') {
      runOnboarding(address)
    }
  }, [isConnected, address, state, isApproved, runOnboarding])

  // Don't show modal if approved or done
  if (!isConnected || (address && isApproved(address)) || state === 'done') {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-bg-secondary border border-border-primary rounded-2xl p-6 w-full max-w-sm mx-4 shadow-2xl">

        {/* Logo */}
        <div className="flex items-center gap-2 mb-5">
          <div className="w-8 h-8 rounded-lg bg-accent-blue flex items-center justify-center">
            <span className="text-white font-bold">H</span>
          </div>
          <span className="text-text-primary font-semibold text-lg">{APP_NAME}</span>
        </div>

        {!isConnected ? (
          <>
            <h2 className="text-text-primary font-semibold text-lg mb-1">Connect your wallet</h2>
            <p className="text-text-muted text-sm mb-5">
              Trade perps on Hyperliquid directly from {APP_NAME}. Your keys, your trades.
            </p>
            <div className="flex justify-center">
              <ConnectButton />
            </div>
          </>
        ) : state === 'cancelled' ? (
          <>
            <h2 className="text-text-primary font-semibold mb-2">Approval skipped</h2>
            <p className="text-text-muted text-sm mb-4">
              You cancelled the approval. {APP_NAME} needs this one-time signature to collect builder fees on your trades.
            </p>
            <button
              onClick={reset}
              className="w-full py-2.5 bg-accent-blue text-white rounded-lg text-sm font-medium hover:bg-accent-blue-dim transition-colors"
            >
              Try again
            </button>
          </>
        ) : state === 'checking' ? (
          <>
            <h2 className="text-text-primary font-semibold mb-2">Setting up your account...</h2>
            <p className="text-text-muted text-sm">Checking your Hyperliquid account status.</p>
            <div className="mt-4 h-1 bg-bg-tertiary rounded-full overflow-hidden">
              <div className="h-full bg-accent-blue rounded-full animate-pulse w-1/3" />
            </div>
          </>
        ) : state === 'approving' ? (
          <>
            <h2 className="text-text-primary font-semibold mb-2">One-time approval needed</h2>
            {isNew && (
              <div className="bg-long-bg border border-long/30 rounded-lg px-3 py-2 mb-3">
                <p className="text-long text-xs font-medium">New user detected</p>
                <p className="text-long/70 text-xs mt-0.5">Referral bonus will be applied to your account.</p>
              </div>
            )}
            <p className="text-text-muted text-sm mb-4">
              Sign this one-time approval to allow {APP_NAME} to submit trades on your behalf.
              Your funds stay in your wallet — this only enables fee collection.
            </p>
            <div className="bg-bg-tertiary rounded-lg p-3 mb-4 space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-text-muted">Builder address</span>
                <span className="font-mono text-text-secondary">{BUILDER_ADDRESS?.slice(0, 6)}…{BUILDER_ADDRESS?.slice(-4)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-text-muted">Max fee</span>
                <span className="text-text-secondary">{(parseInt(process.env.NEXT_PUBLIC_BUILDER_FEE || '3') / 1000).toFixed(3)}% per trade</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-text-muted">Revokable</span>
                <span className="text-long">Yes, anytime</span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-text-muted animate-pulse">
              <div className="w-3 h-3 rounded-full border-2 border-accent-blue border-t-transparent animate-spin" />
              Waiting for wallet signature...
            </div>
          </>
        ) : state === 'error' ? (
          <>
            <h2 className="text-text-primary font-semibold mb-2">Something went wrong</h2>
            <p className="text-short text-sm mb-4">{error}</p>
            <button
              onClick={reset}
              className="w-full py-2.5 bg-accent-blue text-white rounded-lg text-sm font-medium hover:bg-accent-blue-dim transition-colors"
            >
              Try again
            </button>
          </>
        ) : null}
      </div>
    </div>
  )
}
