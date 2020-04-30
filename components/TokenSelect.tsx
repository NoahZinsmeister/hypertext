import { useRef, useState, useLayoutEffect, ChangeEvent, useMemo, Suspense } from 'react'
import { Token, WETH } from '@uniswap/sdk'
import {
  Input,
  Stack,
  Text,
  useColorMode,
  useTheme,
  List,
  ListItem,
  IconButton,
  Divider,
  Spinner,
  Flex,
  Icon,
  Box,
} from '@chakra-ui/core'
import {
  Combobox,
  ComboboxInput,
  ComboboxPopover,
  ComboboxList,
  ComboboxOption,
  ComboboxOptionText,
} from '@reach/combobox'
import { getAddress } from '@ethersproject/address'
import { useWeb3React } from '@web3-react/core'
import copy from 'copy-to-clipboard'

import { useAllTokens, DEFAULT_TOKENS, useTokenByAddress } from '../tokens'
import { getTokenDisplayValue, shortenHex } from '../utils'
import TokenLogo, { TokenLogoColor } from './TokenLogo'
import { useFirstToken, useSecondToken } from '../context'
import { useOnchainToken, useRemoteTokens } from '../data'
import { useDefaultedDebounce } from '../hooks'
import ErrorBoundary from './ErrorBoundary'

function PastedToken({ address }: { address: string }): JSX.Element {
  return (
    <ErrorBoundary
      fallback={
        <Flex justifyContent="center" width="100%" px="1rem" py="0.5rem">
          <Icon name="warning" size="1rem" />
        </Flex>
      }
    >
      <Suspense
        fallback={
          <Flex justifyContent="center" width="100%" px="1rem" py="0.5rem">
            <Spinner color="gray.500" size="sm" />
          </Flex>
        }
      >
        <PastedTokenData address={address} />
      </Suspense>
    </ErrorBoundary>
  )
}

function PastedTokenData({ address }: { address: string }): JSX.Element {
  const { data } = useOnchainToken(address, true)

  return data === null ? (
    <Text textAlign="center" px="1rem" py="0.5rem">
      Invalid token address
    </Text>
  ) : (
    <>
      <Divider m={0} />
      <Text mx="1rem" my="0.5rem" textAlign="center" fontSize="1rem">
        Token Found By Address
      </Text>

      <ComboboxList as={List}>
        <ComboboxOption as={ListItem} key={data.address} value={data.address}>
          <Stack direction="row" align="center" p="0.5rem">
            <TokenLogo token={data} size="1.5rem" />

            <Stack direction="column" ml="1rem" spacing={0} display="block">
              <Text>{data.symbol}</Text>
              <Text fontSize="1rem">{data.name}</Text>
            </Stack>
          </Stack>
        </ComboboxOption>
      </ComboboxList>
    </>
  )
}

function RemoteTokens({ query }: { query: string }): JSX.Element {
  const debouncedValue = useDefaultedDebounce(query, '', 200)

  return debouncedValue.length === 0 ? null : (
    <>
      <Divider m={0} />
      <Text mx="1rem" my="0.5rem" textAlign="center" fontSize="1rem">
        Unverified Tokens
      </Text>

      <ErrorBoundary
        fallback={
          <Flex justifyContent="center" width="100%" pb="0.5rem">
            <Icon name="warning" size="1rem" />
          </Flex>
        }
      >
        <Suspense
          fallback={
            <Flex justifyContent="center" width="100%" pb="0.5rem">
              <Spinner color="gray.500" size="sm" />
            </Flex>
          }
        >
          <RemoteTokensData query={query} />
        </Suspense>
      </ErrorBoundary>
    </>
  )
}

