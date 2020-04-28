import { Flex, Stack, Text } from '@chakra-ui/core'

export default function Error(): JSX.Element {
  return (
    <Flex flexGrow={1} alignItems="center" justifyContent="center">
      <Stack direction="column" alignItems="center">
        <Text fontSize="1.5rem">Something went wrong.</Text>
        <Text>Try checking your internet connection, refreshing the page, or visiting from a different browser.</Text>
      </Stack>
    </Flex>
  )
}
