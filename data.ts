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
function getETHBalance(library: any): (_: DataType, chainId: number, address: string) => Promise<TokenAmount> {
  return async (_, chainId: number, address: string): Promise<TokenAmount> => {
    const ETH = new Token(chainId, ADDRESS_ZERO, 18)
    return library
      .getBalance(address)
      .then((balance: { toString: () => string }) => new TokenAmount(ETH, balance.toString()))
  }
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function useETHBalance(address?: string) {
  const { chainId, library } = useWeb3React()
  const shouldFetch = typeof chainId === 'number' && typeof address === 'string' && !!library
  return useSWR(shouldFetch ? [DataType.ETHBalance, chainId, address] : null, getETHBalance(library), {
    refreshInterval: 45 * 1000,
  })
}

function getTokenBalance(
  contract: Contract,
  token: Token
): (_: DataType, __: number, ___: string, address: string) => Promise<TokenAmount> {
  return async (_, __, ___, address: string): Promise<TokenAmount> =>
    contract
      .balanceOf(address)
      .then((balance: { toString: () => string }) => new TokenAmount(token, balance.toString()))
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function useTokenBalance(token?: Token, address?: string) {
  const contract = useContract(token?.address, ERC20)
  const shouldFetch = !!contract && typeof address === 'string'
  return useSWR(
    shouldFetch ? [DataType.TokenBalance, token.chainId, token.address, address] : null,
    getTokenBalance(contract, token),
    {
      refreshInterval: 45 * 1000,
    }
  )
}

function getTokenAllowance(
  contract: Contract,
  token: Token
): (_: DataType, __: number, ___: string, owner: string, spender: string) => Promise<TokenAmount> {
  return async (_, __, ___, owner: string, spender: string): Promise<TokenAmount> =>
    contract
      .allowance(owner, spender)
      .then((balance: { toString: () => string }) => new TokenAmount(token, balance.toString()))
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function useTokenAllowance(token?: Token, owner?: string, spender?: string) {
  const contract = useContract(token?.address, ERC20)
  const shouldFetch = !!contract && typeof owner === 'string' && typeof spender === 'string'
  return useSWR(
    shouldFetch ? [DataType.TokenAllowance, token.chainId, token.address, owner, spender] : null,
    getTokenAllowance(contract, token),
    {
      refreshInterval: 60 * 1000,
    }
  )
}

function getReserves(contract: Contract, token0: Token, token1: Token): () => Promise<Pair | null> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  return async (): Promise<Pair | null> =>
    contract
      .getReserves()
      .then(
        ({ reserve0, reserve1 }: { reserve0: { toString: () => string }; reserve1: { toString: () => string } }) => {
          const pair = new Pair(
            new TokenAmount(token0, reserve0.toString()),
            new TokenAmount(token1, reserve1.toString())
          )
          return JSBI.equal(pair.reserve0.raw, ZERO) || JSBI.equal(pair.reserve1.raw, ZERO) ? null : pair
        }
      )
      .catch(() => null)
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function useReserves(tokenA?: Token, tokenB?: Token) {
  const [token0, token1] =
    !!tokenA && !!tokenB && !tokenA.equals(tokenB)
      ? tokenA.sortsBefore(tokenB)
        ? [tokenA, tokenB]
        : [tokenB, tokenA]
      : []
  const pairAddress = !!token0 && !!token1 ? Pair.getAddress(token0, token1) : undefined
  const contract = useContract(pairAddress, PAIR)
  const shouldFetch = !!contract
  return useSWR(
    shouldFetch ? [DataType.Reserves, tokenA.chainId, pairAddress] : null,
    getReserves(contract, token0, token1),
    {
      refreshInterval: 30 * 1000,
    }
  )
}
