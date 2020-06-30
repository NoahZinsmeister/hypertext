import { useCallback, useEffect, useState, useMemo, useRef } from 'react'
import { useWeb3React } from '@web3-react/core'
import { Token, Route, WETH, Pair, ChainId, TokenAmount, TradeType, Trade, Fraction, JSBI } from '@uniswap/sdk'

import { injected } from './connectors'
import { useReserves, useBlockNumber } from './data'
import { Contract, ContractInterface } from '@ethersproject/contracts'
import { useRouter } from 'next/router'
import { QueryParameters } from './constants'
import { getAddress } from '@ethersproject/address'
import { responseInterface } from 'swr'
import { DAI, USDC } from './tokens'

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
        event.target.tagName === 'BODY' &&
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useKeepSWRDataLiveAsBlocksArrive(mutate: responseInterface<any, any>['mutate']): void {
  // because we don't care about the referential identity of mutate, just bind it to a ref
  const mutateRef = useRef(mutate)
  useEffect(() => {
    mutateRef.current = mutate
  })
  // then, whenever a new block arrives, trigger a mutation
  const { data } = useBlockNumber()
  useEffect(() => {
    mutateRef.current()
  }, [data])
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

function useDirectPair(inputToken?: Token, outputToken?: Token): Pair {
  const bothDefined = !!inputToken && !!outputToken
  const invalid = bothDefined && inputToken.equals(outputToken)
  const { data: pair } = useReserves(inputToken, outputToken)
  return invalid ? null : pair
}

export function useRoute(inputToken?: Token, outputToken?: Token): [undefined | Route | null, Pair[]] {
  // direct pair
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
  // connecting pairs
  const DAIWETH = useDirectPair(inputToken?.chainId === ChainId.MAINNET ? DAI : undefined, WETH[DAI.chainId])
  const USDCWETH = useDirectPair(inputToken?.chainId === ChainId.MAINNET ? USDC : undefined, WETH[USDC.chainId])
  const DAIUSDC = useDirectPair(
    inputToken?.chainId === ChainId.MAINNET ? DAI : undefined,
    inputToken?.chainId === ChainId.MAINNET ? USDC : undefined
  )

  const pairs = [
    directPair,
    WETHInputPair,
    WETHOutputPair,
    DAIInputPair,
    DAIOutputPair,
    USDCInputPair,
    USDCOutputPair,
    DAIWETH,
    USDCWETH,
    DAIUSDC,
  ]
    // filter out invalid pairs
    .filter((p) => !!p)
    // filter out duplicated pairs
    .filter((p, i, pairs) => i === pairs.findIndex((pair) => pair.liquidityToken.address === p.liquidityToken.address))

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
    routes.filter((route) => !!route).length > 0
      ? routes.filter((route) => !!route)[0]
      : routes.some((route) => route === undefined)
      ? undefined
      : null,
    pairs,
  ]
}

export function useTrade(
  inputToken: Token,
  outputToken: Token,
  pairs: Pair[],
  independentAmount: TokenAmount,
  tradeType: TradeType
): undefined | Trade {
  const canCompute = !!inputToken && !!outputToken && pairs.length > 0 && !!independentAmount

  let trade: undefined | Trade
  if (canCompute) {
    if (tradeType === TradeType.EXACT_INPUT) {
      trade = Trade.bestTradeExactIn(pairs, independentAmount, outputToken, { maxNumResults: 1 })[0]
    } else {
      trade = Trade.bestTradeExactOut(pairs, inputToken, independentAmount, { maxNumResults: 1 })[0]
    }
  }

  return trade
}

export function useContract(address?: string, ABI?: ContractInterface, withSigner = false): Contract | undefined {
  const { library, account } = useWeb3React()
  return useMemo(
    () =>
      !!address && !!ABI && !!library
        ? new Contract(address, ABI, withSigner ? library.getSigner(account).connectUnchecked() : library)
        : undefined,
    [address, ABI, withSigner, library, account]
  )
}

