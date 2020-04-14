import { Flex, Button, Stack, Text } from '@chakra-ui/core'
import { useRouter } from 'next/router'

import { CHAIN_ID_NAMES } from '../utils'

export default function SwitchToChain({ requiredChainId }: { requiredChainId: number }): JSX.Element {
  const { pathname, replace } = useRouter()

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
            replace({ pathname }, undefined, { shallow: true })
          }}
        >
          Here by mistake?
        </Button>
      </Stack>
    </Flex>
  )
}
