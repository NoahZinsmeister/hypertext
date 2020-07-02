import { Button, Box } from '@chakra-ui/core'
import { useWeb3React } from '@web3-react/core'
import { Web3Provider } from '@ethersproject/providers'
import { useEffect, useState } from 'react'

import { walletconnect } from '../connectors'
import { UserRejectedRequestError } from '@web3-react/walletconnect-connector'

export default function WalletConnect(): JSX.Element {
  const { active, error, activate, setError } = useWeb3React<Web3Provider>()

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
      leftIcon={'walletconnect' as 'edit'}
      onClick={(): void => {
        setConnecting(true)
        // reset the connector if it was tried already
        if (walletconnect?.walletConnectProvider?.wc?.uri) {
          walletconnect.walletConnectProvider = undefined
        }
        activate(walletconnect, undefined, true).catch((error) => {
          if (error instanceof UserRejectedRequestError) {
            setConnecting(false)
          } else {
            setError(error)
          }
        })
      }}
    >
      WalletConnect
    </Button>
  )
}
