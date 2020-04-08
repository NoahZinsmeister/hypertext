import { useCallback, useEffect, useState, useMemo } from 'react'
import { useWeb3React } from '@web3-react/core'
import { Token, Route, WETH } from '@uniswap/sdk'

import { injected } from './connectors'
import { useReserves } from './data'
import { Contract } from '@ethersproject/contracts'

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

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function useDirectPair(inputToken: Token, outputToken: Token) {
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

export function useRoute(inputToken: Token, outputToken: Token): undefined | Route | null {
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
  }, [directPair, inputPair, outputPair, inputToken])
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