import { ChainId, Token } from '@uniswap/sdk'
import { Signature, splitSignature, hexDataSlice } from '@ethersproject/bytes'
import { PERMIT_AND_CALL_ADDRESS } from './constants'
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

const DAIPermitGatherer: PermitGathererFunction = async (address, deadline, _, token, library) => {
  const EIP712Domain = [
    { name: 'name', type: 'string' },
    { name: 'version', type: 'string' },
    { name: 'chainId', type: 'uint256' },
    { name: 'verifyingContract', type: 'address' },
  ]
  const Permit = [
    { name: 'holder', type: 'address' },
    { name: 'spender', type: 'address' },
    { name: 'nonce', type: 'uint256' },
    { name: 'expiry', type: 'uint256' },
    { name: 'allowed', type: 'bool' },
  ]
  const domain = {
    name: 'Dai Stablecoin',
  }
  const DAI = new Contract(token.address, ['function nonces(address holder) pure returns (uint256 nonce)'], library)
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

const permitGatherers: { [chainId: number]: { [tokenAddress: string]: PermitGathererFunction } } = {
  [ChainId.MAINNET]: {
    '0x6B175474E89094C44Da98b954EedeAC495271d0F': DAIPermitGatherer,
  },
  [ChainId.KOVAN]: {
    '0x4F96Fe3b7A6Cf9725f59d353F723c1bDb64CA6Aa': DAIPermitGatherer,
  },
}

export function canPermit(token?: Token): boolean {
  return !!permitGatherers[token?.chainId]?.[token?.address]
}

export async function gatherPermit(
  address: string,
  deadline: number,
  approveMax: boolean,
  token: Token,
  library: Web3Provider
): Promise<Permit> {
  const { permitSelector, getPermitData, ...data } = await permitGatherers[token.chainId][token.address](
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
          ...data.domain,
          version: '1',
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
