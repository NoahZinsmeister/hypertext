import { useState, useEffect } from 'react'
import { Button, ButtonGroup } from '@chakra-ui/core'
import { Web3Provider } from '@ethersproject/providers'
import { useWeb3React } from '@web3-react/core'

import { formatEtherscanLink, EtherscanType } from '../utils'
import { injected } from '../connectors'
import { useETHBalance } from '../data'

export default function Account() {
  const { active, error, activate, library, chainId, account } = useWeb3React<Web3Provider>()

  const [connecting, setConnecting] = useState(false)
  useEffect(() => {
    if (active || error) {
      setConnecting(false)
    }
  }, [active, error])

  const [ENSName, setENSName] = useState<string>('')
  useEffect(() => {
    if (library && account) {
      library
        .lookupAddress(account)
        .then(name => {
          if (typeof name === 'string') {
            setENSName(name)
          }
        })
        .catch(() => {})
      return () => {
        setENSName('')
      }
    }
  }, [library, account, chainId])

  const { data: balance } = useETHBalance(account)

  if (typeof account !== 'string') {
    return (
      <Button
        position="absolute"
        right={0}
        top={0}
        isLoading={connecting}
        transition="none"
        m={'1.5rem'}
        onClick={() => {
          setConnecting(true)
          activate(injected)
        }}
      >
        Connect Wallet
      </Button>
    )
  }

  return (
    <ButtonGroup position="absolute" right={0} top={0} spacing={0} m="1.5rem">
      <Button
        variant="outline"
        isDisabled
        isLoading={!!!balance}
        transition="none"
        _disabled={{
          opacity: 1,
          cursor: 'default'
        }}
        _hover={{}}
        style={{ borderTopRightRadius: 0, borderBottomRightRadius: 0, borderRight: 'none' }}
      >
        Ξ {balance?.toSignificant(4)}
      </Button>

      <Button
        as="a"
        transition="none"
        style={{ borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }}
        {...{
          href: formatEtherscanLink(chainId, EtherscanType.Account, account),
          target: '_blank',
          rel: 'noopener noreferrer'
        }}
      >
        {ENSName || `${account.substring(0, 6)}...${account.substring(account.length - 4)}`}
      </Button>
    </ButtonGroup>
  )
}
