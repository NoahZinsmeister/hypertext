import { useCallback, useEffect, useState, useMemo } from 'react'
import { useWeb3React } from '@web3-react/core'
import { Token, Route, WETH } from '@uniswap/sdk'

import { injected } from './connectors'
import { useReserves } from './data'
import { Contract } from '@ethersproject/contracts'
import { useRouter } from 'next/router'
import { QueryParameters } from './constants'
import { getAddress } from '@ethersproject/address'

export function useWindowSize(): { width: number | undefined; height: number | undefined } {
  function getSize(): ReturnType<typeof useWindowSize> {
    const isClient = typeof window === 'object'
    return {
      width: isClient ? window.innerWidth : undefined,
      height: isClient ? window.innerHeight : undefined,
    }
  }

  const [windowSize, setWindowSize] = useState(getSize())
  useEffect(() => {
    const handleResize = (): void => {
      setWindowSize(getSize())
    }
    window.addEventListener('resize', handleResize)
    return (): void => {
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  return windowSize
}

// https://usehooks.com/useDebounce/
export function useDefaultedDebounce<T>(value: T, initialValue: T, delay: number): T {
  const [defaultedDebounce, setDefaultedDebounce] = useState(initialValue)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDefaultedDebounce(value)
    }, delay)

    return (): void => {
      clearTimeout(handler)
      setDefaultedDebounce(initialValue)
    }
  }, [value, initialValue, delay])

  return defaultedDebounce
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useBodyKeyDown(targetKey: string, onKeyDown: (event?: any) => void, suppress = false): void {
  const downHandler = useCallback(
    (event) => {
      if (
        !suppress &&
        event.key === targetKey &&
        (event.target.tagName === 'BODY' || event.target.getAttribute('aria-modal') === 'true') &&
        !event.altKey &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.shiftKey
      ) {
        onKeyDown(event)
      }
    },
    [suppress, targetKey, onKeyDown]
  )
  useEffect(() => {
    window.addEventListener('keydown', downHandler)
    return (): void => {
      window.removeEventListener('keydown', downHandler)
    }
  }, [suppress, targetKey, downHandler])
}

export function useEagerConnect(): boolean {
  const { activate, active } = useWeb3React()

  const [tried, setTried] = useState(false)

  useEffect(() => {
    injected.isAuthorized().then((isAuthorized: boolean) => {
      if (isAuthorized) {
        activate(injected, undefined, true).catch(() => {
          setTried(true)
        })
      } else {
        setTried(true)
      }
    })
  }, [activate])

  // if the connection worked, wait until we get confirmation of that to flip the flag
  useEffect(() => {
    if (!tried && active) {
      setTried(true)
    }
  }, [tried, active])

  return tried
}

const chainMappings = {
  '1': 1,
  mainnet: 1,
  '3': 3,
  ropsten: 3,
  '4': 4,
  rinkeby: 4,
  '5': 5,
  görli: 5,
  goerli: 5,
  '42': 42,
  kovan: 42,
}

export function useQueryParameters(): {
  [QueryParameters.CHAIN]: number | undefined
  [QueryParameters.INPUT]: string | undefined
  [QueryParameters.OUTPUT]: string | undefined
} {
  const { query } = useRouter()

  let candidateChainId: number
  try {
    candidateChainId = chainMappings[query[QueryParameters.CHAIN] as string]
  } catch {}
  const chainId = injected.supportedChainIds.includes(candidateChainId) ? candidateChainId : undefined

  let input: string
  try {
    if (typeof query[QueryParameters.INPUT] === 'string') input = getAddress(query[QueryParameters.INPUT] as string)
  } catch {}

  let output: string
  try {
    if (typeof query[QueryParameters.OUTPUT] === 'string') output = getAddress(query[QueryParameters.OUTPUT] as string)
  } catch {}

  return useMemo(
    () => ({
      [QueryParameters.CHAIN]: chainId,
      [QueryParameters.INPUT]: input,
      [QueryParameters.OUTPUT]: output,
    }),
    [chainId, input, output]
  )
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function useDirectPair(inputToken?: Token, outputToken?: Token) {
  const { data: pair } = useReserves(inputToken, outputToken)
  return pair
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function useETHPairs(inputToken: Token, outputToken: Token) {
  const { data: inputPair } = useReserves(
    inputToken,
    inputToken?.equals(WETH[inputToken?.chainId]) ? undefined : WETH[inputToken?.chainId]
  )
  const { data: outputPair } = useReserves(
    outputToken,
    outputToken?.equals(WETH[outputToken?.chainId]) ? undefined : WETH[outputToken?.chainId]
  )
  return [inputPair, outputPair]
}

export function useRoute(inputToken?: Token, outputToken?: Token): undefined | Route | null {
  const directPair = useDirectPair(inputToken, outputToken)
  const [inputPair, outputPair] = useETHPairs(
    directPair === null ? inputToken : undefined,
    directPair === null ? outputToken : undefined
  )

  return useMemo(() => {
    if (directPair) {
      return new Route([directPair], inputToken)
    } else if (inputPair && outputPair) {
      return new Route([inputPair, outputPair], inputToken)
    } else {
      return directPair === null && (inputPair === null || outputPair === null) ? null : undefined
    }
  }, [directPair, inputToken, inputPair, outputPair])
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useContract(address?: string, ABI?: any, withSigner = false): Contract | undefined {
  const { library, account } = useWeb3React()
  return useMemo(
    () =>
      !!address && !!ABI && !!library
        ? new Contract(address, ABI, withSigner ? library.getSigner(account).connectUnchecked() : library)
        : undefined,
    [address, ABI, withSigner, library, account]
  )
}
