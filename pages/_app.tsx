import { useState, useEffect } from 'react'
import { NextComponentType } from 'next'
import NextApp from 'next/app'
import Head from 'next/head'
import { ThemeProvider, CSSReset, ColorModeProvider } from '@chakra-ui/core'
import { Web3Provider } from '@ethersproject/providers'
import { Web3ReactProvider, useWeb3React } from '@web3-react/core'
import { useRouter } from 'next/router'

import theme from '../theme'
import { useEagerConnect } from '../hooks'
import { injected } from '../connectors'
import Base from '../components/Base'
import Favicon from '../components/Favicon'
import Provider from '../context'
import Layout from '../components/Layout'
import SwitchToChain from '../components/SwitchToChain'

import '../styles.css'
import '@reach/combobox/styles.css'

export enum QueryParameters {
  CHAIN = 'chain',
}

function FunctionalApp({ Component }: { Component: NextComponentType }): JSX.Element {
  const [painted, setPainted] = useState(false)
  useEffect(() => {
    setPainted(true)
  }, [])

  const tried = useEagerConnect()

  const { chainId } = useWeb3React()
  const { query } = useRouter()
  const requiredChainId = injected.supportedChainIds.includes(Number(query[QueryParameters.CHAIN]))
    ? Number(query[QueryParameters.CHAIN])
    : undefined

  return !painted ? null : (
    <>
      <Base />
      <ColorModeProvider>
        <Favicon />
        <Provider>
          <Layout tried={tried}>
            {!tried ? null : typeof requiredChainId === 'number' && requiredChainId !== chainId ? (
              <SwitchToChain chainId={requiredChainId} />
            ) : (
              <Component />
            )}
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
          <title key="title">Hypertext</title>
          <meta key="description" name="Description" content="A text-forward Uniswap interface." />
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
