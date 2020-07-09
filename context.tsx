import {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
  ReactNode,
  Dispatch,
  SetStateAction,
} from 'react'
import { Token } from '@uniswap/sdk'

import { DEFAULT_APPROVE_MAX, DEFAULT_DEADLINE, DEFAULT_SLIPPAGE } from './constants'

enum LocalStorageKeys {
  Version = 'version',
  ApproveMax = 'approveMax',
  Deadline = 'deadline',
  Slippage = 'slippage',
  Transactions = 'transactions',
  Tokens = 'tokens',
}

const NO_VERSION = -1
const CURRENT_VERSION = 0

function useLocalStorage<T, S = T>(
  key: LocalStorageKeys,
  defaultValue: T,
  overrideLookup = false,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  { serialize, deserialize }: { serialize: (toSerialize: T) => S; deserialize: (toDeserialize: S) => T } = {
    serialize: (toSerialize): S => (toSerialize as unknown) as S,
    deserialize: (toDeserialize): T => (toDeserialize as unknown) as T,
  }
): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    if (overrideLookup) {
      return defaultValue
    } else {
      try {
        const item = window.localStorage.getItem(key)
        return item === null ? defaultValue : deserialize(JSON.parse(item)) ?? defaultValue
      } catch {
        return defaultValue
      }
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
): { chainId: number; address: string; decimals: number; symbol?: string; name?: string }[] {
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

interface Transaction {
  chainId: number
  hash: string
}

const HypertextContext = createContext<
  [
    {
      firstToken: Token | undefined
      secondToken: Token | undefined
      approveMax: boolean
      deadline: number
      slippage: number
      transactions: Transaction[]
      tokens: Token[]
    },
    {
      setFirstToken: Dispatch<SetStateAction<Token | undefined>>
      setSecondToken: Dispatch<SetStateAction<Token | undefined>>
      setApproveMax: Dispatch<SetStateAction<boolean>>
      setDeadline: Dispatch<SetStateAction<number>>
      setSlippage: Dispatch<SetStateAction<number>>
      setTransactions: Dispatch<SetStateAction<Transaction[]>>
      setTokens: Dispatch<SetStateAction<Token[]>>
    }
  ]
>([{}, {}] as any) // eslint-disable-line @typescript-eslint/no-explicit-any

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function useHypertextContext() {
  return useContext(HypertextContext)
}

export default function Provider({ children }: { children: ReactNode }): JSX.Element {
  // global state
  const [firstToken, setFirstToken] = useState<Token | undefined>()
  const [secondToken, setSecondToken] = useState<Token | undefined>()

  // versioning
  const [version, setVersion] = useLocalStorage<number>(LocalStorageKeys.Version, NO_VERSION)
  // after it's been used to sychronously + selectively override localstorage keys, bump the version as soon as we can
  useEffect(() => {
    setVersion(CURRENT_VERSION)
  }, [setVersion])

  // global localstorage state
  const [approveMax, setApproveMax] = useLocalStorage<boolean>(LocalStorageKeys.ApproveMax, DEFAULT_APPROVE_MAX)
  const [deadline, setDeadline] = useLocalStorage<number>(LocalStorageKeys.Deadline, DEFAULT_DEADLINE)
  const [slippage, setSlippage] = useLocalStorage<number>(LocalStorageKeys.Slippage, DEFAULT_SLIPPAGE)
  const [transactions, setTransactions] = useLocalStorage<Transaction[]>(
    LocalStorageKeys.Transactions,
    [],
    version < 0 ? true : false // pre-version0 localstorage transactions didn't include chainId and must be overriden
  )
  const [tokens, setTokens] = useLocalStorage<Token[], ReturnType<typeof serializeTokens>>(
    LocalStorageKeys.Tokens,
    [],
    false,
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

export function useFirstToken(): [Token | undefined, ReturnType<typeof useHypertextContext>[1]['setFirstToken']] {
  const [{ firstToken }, { setFirstToken }] = useHypertextContext()
  return [firstToken, setFirstToken]
}

export function useSecondToken(): [Token | undefined, ReturnType<typeof useHypertextContext>[1]['setSecondToken']] {
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
  Transaction[],
  {
    addTransaction: (chainId: number, hash: string) => void
    removeTransaction: (chainId: number, hash: string) => void
  }
] {
  const [{ transactions }, { setTransactions }] = useHypertextContext()

  const addTransaction = useCallback(
    (chainId: number, hash: string) => {
      setTransactions((transactions) =>
        transactions
          .filter((transaction) => !(transaction.chainId === chainId && transaction.hash === hash))
          .concat([{ chainId, hash }])
      )
    },
    [setTransactions]
  )
  const removeTransaction = useCallback(
    (chainId: number, hash: string) => {
      setTransactions((transactions) =>
        transactions.filter((transaction) => !(transaction.chainId === chainId && transaction.hash === hash))
      )
    },
    [setTransactions]
  )

  return [transactions, { addTransaction, removeTransaction }]
}

export function useLocalStorageTokens(): [
  Token[],
  {
    addToken: (token: Token) => void
    removeToken: (token: Token) => void
  }
] {
  const [{ tokens }, { setTokens }] = useHypertextContext()

  const addToken = useCallback(
    async (token: Token) => {
      setTokens((tokens) => tokens.filter((currentToken) => !currentToken.equals(token)).concat([token]))
    },
    [setTokens]
  )

  const removeToken = useCallback(
    (token: Token) => {
      setTokens((tokens) => tokens.filter((currentToken) => !currentToken.equals(token)))
    },
    [setTokens]
  )

  return [tokens, { addToken, removeToken }]
}
