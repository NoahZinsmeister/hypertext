import { JSBI, Fraction, Percent, Price, Token, WETH, ChainId } from '@uniswap/sdk'
import { UrlObject } from 'url'

import { isIPFS } from './constants'

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions#Escaping
export function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // $& means the whole matched string
}

export function shortenHex(hex: string, length = 4): string {
  return `${hex.substring(0, length + 2)}…${hex.substring(hex.length - length)}`
}

export const CHAIN_ID_NAMES: { [key: number]: string } = {
  1: 'Mainnet',
  3: 'Ropsten',
  4: 'Rinkeby',
  5: 'Görli',
  42: 'Kovan',
}

export const INFURA_PREFIXES: { [key: number]: string } = {
  1: 'mainnet',
  3: 'ropsten',
  4: 'rinkeby',
  5: 'goerli',
  42: 'kovan',
}

export enum EtherscanType {
  Account,
  TokenBalance,
  Transaction,
}

const ETHERSCAN_PREFIXES: { [key: number]: string } = {
  1: '',
  3: 'ropsten.',
  4: 'rinkeby.',
  5: 'goerli.',
  42: 'kovan.',
}

interface EtherscanTypeData {
  [EtherscanType.Account]: [number, string]
  [EtherscanType.TokenBalance]: [Token, string]
  [EtherscanType.Transaction]: [number, string]
}

export function formatEtherscanLink(type: EtherscanType, data: EtherscanTypeData[EtherscanType]): string {
  switch (type) {
    case EtherscanType.Account: {
      const [chainId, address] = data as EtherscanTypeData[EtherscanType.Account]
      return `https://${ETHERSCAN_PREFIXES[chainId]}etherscan.io/address/${address}`
    }
    case EtherscanType.TokenBalance: {
      const [token, address] = data as EtherscanTypeData[EtherscanType.TokenBalance]
      return `https://${ETHERSCAN_PREFIXES[token.chainId]}etherscan.io/token/${token.address}?a=${address}`
    }
    case EtherscanType.Transaction: {
      const [chainId, hash] = data as EtherscanTypeData[EtherscanType.Transaction]
      return `https://${ETHERSCAN_PREFIXES[chainId]}etherscan.io/tx/${hash}`
    }
  }
}

const SAI = new Token(ChainId.MAINNET, '0x89d24A6b4CcB1B6fAA2625fE562bDD9a23260359', 18)
export function getTokenDisplayValue(token: Token): string {
  return token.equals(WETH[token.chainId]) ? 'ETH' : token.equals(SAI) ? 'SAI' : token.symbol ?? 'UNKNOWN'
}

export function getPercentChange(referenceRate: Price, newRate: Price, flipOrder = false): Percent {
  // calculate (referenceRate - newRate) / referenceRate or (newRate - referenceRate) / referenceRate
  const difference = new Fraction(
    flipOrder
      ? JSBI.subtract(
          JSBI.multiply(newRate.adjusted.numerator, referenceRate.adjusted.denominator),
          JSBI.multiply(referenceRate.adjusted.numerator, newRate.adjusted.denominator)
        )
      : JSBI.subtract(
          JSBI.multiply(referenceRate.adjusted.numerator, newRate.adjusted.denominator),
          JSBI.multiply(newRate.adjusted.numerator, referenceRate.adjusted.denominator)
        ),
    JSBI.multiply(referenceRate.adjusted.denominator, newRate.adjusted.denominator)
  )
  const percentChange = difference.multiply(referenceRate.adjusted.invert())
  return new Percent(percentChange.numerator, percentChange.denominator)
}

export function modifyUrlObjectForIPFS(url: string | UrlObject): { href: UrlObject; as: UrlObject } {
  const normalizedURL = typeof url === 'string' ? { pathname: url } : url
  const { pathname, ...rest } = normalizedURL

  const pathnameForBrowser = pathname === '/' ? './' : `.${pathname}${isIPFS ? '.html' : ''}`

  return {
    href: {
      pathname,
      ...rest,
    },
    as: {
      pathname: pathnameForBrowser,
      ...rest,
    },
  }
}
