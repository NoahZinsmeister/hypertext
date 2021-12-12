import { Button } from '@chakra-ui/core'
import { useWeb3React } from '@web3-react/core'
import { Web3Provider } from '@ethersproject/providers'
import { useEffect, useState } from 'react'

import { UserRejectedRequestError } from '@web3-react/walletconnect-connector'
import { uauth } from '../connectors'

// import UAuth from '@uauth/js'

// export const uauth = new UAuth({
//   clientID: 'Fn+l56Y+1F/lJby1/AzuJ6i96eYjEpNgCEQlTz9H5wA=',
//   clientSecret: '7fXXOeHQCsMzFb6MALs7b6NP66AfvFzg3/nEr4jNAPE=',
//   // redirectUri: 'http://localhost:3000/callback',
//   redirectUri: 'https://hypertext-lwu.netlify.app/callback',
// })


export default function UnstoppableDomains(): JSX.Element | null {
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
      leftIcon={'unstoppabledomains' as 'edit'}
      onClick={async (): Promise<void> => {
        setConnecting(true)

        activate(uauth, undefined, true).catch((error) => {
          if (error instanceof UserRejectedRequestError) {
            setConnecting(false)
          } else {
            setError(error)
          }
        })
      }}
    >
      Unstoppable Domains
    </Button>
  )
}
