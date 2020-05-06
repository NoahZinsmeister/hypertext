import { useCallback, useEffect, useState, useMemo } from 'react'
import { useWeb3React } from '@web3-react/core'
import { Token, Route, WETH, Pair, ChainId, TokenAmount, TradeType, Trade } from '@uniswap/sdk'

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
  const bothDefined = !!inputToken && !!outputToken
  const invalid = bothDefined && inputToken.equals(outputToken)
  const { data: pair } = useReserves(inputToken, outputToken)
  return invalid ? null : pair
}

const DAI = new Token(ChainId.MAINNET, '0x6B175474E89094C44Da98b954EedeAC495271d0F', 18, 'DAI', 'Dai Stablecoin')
const USDC = new Token(ChainId.MAINNET, '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 6, 'USDC', 'USD//C')
export function useRoute(inputToken?: Token, outputToken?: Token): [undefined | Route | null, Pair[]] {
  const directPair = useDirectPair(inputToken, outputToken)
  // WETH pairs
  const WETHInputPair = useDirectPair(WETH[inputToken?.chainId], inputToken)
  const WETHOutputPair = useDirectPair(WETH[outputToken?.chainId], outputToken)
  // DAI pairs
  const DAIInputPair = useDirectPair(inputToken?.chainId === ChainId.MAINNET ? DAI : undefined, inputToken)
  const DAIOutputPair = useDirectPair(outputToken?.chainId === ChainId.MAINNET ? DAI : undefined, outputToken)
  // USDC pairs
  const USDCInputPair = useDirectPair(inputToken?.chainId === ChainId.MAINNET ? USDC : undefined, inputToken)
  const USDCOutputPair = useDirectPair(outputToken?.chainId === ChainId.MAINNET ? USDC : undefined, outputToken)
  const pairs = [directPair, WETHInputPair, WETHOutputPair, DAIInputPair, DAIOutputPair, USDCInputPair, USDCOutputPair]

  const directRoute = useMemo(
    () => (directPair ? new Route([directPair], inputToken) : directPair === null ? null : undefined),
    [directPair, inputToken]
  )
  const WETHRoute = useMemo(
    () =>
      WETHInputPair && WETHOutputPair
        ? new Route([WETHInputPair, WETHOutputPair], inputToken)
        : WETHInputPair === null || WETHOutputPair === null
        ? null
        : undefined,
    [WETHInputPair, WETHOutputPair, inputToken]
  )
  const DAIRoute = useMemo(
    () =>
      DAIInputPair && DAIOutputPair
        ? new Route([DAIInputPair, DAIOutputPair], inputToken)
        : DAIInputPair === null || DAIOutputPair === null
        ? null
        : undefined,
    [DAIInputPair, DAIOutputPair, inputToken]
  )
  const USDCRoute = useMemo(
    () =>
      USDCInputPair && USDCOutputPair
        ? new Route([USDCInputPair, USDCOutputPair], inputToken)
        : USDCInputPair === null || USDCOutputPair === null
        ? null
        : undefined,
    [USDCInputPair, USDCOutputPair, inputToken]
  )
  const routes = [directRoute, WETHRoute, DAIRoute, USDCRoute]

  return [
    routes.filter((route) => !!route).length === 0 ? routes[0] : routes.filter((route) => !!route)[0],
    pairs.filter((pair) => !!pair),
  ]
}

export function useTrade(
  inputToken: Token,
  outputToken: Token,
  pairs: Pair[],
  independentAmount: TokenAmount,
  tradeType: TradeType
): undefined | Trade {
  const canCompute = !!inputToken && !!inputToken && pairs.length > 0 && !!independentAmount

  let trade: undefined | Trade
  if (canCompute) {
    if (tradeType === TradeType.EXACT_INPUT) {
      trade = Trade.bestTradeExactIn(pairs, independentAmount, outputToken, { maxNumResults: 1, maxHops: 2 })[0]
    } else {
      trade = Trade.bestTradeExactOut(pairs, inputToken, independentAmount, { maxNumResults: 1, maxHops: 2 })[0]
    }
  }

  return trade
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
