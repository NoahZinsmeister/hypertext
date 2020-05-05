import { JSBI } from '@uniswap/sdk'

export const BG = { light: 'gray.50', dark: 'gray.900' }
export const COLOR = { light: 'black', dark: 'white' }

export const ADDRESS_ZERO = '0x0000000000000000000000000000000000000000'

export const DEFAULT_APPROVE_MAX = true
export const DEFAULT_DEADLINE = 60 * 15
export const DEFAULT_SLIPPAGE = 50

export const ROUTER_ADDRESS = '0xf164fC0Ec4E93095b804a4795bBe1e041497b92a'
export const ZERO = JSBI.BigInt(0)
export const MAX_UINT256 = JSBI.BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff')

export enum QueryParameters {
  INPUT = 'input',
  OUTPUT = 'output',
  CHAIN = 'chain',
}

export const ERC20_BYTES32 = [
  {
    constant: true,
    inputs: [],
    name: 'name',
    outputs: [{ internalType: 'bytes32', name: '', type: 'bytes32' }],
    payable: false,
    stateMutability: 'pure',
    type: 'function',
  },
  {
    constant: true,
    inputs: [],
    name: 'symbol',
    outputs: [{ internalType: 'bytes32', name: '', type: 'bytes32' }],
    payable: false,
    stateMutability: 'pure',
    type: 'function',
  },
]
