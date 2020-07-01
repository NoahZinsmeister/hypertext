import { useState, useEffect, Suspense } from 'react'
import { Button, Stack, Box, IconButton } from '@chakra-ui/core'
import { Web3Provider } from '@ethersproject/providers'
import { useWeb3React } from '@web3-react/core'
import { NoEthereumProviderError, UserRejectedRequestError } from '@web3-react/injected-connector'
import { UserRejectedRequestError as UserRejectedRequestErrorWalletconnect } from '@web3-react/walletconnect-connector'

import { formatEtherscanLink, EtherscanType, shortenHex } from '../utils'
import { injected, getNetwork, walletconnect } from '../connectors'
import { useETHBalance } from '../data'
import { useEagerConnect, useQueryParameters } from '../hooks'
import { QueryParameters } from '../constants'
import ErrorBoundary from './ErrorBoundary'

function ETHBalance(): JSX.Element {
  const { account } = useWeb3React()
  const { data } = useETHBalance(account, true)

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
      Ξ {data.toSignificant(4, { groupSeparator: ',' })}
    </Button>
  )
}

export default function Account(): JSX.Element {
  const { active, error, activate, library, chainId, account, setError } = useWeb3React<Web3Provider>()

  // automatically try connecting to the injected connected where applicable
  const tried = useEagerConnect()

  // automatically try connecting to the network connector where applicable
  const queryParameters = useQueryParameters()
  const requiredChainId = queryParameters[QueryParameters.CHAIN]
  useEffect(() => {
    if (tried && !active && !error) {
      activate(getNetwork(requiredChainId))
    }
  }, [tried, active, error, requiredChainId, activate])

  // manage connecting state for injected connector
  const [connecting, setConnecting] = useState(false)
  useEffect(() => {
    if (active || error) {
      setConnecting(false)
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

  if (error) {
    return null
  } else if (!tried) {
    return null
  } else if (typeof account !== 'string') {
    return (
      <Box>
        <Button
          isLoading={connecting}
          onClick={(): void => {
            setConnecting(true)
            activate(injected, undefined, true).catch((error) => {
              // ignore the error if it's a user rejected request
              if (error instanceof UserRejectedRequestError) {
                setConnecting(false)
              }
              // try connecting to walletconnect if there was no injected provider and we're on mainnet
              else if (error instanceof NoEthereumProviderError && chainId === 1) {
                // reset the connector if it was tried already
                if (walletconnect?.walletConnectProvider?.wc?.uri) {
                  walletconnect.walletConnectProvider = undefined
                }
                activate(walletconnect, undefined, true).catch((error) => {
                  if (error instanceof UserRejectedRequestErrorWalletconnect) {
                    setConnecting(false)
                  } else {
                    setError(error)
                  }
                })
              } else {
                setError(error)
              }
            })
          }}
        >
          Connect Wallet
        </Button>
      </Box>
    )
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
          <ETHBalance />
        </Suspense>
      </ErrorBoundary>

      <Button
        as="a"
        rightIcon="external-link"
        style={{ borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }}
        {...{
          href: formatEtherscanLink(EtherscanType.Account, [chainId, account]),
          target: '_blank',
          rel: 'noopener noreferrer',
        }}
      >
        {ENSName || `${shortenHex(account, 4)}`}
      </Button>
    </Stack>
  )
}
