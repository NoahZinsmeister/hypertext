import { useMemo, useEffect, useState } from 'react'
import { useWeb3React } from '@web3-react/core'
import { ChainId, WETH, Token } from '@uniswap/sdk'

import { useTokens } from './context'

const DEFAULT_TOKENS = [
  ...Object.values(WETH),

  new Token(ChainId.MAINNET, '0x6B175474E89094C44Da98b954EedeAC495271d0F', 18, 'DAI', 'Dai Stablecoin'),
  new Token(ChainId.MAINNET, '0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2', 18, 'MKR', 'Maker'),

  new Token(ChainId.KOVAN, '0x4F96Fe3b7A6Cf9725f59d353F723c1bDb64CA6Aa', 18, 'DAI', 'Dai Stablecoin'),
  new Token(ChainId.KOVAN, '0xAaF64BFCC32d0F15873a02163e7E500671a4ffcD', 18, 'MKR', 'Maker'),
]

export function useAllTokens(): [Token[], ReturnType<typeof useTokens>[1]] {
  const { chainId } = useWeb3React()
  const [tokens, { addTokenByAddress, removeToken }] = useTokens()

  return [
    useMemo(() => {
      const seen: { [address: string]: boolean } = {}
      return DEFAULT_TOKENS.concat(tokens).filter((token) => {
        if (token.chainId === chainId && !seen[token.address]) {
          seen[token.address] = true
          return true
        } else {
          return false
        }
      })
    }, [tokens, chainId]),
    { addTokenByAddress, removeToken },
  ]
}

let BROKEN: { [chainId: number]: { [address: string]: boolean } } = {}

export function useTokenByAddress(tokenAddress?: string): Token | undefined {
  const { chainId } = useWeb3React()
  const [allTokens, { addTokenByAddress }] = useAllTokens()

  const existingToken = useMemo(() => allTokens.filter((token) => token.address === tokenAddress)[0], [
    allTokens,
    tokenAddress,
  ])

  const [, setDummy] = useState(0)
  useEffect(() => {
    if (typeof chainId === 'number' && tokenAddress && !existingToken && !BROKEN[chainId]?.[tokenAddress]) {
      addTokenByAddress(tokenAddress).catch(() => {
        BROKEN = {
          ...BROKEN,
          [chainId]: {
            ...BROKEN?.[chainId],
            [tokenAddress]: true,
          },
        }
        setDummy((dummy) => dummy + 1)
      })
    }
  }, [chainId, tokenAddress, existingToken, addTokenByAddress])

  return BROKEN[chainId]?.[tokenAddress] ? null : existingToken
}
