import { useState, useEffect } from 'react'
import { useToast, Button, Spinner, IconButton, ButtonGroup } from '@chakra-ui/core'
import { useWeb3React } from '@web3-react/core'
import { useTransactions } from '../context'
import { shortenHex, EtherscanType, formatEtherscanLink } from '../utils'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ToastWrapper = (hash: string, library: any, chainId: number, removeTransaction: (hash: string) => void) =>
  function Toast({ onClose }: { onClose: () => void }): JSX.Element {
    const [confirmed, setConfirmed] = useState<boolean>()
    useEffect(() => {
      let mounted = true

      library.waitForTransaction(hash).then((receipt) => {
        if (mounted) {
          setConfirmed(receipt.status === 1 ? true : false)
        }
      })

      return (): void => {
        mounted = false
      }
    }, [])

    return (
      <ButtonGroup spacing={0} mb="1.5rem" mr="1.5rem">
        <Button
          as="a"
          variantColor={typeof confirmed === 'boolean' ? (confirmed ? 'green' : 'red') : 'blue'}
          leftIcon={
            typeof confirmed === 'boolean'
              ? confirmed
                ? 'check-circle'
                : 'warning'
              : (): JSX.Element => <Spinner color="white" size="sm" mr="0.5rem" />
          }
          rightIcon="external-link"
          style={{ borderTopRightRadius: 0, borderBottomRightRadius: 0 }}
          {...{
            href: formatEtherscanLink(EtherscanType.Transaction, [chainId, hash]),
            target: '_blank',
            rel: 'noopener noreferrer',
          }}
        >
          {shortenHex(hash, 2)}
        </Button>

        <IconButton
          icon="close"
          variantColor={typeof confirmed === 'boolean' ? (confirmed ? 'green' : 'red') : 'blue'}
          aria-label="Close"
          style={{ borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }}
          borderLeft="1px solid white"
          onClick={(): void => {
            onClose()
            removeTransaction(hash)
          }}
        />
      </ButtonGroup>
    )
  }

export function TransactionToast({ hash }: { hash: string }): null {
  const toast = useToast()
  const { library, chainId } = useWeb3React()
  const [, { removeTransaction }] = useTransactions()

  useEffect(() => {
    toast({
      position: 'bottom-right',
      status: 'info',
      duration: null,
      title: 'Transaction',
      // eslint-disable-next-line react/display-name
      render: ToastWrapper(hash, library, chainId, removeTransaction),
    })
  }, [toast, hash, library, chainId, removeTransaction])

  return null
}
