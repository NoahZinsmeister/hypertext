/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { Box, Button, IconButton, Stack } from '@chakra-ui/core'
import { Web3Provider } from '@ethersproject/providers'
import MetaMaskOnboarding from '@metamask/onboarding'
import { TokenAmount } from '@uniswap/sdk'
import { useWeb3React } from '@web3-react/core'
import { UserRejectedRequestError } from '@web3-react/injected-connector'
import { Suspense, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { getNetwork, injected } from '../connectors'
import { QueryParameters } from '../constants'
import { useIsConnected, useShowUSD } from '../context'
import { useETHBalance } from '../data'
import { useQueryParameters, useUSDETHPrice } from '../hooks'
import { uauth } from '../ud-auth'
import { EtherscanType, formatEtherscanLink, shortenHex } from '../utils'
import ErrorBoundary from './ErrorBoundary'

function ETHBalance({ address }: { address: string }): JSX.Element {
  const { account } = useWeb3React()
  const { data } = useETHBalance(account || address, true)

  const [showUSD] = useShowUSD()
  const USDETHPrice = useUSDETHPrice()

  return (
    <Button
      variant="outline"
      cursor="default"
      tabIndex={-1}
      _hover={{}}
      _active={{}}
      _focus={{}}
      style={{ borderTopRightRadius: 0, borderBottomRightRadius: 0, borderRight: 'none' }}
    >
      Ξ{' '}
      {showUSD && USDETHPrice
        ? `$${(data as TokenAmount).multiply(USDETHPrice).toFixed(2, { groupSeparator: ',' })}`
        : (data as TokenAmount)?.toSignificant(4, { groupSeparator: ',' })}
    </Button>
  )
}
export default function Account({ triedToEagerConnect }: { triedToEagerConnect: boolean }): JSX.Element | null {
  const { active, error, activate, library, chainId, account, setError, deactivate } = useWeb3React<Web3Provider>()

  // initialize metamask onboarding
  const onboarding = useRef<MetaMaskOnboarding>()
  useLayoutEffect(() => {
    onboarding.current = new MetaMaskOnboarding()
  }, [])

  // automatically try connecting to the network connector where applicable
  const queryParameters = useQueryParameters()
  const requiredChainId = queryParameters[QueryParameters.CHAIN]
  useEffect(() => {
    if (triedToEagerConnect && !active && !error) {
      activate(getNetwork(requiredChainId))
    }
  }, [triedToEagerConnect, active, error, requiredChainId, activate])

  // manage connecting state for injected connector
  const [connecting, setConnecting] = useState(false)
  useEffect(() => {
    if (active || error) {
      setConnecting(false)
      onboarding.current?.stopOnboarding()
    }
  }, [active, error])

  const [ENSName, setENSName] = useState<string>('')
  useEffect(() => {
    if (library && account) {
      let stale = false
      library
        .lookupAddress(account)
        .then((name) => {
          if (!stale && typeof name === 'string') {
            setENSName(name)
          }
        })
        .catch(() => {}) // eslint-disable-line @typescript-eslint/no-empty-function
      return (): void => {
        stale = true
        setENSName('')
      }
    }
  }, [library, account, chainId])

  // UD States
  const [isConnected, setIsConnected] = useIsConnected()
  const [UDAccount, setUDAccount] = useState('')
  const [UDAddress, setUDAddress] = useState('')

  // UD on login
  useEffect(() => {
    async function fetchUser() {
      try {
        const UDUser = await uauth.user()
        if (UDUser) {
          setUDAccount(UDUser.sub)
          setUDAddress(UDUser.wallet_address!)
          setIsConnected(true)
        }
      } catch (error) {
        setUDAccount('')
        setUDAddress('')
        setIsConnected(false)
      }
    }
    fetchUser()
  }, [isConnected, setIsConnected])

  // UD logout
  async function UDLogout() {
    try {
      await uauth.logout()
      deactivate()
      setIsConnected(false)
    } catch (error) {}
  }

  if (error) {
    return null
  } else if (!triedToEagerConnect) {
    return null
  } else if (typeof account !== 'string' && UDAccount === '') {
    return (
      <Box>
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {MetaMaskOnboarding.isMetaMaskInstalled() || (window as any)?.ethereum || (window as any)?.web3 ? (
          <Button
            isLoading={connecting}
            leftIcon={MetaMaskOnboarding.isMetaMaskInstalled() ? ('metamask' as 'edit') : undefined}
            onClick={(): void => {
              setConnecting(true)
              activate(injected, undefined, true).catch((error) => {
                // ignore the error if it's a user rejected request
                if (error instanceof UserRejectedRequestError) {
                  setConnecting(false)
                } else {
                  setError(error)
                }
              })
            }}
          >
            {MetaMaskOnboarding.isMetaMaskInstalled() ? 'Connect to MetaMask' : 'Connect to Wallet'}
          </Button>
        ) : (
          <Button leftIcon={'metamask' as 'edit'} onClick={() => onboarding.current?.startOnboarding()}>
            Install Metamask
          </Button>
        )}
      </Box>
    )
  }

  let leftIcon: string | undefined

  // Check UD first because it overlaps both WC & MM
  if (UDAccount !== '') {
    leftIcon = 'unstoppabledomains'

    // Check walletconnect in 2nd because sometime metamask can be installed but we're still using walletconnect
  } else if ((library?.provider as { isWalletConnect: boolean })?.isWalletConnect) {
    leftIcon = 'walletconnect'
  } else if (MetaMaskOnboarding.isMetaMaskInstalled()) {
    leftIcon = 'metamask'
  }

  return (
    <Stack direction="row" spacing={0} whiteSpace="nowrap" m={0} shouldWrapChildren>
      <ErrorBoundary
        fallback={
          <IconButton
            variant="outline"
            icon="warning"
            aria-label="Failed"
            isDisabled
            cursor="default !important"
            _hover={{}}
            _active={{}}
            style={{ borderTopRightRadius: 0, borderBottomRightRadius: 0, borderRight: 'none' }}
          />
        }
      >
        <Suspense
          fallback={
            <Button
              variant="outline"
              isLoading
              cursor="default !important"
              _hover={{}}
              _active={{}}
              style={{ borderTopRightRadius: 0, borderBottomRightRadius: 0, borderRight: 'none' }}
            >
              {null}
            </Button>
          }
        >
          <ETHBalance address={UDAddress} />
        </Suspense>
      </ErrorBoundary>

      <Button
        as="a"
        leftIcon={leftIcon ? (leftIcon as 'edit') : undefined}
        rightIcon="external-link"
        style={UDAccount !== '' ? { borderRadius: 0 } : { borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }}
        {...{
          href: formatEtherscanLink(EtherscanType.Account, [chainId as number, account!]),
          target: '_blank',
          rel: 'noopener noreferrer',
        }}
      >
        {UDAccount !== '' ? UDAccount : ENSName || `${shortenHex(account!, 4)}`}
      </Button>
      {UDAccount !== '' ? (
        <IconButton
          variant="outline"
          icon="small-close"
          aria-label="Failed"
          style={{ borderTopLeftRadius: 0, borderBottomLeftRadius: 0, borderLeft: 'none' }}
          onClick={UDLogout}
        />
      ) : (
        ''
      )}
    </Stack>
  )
}
