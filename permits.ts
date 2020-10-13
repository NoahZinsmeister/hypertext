import { ChainId, JSBI, Token } from '@uniswap/sdk'
import { Signature, splitSignature, hexDataSlice } from '@ethersproject/bytes'
import { PERMIT_AND_CALL_ADDRESS } from './constants'
import { Web3Provider } from '@ethersproject/providers'
import { Contract } from '@ethersproject/contracts'
import { BigNumber } from '@ethersproject/bignumber'
import { id } from '@ethersproject/hash'
import { defaultAbiCoder } from '@ethersproject/abi'

import { DAI, UNI, USDC } from './tokens'

interface eth_signTypedData_v4 {
  types: {
    EIP712Domain: { name: string; type: string }[]
    Permit: { name: string; type: string }[]
  }
  domain: {
    name: string
    version?: string
  }
  message: {
    [key: string]: any // eslint-disable-line @typescript-eslint/no-explicit-any
  }
}

export interface Permit {
  permitSelector: string
  permitData: string
}

interface PermitGathererReturn extends eth_signTypedData_v4 {
  permitSelector: Permit['permitSelector']
  getPermitData: (signature: Signature) => Permit['permitData']
}

type PermitGathererFunction = (
  address: string,
  deadline: number,
  approveAmount: JSBI,
  library: Web3Provider
) => Promise<PermitGathererReturn>

const EIP712Domain = [
  { name: 'name', type: 'string' },
  { name: 'version', type: 'string' },
  { name: 'chainId', type: 'uint256' },
  { name: 'verifyingContract', type: 'address' },
]

const EIP712DomainWithoutVersion = [
  { name: 'name', type: 'string' },
  { name: 'chainId', type: 'uint256' },
  { name: 'verifyingContract', type: 'address' },
]

const DAIPermitGatherer: PermitGathererFunction = async (address, deadline, _, library) => {
  const Permit = [
    { name: 'holder', type: 'address' },
    { name: 'spender', type: 'address' },
    { name: 'nonce', type: 'uint256' },
    { name: 'expiry', type: 'uint256' },
    { name: 'allowed', type: 'bool' },
  ]
  const domain = {
    name: 'Dai Stablecoin',
    version: '1',
  }
  const DAIContract = new Contract(
    DAI.address,
    ['function nonces(address holder) view returns (uint256 nonce)'],
    library
  )
  const nonce: BigNumber = await DAIContract.nonces(address)
  const message = {
    holder: address,
    spender: PERMIT_AND_CALL_ADDRESS,
    nonce: await Promise.resolve(nonce.toNumber()).catch(() => nonce.toString()),
    expiry: deadline,
    allowed: true, // DAI only allows unlimited approves
  }
  const inputs = ['address', 'address', 'uint256', 'uint256', 'bool', 'uint8', 'bytes32', 'bytes32']
  return {
    types: {
      EIP712Domain,
      Permit,
    },
    domain,
    message,
    permitSelector: hexDataSlice(id(`permit(${inputs.join(',')})`), 0, 4),
    getPermitData: ({ v, r, s }) =>
      defaultAbiCoder.encode(inputs, [address, PERMIT_AND_CALL_ADDRESS, nonce, deadline, true, v, r, s]),
  }
}

