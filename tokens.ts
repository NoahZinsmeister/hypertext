import { useMemo } from 'react'
import { useWeb3React } from '@web3-react/core'
import { ChainId, WETH, Token } from '@uniswap/sdk'

import { DEFAULT_CHAIN_ID } from './constants'
import { useTokens } from './context'

const DEFAULT_TOKENS = [
  ...Object.values(WETH).filter((token) => token.chainId !== ChainId.MAINNET),
  new Token(ChainId.RINKEBY, '0xc7AD46e0b8a400Bb3C915120d284AafbA8fc4735', 18, 'DAI', 'Dai Stablecoin'),
  new Token(ChainId.RINKEBY, '0x8ab15C890E5C03B5F240f2D146e3DF54bEf3Df44', 18, 'IANV2', 'Ian V2 Coin'),
  new Token(ChainId.RINKEBY, '0xF9bA5210F91D0474bd1e1DcDAeC4C58E359AaD85', 18, 'MKR', 'Maker'),
  new Token(ChainId.KOVAN, '0x4F96Fe3b7A6Cf9725f59d353F723c1bDb64CA6Aa', 18, 'DAI', 'Dai Stablecoin'),
  new Token(ChainId.ROPSTEN, '0xaD6D458402F60fD3Bd25163575031ACDce07538D', 18, 'DAI', 'Dai Stablecoin'),
  new Token(ChainId.GÖRLI, '0xaD6D458402F60fD3Bd25163575031ACDce07538D', 18, 'DAI', 'Dai Stablecoin'),
]

export function useAllTokens(): [Token[], (address: string) => Promise<Token | null>] {
  const { chainId } = useWeb3React()
  const [tokens, { addToken }] = useTokens()

  return [
    useMemo(() => {
      let seen: { [address: string]: boolean } = {}
      return DEFAULT_TOKENS.concat(tokens).filter((token) => {
        if (token.chainId === (chainId ?? DEFAULT_CHAIN_ID) && !seen[token.address]) {
          seen[token.address] = true
          return true
        } else {
          return false
        }
      })
    }, [tokens, chainId]),
    addToken,
  ]
}

export function useToken(tokenAddress?: string) {
  const [allTokens] = useAllTokens()
  return useMemo(() => allTokens.filter((token) => token.address === tokenAddress)?.[0], [allTokens, tokenAddress])
}
