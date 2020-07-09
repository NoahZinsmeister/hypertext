import { useRef, useState, useLayoutEffect, ChangeEvent, useMemo, Suspense, useEffect } from 'react'
import { Token, WETH, ChainId } from '@uniswap/sdk'
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
import { Combobox, ComboboxInput, ComboboxPopover, ComboboxList, ComboboxOption } from '@reach/combobox'
import { getAddress } from '@ethersproject/address'
import { useWeb3React } from '@web3-react/core'

import { useAllTokens, DEFAULT_TOKENS } from '../tokens'
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
        <ComboboxOption as={ListItem} key={(data as Token).address} value={(data as Token).address}>
          <Stack direction="row" align="center" p="0.5rem" shouldWrapChildren>
            <TokenLogo token={data as Token} size="1.5rem" />

            <Stack direction="column" ml="1rem" spacing={0}>
              <Text>{(data as Token).symbol}</Text>
              <Text fontSize="1rem">{(data as Token).name}</Text>
            </Stack>
          </Stack>
        </ComboboxOption>
      </ComboboxList>
    </>
  )
}

function RemoteTokens({ query }: { query: string }): JSX.Element | null {
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
    const aExact = a?.symbol?.slice(0, query.length)?.toLowerCase() === query.toLowerCase()
    const bExact = b?.symbol?.slice(0, query.length)?.toLowerCase() === query.toLowerCase()
    if (aExact && !bExact) {
      return -1
    } else if (!aExact && bExact) {
      return 1
    } else {
      return (a?.symbol?.toLowerCase() ?? 0) > (b?.symbol?.toLowerCase() ?? 0) ? 1 : -1
    }
  })

  return remoteTokensFiltered.length === 0 ? (
    <Text textAlign="center" pb="0.5rem">
      No results
    </Text>
  ) : (
    <ComboboxList as={List}>
      {remoteTokensFiltered.map((token) => {
        const DUMMY = new Token(chainId as number, (token as Token).address, 18) // we don't know if it actually has 18 decimals
        return (
          <ComboboxOption as={ListItem} key={(token as Token).address} value={(token as Token).address}>
            <Stack direction="row" align="center" p="0.5rem" shouldWrapChildren>
              <TokenLogo token={DUMMY} size="1.5rem" />

              <Stack direction="column" ml="1rem" spacing={0}>
                <Text>{(token as Token).symbol}</Text>
                <Text fontSize="1rem">{(token as Token).name}</Text>
              </Stack>
            </Stack>
          </ComboboxOption>
        )
      })}
    </ComboboxList>
  )
}

