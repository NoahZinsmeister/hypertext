import { Suspense } from 'react'
import { Button, Text, IconButton, useColorMode } from '@chakra-ui/core'
import { useWeb3React } from '@web3-react/core'
import { Token } from '@uniswap/sdk'

import { formatEtherscanLink, EtherscanType } from '../utils'
import { BG } from '../constants'
import { useTokenBalance } from '../data'
import TokenLogo from './TokenLogo'
import ErrorBoundary from './ErrorBoundary'
import { useShowUSD } from '../context'
import { useUSDTokenPrice } from '../hooks'

function Balance({ token }: { token: Token }): JSX.Element {
  const { colorMode } = useColorMode()
  const { account } = useWeb3React()
  const { data } = useTokenBalance(token, account, true)

  const [showUSD] = useShowUSD()
  const USDTokenPrice = useUSDTokenPrice(token)

  return (
    <Button
      as="a"
      rightIcon="external-link"
      variant="outline"
      backgroundColor={BG[colorMode]}
      {...{
        href: formatEtherscanLink(EtherscanType.TokenBalance, [token, account]),
        target: '_blank',
        rel: 'noopener noreferrer',
      }}
    >
      <TokenLogo token={token} size="1.5rem" />
      <Text ml="0.5rem">
        {showUSD && USDTokenPrice
          ? `$${data.multiply(USDTokenPrice).toFixed(2, { groupSeparator: ',' })}`
          : data.toSignificant(6, { groupSeparator: ',' })}
      </Text>
    </Button>
  )
}

export default function TokenBalance({ token }: { token: Token }): JSX.Element {
  const { colorMode } = useColorMode()
  return (
    <ErrorBoundary
      fallback={
        <IconButton
          variant="outline"
          backgroundColor={BG[colorMode]}
          icon="warning"
          aria-label="Failed"
          isDisabled
          cursor="default !important"
          _hover={{}}
          _active={{}}
        />
      }
    >
      <Suspense
        fallback={
          <Button
            variant="outline"
            backgroundColor={BG[colorMode]}
            isLoading
            cursor="default !important"
            _hover={{}}
            _active={{}}
          >
            {null}
          </Button>
        }
      >
        <Balance token={token} />
      </Suspense>
    </ErrorBoundary>
  )
}
