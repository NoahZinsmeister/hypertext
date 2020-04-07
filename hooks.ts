import { useCallback, useEffect, useState, useMemo } from 'react'
import { useWeb3React } from '@web3-react/core'
import { Token, Pair, Route, JSBI, WETH } from '@uniswap/sdk'

import { injected } from './connectors'
import { useTokenBalance } from './data'
import { Contract } from '@ethersproject/contracts'

// Hook
export function useWindowSize() {
  const isClient = typeof window === 'object'

  function getSize() {
    return {
      width: isClient ? window.innerWidth : undefined,
      height: isClient ? window.innerHeight : undefined,
    }
  }

  const [windowSize, setWindowSize] = useState(getSize)

  useEffect(() => {
    if (isClient) {
      const handleResize = () => {
        setWindowSize(getSize())
      }

      window.addEventListener('resize', handleResize)
      return () => window.removeEventListener('resize', handleResize)
    }
  }, []) // Empty array ensures that effect is only run on mount and unmount

  return windowSize
}

export function useBodyKeyDown(targetKey: string, onKeyDown: (event?: any) => any, suppress = false) {
  const downHandler = useCallback(
    (event) => {
      if (
        event.key === targetKey &&
        (event.target.tagName === 'BODY' || event.target.getAttribute('aria-modal') === 'true') &&
        !event.altKey &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.shiftKey
      ) {
        event.preventDefault()
        onKeyDown(event)
      }
    },
    [targetKey, onKeyDown]
  )

  useEffect(() => {
    if (!suppress) {
      window.addEventListener('keydown', downHandler)
      return () => {
        window.removeEventListener('keydown', downHandler)
      }
    }
  }, [suppress, downHandler])
}

export function useEagerConnect() {
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
  }, []) // intentionally only running on mount (make sure it's only mounted once :))

  // if the connection worked, wait until we get confirmation of that to flip the flag
  useEffect(() => {
    if (!tried && active) {
      setTried(true)
    }
  }, [tried, active])

  return tried
}

export function useRoute(inputToken: Token, outputToken: Token) {
  const pairAddress = !!inputToken && !!outputToken ? Pair.getAddress(inputToken, outputToken) : undefined
  const { data: inputTokenBalance } = useTokenBalance(inputToken, pairAddress)
  const { data: outputTokenBalance } = useTokenBalance(outputToken, pairAddress)

  const directFetched = !!inputTokenBalance && !!outputTokenBalance
  const noDirect = directFetched
    ? JSBI.equal(inputTokenBalance.raw, JSBI.BigInt(0)) || JSBI.equal(outputTokenBalance.raw, JSBI.BigInt(0))
    : undefined

  const inputETHPairAddress =
    noDirect === true && !inputToken?.equals(WETH[inputToken?.chainId])
      ? Pair.getAddress(inputToken, WETH[inputToken.chainId])
      : undefined
  const outputETHPairAddress =
    noDirect === true && !outputToken?.equals(WETH[outputToken?.chainId])
      ? Pair.getAddress(outputToken, WETH[outputToken.chainId])
      : undefined

  const { data: inputETHPairTokenBalance } = useTokenBalance(inputToken, inputETHPairAddress)
  const { data: inputETHPairETHBalance } = useTokenBalance(WETH[inputToken?.chainId], inputETHPairAddress)
  const { data: outputETHPairTokenBalance } = useTokenBalance(outputToken, outputETHPairAddress)
  const { data: outputETHPairETHBalance } = useTokenBalance(WETH[inputToken?.chainId], outputETHPairAddress)

  const ETHFetched =
    !!inputETHPairTokenBalance && !!inputETHPairETHBalance && !!outputETHPairTokenBalance && !!outputETHPairETHBalance
  const noETH = ETHFetched
    ? JSBI.equal(inputETHPairTokenBalance.raw, JSBI.BigInt(0)) ||
      JSBI.equal(inputETHPairETHBalance.raw, JSBI.BigInt(0)) ||
      JSBI.equal(outputETHPairTokenBalance.raw, JSBI.BigInt(0)) ||
      JSBI.equal(outputETHPairETHBalance.raw, JSBI.BigInt(0))
    : undefined

  const pairs = useMemo(() => {
    if (noDirect === false) {
      return [new Pair(inputTokenBalance, outputTokenBalance)]
    } else if (noETH === false) {
      return [
        new Pair(inputETHPairTokenBalance, inputETHPairETHBalance),
        new Pair(outputETHPairTokenBalance, outputETHPairETHBalance),
      ]
    } else {
      return !!inputTokenBalance && !!outputTokenBalance ? [new Pair(inputTokenBalance, outputTokenBalance)] : []
    }
  }, [
    noDirect,
    noETH,
    inputTokenBalance,
    outputTokenBalance,
    inputETHPairTokenBalance,
    inputETHPairETHBalance,
    outputETHPairTokenBalance,
    outputETHPairETHBalance,
  ])

  return useMemo(() => (pairs.length >= 1 ? new Route(pairs, inputToken) : undefined), [pairs])
}

export function useContract(address?: string, ABI?: any, withSigner = false) {
  const { library, account } = useWeb3React()
  return useMemo(
    () =>
      !!address && !!ABI && !!library
        ? new Contract(address, ABI, withSigner ? library.getSigner(account).connectUnchecked() : library)
        : undefined,
    [address, library, ABI]
  )
}
