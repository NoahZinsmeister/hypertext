import { useState, useEffect } from 'react'
import NextApp from 'next/app'
import Head from 'next/head'
import { ThemeProvider, CSSReset, ColorModeProvider } from '@chakra-ui/core'
import { Web3Provider } from '@ethersproject/providers'
import { Web3ReactProvider } from '@web3-react/core'

import theme from '../theme'
import { useEagerConnect } from '../hooks'
import Layout from '../components/Layout'

import '../styles.css'

function getLibrary(provider: any): Web3Provider {
  return new Web3Provider(provider)
}

function FunctionalApp({ Component }) {
  const [painted, setPainted] = useState(false)
  useEffect(() => {
    setPainted(true)
  }, [])

  const tried = useEagerConnect()

  return !painted || !tried ? null : (
    <ColorModeProvider>
      <Layout>
        <Component />
      </Layout>
    </ColorModeProvider>
  )
}

export default class App extends NextApp {
  render() {
    const { Component } = this.props
    return (
      <>
        <Head>
          <title>Sentence Swap</title>
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
