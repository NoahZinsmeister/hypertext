import { theme } from '@chakra-ui/core'

export default {
  ...theme,
  fonts: {
    ...theme.fonts,
    heading: `Rubik,${theme.fonts.heading}`,
    body: `Rubik,${theme.fonts.heading}`
  }
}
