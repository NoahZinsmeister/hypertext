import { Button } from '@chakra-ui/core'
import { Web3Provider } from '@ethersproject/providers'
import { useWeb3React } from '@web3-react/core'
import { useEffect, useState } from 'react'
import { uauth } from '../ud-auth'
import { useIsConnected } from '../context'

export default function UnstoppableDomains(): JSX.Element | null {
  const { active, error } = useWeb3React<Web3Provider>()
  const [isConnected, setIsConnected] = useIsConnected()

  async function handleUAuthConnect() {
    setConnecting(true)

    try {
      await uauth.loginWithPopup()
      setIsConnected(true)
    } catch (error) {
      setIsConnected(false)
    }
    setConnecting(false)
  }

  const [connecting, setConnecting] = useState(false)
  useEffect(() => {
    if (active || error) {
      setConnecting(false)
    }
  }, [active, error])

  if (error) {
    return null
  }

  return (
    <Button
      isLoading={connecting}
      leftIcon={'unstoppabledomains' as 'edit'}
      onClick={async (): Promise<void> => {
        return handleUAuthConnect()

        /**
         * @note UD using Web3React does not work as intended
         * see connectors.ts for details
         */
        // https://docs.unstoppabledomains.com/login-with-unstoppable/login-integration-guides/web3-react-guide#shouldloginwithredirect
        // activate(uauth, undefined, true).catch((error) => {
        //   if (error instanceof UserRejectedRequestError) {
        //     setConnecting(false)
        //   } else {
        //     setError(error)
        //   }
        // })
      }}
    >
      Unstoppable Domains
    </Button>
  )
}
