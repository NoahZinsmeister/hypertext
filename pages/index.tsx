import { useReducer, ReactNode, useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { parseUnits } from '@ethersproject/units'
import { TradeType, TokenAmount, Trade } from '@uniswap/sdk'
import { Stack, Button, Box } from '@chakra-ui/core'

import Text from '../components/Text'
import AmountInput from '../components/AmountInput'
import TokenSelect from '../components/TokenSelect'
import { useToken } from '../tokens'
import { useExchange, useRoute } from '../hooks'

enum Field {
  INPUT,
  OUTPUT
}

interface SentenceState {
  independentField: Field
  value: string
  [Field.INPUT]: {
    address: string | undefined
  }
  [Field.OUTPUT]: {
    address: string | undefined
  }
}

function initializeSentenceState(
  partialState: Partial<Omit<SentenceState, 'independentField' | 'value'>> = {}
): SentenceState {
  return {
    independentField: Field.OUTPUT,
    value: '',
    [Field.INPUT]: {
      address: partialState[Field.INPUT]?.address
    },
    [Field.OUTPUT]: {
      address: partialState[Field.OUTPUT]?.address
    }
  }
}

enum ActionType {
  SELECT_TOKEN,
  TYPE
}

interface ActionPayload {
  [ActionType.SELECT_TOKEN]: {
    field: Field
    address: string
  }
  [ActionType.TYPE]: {
    field: Field
    value: string
  }
}

function reducer(
  state: SentenceState,
  action: {
    type: ActionType
    payload: ActionPayload[ActionType]
  }
): SentenceState {
  switch (action.type) {
    case ActionType.SELECT_TOKEN: {
      const { field, address } = action.payload as ActionPayload[ActionType.SELECT_TOKEN]
      if (address === state[field === Field.INPUT ? Field.OUTPUT : Field.INPUT].address) {
        return {
          ...state,
          value: '',
          [Field.INPUT]: state[Field.OUTPUT],
          [Field.OUTPUT]: state[Field.INPUT]
        }
      } else {
        return {
          ...state,
          [field]: { address }
        }
      }
    }
    case ActionType.TYPE: {
      const { field, value } = action.payload as ActionPayload[ActionType.TYPE]
      return {
        ...state,
        independentField: field,
        value
      }
    }
  }
}

enum Direction {
  BUYING,
  SELLING
}

export default function Index() {
  const { query, pathname, push } = useRouter()

  const [state, dispatch] = useReducer(
    reducer,
    {
      [Field.INPUT]: {
        address: '0xc7AD46e0b8a400Bb3C915120d284AafbA8fc4735'
      },
      [Field.OUTPUT]: {
        address: '0xc778417E063141139Fce010982780140Aa0cD5Ab'
      }
    },
    initializeSentenceState
  )
  const { independentField, value, ...tokenAddresses } = state

  // derived state
  const dependentField = independentField === Field.INPUT ? Field.OUTPUT : Field.INPUT
  const tradeType = independentField === Field.INPUT ? TradeType.EXACT_INPUT : TradeType.EXACT_OUTPUT

  const [direction, setDirection] = useState(query.buy === 'true' ? Direction.BUYING : Direction.SELLING)
  useEffect(() => {
    const { buy, sell, ...rest } = query
    const invalidParametersExist = Object.keys(rest).length > 0
    if (direction === Direction.BUYING && (invalidParametersExist || buy !== 'true' || sell !== undefined)) {
      push({ pathname, query: { buy: 'true' } }, undefined, { shallow: true })
    } else if (direction === Direction.SELLING && (invalidParametersExist || sell !== 'true' || buy !== undefined)) {
      push({ pathname, query: { sell: 'true' } }, undefined, { shallow: true })
    }
  }, [query, direction, push, pathname])

  // sdk state
  const tokens = {
    [Field.INPUT]: useToken(tokenAddresses[Field.INPUT].address),
    [Field.OUTPUT]: useToken(tokenAddresses[Field.OUTPUT].address)
  }
  const exchange = useExchange(tokens[Field.INPUT], tokens[Field.OUTPUT])
  const route = useRoute(exchange, tokens[Field.INPUT])

  // parse input
  const parsed: { [field: number]: TokenAmount } = {}
  if (value !== '' && value !== '.' && tokens[independentField]) {
    try {
      const valueParsed = parseUnits(value, tokens[independentField].decimals).toString()
      if (valueParsed !== '0') parsed[independentField] = new TokenAmount(tokens[independentField], valueParsed)
    } catch (error) {
      // should only fail if the user specifies too many decimal places of precision (or maybe exceed max uint?)
      console.error(error)
    }
  }

  let trade: Trade
  try {
    trade = !!route && !!parsed[independentField] ? new Trade(route, parsed[independentField], tradeType) : undefined
  } catch (error) {
    console.error(error)
  }
  if (trade) parsed[dependentField] = tradeType === TradeType.EXACT_INPUT ? trade.outputAmount : trade.inputAmount

  const formatted = {
    [independentField]: value,
    [dependentField]: parsed[dependentField] ? parsed[dependentField].toSignificant(5) : ''
  }

  return (
    <Stack align="center">
      <Stack direction="row" align="center" flexWrap="wrap" m="2rem">
        {[
          <Text fontSize="3xl">I want to</Text>,

          <Button
            size="lg"
            variant="ghost"
            width="5rem"
            p={0}
            transition="none"
            variantColor={direction === Direction.BUYING ? 'green' : 'red'}
            onClick={() => {
              setDirection(direction => (direction === Direction.BUYING ? Direction.SELLING : Direction.BUYING))
            }}
          >
            <Text transition="none" fontSize="3xl">
              {direction === Direction.BUYING ? 'Buy' : 'Sell'}
            </Text>
          </Button>,

          <AmountInput
            value={formatted[direction === Direction.BUYING ? Field.OUTPUT : Field.INPUT]}
            onChange={value => {
              dispatch({
                type: ActionType.TYPE,
                payload: { field: direction === Direction.BUYING ? Field.OUTPUT : Field.INPUT, value }
              })
            }}
            selling={direction === Direction.SELLING}
            estimated={
              (direction === Direction.BUYING && independentField === Field.INPUT && !!parsed[Field.OUTPUT]) ||
              (direction === Direction.SELLING && independentField === Field.OUTPUT && !!parsed[Field.INPUT])
            }
          />,

          <Box width="10rem" maxWidth="10rem">
            <TokenSelect
              address={tokens[direction === Direction.BUYING ? Field.OUTPUT : Field.INPUT]?.address}
              onChange={address => {
                dispatch({
                  type: ActionType.SELECT_TOKEN,
                  payload: { field: direction === Direction.BUYING ? Field.OUTPUT : Field.INPUT, address }
                })
              }}
            />
          </Box>,

          <Text fontSize="3xl" width="4rem" textAlign="center">
            {direction === Direction.BUYING ? 'with' : 'for'}
          </Text>,

          <AmountInput
            value={formatted[direction === Direction.BUYING ? Field.INPUT : Field.OUTPUT]}
            onChange={value => {
              dispatch({
                type: ActionType.TYPE,
                payload: { field: direction === Direction.BUYING ? Field.INPUT : Field.OUTPUT, value }
              })
            }}
            selling={direction === Direction.BUYING}
            estimated={
              (direction === Direction.BUYING && independentField === Field.OUTPUT && !!parsed[Field.INPUT]) ||
              (direction === Direction.SELLING && independentField === Field.INPUT && !!parsed[Field.OUTPUT])
            }
          />,

          <Box width="10rem" maxWidth="10rem">
            <TokenSelect
              address={tokens[direction === Direction.BUYING ? Field.INPUT : Field.OUTPUT]?.address}
              onChange={address => {
                dispatch({
                  type: ActionType.SELECT_TOKEN,
                  payload: { field: direction === Direction.BUYING ? Field.INPUT : Field.OUTPUT, address }
                })
              }}
            />
          </Box>,

          <Text fontSize="3xl">.</Text>
        ].map(
          (element: ReactNode, i): ReactNode => (
            <Stack key={i} flexShrink={0} direction="row" spacing={0} align="center">
              {element}
            </Stack>
          )
        )}
      </Stack>
    </Stack>
  )
}
