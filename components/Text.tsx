import { Text as ChakraText } from '@chakra-ui/core'

export default function Text({ children, ...rest }) {
  return <ChakraText {...rest}>{children}</ChakraText>
}
