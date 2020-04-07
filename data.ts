import useSWR from 'swr'
import { Token, TokenAmount } from '@uniswap/sdk'
import { useWeb3React } from '@web3-react/core'
import { Contract } from '@ethersproject/contracts'

import { ADDRESS_ZERO, ERC20 } from './constants'
import { useMemo } from 'react'
import { useContract } from './hooks'

export enum DataType {
  ETHBalance,
  TokenBalance,
  TokenAllowance
}

async function getETHBalance(_: DataType, ETH: Token, address: string, library: any): Promise<TokenAmount> {
  return library.getBalance(address).then((balance: any) => new TokenAmount(ETH, balance.toString()))
}

export function useETHBalance(address?: string) {
  const { library, chainId } = useWeb3React()
  const ETH = useMemo(() => (typeof chainId === 'number' ? new Token(chainId, ADDRESS_ZERO, 18) : undefined), [chainId])
  const shouldFetch = !!ETH && typeof address === 'string' && !!library
  return useSWR(shouldFetch ? [DataType.ETHBalance, ETH, address, library] : null, getETHBalance, {
    refreshInterval: 60 * 1000
  })
}

async function getTokenBalance(_: DataType, token: Token, contract: Contract, address: string): Promise<TokenAmount> {
  return contract.balanceOf(address).then((balance: any) => new TokenAmount(token, balance.toString()))
}

export function useTokenBalance(token?: Token, address?: string) {
  const contract = useContract(token?.address, ERC20)
  const shouldFetch = !!contract && typeof address === 'string'
  return useSWR(shouldFetch ? [DataType.TokenBalance, token, contract, address] : null, getTokenBalance, {
    refreshInterval: 60 * 1000
  })
}

async function getTokenAllowance(
  _: DataType,
  token: Token,
  contract: Contract,
  owner: string,
  spender: string
): Promise<TokenAmount> {
  return contract.allowance(owner, spender).then((balance: any) => new TokenAmount(token, balance.toString()))
}

export function useTokenAllowance(token?: Token, owner?: string, spender?: string) {
  const contract = useContract(token?.address, ERC20)
  const shouldFetch = !!contract && typeof owner === 'string' && typeof spender === 'string'
  return useSWR(shouldFetch ? [DataType.TokenAllowance, token, contract, owner, spender] : null, getTokenAllowance, {
    refreshInterval: 60 * 1000
  })
}
