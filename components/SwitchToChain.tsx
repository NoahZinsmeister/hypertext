import { Flex, Button, Stack, Text } from '@chakra-ui/core'
import { useRouter } from 'next/router'

import { CHAIN_ID_NAMES, modifyUrlObjectForIPFS } from '../utils'

export default function SwitchToChain({ requiredChainId }: { requiredChainId: number }): JSX.Element {
  const { pathname, push } = useRouter()

  const { href, as } = modifyUrlObjectForIPFS(pathname)

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
            push(href, as, { shallow: true })
          }}
        >
          Here by mistake?
        </Button>
      </Stack>
    </Flex>
  )
}
