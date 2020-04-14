import { createContext, useContext, useState, useEffect, useMemo, useCallback, ReactNode } from 'react'
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

function useLocalStorage<T, S = T>(
  key: LocalStorageKeys,
  defaultValue: T,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  { serialize, deserialize }: { serialize: (toSerialize: T) => S; deserialize: (toDeserialize: S) => T } = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    serialize: (toSerialize): S => (toSerialize as unknown) as S,
    deserialize: (toDeserialize): T => (toDeserialize as unknown) as T,
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
  }, [key, serialize, value])

  return [value, setValue]
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serializeTokens(
  tokens: Token[]
): { chainId: number; address: string; decimals: number; symbol: string; name: string }[] {
  return tokens.map((token) => ({
    chainId: token.chainId,
    address: token.address,
    decimals: token.decimals,
    symbol: token.symbol,
    name: token.name,
  }))
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function deserializeTokens(serializedTokens: ReturnType<typeof serializeTokens>): Token[] {
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

const HypertextContext = createContext<
  [
    {
      firstToken: Token
      secondToken: Token
      approveMax: boolean
      deadline: number
      slippage: number
      transactions: string[]
      tokens: Token[]
    },
    {
      setFirstToken: (token: Token) => void
      setSecondToken: (token: Token) => void
      setApproveMax: (approveMax: boolean) => void
      setDeadline: (deadline: number) => void
      setSlippage: (slippage: number) => void
      setTransactions: (transactions: string[]) => void
      setTokens: (tokens: Token[]) => void
    }
  ]
>([] as any) // eslint-disable-line @typescript-eslint/no-explicit-any

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function useHypertextContext() {
  return useContext(HypertextContext)
}

export default function Provider({ children }: { children: ReactNode }): JSX.Element {
  // global state
  const [firstToken, setFirstToken] = useState<Token>()
  const [secondToken, setSecondToken] = useState<Token>()

  // global localstorage state
  const [approveMax, setApproveMax] = useLocalStorage<boolean>(LocalStorageKeys.ApproveMax, DEFAULT_APPROVE_MAX)
  const [deadline, setDeadline] = useLocalStorage<number>(LocalStorageKeys.Deadline, DEFAULT_DEADLINE)
  const [slippage, setSlippage] = useLocalStorage<number>(LocalStorageKeys.Slippage, DEFAULT_SLIPPAGE)
  const [transactions, setTransactions] = useLocalStorage<string[]>(LocalStorageKeys.Transactions, [])
  const [tokens, setTokens] = useLocalStorage<Token[], ReturnType<typeof serializeTokens>>(
    LocalStorageKeys.Tokens,
    [],
    {
      serialize: serializeTokens,
      deserialize: deserializeTokens,
    }
  )

  return (
    <HypertextContext.Provider
      value={useMemo(
        () => [
          { firstToken, secondToken, approveMax, deadline, slippage, transactions, tokens },
          {
            setFirstToken,
            setSecondToken,
            setApproveMax,
            setDeadline,
            setSlippage,
            setTransactions,
            setTokens,
          },
        ],
        [
          firstToken,
          secondToken,
          approveMax,
          deadline,
          slippage,
          transactions,
          tokens,
          setFirstToken,
          setSecondToken,
          setApproveMax,
          setDeadline,
          setSlippage,
          setTransactions,
          setTokens,
        ]
      )}
    >
      {children}
    </HypertextContext.Provider>
  )
}

export function useFirstToken(): [Token, ReturnType<typeof useHypertextContext>[1]['setFirstToken']] {
  const [{ firstToken }, { setFirstToken }] = useHypertextContext()
  return [firstToken, setFirstToken]
}

export function useSecondToken(): [Token, ReturnType<typeof useHypertextContext>[1]['setSecondToken']] {
  const [{ secondToken }, { setSecondToken }] = useHypertextContext()
  return [secondToken, setSecondToken]
}

export function useApproveMax(): [boolean, () => void] {
  const [{ approveMax }, { setApproveMax }] = useHypertextContext()
  const toggleApproveMax = useCallback(() => {
    setApproveMax(!approveMax)
  }, [approveMax, setApproveMax])
  return [approveMax, toggleApproveMax]
}

export function useDeadline(): [number, ReturnType<typeof useHypertextContext>[1]['setDeadline']] {
  const [{ deadline }, { setDeadline }] = useHypertextContext()
  return [deadline, setDeadline]
}

export function useSlippage(): [number, ReturnType<typeof useHypertextContext>[1]['setSlippage']] {
  const [{ slippage }, { setSlippage }] = useHypertextContext()
  return [slippage, setSlippage]
}

export function useTransactions(): [
  string[],
  { addTransaction: (hash: string) => void; removeTransaction: (hash: string) => void }
] {
  const [{ transactions }, { setTransactions }] = useHypertextContext()

  const addTransaction = useCallback(
    (hash: string) => {
      if (!transactions.some((transaction) => transaction === hash)) {
        setTransactions(transactions.concat([hash]))
      }
    },
    [transactions, setTransactions]
  )
  const removeTransaction = useCallback(
    (hash: string) => {
      setTransactions(transactions.filter((transaction) => transaction !== hash))
    },
    [transactions, setTransactions]
  )

  return [transactions, { addTransaction, removeTransaction }]
}

export function useTokens(): [
  Token[],
  { addTokenByAddress: (address: string) => Promise<Token | null>; removeToken: (token: Token) => void }
] {
  const { library, chainId } = useWeb3React()
  const [{ tokens }, { setTokens }] = useHypertextContext()

  const addTokenByAddress = useCallback(
    async (address: string) => {
      const contract = new Contract(address, ERC20, library)
      const [decimals, symbol, name] = await Promise.all([
        contract.decimals().catch(() => null),
        contract.symbol().catch(() => new Contract(address, ERC20_BYTES32, library).catch(() => 'UNKNOWN')),
        contract.name().catch(() => new Contract(address, ERC20_BYTES32, library).catch(() => 'Unknown')),
      ])

      if (decimals !== null) {
        const token = new Token(chainId, address, decimals, symbol, name)
        setTokens(tokens.concat([token]))
        return token
      } else {
        return null
      }
    },
    [library, chainId, tokens, setTokens]
  )

  const removeToken = useCallback(
    (token: Token) => {
      setTokens(tokens.filter((currentToken) => !currentToken.equals(token)))
    },
    [tokens, setTokens]
  )

  return [tokens, { addTokenByAddress, removeToken }]
}
