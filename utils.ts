import { JSBI, Fraction, Percent, Price, Token, WETH } from '@uniswap/sdk'

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions#Escaping
export function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // $& means the whole matched string
}

export const CHAIN_ID_NAMES = {
  1: 'Mainnet',
  3: 'Ropsten',
  4: 'Rinkeby',
  5: 'Görli',
  42: 'Kovan',
}

export enum EtherscanType {
  Account,
  TokenBalance,
  Transaction,
}

const ETHERSCAN_PREFIXES = {
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

export function formatEtherscanLink(type: EtherscanType, data: EtherscanTypeData[EtherscanType]) {
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

export function shortenAddress(address: string, length: number = 4) {
  return `${address.substring(0, length + 2)}…${address.substring(address.length - length)}`
}

export function getPercentChange(referenceRate: Price, newRate: Price, flipOrder = false): Percent {
  // calculate (referenceRate - newRate) / referenceRate
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

export function getTokenDisplayValue(token: Token): string {
  return WETH[token.chainId].equals(token) ? 'ETH' : token.symbol ?? shortenAddress(token.address)
}
