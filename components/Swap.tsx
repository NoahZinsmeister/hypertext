import { useReducer, useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { useWeb3React } from '@web3-react/core'
import { parseUnits } from '@ethersproject/units'
import { PayableOverrides } from '@ethersproject/contracts'
import { BigNumber } from '@ethersproject/bignumber'
import { TradeType, TokenAmount, JSBI, WETH, Percent } from '@uniswap/sdk'
import IERC20 from '@uniswap/v2-core/build/IERC20.json'
import { abi as IUniswapV2Router02ABI } from '@uniswap/v2-periphery/build/IUniswapV2Router02.json'
import { Stack, Button, Text, BoxProps } from '@chakra-ui/core'

import AmountInput from '../components/AmountInput'
import TokenSelect from '../components/TokenSelect'
import { useTokenByAddressAndAutomaticallyAdd } from '../tokens'
import { useRoute, useContract, useQueryParameters, useTrade } from '../hooks'
import { useTokenBalance, useTokenAllowance, useETHBalance } from '../data'
import { ROUTER_ADDRESS, ZERO, MAX_UINT256, QueryParameters } from '../constants'
import { useSlippage, useDeadline, useApproveMax, useTransactions, useFirstToken, useSecondToken } from '../context'
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
  partialState: Pick<SentenceState, 'independentField'> & Partial<Pick<SentenceState, Field.INPUT | Field.OUTPUT>>
): SentenceState {
  return {
    independentField: partialState.independentField,
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
  [ActionType.RESET]: {
    field: Field
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
      const { field } = action.payload as ActionPayload[ActionType.RESET]
      return initializeSentenceState({ independentField: field })
    }
  }
}

function SwapText({ children, ...rest }: BoxProps): JSX.Element {
  return (
    <Text fontSize="3xl" lineHeight={1} py="0.3rem" {...rest}>
      {children}
    </Text>
  )
}

