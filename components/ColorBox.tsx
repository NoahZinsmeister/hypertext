import { useColorMode, BoxProps, Box } from '@chakra-ui/core'

import { BG, COLOR } from '../constants'

export default function ColorBox(props: BoxProps): JSX.Element {
  const { children, ...rest } = props
  const { colorMode } = useColorMode()

  return (
    <Box bg={BG[colorMode]} color={COLOR[colorMode]} transition="background-color 250ms" {...rest}>
      {children}
    </Box>
  )
}
