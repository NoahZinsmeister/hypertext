import useSWR, { responseInterface } from 'swr'
import { Token, TokenAmount, Pair, JSBI, ChainId } from '@uniswap/sdk'
import { useWeb3React } from '@web3-react/core'
import { Contract } from '@ethersproject/contracts'

import { ADDRESS_ZERO, ERC20, PAIR, ZERO } from './constants'
import { useContract } from './hooks'
import { getAddress } from '@ethersproject/address'

export enum DataType {
  ETHBalance,
  TokenBalance,
  TokenAllowance,
  Reserves,
  RemoteTokens,
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useETHBalance(address?: string, suspense = false): responseInterface<TokenAmount, any> {
  const { chainId, library } = useWeb3React()
  const shouldFetch = typeof chainId === 'number' && typeof address === 'string' && !!library
  return useSWR(shouldFetch ? [DataType.ETHBalance, chainId, address] : null, getETHBalance(library), {
    refreshInterval: 45 * 1000,
    suspense,
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useTokenBalance(token?: Token, address?: string): responseInterface<TokenAmount, any> {
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

export function useTokenAllowance(
  token?: Token,
  owner?: string,
  spender?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): responseInterface<TokenAmount, any> {
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useReserves(tokenA?: Token, tokenB?: Token): responseInterface<Pair | null, any> {
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

const rinkebyQuery = `
query getRemoteTokens($searchQuery: String!) {
  tokens(where: { symbol_contains: $searchQuery }) {
    id
    symbol
    name
  }
}
`

const mainnetQuery = `
query getRemoteTokens($searchQuery: String!) {
  exchanges(where: { tokenSymbol_contains: $searchQuery }) {
    tokenAddress
    tokenSymbol
    tokenName
  }
}
`

interface RemoteToken {
  address: string
  symbol: string
  name: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getRemoteTokens(_: DataType, chainId: number, searchQuery: string): Promise<RemoteToken[]> {
  const { request } = await import('graphql-request')

  return request(
    chainId === ChainId.RINKEBY
      ? 'https://api.thegraph.com/subgraphs/name/noahzinsmeister/uniswapv2test'
      : 'https://api.thegraph.com/subgraphs/name/graphprotocol/uniswap',
    chainId === ChainId.RINKEBY ? rinkebyQuery : mainnetQuery,
    {
      searchQuery,
    }
  ).then((result) =>
    (chainId === ChainId.RINKEBY ? result.tokens : result.exchanges).map(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (token: any): RemoteToken => ({
        address: getAddress(chainId === ChainId.RINKEBY ? token.id : token.tokenAddress),
        symbol: chainId === ChainId.RINKEBY ? token.symbol : token.tokenSymbol,
        name: chainId === ChainId.RINKEBY ? token.name : token.tokenName,
      })
    )
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useRemoteTokens(searchQuery = ''): responseInterface<RemoteToken[], any> {
  const { chainId } = useWeb3React()
  const shouldFetch = (chainId === ChainId.RINKEBY || chainId === ChainId.MAINNET) && searchQuery.length > 0
  return useSWR(shouldFetch ? [DataType.RemoteTokens, chainId, searchQuery] : null, getRemoteTokens, {
    dedupingInterval: 60 * 10 * 1000,
  })
}
