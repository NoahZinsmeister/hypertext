import { useState, useLayoutEffect, useEffect } from 'react'
import { NextComponentType } from 'next'
import NextApp from 'next/app'
import Head from 'next/head'
import { ThemeProvider, CSSReset, ColorModeProvider } from '@chakra-ui/core'
import { Web3Provider } from '@ethersproject/providers'
import { Web3ReactProvider, useWeb3React } from '@web3-react/core'

import theme from '../theme'
import { useQueryParameters } from '../hooks'
import Base from '../components/Base'
import Favicon from '../components/Favicon'
import Provider from '../context'
import Layout from '../components/Layout'
import Error from '../components/Error'
import SwitchToChain from '../components/SwitchToChain'

import '../styles.css'
import '@reach/combobox/styles.css'
import { QueryParameters } from '../constants'
import Loading from '../components/Loading'

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect

function FunctionalApp({ Component }: { Component: NextComponentType }): JSX.Element {
  const [painted, setPainted] = useState(false)
  useIsomorphicLayoutEffect(() => {
    setPainted(true)
  }, [])

  const { error, chainId } = useWeb3React()
  const queryParameters = useQueryParameters()
  const requiredChainId = queryParameters[QueryParameters.CHAIN]

  return !painted ? null : (
    <ColorModeProvider>
      <Favicon />
      <Provider>
        <Layout>
          {error ? (
            <Error />
          ) : typeof chainId !== 'number' ? (
            <Loading />
          ) : typeof requiredChainId === 'number' && chainId !== requiredChainId ? (
            <SwitchToChain requiredChainId={requiredChainId} />
          ) : (
            <Component />
          )}
        </Layout>
      </Provider>
    </ColorModeProvider>
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
        <Base />
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
