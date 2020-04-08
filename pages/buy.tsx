import { useReducer, useState, useEffect } from 'react'
import Link from 'next/link'
import { parseUnits } from '@ethersproject/units'
import { TradeType, TokenAmount, Trade, JSBI, WETH } from '@uniswap/sdk'
import { Stack, Button, Box, Text, Popover, PopoverTrigger, PopoverContent } from '@chakra-ui/core'
import { getAddress } from '@ethersproject/address'

import AmountInput from '../components/AmountInput'
import TokenSelect from '../components/TokenSelect'
import { useTokenByAddress } from '../tokens'
import { useRoute, useContract } from '../hooks'
import { useTokenBalance, useTokenAllowance, useETHBalance } from '../data'
import { useWeb3React } from '@web3-react/core'
import { ROUTER_ADDRESS, ROUTER, ZERO, MAX_UINT256, ERC20 } from '../constants'
import { useSlippage, useDeadline, useApproveMax, useTransactions, useFirstToken, useSecondToken } from '../context'
import { useRouter } from 'next/router'
import TradeSummary from '../components/TradeSummary'

enum Field {
  INPUT,
  OUTPUT,
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
      address: partialState[Field.INPUT]?.address,
    },
    [Field.OUTPUT]: {
      address: partialState[Field.OUTPUT]?.address,
    },
  }
}

enum ActionType {
  SELECT_TOKEN,
  TYPE,
  RESET,
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
  [ActionType.RESET]: undefined
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
      if (!!address && address === state[field === Field.INPUT ? Field.OUTPUT : Field.INPUT].address) {
        return {
          ...state,
          value: '',
          [Field.INPUT]: state[Field.OUTPUT],
          [Field.OUTPUT]: state[Field.INPUT],
        }
      } else {
        return {
          ...state,
          [field]: { address },
        }
      }
    }
    case ActionType.TYPE: {
      const { field, value } = action.payload as ActionPayload[ActionType.TYPE]
      return {
        ...state,
        independentField: field,
        value,
      }
    }
    case ActionType.RESET: {
      return initializeSentenceState()
    }
  }
}

enum QueryParameters {
  INPUT = 'input',
  OUTPUT = 'output',
}

