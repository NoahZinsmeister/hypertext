import { useState, useEffect } from 'react'
import { Image, Icon } from '@chakra-ui/core'
import { Token, WETH } from '@uniswap/sdk'

let BROKEN: { [chainId: number]: { [address: string]: boolean } } = {}

export default function TokenLogo({ token, size }: { token: Token; size: string }): JSX.Element {
  let src: string
  if (token.equals(WETH[token.chainId])) {
    src =
      'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2/logo.png'
  } else {
    src = `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/${token.address}/logo.png`
  }

  const [, setDummy] = useState(0)

  if (!BROKEN[token.chainId]?.[token.address]) {
    return (
      <Image
        src={src}
        minHeight={size}
        maxHeight={size}
        maxWidth={size}
        minWidth={size}
        objectFit="contain"
        onError={(): void => {
          BROKEN = {
            ...BROKEN,
            [token.chainId]: {
              ...BROKEN?.[token.chainId],
              [token.address]: true,
            },
          }
          setDummy((dummy) => dummy + 1)
        }}
        ignoreFallback
      />
    )
  } else {
    return <Icon width={size} height={size} name="question-outline" />
  }
}

type Swatch = { hex: string } | null
let SWATCHES: { [chainId: number]: { [address: string]: Swatch } } = {}

export function TokenLogoColor({
  token,
  children,
}: {
  token?: Token
  children: (swatch: undefined | Swatch) => JSX.Element
}): JSX.Element {
  const [, setDummy] = useState(0)

  useEffect(() => {
    if (
      !!token &&
      !token.equals(WETH[token.chainId]) &&
      !BROKEN[token.chainId]?.[token.address] &&
      !SWATCHES[token.chainId]?.[token.address]
    ) {
      let stale = false

      import('node-vibrant').then(({ default: Vibrant }) =>
        Vibrant.from(
          `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/${token.address}/logo.png`
        )
          .getPalette()
          .then((palette) => {
            SWATCHES = {
              ...SWATCHES,
              [token.chainId]: {
                ...SWATCHES?.[token.chainId],
                [token.address]: palette.Vibrant,
              },
            }
            if (!stale) {
              setDummy((dummy) => dummy + 1)
            }
          })
          .catch(() => {
            BROKEN = {
              ...BROKEN,
              [token.chainId]: {
                ...BROKEN?.[token.chainId],
                [token.address]: true,
              },
            }
            if (!stale) {
              setDummy((dummy) => dummy + 1)
            }
          })
      )

      return () => {
        stale = true
      }
    }
  }, [token])

  return children(!BROKEN[token?.chainId]?.[token?.address] ? SWATCHES[token?.chainId]?.[token?.address] : null)
}
