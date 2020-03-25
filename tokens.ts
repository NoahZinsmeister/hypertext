import { useMemo } from 'react'
import { useWeb3React } from '@web3-react/core'
import { ChainId, WETH, Token } from '@uniswap/sdk'

import { DEFAULT_CHAIN_ID } from './constants'

const ALL_TOKENS = [
  ...Object.values(WETH).filter(token => token.chainId !== ChainId.MAINNET),
  new Token(ChainId.RINKEBY, '0xc7AD46e0b8a400Bb3C915120d284AafbA8fc4735', 18, 'DAI', 'Dai Stablecoin')
]

export function useAllTokens() {
  const { chainId } = useWeb3React()
  return useMemo(() => ALL_TOKENS.filter(token => token.chainId === (chainId ?? DEFAULT_CHAIN_ID)), [chainId])
}

export function useToken(tokenAddress?: string) {
  const allTokens = useAllTokens()
  return useMemo(() => allTokens.filter(token => token.address === tokenAddress)?.[0], [allTokens, tokenAddress])
}
