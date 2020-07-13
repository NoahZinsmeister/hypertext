import useSWR, { responseInterface } from 'swr'
import { Token, TokenAmount, Pair, JSBI, ChainId } from '@uniswap/sdk'
import { useWeb3React } from '@web3-react/core'
import { Contract } from '@ethersproject/contracts'
import { parseBytes32String } from '@ethersproject/strings'
import { getAddress } from '@ethersproject/address'
import { Web3Provider } from '@ethersproject/providers'
import IERC20 from '@uniswap/v2-core/build/IERC20.json'
import IUniswapV2Pair from '@uniswap/v2-core/build/IUniswapV2Pair.json'

import { ZERO, ADDRESS_ZERO, ERC20_BYTES32 } from './constants'
import { useContract, useKeepSWRDataLiveAsBlocksArrive } from './hooks'

export enum DataType {
  BlockNumber,
  ETHBalance,
  TokenBalance,
  TokenAllowance,
  Reserves,
  Token,
  RemoteTokens,
}

function getBlockNumber(library: Web3Provider): () => Promise<number> {
  return async (): Promise<number> => {
    return library.getBlockNumber()
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useBlockNumber(): responseInterface<number, any> {
  const { library } = useWeb3React()
  const shouldFetch = !!library
  return useSWR(shouldFetch ? [DataType.BlockNumber] : null, getBlockNumber(library), {
    refreshInterval: 10 * 1000,
  })
}

function getETHBalance(library: Web3Provider): (chainId: number, address: string) => Promise<TokenAmount> {
  return async (chainId: number, address: string): Promise<TokenAmount> => {
    const ETH = new Token(chainId, ADDRESS_ZERO, 18)
    return library
      .getBalance(address)
      .then((balance: { toString: () => string }) => new TokenAmount(ETH, balance.toString()))
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useETHBalance(address?: string | null, suspense = false): responseInterface<TokenAmount, any> {
  const { chainId, library } = useWeb3React()
  const shouldFetch = typeof chainId === 'number' && typeof address === 'string' && !!library

  const result = useSWR(shouldFetch ? [chainId, address, DataType.ETHBalance] : null, getETHBalance(library), {
    suspense,
  })
  useKeepSWRDataLiveAsBlocksArrive(result.mutate)
  return result
}

function getTokenBalance(contract: Contract, token: Token): (address: string) => Promise<TokenAmount> {
  return async (address: string): Promise<TokenAmount> =>
    contract
      .balanceOf(address)
      .then((balance: { toString: () => string }) => new TokenAmount(token, balance.toString()))
}

export function useTokenBalance(
  token?: Token,
  address?: string | null,
  suspense = false
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): responseInterface<TokenAmount, any> {
  const contract = useContract(token?.address, IERC20.abi)

  const result = useSWR(
    typeof address === 'string' && token && contract
      ? [address, token.chainId, token.address, DataType.TokenBalance]
      : null,
    getTokenBalance(contract as Contract, token as Token),
    { suspense }
  )
  useKeepSWRDataLiveAsBlocksArrive(result.mutate)
  return result
}

function getTokenAllowance(contract: Contract, token: Token): (owner: string, spender: string) => Promise<TokenAmount> {
  return async (owner: string, spender: string): Promise<TokenAmount> =>
    contract
      .allowance(owner, spender)
      .then((balance: { toString: () => string }) => new TokenAmount(token, balance.toString()))
}

export function useTokenAllowance(
  token?: Token,
  owner?: string | null,
  spender?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): responseInterface<TokenAmount, any> {
  const contract = useContract(token?.address, IERC20.abi)

  const result = useSWR(
    typeof owner === 'string' && typeof spender === 'string' && token && contract
      ? [owner, spender, token.chainId, token.address, DataType.TokenAllowance]
      : null,
    getTokenAllowance(contract as Contract, token as Token)
  )
  useKeepSWRDataLiveAsBlocksArrive(result.mutate)
  return result
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
  const invalid = !!tokenA && !!tokenB && tokenA.equals(tokenB)
  const [token0, token1] =
    !!tokenA && !!tokenB && !invalid ? (tokenA.sortsBefore(tokenB) ? [tokenA, tokenB] : [tokenB, tokenA]) : []
  const pairAddress = !!token0 && !!token1 ? Pair.getAddress(token0, token1) : undefined
  const contract = useContract(pairAddress, IUniswapV2Pair.abi)
  const result = useSWR(
    token0 && pairAddress && contract && token1 ? [token0.chainId, pairAddress, DataType.Reserves] : null,
    getReserves(contract as Contract, token0 as Token, token1 as Token)
  )
  useKeepSWRDataLiveAsBlocksArrive(result.mutate)
  return result
}

function getOnchainToken(
  contract: Contract,
  contractBytes32: Contract
): (chainId: number, address: string) => Promise<Token | null> {
  return async (chainId: number, address: string): Promise<Token | null> => {
    const [decimals, symbol, name] = await Promise.all([
      contract.decimals().catch(() => null),
      contract.symbol().catch(() =>
        contractBytes32
          .symbol()
          .then(parseBytes32String)
          .catch(() => 'UNKNOWN')
      ),
      contract.name().catch(() =>
        contractBytes32
          .name()
          .then(parseBytes32String)
          .catch(() => 'Unknown')
      ),
    ])
    return decimals === null ? null : new Token(chainId, address, decimals, symbol, name)
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useOnchainToken(address?: string, suspense = false): responseInterface<Token | null, any> {
  const { chainId } = useWeb3React()
  const contract = useContract(address, IERC20.abi)
  const contractBytes32 = useContract(address, ERC20_BYTES32)
  return useSWR(
    typeof chainId === 'number' && typeof address === 'string' && contract && contractBytes32
      ? [chainId, address, DataType.Token]
      : null,
    getOnchainToken(contract as Contract, contractBytes32 as Contract),
    {
      dedupingInterval: 60 * 1000,
      refreshInterval: 60 * 1000,
      suspense,
    }
  )
}

interface RemoteToken {
  address: string
  symbol: string
  name: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getRemoteTokens(searchQuery: string): Promise<RemoteToken[]> {
  const { request } = await import('graphql-request')

  return request(
    'https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v2',
    `
query getRemoteTokens($searchQuery: String!) {
  tokens(where: { symbol_contains: $searchQuery }) {
    id
    symbol
    name
  }
}`,
    { searchQuery }
  ).then((result) =>
    result.tokens.map(
      (token: { id: string; symbol: string; name: string }): RemoteToken => ({
        address: getAddress(token.id),
        symbol: token.symbol ?? 'UNKNOWN',
        name: token.name ?? 'Unknown',
      })
    )
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useRemoteTokens(query = '', suspense = false): responseInterface<RemoteToken[], any> {
  const { chainId } = useWeb3React()
  const shouldFetch = chainId === ChainId.MAINNET && query.length > 0
  return useSWR(shouldFetch ? [query, DataType.RemoteTokens] : null, getRemoteTokens, {
    dedupingInterval: 60 * 5 * 1000,
    refreshInterval: 60 * 5 * 1000,
    suspense,
  })
}
