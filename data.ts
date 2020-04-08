import { useMemo } from 'react'
import useSWR from 'swr'
import { Token, TokenAmount, Pair, JSBI } from '@uniswap/sdk'
import { useWeb3React } from '@web3-react/core'
import { Contract } from '@ethersproject/contracts'

import { ADDRESS_ZERO, ERC20, PAIR, ZERO } from './constants'
import { useContract } from './hooks'

export enum DataType {
  ETHBalance,
  TokenBalance,
  TokenAllowance,
  Reserves,
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getETHBalance(_: DataType, ETH: Token, address: string, library: any): Promise<TokenAmount> {
  return library
    .getBalance(address)
    .then((balance: { toString: () => string }) => new TokenAmount(ETH, balance.toString()))
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function useETHBalance(address?: string) {
  const { library, chainId } = useWeb3React()
  const ETH = useMemo(() => (typeof chainId === 'number' ? new Token(chainId, ADDRESS_ZERO, 18) : undefined), [chainId])
  const shouldFetch = !!ETH && typeof address === 'string' && !!library
  return useSWR(shouldFetch ? [DataType.ETHBalance, ETH, address, library] : null, getETHBalance, {
    refreshInterval: 60 * 1000,
  })
}

async function getTokenBalance(_: DataType, token: Token, contract: Contract, address: string): Promise<TokenAmount> {
  return contract
    .balanceOf(address)
    .then((balance: { toString: () => string }) => new TokenAmount(token, balance.toString()))
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function useTokenBalance(token?: Token, address?: string) {
  const contract = useContract(token?.address, ERC20)
  const shouldFetch = !!contract && typeof address === 'string'
  return useSWR(shouldFetch ? [DataType.TokenBalance, token, contract, address] : null, getTokenBalance, {
    refreshInterval: 60 * 1000,
  })
}

async function getTokenAllowance(
  _: DataType,
  token: Token,
  contract: Contract,
  owner: string,
  spender: string
): Promise<TokenAmount> {
  return contract
    .allowance(owner, spender)
    .then((balance: { toString: () => string }) => new TokenAmount(token, balance.toString()))
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function useTokenAllowance(token?: Token, owner?: string, spender?: string) {
  const contract = useContract(token?.address, ERC20)
  const shouldFetch = !!contract && typeof owner === 'string' && typeof spender === 'string'
  return useSWR(shouldFetch ? [DataType.TokenAllowance, token, contract, owner, spender] : null, getTokenAllowance, {
    refreshInterval: 60 * 1000,
  })
}

async function getReserves(_: DataType, token0: Token, token1: Token, contract: Contract): Promise<Pair | null> {
  return contract
    .getReserves()
    .then((reserves: { reserve0: { toString: () => string }; reserve1: { toString: () => string } }) => {
      const pair = new Pair(
        new TokenAmount(token0, reserves.reserve0.toString()),
        new TokenAmount(token1, reserves.reserve1.toString())
      )
      return JSBI.equal(pair.reserve0.raw, ZERO) || JSBI.equal(pair.reserve1.raw, ZERO) ? null : pair
    })
    .catch(() => null)
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function useReserves(tokenA?: Token, tokenB?: Token) {
  const [token0, token1] =
    !!!tokenA || !!!tokenB ? [] : tokenA.sortsBefore(tokenB) ? [tokenA, tokenB] : [tokenA, tokenB]
  const pairAddress = !!token0 && !!token1 ? Pair.getAddress(token0, token1) : undefined
  const contract = useContract(pairAddress, PAIR)
  const shouldFetch = !!contract
  return useSWR(shouldFetch ? [DataType.Reserves, token0, token1, contract] : null, getReserves, {
    refreshInterval: 60 * 1000,
  })
}
