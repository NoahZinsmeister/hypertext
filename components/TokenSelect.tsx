import { useRef, useState, forwardRef, useLayoutEffect, ChangeEvent, useEffect } from 'react'
import { Token, WETH } from '@uniswap/sdk'
import { Input, Stack, Text, useColorMode, useTheme, List, ListItem } from '@chakra-ui/core'
import {
  Combobox,
  ComboboxInput,
  ComboboxPopover,
  ComboboxList,
  ComboboxOption,
  ComboboxOptionText,
} from '@reach/combobox'

import { useAllTokens } from '../tokens'
import { getTokenDisplayValue } from '../utils'
import TokenLogo, { TokenLogoColor } from './TokenLogo'
import { getAddress } from '@ethersproject/address'

export default function TokenSelect({
  isInvalid,
  isDisabled,
  selectedToken,
  onAddressSelect,
}: {
  isInvalid: boolean
  isDisabled: boolean
  selectedToken?: Token
  onAddressSelect: (address: string) => void
}) {
  const { fonts, colors } = useTheme()
  const { colorMode } = useColorMode()

  const [tokens, addToken] = useAllTokens()

  const [value, setValue] = useState('')

  useEffect(() => {
    try {
      const address = getAddress(value)
      addToken(address)
        .then((token) => {
          if (token !== null) {
            setValue(getTokenDisplayValue(token))
          }
        })
        .catch(() => {}) // todo handle failure grancefully
    } catch {}
  }, [value])

  function onSelect(displayValue: string) {
    onAddressSelect(tokens.filter((token) => getTokenDisplayValue(token) === displayValue)[0].address)
  }

  function onChange(event: ChangeEvent<HTMLInputElement>) {
    onAddressSelect(undefined)
    try {
      const address = getAddress(value)
      if (tokens.some((token) => token.address === address)) {
        setValue(getTokenDisplayValue(tokens.filter((token) => token.address === address)[0]))
      } else {
        setValue(event.target.value)
      }
    } catch {
      setValue(event.target.value)
    }
  }

  const ref = useRef<HTMLInputElement>()
  useLayoutEffect(() => {
    if (ref.current)
      ref.current.size = !!selectedToken
        ? getTokenDisplayValue(selectedToken).length
        : value.length === 0
        ? 7
        : value.length
  })
  const filteredTokens = tokens
    .filter((token) => {
      const displayMatch = getTokenDisplayValue(token).slice(0, value.length).toLowerCase() === value.toLowerCase()
      const nameMatch =
        !token.equals(WETH[token.chainId]) && !!token.name && token.name.toLowerCase().includes(value.toLowerCase())
      return displayMatch || nameMatch
    })
    .sort((a: Token, b: Token) => {
      const aExact = getTokenDisplayValue(a).slice(0, value.length).toLowerCase() === value.toLowerCase()
      const bExact = getTokenDisplayValue(b).slice(0, value.length).toLowerCase() === value.toLowerCase()
      if (selectedToken && a.equals(selectedToken)) {
        return -1
      } else if (selectedToken && b.equals(selectedToken)) {
        return 1
      } else if (aExact && !bExact) {
        return -1
      } else if (!aExact && bExact) {
        return 1
      } else {
        return getTokenDisplayValue(a).toLowerCase() > getTokenDisplayValue(b).toLowerCase() ? 1 : -1
      }
    })

  return (
    <>
      <Combobox openOnFocus onSelect={onSelect}>
        <TokenLogoColor token={selectedToken}>
          {(swatch) => (
            <ComboboxInput
              selectOnClick
              autocomplete={false}
              as={Input}
              ref={ref}
              value={!!selectedToken ? getTokenDisplayValue(selectedToken) : value}
              onChange={onChange}
              // chakra props
              variant="flushed"
              placeholder="Select…"
              px="0.5rem"
              textAlign="center"
              fontFamily={fonts.mono}
              fontSize="1.875rem"
              {...(!!swatch && { color: swatch.hex })}
              isInvalid={isInvalid}
              isDisabled={isDisabled}
              _disabled={{
                opacity: 0.4,
                cursor: 'not-allowed',
              }}
            />
          )}
        </TokenLogoColor>
        <ComboboxPopover>
          {value === '' && (
            <Text mx="1rem" my="0.5rem" textAlign="center" color="gray.500">
              Paste token address to add
            </Text>
          )}
          <ComboboxList as={List} persistSelection>
            {filteredTokens.map((token, i) => {
              return (
                <ComboboxOption
                  as={ListItem}
                  key={token.address}
                  value={getTokenDisplayValue(token)}
                  _focus={{ zIndex: 1000 }}
                >
                  <Stack
                    direction="row"
                    align="center"
                    p="0.5rem"
                    style={{
                      borderTopRightRadius: i === 0 ? '0.5rem' : 0,
                      borderBottomLeftRadius: i + 1 === tokens.length ? '0.5rem' : 0,
                      borderBottomRightRadius: i + 1 === tokens.length ? '0.5rem' : 0,
                    }}
                  >
                    <TokenLogo token={token} size="1.5rem" />

                    <Stack direction="column" ml="1rem" spacing={0} display="block">
                      <ComboboxOptionText />
                      <Text fontSize="1rem">
                        {WETH[token.chainId].equals(token) ? 'Ethereum' : token.name ? token.name : null}
                      </Text>
                    </Stack>
                  </Stack>
                </ComboboxOption>
              )
            })}
          </ComboboxList>
        </ComboboxPopover>
      </Combobox>

      <style jsx>{`
        :global([data-reach-combobox-popover]) {
          min-width: max-content !important;
          max-height: 20rem;
          overflow-y: auto;
          background-color: ${colorMode === 'light' ? colors.gray[50] : colors.gray[900]};
          color: ${colorMode === 'light' ? 'black' : 'white'};
          border-radius: 0.5rem;
          border-top-left-radius: 0;
        }

        :global([data-reach-combobox-list] :hover) {
          background-color: ${colorMode === 'light' ? colors.gray[100] : 'rgba(255,255,255,0.04)'};
        }

        :global([data-reach-combobox-option] :hover) {
          background-color: unset;
        }

        :global([data-reach-combobox-option]) {
          font-size: 1.25rem;
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
