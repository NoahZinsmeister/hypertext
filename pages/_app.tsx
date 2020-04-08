import { useState, useEffect } from 'react'
import { NextComponentType } from 'next'
import NextApp from 'next/app'
import Head from 'next/head'
import { ThemeProvider, CSSReset, ColorModeProvider } from '@chakra-ui/core'
import { Web3Provider } from '@ethersproject/providers'
import { Web3ReactProvider } from '@web3-react/core'

import theme from '../theme'
import { useEagerConnect } from '../hooks'
import Base from '../components/Base'
import Favicon from '../components/Favicon'
import Provider from '../context'
import Layout from '../components/Layout'

import '../styles.css'
import '@reach/combobox/styles.css'

function FunctionalApp({ Component }: { Component: NextComponentType }): JSX.Element {
  const [painted, setPainted] = useState(false)
  useEffect(() => {
    setPainted(true)
  }, [])

  const tried = useEagerConnect()

  return !painted || !tried ? null : (
    <>
      <Base />
      <ColorModeProvider>
        <Favicon />
        <Provider>
          <Layout>
            <Component />
          </Layout>
        </Provider>
      </ColorModeProvider>
    </>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getLibrary(provider: any): Web3Provider {
  return new Web3Provider(provider)
}

export default class App extends NextApp {
  render(): JSX.Element {
    const { Component } = this.props
    return (
      <>
        <Head>
          <title>Hypertext</title>
        </Head>
        <Web3ReactProvider getLibrary={getLibrary}>
          <ThemeProvider theme={theme}>
            <CSSReset />
            <FunctionalApp Component={Component} />
          </ThemeProvider>
        </Web3ReactProvider>
      </>
    )
  }
}
