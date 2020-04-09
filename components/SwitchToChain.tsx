import { Flex, Button, Stack, Text } from '@chakra-ui/core'
import { QueryParameters } from '../pages/_app'
import { useRouter } from 'next/router'
import { CHAIN_ID_NAMES } from '../utils'

export default function SwitchToChain({ chainId }: { chainId: number }): JSX.Element {
  const { query, pathname, replace } = useRouter()
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { [QueryParameters.CHAIN]: _, ...stripped } = query

  return (
    <Flex flexGrow={1} alignItems="center" justifyContent="center">
      <Stack direction="column" alignItems="center">
        <Text fontSize="1.5rem">
          Please connect to the {chainId === 1 ? 'Ethereum' : ''} {CHAIN_ID_NAMES[chainId]}
          {chainId !== 1 ? ' testnet' : ''}.
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
