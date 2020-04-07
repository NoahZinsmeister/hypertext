import { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react'
import { useWeb3React } from '@web3-react/core'
import { Token } from '@uniswap/sdk'
import { Contract } from '@ethersproject/contracts'

import { DEFAULT_APPROVE_MAX, DEFAULT_DEADLINE, DEFAULT_SLIPPAGE, ERC20, ERC20_BYTES32 } from './constants'

enum LocalStorageKeys {
  ApproveMax = 'approveMax',
  Deadline = 'deadline',
  Slippage = 'slippage',
  Transactions = 'transactions',
  Tokens = 'tokens',
}

function useLocalStorage<T>(
  key: LocalStorageKeys,
  defaultValue: T,
  { serialize, deserialize }: { serialize: (toSerialize: T) => any; deserialize: (toDeserialize: any) => T } = {
    serialize: (toSerialize) => toSerialize,
    deserialize: (toDeserialize) => toDeserialize,
  }
): [T, (value: T) => void] {
  const [value, setValue] = useState(() => {
    try {
      return deserialize(JSON.parse(window.localStorage.getItem(key))) ?? defaultValue
    } catch {
      return defaultValue
    }
  })

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(serialize(value)))
    } catch {}
  }, [key, value])

  return [value, setValue]
}

const LocalStorageContext = createContext<
  [
    {
      approveMax: boolean
      deadline: number
      slippage: number
      transactions: string[]
      tokens: any[]
    },
    {
      setApproveMax: (approveMax: boolean) => void
      setDeadline: (deadline: number) => void
      setSlippage: (slippage: number) => void
      setTransactions: (transactions: string[]) => void
      setTokens: (tokens: Token[]) => void
    }
  ]
>([] as any)

function useLocalStorageContext() {
  return useContext(LocalStorageContext)
}

function serializeTokens(tokens: Token[]): any[] {
  return tokens.map((token) => ({
    chainId: token.chainId,
    address: token.address,
    decimals: token.decimals,
    symbol: token.symbol,
    name: token.name,
  }))
}

function deserializeTokens(serializedTokens: any[]): Token[] {
  return serializedTokens.map(
    (serializedToken) =>
      new Token(
        serializedToken.chainId,
        serializedToken.address,
        serializedToken.decimals,
        serializedToken.symbol,
        serializedToken.name
      )
  )
}

export default function Provider({ children }) {
  const [approveMax, setApproveMax] = useLocalStorage<boolean>(LocalStorageKeys.ApproveMax, DEFAULT_APPROVE_MAX)
  const [deadline, setDeadline] = useLocalStorage<number>(LocalStorageKeys.Deadline, DEFAULT_DEADLINE)
  const [slippage, setSlippage] = useLocalStorage<number>(LocalStorageKeys.Slippage, DEFAULT_SLIPPAGE)
  const [transactions, setTransactions] = useLocalStorage<string[]>(LocalStorageKeys.Transactions, [])
  const [tokens, setTokens] = useLocalStorage<any[]>(LocalStorageKeys.Tokens, [], {
    serialize: serializeTokens,
    deserialize: deserializeTokens,
  })

  return (
    <LocalStorageContext.Provider
      value={useMemo(
        () => [
          { approveMax, deadline, slippage, transactions, tokens },
          { setApproveMax, setDeadline, setSlippage, setTransactions, setTokens },
        ],
        [approveMax, deadline, slippage, transactions, tokens]
      )}
    >
      {children}
    </LocalStorageContext.Provider>
  )
}

export function useApproveMax(): [boolean, () => void] {
  const [{ approveMax }, { setApproveMax }] = useLocalStorageContext()
  const toggleApproveMax = useCallback(() => {
    setApproveMax(!approveMax)
  }, [approveMax])
  return [approveMax, toggleApproveMax]
}

export function useDeadline(): [number, (deadline: number) => void] {
  const [{ deadline }, { setDeadline }] = useLocalStorageContext()
  return [deadline, setDeadline]
}

export function useSlippage(): [number, (slippage: number) => void] {
  const [{ slippage }, { setSlippage }] = useLocalStorageContext()
  return [slippage, setSlippage]
}

export function useTransactions(): [
  string[],
  { addTransaction: (hash: string) => void; removeTransaction: (hash: string) => void }
] {
  const [{ transactions }, { setTransactions }] = useLocalStorageContext()
  const addTransaction = useCallback(
    (hash: string) => {
      if (!transactions.some((transaction) => transaction === hash)) {
        setTransactions(transactions.concat([hash]))
      }
    },
    [transactions]
  )
  const removeTransaction = useCallback(
    (hash: string) => {
      setTransactions(transactions.filter((transaction) => transaction !== hash))
    },
    [transactions]
  )

  return [transactions, { addTransaction, removeTransaction }]
}

export function useTokens(): [Token[], { addToken: (address: string) => Promise<Token | null> }] {
  const [{ tokens }, { setTokens }] = useLocalStorageContext()
  const { library, chainId } = useWeb3React()
  const addToken = useCallback(
    async (address: string) => {
      if (tokens.some((token) => token.chainId === chainId && token.address === address)) {
        return tokens.filter((token) => token.chainId === chainId && token.address === address)[0]
      } else {
        const contract = new Contract(address, ERC20, library)
        const [decimals, symbol, name] = await Promise.all([
          contract.decimals().catch(() => null),
          contract.symbol().catch(() => new Contract(address, ERC20_BYTES32, library).catch(() => 'UNKNOWN')),
          contract.name().catch(() => new Contract(address, ERC20_BYTES32, library).catch(() => 'Unknown')),
        ])

        if (decimals === null) {
          return null
        } else {
          const token = new Token(chainId, address, decimals, symbol, name)
          setTokens(tokens.concat([token]))
          return token
        }
      }
    },
    [library, chainId]
  )

  return [tokens, { addToken }]
}
