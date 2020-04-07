import { useState, useEffect } from 'react'
import { useToast, Box, Link, Icon, Stack, Button, Spinner, IconButton, ButtonGroup } from '@chakra-ui/core'
import { useWeb3React } from '@web3-react/core'
import { useTransactions } from '../context'
import { shortenAddress, EtherscanType, formatEtherscanLink } from '../utils'

export function TransactionToast({ hash }) {
  const toast = useToast()
  const { library, chainId } = useWeb3React()
  const [, { removeTransaction }] = useTransactions()

  useEffect(() => {
    toast({
      position: 'bottom-right',
      status: 'info',
      duration: null,
      title: 'Transaction',
      render: ({ onClose }) => {
        const [confirmed, setConfirmed] = useState<boolean>()
        useEffect(() => {
          let mounted = true

          library.waitForTransaction(hash).then((receipt) => {
            if (mounted) {
              setConfirmed(receipt.status === 1 ? true : false)
            }
          })

          return () => {
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
                  : () => <Spinner color="white" size="sm" mr="0.5rem" />
              }
              rightIcon="external-link"
              style={{ borderTopRightRadius: 0, borderBottomRightRadius: 0 }}
              {...{
                href: formatEtherscanLink(EtherscanType.Transaction, [chainId, hash]),
                target: '_blank',
                rel: 'noopener noreferrer',
              }}
            >
              {shortenAddress(hash, 2)}
            </Button>

            <IconButton
              icon="close"
              variantColor={typeof confirmed === 'boolean' ? (confirmed ? 'green' : 'red') : 'blue'}
              aria-label="Close"
              style={{ borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }}
              borderLeft="1px solid white"
              onClick={() => {
                onClose()
                removeTransaction(hash)
              }}
            />
          </ButtonGroup>
        )
      },
    })
  }, [])

  return null
}