export default function TokenSelect({
  tokenAddress,
  isInvalid,
  isDisabled,
  onAddressSelect,
}: {
  tokenAddress?: string
  isInvalid: boolean
  isDisabled: boolean
  onAddressSelect: (address: string | undefined) => void
}): JSX.Element {
  const { colors } = useTheme()
  const { colorMode } = useColorMode()
  const { chainId } = useWeb3React()

  const [firstToken] = useFirstToken()
  const [secondToken] = useSecondToken()

  // if the currently selected token address is in our list, pluck it out
  const [tokens, { removeToken }] = useAllTokens()
  const tokenDerivedFromProps = tokens.filter((token) => token.address === tokenAddress)[0]

  const [value, setValue] = useState(tokenAddress ?? '')
  // keep the state in sync with the prop
  useEffect(() => {
    setValue(tokenAddress ?? '')
  }, [tokenAddress])

  // try to parse the value as an address
  let valueAsAddress: string | null
  try {
    valueAsAddress = getAddress(value)
  } catch {
    valueAsAddress = null
  }

  const ref = useRef<HTMLInputElement>(null)
  useLayoutEffect(() => {
    if (ref.current)
      ref.current.size = tokenDerivedFromProps
        ? getTokenDisplayValue(tokenDerivedFromProps).length
        : valueAsAddress === null
        ? value.length === 0
          ? 7
          : value.length
        : shortenHex(valueAsAddress, 4).length
  })

  function onSelect(tokenAddress: string): void {
    onAddressSelect(tokenAddress)
  }

  // set up a hack. when a user has selected a token, and modifies the input text, the value will get cleared, so we
  // have to store the modified text and reset it after the clear
  const [temporaryInput, setTemporaryInput] = useState<string>()
  useEffect(() => {
    if (temporaryInput && !tokenAddress) {
      setValue(temporaryInput)
      setTemporaryInput(undefined)
    }
  }, [temporaryInput, tokenAddress])

  function onChange(event: ChangeEvent<HTMLInputElement>): void {
    // try to parse the input as an address
    let valueAsAddress: string | null
    try {
      valueAsAddress = getAddress(event.target.value)
    } catch {
      valueAsAddress = null
    }
    // if they pasted an address that's already in our list, select it
    if (valueAsAddress && tokens.filter((token) => token.address === valueAsAddress)[0]) {
      onSelect(valueAsAddress)
    } else {
      if (tokenAddress) {
        onAddressSelect(undefined) // unset the selected address
        setTemporaryInput(event.target.value) // set the temporary input
      } else {
        setValue(event.target.value)
      }
    }
  }

  const filteredTokens = tokens
    .filter((token) => {
      const addressMatch = valueAsAddress === token.address
      const displayMatch = value.toLowerCase() === getTokenDisplayValue(token).slice(0, value.length).toLowerCase()
      const nameMatch = !token.equals(WETH[token.chainId]) && token?.name?.toLowerCase()?.includes(value.toLowerCase())
      return addressMatch || displayMatch || nameMatch
    })
    .sort((a: Token, b: Token) => {
      const aExact =
        valueAsAddress === a.address ||
        value.toLowerCase() === getTokenDisplayValue(a).slice(0, value.length).toLowerCase()
      const bExact =
        valueAsAddress === b.address ||
        value.toLowerCase() === getTokenDisplayValue(b).slice(0, value.length).toLowerCase()
      if (tokenDerivedFromProps && a.equals(tokenDerivedFromProps)) {
        return -1
      } else if (tokenDerivedFromProps && b.equals(tokenDerivedFromProps)) {
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
        return getTokenDisplayValue(a).toLowerCase() < getTokenDisplayValue(b).toLowerCase() ? -1 : 1
      }
    })

  return (
    <>
      <Combobox openOnFocus onSelect={onSelect}>
        <TokenLogoColor token={tokenDerivedFromProps}>
          {(swatch): JSX.Element => (
            <ComboboxInput
              selectOnClick
              autocomplete={false}
              as={Input}
              ref={ref}
              value={
                tokenDerivedFromProps
                  ? getTokenDisplayValue(tokenDerivedFromProps)
                  : valueAsAddress === null
                  ? value
                  : shortenHex(valueAsAddress, 4)
              }
              onChange={onChange}
              title="Token Select"
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              onCopy={(event: any): void => {
                // copy the full address if we've shortened it
                if (valueAsAddress) {
                  event.preventDefault()
                  event.clipboardData.setData('text/plain', valueAsAddress)
                }
              }}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              onCut={(event: any): void => {
                // cut the full address if we've shortened it
                if (valueAsAddress) {
                  event.preventDefault()
                  event.clipboardData.setData('text/plain', valueAsAddress)
                  // simulate an onChange
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  onChange({ target: { value: '' } } as any)
                }
              }}
              // chakra props
              variant="flushed"
              placeholder="Select…"
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
              {/* hide popover content when there's a token selected */}
              {!tokenDerivedFromProps && (
                <>
                  {(value === '' || tokenAddress === value) && (
                    <Text mx="1rem" my="0.5rem" textAlign="center" color="gray.500">
                      Paste token address or search
                    </Text>
                  )}

                  <ComboboxList as={List}>
                    {filteredTokens.map((token) => {
                      const userAdded = !DEFAULT_TOKENS.some((defaultToken) => defaultToken.equals(token))
                      return (
                        <ComboboxOption as={ListItem} key={token.address} value={token.address}>
                          <Stack direction="row" align="center" p="0.5rem">
                            <Box>
                              <TokenLogo token={token} size="1.5rem" />
                            </Box>

                            <Stack direction="column" ml="1rem" spacing={0} shouldWrapChildren>
                              <Text>{getTokenDisplayValue(token)}</Text>
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

                  {valueAsAddress !== null && !tokens.some((token) => token.address === valueAsAddress) ? (
                    <PastedToken address={valueAsAddress} />
                  ) : null}

                  {value.length >= 2 && valueAsAddress === null && chainId === ChainId.MAINNET ? (
                    <RemoteTokens query={value} />
                  ) : null}
                </>
              )}
            </ComboboxPopover>
          </Box>
        </Box>
      </Combobox>

      <style jsx>{`
        :global([data-reach-combobox-popover]) {
          width: max-content !important;
          max-height: 25rem;
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
      `}</style>
    </>
  )
}
