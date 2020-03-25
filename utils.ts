// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions#Escaping
export function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // $& means the whole matched string
}

export const CHAIN_ID_NAMES = {
  1: 'Mainnet',
  3: 'Ropsten',
  4: 'Rinkeby',
  5: 'Görli',
  42: 'Kovan'
}

export enum EtherscanType {
  Account
}

const ETHERSCAN_PREFIXES = {
  1: '',
  3: 'ropsten.',
  4: 'rinkeby.',
  5: 'goerli.',
  42: 'kovan.'
}

interface EtherscanTypeData {
  [EtherscanType.Account]: string
}

export function formatEtherscanLink(chainId: number, type: EtherscanType, data: EtherscanTypeData[EtherscanType]) {
  switch (type) {
    case EtherscanType.Account:
      return `https://${ETHERSCAN_PREFIXES[chainId]}etherscan.io/address/${data}`
  }
}
