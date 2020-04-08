import { Flex, IconButton, useDisclosure, Badge, LightMode } from '@chakra-ui/core'
import { useWeb3React } from '@web3-react/core'

import { CHAIN_ID_NAMES } from '../utils'
import { useBodyKeyDown } from '../hooks'
import { useTransactions } from '../context'
import ColorBox from './ColorBox'
import Settings from './Settings'
import Account from './Account'
import { TransactionToast } from './TransactionToast'

export default function Layout({ tried, children }: { tried: boolean; children: JSX.Element }): JSX.Element {
  const { chainId } = useWeb3React()
  const isTestnet = chainId !== 1

  const [transactions] = useTransactions()

  const { isOpen: isOpenSettings, onOpen: onOpenSettings, onClose: onCloseSettings } = useDisclosure()
  useBodyKeyDown('s', onOpenSettings, isOpenSettings)

  return (
    <>
      <Settings isOpen={isOpenSettings} onClose={onCloseSettings} />

      {transactions.map((hash) => (
        <TransactionToast key={hash} hash={hash} />
      ))}

      <ColorBox
        as={Flex}
        flexDirection="column"
        borderColor="orange.500"
        borderWidth={isTestnet ? '.5rem' : '0'}
        minHeight="100vh"
        maxHeight="100vh"
      >
        <Flex justifyContent="space-between" overflowX="auto" minHeight="9.5rem" maxHeight="9.5rem" p="1rem" pb={0}>
          <IconButton icon="settings" variant="ghost" onClick={onOpenSettings} aria-label="Settings" />
          <Account tried={tried} />
        </Flex>

        <Flex flexGrow={1} direction="column" overflowY="auto">
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
      </ColorBox>
    </>
  )
}
