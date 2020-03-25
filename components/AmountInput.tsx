import { memo, useRef, useLayoutEffect, ChangeEvent } from 'react'
import { useColorMode, InputGroup, InputLeftElement, Input, Icon } from '@chakra-ui/core'

import { escapeRegExp } from '../utils'
import Text from './Text'

const REGEX = RegExp(`^\\d*(?:\\\\.)?\\d*$`) // match escaped "." characters via in a non-capturing group

export default memo(function AmountInput({
  value,
  onChange,
  selling,
  estimated
}: {
  value: string
  onChange: (value: string) => void
  selling: boolean
  estimated: boolean
}) {
  const { colorMode } = useColorMode()
  const ref = useRef<any>()

  useLayoutEffect(() => {
    if (ref.current) ref.current.size = Math.max(1, value.length)
  })

  const shade = colorMode === 'light' ? 500 : 200

  return (
    <>
      {estimated && (
        <Text userSelect="none" fontSize="3xl" color={`${selling ? 'red' : 'green'}.${shade}`}>
          ~
        </Text>
      )}

      <Input
        ref={ref}
        value={value}
        onChange={(event: ChangeEvent<HTMLInputElement>) => {
          const value = event.target.value
          if (value === '' || REGEX.test(escapeRegExp(value))) {
            onChange(value)
          }
        }}
        // chakra options
        color={`${selling ? 'red' : 'green'}.${shade}`}
        isRequired={true}
        variant="unstyled"
        fontSize="3xl"
        textAlign="center"
        transition="none"
        // universal input options
        inputMode="decimal"
        title="Token Amount"
        autoComplete="off"
        autoCorrect="off"
        // text-specific options
        type="text"
        placeholder="0"
        minLength={1}
        maxLength={79}
        spellCheck="false"
      />
    </>
  )
})
