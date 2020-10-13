import { useMemo, useEffect } from 'react'
import { useWeb3React } from '@web3-react/core'
import { ChainId, WETH, Token } from '@uniswap/sdk'

import { useLocalStorageTokens } from './context'
import { useOnchainToken } from './data'

export const DAI = new Token(ChainId.MAINNET, '0x6B175474E89094C44Da98b954EedeAC495271d0F', 18, 'DAI', 'Dai Stablecoin')
export const USDC = new Token(ChainId.MAINNET, '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 6, 'USDC', 'USD Coin')
export const UNI = new Token(ChainId.MAINNET, '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984', 18, 'UNI', 'Uniswap')

export const DEFAULT_TOKENS = [
  ...Object.values(WETH),

  // stablecoins
  DAI,
  USDC,
  new Token(ChainId.MAINNET, '0xdAC17F958D2ee523a2206206994597C13D831ec7', 6, 'USDT', 'Tether USD'),
  // stablecoin derivatives
  new Token(ChainId.MAINNET, '0x5d3a536E4D6DbD6114cc1Ead35777bAB948E3643', 8, 'cDAI', 'Compound Dai'),
  new Token(ChainId.MAINNET, '0x06AF07097C9Eeb7fD685c692751D5C66dB49c215', 18, 'CHAI', 'Chai'),
  new Token(ChainId.MAINNET, '0x39AA39c021dfbaE8faC545936693aC917d5E7563', 8, 'cUSDC', 'Compound USD Coin'),
  // uniswap
  UNI,
  // compound
  new Token(ChainId.MAINNET, '0xc00e94Cb662C3520282E6f5717214004A7f26888', 18, 'COMP', 'Compound'),
  // maker
  new Token(ChainId.MAINNET, '0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2', 18, 'MKR', 'Maker'),
  // uma
  new Token(ChainId.MAINNET, '0x04Fa0d235C4abf4BcF4787aF4CF447DE572eF828', 18, 'UMA', 'UMA Voting Token v1'),
  // wbtc
  new Token(ChainId.MAINNET, '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', 8, 'WBTC', 'Wrapped BTC'),
  // donut
  new Token(ChainId.MAINNET, '0xC0F9bD5Fa5698B6505F643900FFA515Ea5dF54A9', 18, 'DONUT', 'Donut'),

  // kovan
  new Token(ChainId.KOVAN, '0x4F96Fe3b7A6Cf9725f59d353F723c1bDb64CA6Aa', 18, 'DAI', 'Dai Stablecoin'),
  new Token(ChainId.KOVAN, '0xAaF64BFCC32d0F15873a02163e7E500671a4ffcD', 18, 'MKR', 'Maker'),
]

export function useAllTokens(): [Token[], ReturnType<typeof useLocalStorageTokens>[1]] {
  const { chainId } = useWeb3React()
  const [tokens, { addToken, removeToken }] = useLocalStorageTokens()

  const combinedTokens = useMemo(() => {
    const seen: { [address: string]: boolean } = {}
    return DEFAULT_TOKENS.concat(tokens).filter((token) => {
      if (token.chainId === chainId && !seen[token.address]) {
        seen[token.address] = true
        return true
      } else {
        return false
      }
    })
  }, [tokens, chainId])

  return [combinedTokens, { addToken, removeToken }]
}

export function useTokenByAddressAndAutomaticallyAdd(tokenAddress?: string): Token | undefined {
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