function RemoteTokensData({ query }: { query: string }): JSX.Element {
  const { chainId } = useWeb3React()

  const [tokens] = useAllTokens()

  const { data: remoteTokensCased } = useRemoteTokens(query, true)
  const { data: remoteTokensLower } = useRemoteTokens(query.toLowerCase(), true)
  const { data: remoteTokensUpper } = useRemoteTokens(query.toUpperCase(), true)

  const remoteTokens = useMemo(
    () => (remoteTokensCased || []).concat(remoteTokensLower || []).concat(remoteTokensUpper || []),
    [remoteTokensCased, remoteTokensLower, remoteTokensUpper]
  )

  const remoteTokensFiltered = useMemo(
    () =>
      Array.from(new Set(remoteTokens.map((remoteToken) => remoteToken.address))) // get unique addresses
        .filter((address) => !tokens.some((token) => token.address === address)) // filter out tokens already in our list
        .map((address) => remoteTokens.find((remoteToken) => remoteToken.address === address)), // get the full remote tokens
    [remoteTokens, tokens]
  ).sort((a, b) => {
    const aExact = a.symbol.slice(0, query.length).toLowerCase() === query.toLowerCase()
    const bExact = b.symbol.slice(0, query.length).toLowerCase() === query.toLowerCase()
    if (aExact && !bExact) {
      return -1
    } else if (!aExact && bExact) {
      return 1
    } else {
      return a.symbol.toLowerCase() > b.symbol.toLowerCase() ? 1 : -1
    }
  })

  return remoteTokensFiltered.length === 0 ? (
    <Text textAlign="center" pb="0.5rem">
      No results
    </Text>
  ) : (
    <ComboboxList as={List}>
      {remoteTokensFiltered.map((token) => {
        const DUMMY = new Token(chainId, token.address, 18) // we don't know if it actually has 18 decimals
        return (
          <ComboboxOption as={ListItem} key={token.address} value={token.address}>
            <Stack direction="row" align="center" p="0.5rem">
              <TokenLogo token={DUMMY} size="1.5rem" />

              <Stack direction="column" ml="1rem" spacing={0} display="block">
                <Text>{token.symbol}</Text>
                <Text fontSize="1rem">{token.name}</Text>
              </Stack>
            </Stack>
          </ComboboxOption>
        )
      })}
    </ComboboxList>
  )
}

