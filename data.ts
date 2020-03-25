import useSWR from 'swr'
import { Token, TokenAmount } from '@uniswap/sdk'
import { useWeb3React } from '@web3-react/core'

import { ADDRESS_ZERO } from './constants'

export enum DataType {
  ETHBalance
}

function getETHBalance(_: DataType, address: string, library: any, chainId: number): Promise<TokenAmount> {
  const ETH = new Token(chainId, ADDRESS_ZERO, 18)
  return library.getBalance(address).then(balance => new TokenAmount(ETH, balance.toString()))
}

export function useETHBalance(address: any) {
  const { library, chainId } = useWeb3React()
  const shouldFetch = typeof address === 'string' && !!library && typeof chainId === 'number'
  return useSWR(shouldFetch ? [DataType.ETHBalance, address, library, chainId] : null, getETHBalance, {
    refreshInterval: 60 * 1000
  })
}
