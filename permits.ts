import { ChainId, Token } from '@uniswap/sdk'
import { Signature, splitSignature, hexDataSlice } from '@ethersproject/bytes'
import { PERMIT_AND_CALL_ADDRESS, MAX_UINT256 } from './constants'
import { Web3Provider } from '@ethersproject/providers'
import { Contract } from '@ethersproject/contracts'
import { BigNumber } from '@ethersproject/bignumber'
import { id } from '@ethersproject/hash'
import { defaultAbiCoder } from '@ethersproject/abi'

interface eth_signTypedData_v4 {
  types: {
    EIP712Domain: { name: string; type: string }[]
    Permit: { name: string; type: string }[]
  }
  domain: {
    name: string
    version: string
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
  approveMax: boolean,
  token: Token,
  library: Web3Provider
) => Promise<PermitGathererReturn>

const EIP712Domain = [
  { name: 'name', type: 'string' },
  { name: 'version', type: 'string' },
  { name: 'chainId', type: 'uint256' },
  { name: 'verifyingContract', type: 'address' },
]

const DAIPermitGatherer: PermitGathererFunction = async (address, deadline, _, token, library) => {
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
  const DAI = new Contract(token.address, ['function nonces(address holder) view returns (uint256 nonce)'], library)
  const nonce: BigNumber = await DAI.nonces(address)
  const message = {
    holder: address,
    spender: PERMIT_AND_CALL_ADDRESS,
    nonce: await Promise.resolve(nonce.toNumber()).catch(() => nonce.toString()),
    expiry: deadline,
    allowed: true,
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

const USDCPermitGatherer: PermitGathererFunction = async (address, deadline, _, token, library) => {
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
  const USDC = new Contract(token.address, ['function nonces(address owner) view returns (uint256 nonce)'], library)
  const nonce: BigNumber = await USDC.nonces(address)
  const value = `0x${MAX_UINT256.toString(16)}`
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

const permitGatherers: { [chainId: number]: { [tokenAddress: string]: PermitGathererFunction } } = {
  [ChainId.MAINNET]: {
    '0x6B175474E89094C44Da98b954EedeAC495271d0F': DAIPermitGatherer,
    '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48': USDCPermitGatherer,
  },
  [ChainId.KOVAN]: {
    '0x4F96Fe3b7A6Cf9725f59d353F723c1bDb64CA6Aa': DAIPermitGatherer,
  },
}

export function canPermit(token?: Token): boolean {
  return !token ? false : !!permitGatherers[token.chainId]?.[token.address]
}

export async function gatherPermit(
  address: string,
  deadline: number,
  approveMax: boolean,
  token: Token,
  library: Web3Provider
): Promise<Permit> {
  const { permitSelector, getPermitData, domain, ...data } = await permitGatherers[token.chainId][token.address](
    address,
    deadline,
    approveMax,
    token,
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
