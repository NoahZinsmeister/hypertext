import { useMemo, useEffect } from 'react'
import { useWeb3React } from '@web3-react/core'
import { ChainId, WETH, Token } from '@uniswap/sdk'

import { useLocalStorageTokens } from './context'
import { useOnchainToken } from './data'

export const DEFAULT_TOKENS = [
  ...Object.values(WETH),

  new Token(ChainId.MAINNET, '0x6B175474E89094C44Da98b954EedeAC495271d0F', 18, 'DAI', 'Dai Stablecoin'),
  new Token(ChainId.MAINNET, '0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2', 18, 'MKR', 'Maker'),

  new Token(ChainId.KOVAN, '0x4F96Fe3b7A6Cf9725f59d353F723c1bDb64CA6Aa', 18, 'DAI', 'Dai Stablecoin'),
  new Token(ChainId.KOVAN, '0xAaF64BFCC32d0F15873a02163e7E500671a4ffcD', 18, 'MKR', 'Maker'),
]

export function useAllTokens(): [Token[], ReturnType<typeof useLocalStorageTokens>[1]] {
  const { chainId } = useWeb3React()
  const [tokens, { addToken, removeToken }] = useLocalStorageTokens()

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
    { addToken, removeToken },
  ]
}

export function useTokenByAddress(tokenAddress?: string): Token | undefined {
  const [allTokens, { addToken }] = useAllTokens()

  const token = useMemo(() => allTokens.filter((token) => token.address === tokenAddress)[0], [allTokens, tokenAddress])

  // fetches onchain data for tokens if they're not in our list already, then adds them to the list
  const { data } = useOnchainToken(token ? undefined : tokenAddress)
  useEffect(() => {
    if (data) {
      addToken(data)
    }
  }, [data, addToken])

  return token
}