export default function TokenSelect({
  initialValue,
  isInvalid,
  isDisabled,
  selectedToken,
  onAddressSelect,
}: {
  initialValue?: string
  isInvalid: boolean
  isDisabled: boolean
  selectedToken?: Token
  onAddressSelect: (address: string) => void
}): JSX.Element {
  const { colors } = useTheme()
  const { colorMode } = useColorMode()

  const [tokens, { removeToken }] = useAllTokens()

  const [firstToken] = useFirstToken()
  const [secondToken] = useSecondToken()

  const [value, setValue] = useState(selectedToken ? getTokenDisplayValue(selectedToken) : initialValue || '')
  let valueAsAddress: string | null
  try {
    valueAsAddress = getAddress(value)
  } catch {
    valueAsAddress = null
  }

  // in charge of adding selecting remote + onchain tokens to the user list
  const [tokenAddressToFetch, setTokenAddressToFetch] = useState<string>()
  useTokenByAddress(tokenAddressToFetch)

  function onSelect(displayValue: string): void {
    const selectedTokenAddress = tokens.filter((token) => getTokenDisplayValue(token) === displayValue)[0]?.address

    // the user clicked on a token in the default list, or their localstorage list
    if (selectedTokenAddress) {
      setValue('')
      onAddressSelect(selectedTokenAddress)
    }
    // the user clicked on a token whose details were fetched from the chain via address, or fetched remotely
    else {
      setValue(displayValue)
      setTokenAddressToFetch(displayValue)
    }
  }

  function onChange(event: ChangeEvent<HTMLInputElement>): void {
    // unset the selected address
    onAddressSelect(undefined)
    // set the value
    setValue(event.target.value)
  }

  const filteredTokens = tokens
    .filter((token) => {
      const addressMatch = valueAsAddress === token.address
      const displayMatch = value.toLowerCase() === getTokenDisplayValue(token).slice(0, value.length).toLowerCase()
      const nameMatch = !token.equals(WETH[token.chainId]) && token.name.toLowerCase().includes(value.toLowerCase())
      return addressMatch || displayMatch || nameMatch
    })
    .sort((a: Token, b: Token) => {
      const aExact =
        valueAsAddress === a.address ||
        value.toLowerCase() === getTokenDisplayValue(a).slice(0, value.length).toLowerCase()
      const bExact =
        valueAsAddress === b.address ||
        value.toLowerCase() === getTokenDisplayValue(b).slice(0, value.length).toLowerCase()
      if (selectedToken && a.equals(selectedToken)) {
        return -1
      } else if (selectedToken && b.equals(selectedToken)) {
        return 1
      } else if (aExact && !bExact) {
        return -1
      } else if (!aExact && bExact) {
        return 1
      } else if (a.equals(WETH[a.chainId])) {
        return -1
      } else if (b.equals(WETH[b.chainId])) {
        return 1
      } else {
        return getTokenDisplayValue(a).toLowerCase() > getTokenDisplayValue(b).toLowerCase() ? 1 : -1
      }
    })

  const ref = useRef<HTMLInputElement>()
  useLayoutEffect(() => {
    if (ref.current)
      ref.current.size = selectedToken
        ? getTokenDisplayValue(selectedToken).length
        : valueAsAddress === null
        ? value.length === 0
          ? 7
          : value.length
        : shortenHex(valueAsAddress, 4).length
  })

  return (
    <>
      <Combobox openOnFocus onSelect={onSelect}>
        <TokenLogoColor token={selectedToken}>
          {(swatch): JSX.Element => (
            <ComboboxInput
              selectOnClick
              autocomplete={false}
              as={Input}
              ref={ref}
              value={
                selectedToken
                  ? getTokenDisplayValue(selectedToken)
                  : valueAsAddress === null
                  ? value
                  : shortenHex(valueAsAddress, 4)
              }
              onChange={onChange}
              title="Token Select"
              onCopy={(event): void => {
                // copy the full address if we've shortened it
                if (valueAsAddress) {
                  event.preventDefault()
                  copy(valueAsAddress)
                }
              }}
              onCut={(event): void => {
                // copy the full address if we've shortened it
                if (valueAsAddress) {
                  event.preventDefault()
                  copy(valueAsAddress)
                }
              }}
              // chakra props
              variant="flushed"
              placeholder="Select…"
              px="0.5rem"
              textAlign="center"
              fontSize="1.875rem"
              {...(!!swatch?.hex && { color: swatch.hex })}
              isInvalid={isInvalid}
              isDisabled={isDisabled}
              _disabled={{
                opacity: 0.4,
                cursor: 'not-allowed',
              }}
            />
          )}
        </TokenLogoColor>

        <Box maxHeight={0} position="relative" zIndex={2}>
          <Box position="absolute">
            <ComboboxPopover portal={false}>
              {value === '' && (
                <Text mx="1rem" my="0.5rem" textAlign="center" color="gray.500">
                  Paste token address or search
                </Text>
              )}
              <ComboboxList as={List}>
                {filteredTokens.map((token) => {
                  const userAdded = !DEFAULT_TOKENS.some((defaultToken) => defaultToken.equals(token))
                  return (
                    <ComboboxOption as={ListItem} key={token.address} value={getTokenDisplayValue(token)}>
                      <Stack direction="row" align="center" p="0.5rem">
                        <TokenLogo token={token} size="1.5rem" />

                        <Stack direction="column" ml="1rem" spacing={0} display="block">
                          <ComboboxOptionText />
                          <Text fontSize="1rem">{WETH[token.chainId].equals(token) ? 'Ethereum' : token.name}</Text>
                        </Stack>

                        {userAdded && (
                          <Flex flexGrow={1} mb="auto" justifyContent="flex-end">
                            <IconButton
                              isDisabled={
                                (!!firstToken && firstToken.equals(token)) ||
                                (!!secondToken && secondToken.equals(token))
                              }
                              icon="close"
                              variant="ghost"
                              size="sm"
                              aria-label="Remove"
                              onClick={(event): void => {
                                event.preventDefault()
                                removeToken(token)
                              }}
                            />
                          </Flex>
                        )}
                      </Stack>
                    </ComboboxOption>
                  )
                })}
              </ComboboxList>

              {typeof valueAsAddress === 'string' && !tokens.some((token) => token.address === valueAsAddress) ? (
                <PastedToken address={valueAsAddress} />
              ) : null}

              {value.length >= 2 && valueAsAddress === null && !selectedToken ? <RemoteTokens query={value} /> : null}
            </ComboboxPopover>
          </Box>
        </Box>
      </Combobox>

      <style jsx>{`
        :global([data-reach-combobox-popover]) {
          width: max-content !important;
          max-height: 20rem;
          overflow-y: auto;
          background: ${colorMode === 'light' ? colors.gray[50] : colors.gray[900]};
          color: ${colorMode === 'light' ? 'black' : 'white'};
          border-radius: 0.5rem;
          border-top-left-radius: 0;
        }

        :global([data-reach-combobox-list] :hover) {
          background: ${colorMode === 'light' ? colors.gray[100] : 'rgba(255,255,255,0.04)'};
        }

        :global([data-reach-combobox-option]) {
          font-size: 1.25rem;
          background: none;
        }

        :global([data-reach-combobox-option] :hover) {
          background: none;
        }

        :global([data-reach-combobox-option][data-highlighted]) {
          background: ${colorMode === 'light' ? colors.gray[100] : 'rgba(255,255,255,0.04)'} !important;
        }

        :global([data-user-value]) {
          font-weight: bold;
        }

        :global([data-suggested-value]) {
          font-weight: normal;
        }
      `}</style>
    </>
  )
}
