import { useState, useEffect, Suspense } from 'react'
import { Button, Stack, Text, Box, IconButton } from '@chakra-ui/core'
import { Web3Provider } from '@ethersproject/providers'
import { useWeb3React } from '@web3-react/core'

import { formatEtherscanLink, EtherscanType, shortenHex } from '../utils'
import { injected, getNetwork } from '../connectors'
import { useETHBalance, useTokenBalance } from '../data'
import TokenLogo from './TokenLogo'
import { WETH } from '@uniswap/sdk'
import { useFirstToken, useSecondToken } from '../context'
import { useEagerConnect, useQueryParameters } from '../hooks'
import { QueryParameters } from '../constants'
import ErrorBoundary from './ErrorBoundary'

function ETHBalance(): JSX.Element {
  const { account } = useWeb3React<Web3Provider>()
  const { data } = useETHBalance(account, true)

  return (
    <Button
      variant="outline"
      cursor="default"
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
  const { active, error, activate, library, chainId, account } = useWeb3React<Web3Provider>()

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
      library
        .lookupAddress(account)
        .then((name) => {
          if (typeof name === 'string') {
            setENSName(name)
          }
        })
        .catch(() => {}) // eslint-disable-line @typescript-eslint/no-empty-function
      return (): void => {
        setENSName('')
      }
    }
  }, [library, account, chainId])

  const [firstToken] = useFirstToken()
  const [secondToken] = useSecondToken()
  const { data: firstTokenBalance } = useTokenBalance(firstToken, account)
  const { data: secondTokenBalance } = useTokenBalance(secondToken, account)

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
            activate(injected)
          }}
        >
          Connect Wallet
        </Button>
      </Box>
    )
  }

  return (
    <Stack direction="column" align="flex-end">
      <Stack direction="row" spacing={0} whiteSpace="nowrap" m={0}>
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

      {!!firstToken && !firstToken.equals(WETH[firstToken.chainId]) && (
        <Button
          as="a"
          rightIcon="external-link"
          variant="outline"
          width="min-content"
          isLoading={!!!firstTokenBalance}
          {...{
            href: formatEtherscanLink(EtherscanType.TokenBalance, [firstToken, account]),
            target: '_blank',
            rel: 'noopener noreferrer',
          }}
        >
          <TokenLogo token={firstToken} size="1.5rem" />
          <Text ml="0.5rem">{firstTokenBalance?.toSignificant(6, { groupSeparator: ',' })}</Text>
        </Button>
      )}

      {!!secondToken && !secondToken.equals(WETH[secondToken.chainId]) && (
        <Button
          as="a"
          rightIcon="external-link"
          variant="outline"
          width="min-content"
          isLoading={!!!secondTokenBalance}
          {...{
            href: formatEtherscanLink(EtherscanType.TokenBalance, [secondToken, account]),
            target: '_blank',
            rel: 'noopener noreferrer',
          }}
        >
          <TokenLogo token={secondToken} size="1.5rem" />
          <Text ml="0.5rem">{secondTokenBalance?.toSignificant(6, { groupSeparator: ',' })}</Text>
        </Button>
      )}
    </Stack>
  )
}
