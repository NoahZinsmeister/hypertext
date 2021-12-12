import { NetworkConnector } from '@web3-react/network-connector'
import { InjectedConnector } from '@web3-react/injected-connector'
import { WalletConnectConnector } from '@web3-react/walletconnect-connector'

import { INFURA_PREFIXES } from './utils'

import { UAuthConnector } from '@uauth/web3-react'
import type { AbstractConnector } from '@web3-react/abstract-connector'

export function getNetwork(defaultChainId = 1): NetworkConnector {
  return new NetworkConnector({
    urls: [1, 3, 4, 5, 42].reduce(
      (urls, chainId) =>
        Object.assign(urls, {
          [chainId]: `https://${INFURA_PREFIXES[chainId]}.infura.io/v3/${process.env.INFURA_PROJECT_ID}`,
        }),
      {}
    ),
    defaultChainId,
  })
}

export const injected = new InjectedConnector({ supportedChainIds: [1, 3, 4, 5, 42] })

export const walletconnect = new WalletConnectConnector({
  rpc: {
    1: `https://${INFURA_PREFIXES[1]}.infura.io/v3/${process.env.INFURA_PROJECT_ID}`,
  },
  bridge: 'https://bridge.walletconnect.org',
})

// @see docs: https://github.com/unstoppabledomains/uauth/blob/main/examples/web3-react/README.md
export const uauth = new UAuthConnector({
  clientID: process.env.UAUTH_CLIENTID,
  clientSecret: process.env.UAUTH_CLIENTSECRET,
  redirectUri: process.env.UAUTH_REDIRECT_URI,
  postLogoutRedirectUri: process.env.UAUTH_POSTREDIRECT_URI,

  scope: 'openid wallet',

  // Injected and walletconnect connectors are required.
  // Existing implems: https://github.com/ethereum/EIPs/blob/master/EIPS/eip-1193.md#implementations
  connectors: { injected, walletconnect },
})

export const connectors: Record<string, AbstractConnector> = {
  injected,
  walletconnect,
  uauth,
}