export function useUSDETHPrice(): Fraction {
  const { chainId } = useWeb3React()

  const DAIWETH = useDirectPair(chainId === ChainId.MAINNET ? DAI : undefined, WETH[ChainId.MAINNET])
  const USDCWETH = useDirectPair(chainId === ChainId.MAINNET ? USDC : undefined, WETH[ChainId.MAINNET])

  const price = useMemo(() => {
    const priceFractions = [
      DAIWETH && new Route([DAIWETH], WETH[ChainId.MAINNET])?.midPrice?.adjusted,
      USDCWETH && new Route([USDCWETH], WETH[ChainId.MAINNET])?.midPrice?.adjusted,
    ].filter((price) => !!price)

    return priceFractions
      .reduce((accumulator, priceFraction) => accumulator.add(priceFraction), new Fraction('0'))
      .divide(priceFractions.length.toString())
  }, [DAIWETH, USDCWETH])

  return price.equalTo('0') ? undefined : price
}

export function useUSDTokenPrice(token: Token): Fraction {
  const USDETHPrice = useUSDETHPrice()

  const DAIWETH = useDirectPair(USDETHPrice ? DAI : undefined, WETH[ChainId.MAINNET])
  const USDCWETH = useDirectPair(USDETHPrice ? USDC : undefined, WETH[ChainId.MAINNET])

  const tokenWETH = useDirectPair(token?.chainId === ChainId.MAINNET ? token : undefined, WETH[ChainId.MAINNET])
  const tokenDAI = useDirectPair(token?.chainId === ChainId.MAINNET ? token : undefined, DAI)
  const tokenUSDC = useDirectPair(token?.chainId === ChainId.MAINNET ? token : undefined, USDC)

  const price = useMemo(() => {
    // early return if the token is WETH
    if (token && token.equals(WETH[ChainId.MAINNET])) {
      return USDETHPrice || new Fraction('0')
    }

    let priceFractions = []

    // if the token has a WETH pair with at least 5 ETH
    if (tokenWETH && tokenWETH.reserveOf(WETH[ChainId.MAINNET]).greaterThan(JSBI.BigInt(5))) {
      const ETHTokenPrice = new Route([tokenWETH], token).midPrice.adjusted
      priceFractions.push(USDETHPrice.multiply(ETHTokenPrice))
    }
    // if DAIWETH pair exists and the token has a DAI pair with at least 1000 DAI
    if (DAIWETH && tokenDAI && tokenDAI.reserveOf(DAI).greaterThan(JSBI.BigInt(1000))) {
      const WETHDAIPrice = new Route([DAIWETH], DAI).midPrice.adjusted
      const DAITokenPrice = new Route([tokenDAI], token).midPrice.adjusted
      priceFractions.push(USDETHPrice.multiply(WETHDAIPrice).multiply(DAITokenPrice))
    }
    // if USDCWETH pair exists and the token has a USDC pair with at least 1000 USDC
    if (USDCWETH && tokenUSDC && tokenUSDC.reserveOf(USDC).greaterThan(JSBI.BigInt(1000))) {
      const WETHUSDCPrice = new Route([USDCWETH], USDC).midPrice.adjusted
      const USDCTokenPrice = new Route([tokenUSDC], token).midPrice.adjusted
      priceFractions.push(USDETHPrice.multiply(WETHUSDCPrice).multiply(USDCTokenPrice))
    }

    priceFractions = priceFractions.filter((price) => !!price)

    return priceFractions
      .reduce((accumulator, priceFraction) => accumulator.add(priceFraction), new Fraction('0'))
      .divide(priceFractions.length.toString())
  }, [tokenWETH, token, USDETHPrice, DAIWETH, tokenDAI, USDCWETH, tokenUSDC])

  return price.equalTo('0') ? undefined : price
}
