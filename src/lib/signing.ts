import { type WalletClient, encodePacked, keccak256, toBytes, bytesToHex } from 'viem'
import { BUILDER_ADDRESS, BUILDER_FEE, REFERRAL_CODE } from './hyperliquid'

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

function getNonce(): number {
  return Date.now()
}

function splitSig(sig: string): { r: string; s: string; v: number } {
  const r = '0x' + sig.slice(2, 66)
  const s = '0x' + sig.slice(66, 130)
  const v = parseInt(sig.slice(130, 132), 16)
  return { r, s, v }
}

// ─── ApproveBuilderFee ────────────────────────────────────────────────────────

export async function signApproveBuilderFee(walletClient: WalletClient): Promise<{
  action: object
  nonce: number
  signature: { r: string; s: string; v: number }
}> {
  const nonce = getNonce()
  const maxFeeRate = `${(BUILDER_FEE / 1000).toFixed(4)}%`
  const account = walletClient.account!

  // Use wallet's actual chainId so viem doesn't reject the signature
  const chainId = await walletClient.getChainId()
  const signatureChainId = '0x' + chainId.toString(16)

  const action = {
    type: 'approveBuilderFee',
    hyperliquidChain: 'Mainnet',
    signatureChainId,
    maxFeeRate,
    builder: BUILDER_ADDRESS,
    nonce,
  }

  const hexSig = await walletClient.signTypedData({
    account,
    domain: {
      name: 'HyperliquidSignTransaction',
      version: '1',
      chainId,
      verifyingContract: ZERO_ADDRESS as `0x${string}`,
    },
    types: {
      'HyperliquidTransaction:ApproveBuilderFee': [
        { name: 'hyperliquidChain', type: 'string' },
        { name: 'maxFeeRate', type: 'string' },
        { name: 'builder', type: 'address' },
        { name: 'nonce', type: 'uint64' },
      ],
    },
    primaryType: 'HyperliquidTransaction:ApproveBuilderFee',
    message: {
      hyperliquidChain: 'Mainnet',
      maxFeeRate,
      builder: BUILDER_ADDRESS as `0x${string}`,
      nonce: BigInt(nonce),
    },
  })

  return { action, nonce, signature: splitSig(hexSig) }
}

// ─── Market Order ─────────────────────────────────────────────────────────────

export interface OrderParams {
  coin: string
  isBuy: boolean
  sz: number
  px?: number
  leverage?: number
  reduceOnly?: boolean
}

export async function signOrder(
  walletClient: WalletClient,
  params: OrderParams
): Promise<{ action: object; nonce: number; signature: { r: string; s: string; v: number } }> {
  const nonce = getNonce()
  const isMarket = !params.px

  const order = {
    a: 0,
    b: params.isBuy,
    p: isMarket ? '0' : params.px!.toFixed(6),
    s: params.sz.toFixed(6),
    r: params.reduceOnly ?? false,
    t: isMarket
      ? { market: { tpsl: 'none', limitPx: '0' } }
      : { limit: { tif: 'Gtc' } },
  }

  const action = {
    type: 'order',
    orders: [order],
    grouping: 'na',
    builder: {
      b: BUILDER_ADDRESS,
      f: BUILDER_FEE,
    },
  }

  const actionHash = keccak256(encodePacked(['bytes', 'uint64', 'bool'], [bytesToHex(toBytes(JSON.stringify(action))), BigInt(nonce), false]))

  const hexSig = await walletClient.signMessage({
    account: walletClient.account!,
    message: { raw: toBytes(actionHash) },
  })

  return { action, nonce, signature: splitSig(hexSig) }
}

// ─── Cancel Order ─────────────────────────────────────────────────────────────

export async function signCancel(
  walletClient: WalletClient,
  coin: string,
  oid: number
): Promise<{ action: object; nonce: number; signature: { r: string; s: string; v: number } }> {
  const nonce = getNonce()

  const action = {
    type: 'cancel',
    cancels: [{ a: 0, o: oid }],
  }

  const actionHash = keccak256(encodePacked(['bytes', 'uint64', 'bool'], [bytesToHex(toBytes(JSON.stringify(action))), BigInt(nonce), false]))

  const hexSig = await walletClient.signMessage({
    account: walletClient.account!,
    message: { raw: toBytes(actionHash) },
  })

  return { action, nonce, signature: splitSig(hexSig) }
}

// ─── Withdraw ─────────────────────────────────────────────────────────────────

export async function signWithdraw(
  walletClient: WalletClient,
  amount: string,
  destination: string
): Promise<{ action: object; nonce: number; signature: { r: string; s: string; v: number } }> {
  const nonce = getNonce()
  const account = walletClient.account!

  const action = {
    type: 'withdraw3',
    hyperliquidChain: 'Mainnet',
    signatureChainId: '0xa4b1',
    amount,
    time: nonce,
    destination,
  }

  const hexSig = await walletClient.signTypedData({
    account,
    domain: {
      name: 'HyperliquidSignTransaction',
      version: '1',
      chainId: 42161,
      verifyingContract: ZERO_ADDRESS as `0x${string}`,
    },
    types: {
      'HyperliquidTransaction:Withdraw': [
        { name: 'hyperliquidChain', type: 'string' },
        { name: 'destination', type: 'string' },
        { name: 'amount', type: 'string' },
        { name: 'time', type: 'uint64' },
      ],
    },
    primaryType: 'HyperliquidTransaction:Withdraw',
    message: {
      hyperliquidChain: 'Mainnet',
      destination,
      amount,
      time: BigInt(nonce),
    },
  })

  return { action, nonce, signature: splitSig(hexSig) }
}

export { REFERRAL_CODE }
