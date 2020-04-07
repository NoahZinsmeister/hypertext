import { useState, useEffect } from 'react'
import NextApp from 'next/app'
import Head from 'next/head'
import { ThemeProvider, CSSReset, ColorModeProvider } from '@chakra-ui/core'
import { Web3Provider } from '@ethersproject/providers'
import { Web3ReactProvider } from '@web3-react/core'
import { Token } from '@uniswap/sdk'

import theme from '../theme'
import { useEagerConnect } from '../hooks'
import Provider from '../context'
import Layout from '../components/Layout'

import '../styles.css'
import '@reach/combobox/styles.css'

function getLibrary(provider: any): Web3Provider {
  return new Web3Provider(provider)
}

function FunctionalApp({ Component }) {
  const [painted, setPainted] = useState(false)
  useEffect(() => {
    setPainted(true)
  }, [])

  const tried = useEagerConnect()

  // global tokens for balances
  const [firstToken, setFirstToken] = useState<Token>()
  const [secondToken, setSecondToken] = useState<Token>()

  return !painted || !tried ? null : (
    <ColorModeProvider>
      <Provider>
        <Layout firstToken={firstToken} secondToken={secondToken}>
          <Component setFirstToken={setFirstToken} setSecondToken={setSecondToken} />
        </Layout>
      </Provider>
    </ColorModeProvider>
  )
}

export default class App extends NextApp {
  render() {
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
