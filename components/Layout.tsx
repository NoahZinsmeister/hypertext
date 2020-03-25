import Head from 'next/head'
import { useColorMode, Box, Flex, IconButton, useDisclosure, Link, Badge, LightMode } from '@chakra-ui/core'
import { useWeb3React } from '@web3-react/core'

import { BG_COLOR, COLOR, DEFAULT_CHAIN_ID } from '../constants'
import { CHAIN_ID_NAMES } from '../utils'
import { useBodyKeyDown } from '../hooks'
import Settings from './Settings'
import Account from './Account'

export default function Layout({ children }) {
  const { colorMode } = useColorMode()

  const { chainId } = useWeb3React()

  const { isOpen: isOpenSettings, onOpen: onOpenSettings, onClose: onCloseSettings } = useDisclosure()
  useBodyKeyDown('s', onOpenSettings, isOpenSettings)

  const isTestnet = (chainId ?? DEFAULT_CHAIN_ID) !== 1

  return (
    <>
      <Head>
        <link rel="shortcut icon" href={`favicon${colorMode === 'light' ? '' : '-dark'}.ico`} />
      </Head>

      <Box bg={BG_COLOR[colorMode]} color={COLOR[colorMode]}>
        <IconButton
          icon="settings"
          aria-label="Settings"
          onClick={() => {
            onOpenSettings()
          }}
          variant="ghost"
          position="absolute"
          left={0}
          top={0}
          m="1.5rem"
        />
        <Settings isOpen={isOpenSettings} onClose={onCloseSettings} />

        <Account />

        <Flex
          direction="column"
          align="center"
          justify="center"
          minHeight="100vh"
          borderColor="orange.500"
          borderWidth={isTestnet ? '.5rem' : '0'}
        >
          {children}
        </Flex>

        <LightMode>
          <Badge
            position="absolute"
            left={0}
            bottom={0}
            variant="solid"
            variantColor={isTestnet ? 'orange' : undefined}
            fontSize="1rem"
            m={isTestnet ? '.5rem' : 0}
            style={{ borderTopLeftRadius: 0, borderBottomRightRadius: 0, borderBottomLeftRadius: 0 }}
          >
            {CHAIN_ID_NAMES[chainId ?? DEFAULT_CHAIN_ID]}
          </Badge>
        </LightMode>

        <Link
          position="absolute"
          right={0}
          bottom={0}
          m="1.5rem"
          transition="none"
          href={`https://github.com/NoahZinsmeister/sentence-swap/tree/${process.env.COMMIT_SHA}`}
          target={'_blank'}
          rel={'noopener noreferrer'}
          lineHeight={1}
        >
          <code style={{ textTransform: 'lowercase' }}>{process.env.COMMIT_SHA}</code>
        </Link>
      </Box>
    </>
  )
}
