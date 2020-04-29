import { memo, useRef, useLayoutEffect, ChangeEvent } from 'react'
import { Input } from '@chakra-ui/core'

import { escapeRegExp } from '../utils'

const REGEX = RegExp(`^\\d*(?:\\\\.)?\\d*$`) // match escaped "." characters via in a non-capturing group

export default memo(function AmountInput({
  isInvalid,
  isDisabled,
  value,
  onChange,
}: {
  isInvalid: boolean
  isDisabled: boolean
  value: string
  onChange: (value: string) => void
}) {
  const ref = useRef<HTMLInputElement>()
  useLayoutEffect(() => {
    if (ref.current) ref.current.size = Math.max(1, value.length)
  })

  return (
    <Input
      ref={ref}
      value={value}
      onChange={(event: ChangeEvent<HTMLInputElement>): void => {
        const value = event.target.value.replace(/,/g, '')
        if (value === '' || REGEX.test(escapeRegExp(value))) {
          onChange(value)
        }
      }}
      // chakra options
      isDisabled={isDisabled}
      _disabled={{
        opacity: 0.4,
        cursor: 'not-allowed',
      }}
      isInvalid={isInvalid}
      borderColor={!isInvalid && 'transparent !important'}
      isRequired={true}
      variant="flushed"
      fontSize="3xl"
      textAlign="center"
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
  )
})
