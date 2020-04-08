import Head from 'next/head'
import { useColorMode } from '@chakra-ui/core'

export default function Favicon(): JSX.Element {
  const { colorMode } = useColorMode()
  return (
    <Head>
      <link key="favicon" rel="icon" href={`/favicon${colorMode === 'dark' ? '-dark' : ''}.ico`} />
    </Head>
  )
}
