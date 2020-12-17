import { Flex, Button, Stack, Text } from '@chakra-ui/core'
import { useRouter } from 'next/router'
import { isIPFS } from '../constants'

import { CHAIN_ID_NAMES } from '../utils'

export default function SwitchToChain({ requiredChainId }: { requiredChainId: number }): JSX.Element {
  const { pathname, push } = useRouter()

  return (
    <Flex flexGrow={1} alignItems="center" justifyContent="center">
      <Stack direction="column" alignItems="center">
        <Text fontSize="1.5rem">
          Please connect to the {requiredChainId === 1 ? 'Ethereum' : ''} {CHAIN_ID_NAMES[requiredChainId]}
          {requiredChainId !== 1 ? ' testnet' : ''}.
        </Text>

        <Button
          width="min-content"
          onClick={(): void => {
            if (isIPFS) {
              window.location.assign(`.${pathname}.html`)
            } else {
              push(pathname, undefined, { shallow: true })
            }
          }}
        >
          Here by mistake?
        </Button>
      </Stack>
    </Flex>
  )
}
