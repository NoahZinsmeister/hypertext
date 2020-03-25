import { useCallback, useEffect, useState, useMemo } from 'react'
import { useWeb3React } from '@web3-react/core'
import { TradeType, Token, TokenAmount, Pair, Route, Trade } from '@uniswap/sdk'

import { injected } from './connectors'

export function useBodyKeyDown(targetKey: string, onKeyDown: (event?: any) => any, suppress = false) {
  const downHandler = useCallback(
    event => {
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

export function useExchange(tokenA: Token, tokenB: Token) {
  const { library } = useWeb3React()
  const [exchange, setExchange] = useState<Pair>()
  const [token0, token1] = tokenA && tokenB ? (tokenA.sortsBefore(tokenB) ? [tokenA, tokenB] : [tokenB, tokenA]) : []

  useEffect(() => {
    if (token0 && token1) {
      const update = () => {
        Pair.fetchData(token0, token1, library).then(setExchange)
      }

      update()
      const interval = setInterval(update, 15 * 1000)

      return () => {
        clearInterval(interval)
        setExchange(undefined)
      }
    }
  }, [token0, token1, library])

  return exchange
}

export function useRoute(exchange: Pair, inputToken: Token) {
  return useMemo(() => (exchange && inputToken ? new Route([exchange], inputToken) : undefined), [exchange, inputToken])
}