export default function Buy(): JSX.Element {
  const { pathname, query, replace } = useRouter()
  const queryParameters: { [parameter: string]: string | undefined } = {}
  try {
    queryParameters[QueryParameters.INPUT] =
      typeof query[QueryParameters.INPUT] === 'string' ? getAddress(query[QueryParameters.INPUT] as string) : undefined
  } catch {}
  try {
    queryParameters[QueryParameters.OUTPUT] =
      typeof query[QueryParameters.OUTPUT] === 'string'
        ? getAddress(query[QueryParameters.OUTPUT] as string)
        : undefined
  } catch {}

  const { account, chainId } = useWeb3React()

  const [approveMax] = useApproveMax()
  const [deadlineDelta] = useDeadline()
  const [slippage] = useSlippage()
  const [, { addTransaction }] = useTransactions()

  // reducer state
  const [state, dispatch] = useReducer(
    reducer,
    {
      [Field.INPUT]: {
        address: queryParameters[QueryParameters.INPUT],
      },
      [Field.OUTPUT]: {
        address: queryParameters[QueryParameters.OUTPUT],
      },
    },
    initializeSentenceState
  )
  const { independentField, value, ...tokenAddresses } = state

  // derived state
  const dependentField = independentField === Field.INPUT ? Field.OUTPUT : Field.INPUT
  const tradeType = independentField === Field.INPUT ? TradeType.EXACT_INPUT : TradeType.EXACT_OUTPUT

  // sdk state
  const tokens = {
    [Field.INPUT]: useTokenByAddress(tokenAddresses[Field.INPUT].address),
    [Field.OUTPUT]: useTokenByAddress(tokenAddresses[Field.OUTPUT].address),
  }
  const firstToken = tokens[Field.OUTPUT]
  const secondToken = tokens[Field.INPUT]
  const [, setFirstToken] = useFirstToken()
  const [, setSecondToken] = useSecondToken()
  useEffect(() => {
    setFirstToken(firstToken)
  }, [firstToken, setFirstToken])
  useEffect(() => {
    setSecondToken(secondToken)
  }, [secondToken, setSecondToken])
  const route = useRoute(tokens[Field.INPUT], tokens[Field.OUTPUT])

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

  if (trade) {
    if (tradeType === TradeType.EXACT_INPUT) {
      parsed[dependentField] = new TokenAmount(
        trade.outputAmount.token,
        JSBI.divide(JSBI.multiply(trade.outputAmount.raw, JSBI.BigInt(10000 - slippage)), JSBI.BigInt(10000))
      )
    } else {
      parsed[dependentField] = new TokenAmount(
        trade.inputAmount.token,
        JSBI.divide(JSBI.multiply(trade.inputAmount.raw, JSBI.BigInt(10000 + slippage)), JSBI.BigInt(10000))
      )
    }
  }

  const formatted = {
    [independentField]:
      value.slice(0, 1) === '.'
        ? value
        : !!parsed[independentField]
        ? parsed[independentField].toSignificant(value.length, { groupSeparator: ',' }) +
          (value.slice(-1) === '.' ? '.' : '')
        : value,
    [dependentField]: parsed[dependentField] ? parsed[dependentField].toSignificant(4, { groupSeparator: ',' }) : '',
  }

  // reset tokens and value when network changes
  useEffect(() => {
    if (typeof chainId === 'number') {
      return (): void => {
        dispatch({
          type: ActionType.RESET,
          payload: undefined,
        })
      }
    }
  }, [chainId])

  // keep url params in sync with tokens
  useEffect(() => {
    if (
      queryParameters[QueryParameters.INPUT] !== tokens[Field.INPUT]?.address ||
      queryParameters[QueryParameters.OUTPUT] !== tokens[Field.OUTPUT]?.address
    ) {
      replace(
        {
          pathname,
          query: {
            ...(!!tokens[Field.INPUT]?.address && {
              [QueryParameters.INPUT]: tokens[Field.INPUT]?.address,
            }),
            ...(!!tokens[Field.OUTPUT]?.address && {
              [QueryParameters.OUTPUT]: tokens[Field.OUTPUT]?.address,
            }),
          },
        },
        undefined,
        { shallow: true }
      )
    }
  })

  const warning = !!trade && Number.parseFloat(trade.slippage.toSignificant(2)) >= 5
  const danger = !!trade && Number.parseFloat(trade.slippage.toSignificant(2)) >= 10

  // get allowance and balance for validation prurposes
  const router = useContract(ROUTER_ADDRESS, ROUTER, true)
  const inputAllowance = useTokenAllowance(tokens[Field.INPUT], account, router?.address)
  const allowance = tokens[Field.INPUT]?.equals(WETH[tokens[Field.INPUT]?.chainId])
    ? new TokenAmount(WETH[tokens[Field.INPUT].chainId], MAX_UINT256)
    : inputAllowance.data
  const ETHBalance = useETHBalance(account)
  const inputBalance = useTokenBalance(tokens[Field.INPUT], account)
  const balance = tokens[Field.INPUT]?.equals(WETH[tokens[Field.INPUT]?.chainId]) ? ETHBalance.data : inputBalance.data

  const canMax =
    !!balance && !tokens[Field.INPUT].equals(WETH[tokens[Field.INPUT].chainId]) && JSBI.greaterThan(balance.raw, ZERO)

  const isInvalidBalance =
    !!parsed[Field.INPUT] && !!balance ? JSBI.greaterThan(parsed[Field.INPUT].raw, balance.raw) : false
  const isInvalidTrade = !!route && !!parsed[independentField] ? !!!trade : false
  const isInvalidRoute = route === null

  const [buying, setBuying] = useState(false)
  const inputToken = useContract(tokens[Field.INPUT]?.address, ERC20, true)
  async function buy(): Promise<void> {
    setBuying(true)

    async function swap(mockGas = false): Promise<{ hash: string }> {
      let routerFunction: any // eslint-disable-line @typescript-eslint/no-explicit-any
      let routerArguments: any[] // eslint-disable-line @typescript-eslint/no-explicit-any
      let routerOptions: object = mockGas ? { gasLimit: 500000 } : {}
      const deadline = Math.floor(Date.now() / 1000) + deadlineDelta

      if (trade.tradeType === TradeType.EXACT_INPUT) {
        if (tokens[Field.INPUT].equals(WETH[tokens[Field.INPUT].chainId])) {
          routerFunction = router.swapExactETHForTokens
          routerArguments = [
            `0x${parsed[Field.OUTPUT].raw.toString(16)}`,
            route.path.map((token) => token.address),
            account,
            deadline,
          ]
          routerOptions = { ...routerOptions, value: `0x${parsed[Field.INPUT].raw.toString(16)}` }
        } else if (tokens[Field.OUTPUT].equals(WETH[tokens[Field.OUTPUT].chainId])) {
          routerFunction = router.swapExactTokensForETH
          routerArguments = [
            `0x${parsed[Field.INPUT].raw.toString(16)}`,
            `0x${parsed[Field.OUTPUT].raw.toString(16)}`,
            route.path.map((token) => token.address),
            account,
            deadline,
          ]
        } else {
          routerFunction = router.swapExactTokensForTokens
          routerArguments = [
            `0x${parsed[Field.INPUT].raw.toString(16)}`,
            `0x${parsed[Field.OUTPUT].raw.toString(16)}`,
            route.path.map((token) => token.address),
            account,
            deadline,
          ]
        }
      } else {
        if (tokens[Field.INPUT].equals(WETH[tokens[Field.INPUT].chainId])) {
          routerFunction = router.swapETHForExactTokens
          routerArguments = [
            `0x${parsed[Field.OUTPUT].raw.toString(16)}`,
            route.path.map((token) => token.address),
            account,
            deadline,
          ]
          routerOptions = { ...routerOptions, value: `0x${parsed[Field.INPUT].raw.toString(16)}` }
        } else if (tokens[Field.OUTPUT].equals(WETH[tokens[Field.OUTPUT].chainId])) {
          routerFunction = router.swapTokensForExactETH
          routerArguments = [
            `0x${parsed[Field.OUTPUT].raw.toString(16)}`,
            `0x${parsed[Field.INPUT].raw.toString(16)}`,
            route.path.map((token) => token.address),
            account,
            deadline,
          ]
        } else {
          routerFunction = router.swapTokensForExactTokens
          routerArguments = [
            `0x${parsed[Field.OUTPUT].raw.toString(16)}`,
            `0x${parsed[Field.INPUT].raw.toString(16)}`,
            route.path.map((token) => token.address),
            account,
            deadline,
          ]
        }
      }

      return routerFunction(...routerArguments, routerOptions)
    }

    let approved = JSBI.greaterThanOrEqual(allowance.raw, parsed[Field.INPUT].raw)
    let mockGas = false
    if (!approved) {
      await inputToken
        .approve(ROUTER_ADDRESS, `0x${(approveMax ? MAX_UINT256 : parsed[Field.INPUT].raw).toString(16)}`)
        .then(async ({ hash }) => {
          addTransaction(hash)
          approved = true
          mockGas = true
        })
        .catch(() => {
          setBuying(false)
        })
    }

    if (approved) {
      await swap(mockGas)
        .then(({ hash }) => {
          addTransaction(hash)
          dispatch({
            type: ActionType.TYPE,
            payload: { field: independentField, value: '' },
          })
          setBuying(false)
        })
        .catch(() => {
          setBuying(false)
        })
    }
  }

  return (
    <Stack direction="column" align="center" spacing="6rem" flexGrow={1} justifyContent="center" p="2rem">
      <Stack direction="row" align="center" spacing={0} flexWrap="wrap">
        <Text fontSize="3xl">I want to</Text>

        <Box ml="0.8rem">
          {!!!trade ? (
            <Link href={{ pathname: '/sell', query }} passHref>
              <Button as="a" variant="ghost" variantColor="green">
                <Text fontSize="3xl">Buy</Text>
              </Button>
            </Link>
          ) : (
            <Button
              variant={'solid'}
              variantColor={!warning ? 'green' : 'yellow'}
              isDisabled={isInvalidBalance || isInvalidTrade}
              isLoading={buying}
              leftIcon={!warning ? undefined : !danger ? 'warning-2' : 'not-allowed'}
              size={!!!trade ? undefined : 'lg'}
              onClick={buy}
            >
              <Text fontSize="3xl">Buy</Text>
            </Button>
          )}
        </Box>

        {trade && independentField === Field.INPUT ? (
          <Text fontSize="3xl" textAlign="center" ml="0.8rem">
            at least
          </Text>
        ) : null}

        <Box ml="0.5rem">
          <AmountInput
            isDisabled={buying}
            isInvalid={isInvalidTrade}
            value={formatted[Field.OUTPUT]}
            onChange={(value): void => {
              dispatch({
                type: ActionType.TYPE,
                payload: { field: Field.OUTPUT, value },
              })
            }}
          />
        </Box>

        <Box ml="0.5rem">
          <TokenSelect
            isInvalid={isInvalidRoute}
            isDisabled={buying}
            selectedToken={tokens[Field.OUTPUT]}
            onAddressSelect={(address): void => {
              dispatch({
                type: ActionType.SELECT_TOKEN,
                payload: { field: Field.OUTPUT, address },
              })
            }}
          />
        </Box>

        <Text fontSize="3xl" textAlign="center" ml="0.75rem">
          with {trade && independentField === Field.OUTPUT ? 'at most' : ''}
        </Text>

        <Popover
          trigger="hover"
          placement="bottom"
          isOpen={
            canMax
              ? !!formatted[Field.INPUT] || (parsed[Field.INPUT] && JSBI.equal(parsed[Field.INPUT].raw, balance.raw))
                ? false
                : true
              : false
          }
          returnFocusOnClose={false}
        >
          <PopoverTrigger>
            <Box ml="0.5rem">
              <AmountInput
                isDisabled={buying}
                isInvalid={isInvalidBalance}
                value={formatted[Field.INPUT]}
                onChange={(value): void => {
                  dispatch({
                    type: ActionType.TYPE,
                    payload: { field: Field.INPUT, value },
                  })
                }}
              />
            </Box>
          </PopoverTrigger>

          <PopoverContent width="min-content" border="none" background="transparent" boxShadow="none">
            <Button
              size="sm"
              onClick={(): void => {
                dispatch({
                  type: ActionType.TYPE,
                  payload: { field: Field.INPUT, value: balance.toExact() },
                })
              }}
            >
              Max
            </Button>
          </PopoverContent>
        </Popover>

        <Box ml="0.5rem">
          <TokenSelect
            isInvalid={isInvalidRoute}
            isDisabled={buying}
            selectedToken={tokens[Field.INPUT]}
            onAddressSelect={(address): void => {
              dispatch({
                type: ActionType.SELECT_TOKEN,
                payload: { field: Field.INPUT, address },
              })
            }}
          />
        </Box>

        <Text fontSize="3xl" ml="0.25rem">
          .
        </Text>
      </Stack>

      <TradeSummary route={route} trade={trade} warning={warning} danger={danger} />
    </Stack>
  )
}