const USDCPermitGatherer: PermitGathererFunction = async (address, deadline, approveAmount, library) => {
  const Permit = [
    { name: 'owner', type: 'address' },
    { name: 'spender', type: 'address' },
    { name: 'value', type: 'uint256' },
    { name: 'nonce', type: 'uint256' },
    { name: 'deadline', type: 'uint256' },
  ]
  const domain = {
    name: 'USD Coin',
    version: '2',
  }
  const USDCContract = new Contract(
    USDC.address,
    ['function nonces(address owner) view returns (uint256 nonce)'],
    library
  )
  const nonce: BigNumber = await USDCContract.nonces(address)
  const value = `0x${approveAmount.toString(16)}`
  const message = {
    owner: address,
    spender: PERMIT_AND_CALL_ADDRESS,
    value,
    nonce: await Promise.resolve(nonce.toNumber()).catch(() => nonce.toString()),
    deadline,
  }
  const inputs = ['address', 'address', 'uint256', 'uint256', 'uint8', 'bytes32', 'bytes32']
  return {
    types: {
      EIP712Domain,
      Permit,
    },
    domain,
    message,
    permitSelector: hexDataSlice(id(`permit(${inputs.join(',')})`), 0, 4),
    getPermitData: ({ v, r, s }) =>
      defaultAbiCoder.encode(inputs, [address, PERMIT_AND_CALL_ADDRESS, value, deadline, v, r, s]),
  }
}

const UNIPermitGatherer: PermitGathererFunction = async (address, deadline, approveAmount, library) => {
  const Permit = [
    { name: 'owner', type: 'address' },
    { name: 'spender', type: 'address' },
    { name: 'value', type: 'uint256' },
    { name: 'nonce', type: 'uint256' },
    { name: 'deadline', type: 'uint256' },
  ]
  const domain = { name: 'Uniswap' }
  const UNIContract = new Contract(
    UNI.address,
    ['function nonces(address holder) view returns (uint256 nonce)'],
    library
  )
  const nonce: BigNumber = await UNIContract.nonces(address)
  const value = `0x${approveAmount.toString(16)}`
  const message = {
    owner: address,
    spender: PERMIT_AND_CALL_ADDRESS,
    value,
    nonce: await Promise.resolve(nonce.toNumber()).catch(() => nonce.toString()),
    deadline,
  }
  const inputs = ['address', 'address', 'uint256', 'uint256', 'uint8', 'bytes32', 'bytes32']
  return {
    types: {
      EIP712Domain: EIP712DomainWithoutVersion,
      Permit,
    },
    domain,
    message,
    permitSelector: hexDataSlice(id(`permit(${inputs.join(',')})`), 0, 4),
    getPermitData: ({ v, r, s }) =>
      defaultAbiCoder.encode(inputs, [address, PERMIT_AND_CALL_ADDRESS, value, deadline, v, r, s]),
  }
}

const permitGatherers: { [chainId: number]: { [tokenAddress: string]: PermitGathererFunction } } = {
  [ChainId.MAINNET]: {
    [DAI.address]: DAIPermitGatherer,
    [USDC.address]: USDCPermitGatherer,
    [UNI.address]: UNIPermitGatherer,
  },
  [ChainId.ROPSTEN]: {
    [UNI.address]: UNIPermitGatherer,
  },
  [ChainId.RINKEBY]: {
    [UNI.address]: UNIPermitGatherer,
  },
  [ChainId.GÖRLI]: {
    [UNI.address]: UNIPermitGatherer,
  },
  [ChainId.KOVAN]: {
    '0x4F96Fe3b7A6Cf9725f59d353F723c1bDb64CA6Aa': DAIPermitGatherer,
    [UNI.address]: UNIPermitGatherer,
  },
}

export function canPermit(token?: Token): boolean {
  return !token ? false : !!permitGatherers[token.chainId]?.[token.address]
}

export async function gatherPermit(
  address: string,
  deadline: number,
  approveAmount: JSBI,
  token: Token,
  library: Web3Provider
): Promise<Permit> {
  const { permitSelector, getPermitData, domain, ...data } = await permitGatherers[token.chainId][token.address](
    address,
    deadline,
    approveAmount,
    library
  )

  const signature = await library
    .send('eth_signTypedData_v4', [
      address,
      JSON.stringify({
        ...data,
        domain: {
          ...domain,
          chainId: token.chainId,
          verifyingContract: token.address,
        },
        primaryType: 'Permit',
      }),
    ])
    .then(splitSignature)

  return {
    permitSelector,
    permitData: getPermitData(signature),
  }
}