export default function Swap({ buy }: { buy: boolean }): JSX.Element {
  const { query, pathname, replace } = useRouter()

  const queryParameters = useQueryParameters()

  const { account, chainId } = useWeb3React()

  const [approveMax] = useApproveMax()
  const [deadlineDelta] = useDeadline()
  const [slippage] = useSlippage()
  const [, { addTransaction }] = useTransactions()

  // reducer state
  const [state, dispatch] = useReducer(
    reducer,
    {
      independentField: buy ? Field.OUTPUT : Field.INPUT,
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

  // sdk tokens
  const tokens = {
    [Field.INPUT]: useTokenByAddressAndAutomaticallyAdd(tokenAddresses[Field.INPUT].address),
    [Field.OUTPUT]: useTokenByAddressAndAutomaticallyAdd(tokenAddresses[Field.OUTPUT].address),
  }

  // keep global token state in sync
  const [, setFirstToken] = useFirstToken()
  const [, setSecondToken] = useSecondToken()
  useEffect(() => {
    setFirstToken(tokens[buy ? Field.OUTPUT : Field.INPUT])
    setSecondToken(tokens[buy ? Field.INPUT : Field.OUTPUT])
  })

  // sdk route
  const [naiveRoute, allPairs] = useRoute(tokens[Field.INPUT], tokens[Field.OUTPUT])

  // parse user value
  const parsed: { [field: number]: TokenAmount } = {}
  if (value !== '' && value !== '.' && tokens[independentField]) {
    try {
      const valueParsed = parseUnits(value, tokens[independentField].decimals).toString()
      if (valueParsed !== '0') {
        parsed[independentField] = new TokenAmount(tokens[independentField], valueParsed)
      }
    } catch {
      // should only fail if the user specifies too many decimal places of precision (or maybe exceed max uint?)
    }
  }

  // sdk trade
  const trade = useTrade(tokens[Field.INPUT], tokens[Field.OUTPUT], allPairs, parsed[independentField], tradeType)

  const route = trade ? trade.route : naiveRoute

  // populate the parsed dependent field
  if (trade) {
    if (tradeType === TradeType.EXACT_INPUT) {
      parsed[dependentField] = trade.minimumAmountOut(new Percent(`${slippage}`, `${10000}`))
    } else {
      parsed[dependentField] = trade.maximumAmountIn(new Percent(`${slippage}`, `${10000}`))
    }
  }

  // calculate the formatted values from the parsed
  const formatted = {
    [independentField]: value,
    [dependentField]: parsed[dependentField] ? parsed[dependentField].toSignificant(4, { groupSeparator: ',' }) : '',
  }

  // reset when the network changes
  useEffect(() => {
    if (typeof chainId === 'number') {
      return (): void => {
        dispatch({
          type: ActionType.RESET,
          payload: { field: buy ? Field.OUTPUT : Field.INPUT },
        })
      }
    }
  }, [chainId, buy])

  // clear url params
  useEffect(() => {
    if (Object.keys(query).length > 0) {
      replace(pathname, undefined, { shallow: true })
    }
  })

  // get input allowance for validation purposes
  const { data: _allowance } = useTokenAllowance(tokens[Field.INPUT], account, ROUTER_ADDRESS)
  const allowance = tokens[Field.INPUT]?.equals(WETH[tokens[Field.INPUT]?.chainId])
    ? new TokenAmount(WETH[tokens[Field.INPUT].chainId], MAX_UINT256)
    : _allowance

  // get input balance for validation purposes
  const ETHBalance = useETHBalance(account)
  const _balance = useTokenBalance(tokens[Field.INPUT], account)
  const balance = tokens[Field.INPUT]?.equals(WETH[tokens[Field.INPUT]?.chainId]) ? ETHBalance.data : _balance.data

  // compute flags for warning states
  const warning = !!trade && Number.parseFloat(trade.slippage.toSignificant(2)) >= 5
  const danger = !!trade && Number.parseFloat(trade.slippage.toSignificant(2)) >= 10

  // compute validation flags
  const isInvalidBalance =
    parsed[Field.INPUT] && balance ? JSBI.greaterThan(parsed[Field.INPUT].raw, balance.raw) : false
  const isInvalidRoute = route === null && value.length > 0
  const isInvalidTrade = route && parsed[independentField] ? !!!trade : false

  // compute flag for whether maxing is allowed
  const canMax =
    !tokens[Field.INPUT]?.equals(WETH[tokens[Field.INPUT]?.chainId]) &&
    !isInvalidRoute &&
    formatted[Field.INPUT]?.length === 0 &&
    !!balance &&
    JSBI.greaterThan(balance.raw, ZERO)

  // function to perform the swap
  const [swapping, setSwapping] = useState(false)
  const inputToken = useContract(tokens[Field.INPUT]?.address, IERC20.abi, true)
  const router = useContract(ROUTER_ADDRESS, IUniswapV2Router02ABI, true)
  async function swap(): Promise<void> {
    setSwapping(true)

    async function innerSwap(mockGas = false): Promise<{ hash: string }> {
      let routerFunctionNames: string[]
      let routerArguments: any[] // eslint-disable-line @typescript-eslint/no-explicit-any
      let value: Required<PayableOverrides>['value'] = BigNumber.from(0)
      const deadline = Math.floor(Date.now() / 1000) + deadlineDelta

      if (trade.tradeType === TradeType.EXACT_INPUT) {
        if (tokens[Field.INPUT].equals(WETH[tokens[Field.INPUT].chainId])) {
          routerFunctionNames = ['swapExactETHForTokens', 'swapExactETHForTokensSupportingFeeOnTransferTokens']
          routerArguments = [
            `0x${parsed[Field.OUTPUT].raw.toString(16)}`,
            route.path.map((token) => token.address),
            account,
            deadline,
          ]
          value = `0x${parsed[Field.INPUT].raw.toString(16)}`
        } else if (tokens[Field.OUTPUT].equals(WETH[tokens[Field.OUTPUT].chainId])) {
          routerFunctionNames = ['swapExactTokensForETH', 'swapExactTokensForETHSupportingFeeOnTransferTokens']
          routerArguments = [
            `0x${parsed[Field.INPUT].raw.toString(16)}`,
            `0x${parsed[Field.OUTPUT].raw.toString(16)}`,
            route.path.map((token) => token.address),
            account,
            deadline,
          ]
        } else {
          routerFunctionNames = ['swapExactTokensForTokens', 'swapExactTokensForTokensSupportingFeeOnTransferTokens']
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
          routerFunctionNames = ['swapETHForExactTokens']
          routerArguments = [
            `0x${parsed[Field.OUTPUT].raw.toString(16)}`,
            route.path.map((token) => token.address),
            account,
            deadline,
          ]
          value = `0x${parsed[Field.INPUT].raw.toString(16)}`
        } else if (tokens[Field.OUTPUT].equals(WETH[tokens[Field.OUTPUT].chainId])) {
          routerFunctionNames = ['swapTokensForExactETH']
          routerArguments = [
            `0x${parsed[Field.OUTPUT].raw.toString(16)}`,
            `0x${parsed[Field.INPUT].raw.toString(16)}`,
            route.path.map((token) => token.address),
            account,
            deadline,
          ]
        } else {
          routerFunctionNames = ['swapTokensForExactTokens']
          routerArguments = [
            `0x${parsed[Field.OUTPUT].raw.toString(16)}`,
            `0x${parsed[Field.INPUT].raw.toString(16)}`,
            route.path.map((token) => token.address),
            account,
            deadline,
          ]
        }
      }

      const estimatedGasLimits: BigNumber[] = await Promise.all(
        routerFunctionNames.map(async (routerFunctionName) => {
          if (mockGas) return Promise.resolve(BigNumber.from(500000))
          return router.estimateGas[routerFunctionName](...routerArguments, { value }).catch((error: Error) => {
            console.log(`Could not estimateGas for ${routerFunctionName}.`)
            console.error(error)
            return null
          })
        })
      )

      const indexOfSuccessfulEstimation = estimatedGasLimits.findIndex((estimatedGasLimit) =>
        BigNumber.isBigNumber(estimatedGasLimit)
      )

      if (indexOfSuccessfulEstimation === -1) {
        if (routerFunctionNames.length === 1) {
          console.log(
            "If you're trying to swap a token that takes a transfer fee, you must specify an exact input amount."
          )
        } else {
          console.log(
            "If you're trying to swap a token that takes a transfer fee, ensure your slippage tolerance is higher than the fee."
          )
        }
        throw Error()
      } else {
        const routerFunctionName = routerFunctionNames[indexOfSuccessfulEstimation]
        const gasLimit = estimatedGasLimits[indexOfSuccessfulEstimation].mul(105).div(100)
        return router[routerFunctionName](...routerArguments, { value, gasLimit }).catch((error) => {
          if (error?.code === 4001) {
            console.log(`Transaction rejected for ${routerFunctionName}.`)
          } else {
            console.log(`Transaction failed for ${routerFunctionName}.`)
            console.error(error)
          }
          throw Error()
        })
      }
    }

    let approved = JSBI.greaterThanOrEqual(allowance.raw, parsed[Field.INPUT].raw)
    let mockGas = false
    if (!approved) {
      await inputToken
        .approve(ROUTER_ADDRESS, `0x${(approveMax ? MAX_UINT256 : parsed[Field.INPUT].raw).toString(16)}`)
        .then(({ hash }) => {
          addTransaction(chainId, hash)
          approved = true
          mockGas = true
        })
        .catch(() => {
          setSwapping(false)
        })
    }

    if (approved) {
      return innerSwap(mockGas)
        .then(({ hash }) => {
          addTransaction(chainId, hash)
          dispatch({
            type: ActionType.TYPE,
            payload: { field: independentField, value: '' },
          })
          setSwapping(false)
        })
        .catch(() => {
          setSwapping(false)
        })
    }
  }

  return (
    <Stack
      direction="column"
      align="center"
      spacing="6rem"
      flexGrow={1}
      justifyContent="center"
      px="2.5rem"
      py="8rem"
      shouldWrapChildren
    >
      <Stack direction="row" align="flex-start" spacing="1rem" flexWrap="wrap" shouldWrapChildren>
        <SwapText>I want to</SwapText>

        {!!!trade ? (
          <Link
            href={{
              pathname: buy ? '/sell' : '/buy',
              query: {
                ...(tokens[Field.INPUT]?.address ? { [QueryParameters.INPUT]: tokens[Field.INPUT]?.address } : {}),
                ...(tokens[Field.OUTPUT]?.address ? { [QueryParameters.OUTPUT]: tokens[Field.OUTPUT]?.address } : {}),
              },
            }}
            passHref
          >
            <Button
              as="a"
              variant="ghost"
              variantColor={buy ? 'green' : 'red'}
              p="0.5rem"
              mt="-0.2rem"
              fontSize="3xl"
              lineHeight={1}
              height="min-content"
            >
              {buy ? 'Buy' : 'Sell'}
            </Button>
          </Link>
        ) : (
          <Button
            variant="solid"
            variantColor={!warning ? (buy ? 'green' : 'red') : 'yellow'}
            p="0.75rem"
            mt="-0.45rem"
            fontSize="3xl"
            lineHeight={1}
            height="min-content"
            leftIcon={!warning ? undefined : !danger ? 'warning-2' : 'not-allowed'}
            isDisabled={!account || isInvalidBalance || isInvalidTrade}
            isLoading={swapping}
            cursor={warning ? 'not-allowed' : 'pointer'}
            onClick={swap}
          >
            {buy ? 'Buy' : 'Sell'}
          </Button>
        )}

        {trade && independentField === (buy ? Field.INPUT : Field.OUTPUT) ? (
          <SwapText>{buy ? 'at least' : 'at most'}</SwapText>
        ) : null}

        <AmountInput
          controlled={independentField === (buy ? Field.OUTPUT : Field.INPUT)}
          isDisabled={isInvalidRoute || swapping}
          isInvalid={isInvalidTrade}
          value={formatted[buy ? Field.OUTPUT : Field.INPUT]}
          onChange={(value): void => {
            dispatch({
              type: ActionType.TYPE,
              payload: { field: buy ? Field.OUTPUT : Field.INPUT, value },
            })
          }}
        />

        {!buy && canMax ? (
          <Button
            size="sm"
            mt="0.3rem"
            onClick={(): void => {
              dispatch({
                type: ActionType.TYPE,
                payload: { field: Field.INPUT, value: balance.toExact() },
              })
            }}
          >
            Max
          </Button>
        ) : null}

        <TokenSelect
          tokenAddress={tokenAddresses[buy ? Field.OUTPUT : Field.INPUT].address}
          isInvalid={isInvalidRoute}
          isDisabled={swapping}
          onAddressSelect={(address): void => {
            dispatch({
              type: ActionType.SELECT_TOKEN,
              payload: { field: buy ? Field.OUTPUT : Field.INPUT, address },
            })
          }}
        />

        <SwapText>
          {buy ? 'with' : 'for'}
          {trade && independentField === (buy ? Field.OUTPUT : Field.INPUT) ? (buy ? ' at most' : ' at least') : ''}
        </SwapText>

        <AmountInput
          controlled={independentField === (buy ? Field.INPUT : Field.OUTPUT)}
          isDisabled={isInvalidRoute || swapping}
          isInvalid={isInvalidBalance}
          value={formatted[buy ? Field.INPUT : Field.OUTPUT]}
          onChange={(value): void => {
            dispatch({
              type: ActionType.TYPE,
              payload: { field: buy ? Field.INPUT : Field.OUTPUT, value },
            })
          }}
        />

        {buy && canMax ? (
          <Button
            size="sm"
            mt="0.3rem"
            onClick={(): void => {
              dispatch({
                type: ActionType.TYPE,
                payload: { field: Field.INPUT, value: balance.toExact() },
              })
            }}
          >
            Max
          </Button>
        ) : null}

        <TokenSelect
          tokenAddress={tokenAddresses[buy ? Field.INPUT : Field.OUTPUT].address}
          isInvalid={isInvalidRoute}
          isDisabled={swapping}
          onAddressSelect={(address): void => {
            dispatch({
              type: ActionType.SELECT_TOKEN,
              payload: { field: buy ? Field.INPUT : Field.OUTPUT, address },
            })
          }}
        />

        <SwapText fontSize="3xl" lineHeight={1} pt="0.3rem">
          .
        </SwapText>
      </Stack>

      <TradeSummary route={route} trade={trade} warning={warning} danger={danger} />
    </Stack>
  )
}
