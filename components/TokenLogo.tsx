import { useState, useEffect } from 'react'
import { Image, Icon } from '@chakra-ui/core'
import { Token, WETH } from '@uniswap/sdk'
import Vibrant from 'node-vibrant'

let BROKEN: { [chainId: number]: { [address: string]: boolean } } = {}

export default function TokenLogo({ token, size }: { token: Token; size: string }) {
  let src: string
  if (token.equals(WETH[token.chainId])) {
    src =
      'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2/logo.png'
  } else {
    src =
      token.symbol === 'DAI'
        ? `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x6B175474E89094C44Da98b954EedeAC495271d0F/logo.png`
        : token.symbol === 'MKR'
        ? `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2/logo.png`
        : `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/${token.address}/logo.png`
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
        onError={() => {
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

let SWATCHES: { [chainId: number]: { [address: string]: any } } = {}

export function TokenLogoColor({
  token,
  children,
}: {
  token?: Token
  children: (swatch: undefined | any | null) => any
}) {
  const [, setDummy] = useState(0)

  useEffect(() => {
    if (
      !!token &&
      !token.equals(WETH[token.chainId]) &&
      !BROKEN[token.chainId]?.[token.address] &&
      !SWATCHES[token.chainId]?.[token.address]
    ) {
      Vibrant.from(
        token.symbol === 'DAI'
          ? `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x6B175474E89094C44Da98b954EedeAC495271d0F/logo.png`
          : token.symbol === 'MKR'
          ? `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2/logo.png`
          : `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/${token.address}/logo.png`
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
          setDummy((dummy) => dummy + 1)
        })
        .catch(() => {
          BROKEN = {
            ...BROKEN,
            [token.chainId]: {
              ...BROKEN?.[token.chainId],
              [token.address]: true,
            },
          }
          setDummy((dummy) => dummy + 1)
        })
    }
  }, [token])

  return children(!BROKEN[token?.chainId]?.[token?.address] ? SWATCHES[token?.chainId]?.[token?.address] : null)
}
