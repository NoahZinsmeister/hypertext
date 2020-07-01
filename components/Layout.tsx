import { ReactNode } from 'react'
import { Flex, IconButton, useDisclosure, Badge, LightMode, Stack, Box, Radio } from '@chakra-ui/core'
import { useWeb3React } from '@web3-react/core'
import dynamic from 'next/dynamic'

import { CHAIN_ID_NAMES } from '../utils'
import { useBodyKeyDown, useUSDETHPrice } from '../hooks'
import { useTransactions, useFirstToken, useSecondToken, useShowUSD } from '../context'
import ColorBox from './ColorBox'
import Account from './Account'
import { TransactionToast } from './TransactionToast'
import TokenBalance from './TokenBalance'
import { WETH } from '@uniswap/sdk'

const Settings = dynamic(() => import('./Settings'))

export default function Layout({ children }: { children: ReactNode }): JSX.Element {
  const { chainId, account } = useWeb3React()
  const isTestnet = typeof chainId === 'number' && chainId !== 1

  const { isOpen: isOpenSettings, onOpen: onOpenSettings, onClose: onCloseSettings } = useDisclosure()

  const [firstToken] = useFirstToken()
  const [secondToken] = useSecondToken()
  const [showUSD, setShowUSD] = useShowUSD()

  const [transactions] = useTransactions()

  const USDETHPrice = useUSDETHPrice()

  return (
    <>
      <Settings isOpen={isOpenSettings} onClose={onCloseSettings} />

      <ColorBox
        as={Flex}
        flexDirection="column"
        borderColor="orange.500"
        borderWidth={isTestnet ? '.5rem' : '0'}
        minHeight="100vh"
        maxHeight="100vh"
      >
        <Flex justifyContent="space-between" flexShrink={0} overflowX="auto" p="1rem">
          <Stack spacing={0} direction="row">
            <IconButton icon="settings" variant="ghost" onClick={onOpenSettings} aria-label="Settings" />
            {!!USDETHPrice && (
              <Radio
                isChecked={showUSD}
                onChange={() => {}} // eslint-disable-line @typescript-eslint/no-empty-function
                onMouseEnter={() => setShowUSD(true)}
                onMouseLeave={() => setShowUSD(false)}
                ml="0.5rem"
              >
                Show $ values
              </Radio>
            )}
          </Stack>
          <Account />
        </Flex>

        {typeof account === 'string' && (
          <Stack
            position="absolute"
            top={0}
            right={0}
            m={isTestnet ? '1.5rem' : '1rem'}
            mt={isTestnet ? '5rem' : '4.5rem'}
            alignItems="flex-end"
            spacing="1rem"
            zIndex={2}
          >
            {firstToken && !firstToken.equals(WETH[firstToken.chainId]) ? (
              <Box>
                <TokenBalance token={firstToken} />
              </Box>
            ) : null}
            {secondToken && !secondToken.equals(WETH[secondToken.chainId]) ? (
              <Box>
                <TokenBalance token={secondToken} />
              </Box>
            ) : null}
          </Stack>
        )}

        <Flex flexGrow={1} direction="column" overflow="auto">
          {children}
        </Flex>

        <Flex minHeight="1.5rem">
          {typeof chainId === 'number' && (
            <LightMode>
              <Badge
                variant="solid"
                variantColor={isTestnet ? 'orange' : undefined}
                fontSize="1rem"
                style={{ borderTopLeftRadius: 0, borderBottomRightRadius: 0, borderBottomLeftRadius: 0 }}
              >
                {CHAIN_ID_NAMES[chainId]}
              </Badge>
            </LightMode>
          )}
        </Flex>

        {transactions.length > 0 && (
          <Stack
            position="absolute"
            bottom={0}
            right={0}
            m={isTestnet ? '1.5rem' : '1rem'}
            alignItems="flex-end"
            spacing="1rem"
            zIndex={2}
          >
            {transactions
              .filter((transaction) => transaction.chainId === chainId)
              .map(({ hash }) => (
                <Box key={hash}>
                  <TransactionToast hash={hash} />
                </Box>
              ))}
          </Stack>
        )}
      </ColorBox>
    </>
  )
}
