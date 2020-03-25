import { Token } from '@uniswap/sdk'
import Select from 'react-select'

import { useAllTokens, useToken } from '../tokens'

interface SerializedToken {
  value: string
  label: string
}

function serialize(token: Token): SerializedToken {
  return {
    value: token.address,
    label: token.symbol
  }
}

export default function TokenSelect({ address, onChange }: { address?: string; onChange: (address: any) => void }) {
  const tokens = useAllTokens()
  const selectedToken = useToken(address)

  return (
    <Select
      value={selectedToken instanceof Token ? serialize(selectedToken) : undefined}
      onChange={({ value: address }: SerializedToken) => {
        onChange(address)
      }}
      options={tokens.map(serialize)}
    />
  )
}
