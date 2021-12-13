import { InjectedConnector } from '@web3-react/injected-connector'
import { NetworkConnector } from '@web3-react/network-connector'
import { WalletConnectConnector } from '@web3-react/walletconnect-connector'
import { INFURA_PREFIXES } from './utils'



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

/**
 * Unstoppable Domains
 */

/**
 * @note UD using Web3React does not callback active & account in useWeb3React() when logged in
 * Furthermore for some reason, it triggers a 2nd provider opening after being logged
 * e.g. Just after a login it then opens the Metamask authn window or WalletConnect QRCode
 */
// // @see docs: https://github.com/unstoppabledomains/uauth/blob/main/examples/web3-react/README.md
// export const uauth = new UAuthConnector({
//   clientID: process.env.UAUTH_CLIENTID,
//   clientSecret: process.env.UAUTH_CLIENTSECRET,
//   redirectUri: process.env.UAUTH_REDIRECT_URI,
//   // postLogoutRedirectUri: process.env.UAUTH_POSTLOGOUT_REDIRECT_URI,

//   shouldLoginWithRedirect: false,
//   scope: 'openid wallet',

//   // Injected and walletconnect connectors are required.
//   // Existing implems: https://github.com/ethereum/EIPs/blob/master/EIPS/eip-1193.md#implementations
//   connectors: { injected, walletconnect },
// })
// console.log(`uauth`, uauth)

// export const connectors: Record<string, AbstractConnector> = {
//   injected,
//   walletconnect,
//   uauth,
// }
