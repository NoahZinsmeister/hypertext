import { useReducer, useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import NextLink from 'next/link'
import { useWeb3React } from '@web3-react/core'
import { parseUnits } from '@ethersproject/units'
import { PayableOverrides, Contract } from '@ethersproject/contracts'
import { BigNumber } from '@ethersproject/bignumber'
import { TradeType, TokenAmount, JSBI, WETH, Percent, Token, Route, Fraction } from '@uniswap/sdk'
import { hexDataSlice } from '@ethersproject/bytes'
import { id } from '@ethersproject/hash'
import { defaultAbiCoder } from '@ethersproject/abi'
import IERC20 from '@uniswap/v2-core/build/IERC20.json'
import { abi as IUniswapV2Router02ABI } from '@uniswap/v2-periphery/build/IUniswapV2Router02.json'
import { Stack, Button, Text, BoxProps } from '@chakra-ui/core'

import AmountInput from '../components/AmountInput'
import TokenSelect from '../components/TokenSelect'
import { useTokenByAddressAndAutomaticallyAdd } from '../tokens'
import { useRoute, useContract, useQueryParameters, useTrade, useUSDTokenPrice } from '../hooks'
import { useTokenBalance, useTokenAllowance, useETHBalance } from '../data'
import {
  ROUTER_ADDRESS,
  ZERO,
  MAX_UINT256,
  QueryParameters,
  PERMIT_AND_CALL_ADDRESS,
  GAS_LIMIT_WHEN_MOCKING,
  isIPFS,
} from '../constants'
import {
  useSlippage,
  useDeadline,
  useApproveMax,
  useTransactions,
  useFirstToken,
  useSecondToken,
  useShowUSD,
} from '../context'
import TradeSummary from '../components/TradeSummary'
import { canPermit, gatherPermit, Permit } from '../permits'
import { formatQueryParams } from '../utils'

interface ErrorWithCode extends Error {
  code?: number
}

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

  const { account, chainId, library } = useWeb3React()

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
      const valueParsed = parseUnits(value, tokens[independentField]?.decimals).toString()
      if (valueParsed !== '0') {
        parsed[independentField] = new TokenAmount(tokens[independentField] as Token, valueParsed)
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

  // usd values
  const [showUSD] = useShowUSD()
  const USDPrices = {
    [Field.INPUT]: useUSDTokenPrice(tokens[Field.INPUT]),
    [Field.OUTPUT]: useUSDTokenPrice(tokens[Field.OUTPUT]),
  }
  const USDAmountsFormatted = {
    [Field.INPUT]:
      parsed[Field.INPUT] && USDPrices[Field.INPUT]
        ? parsed[Field.INPUT].multiply(USDPrices[Field.INPUT] as Fraction).toFixed(2, { groupSeparator: ',' })
        : undefined,
    [Field.OUTPUT]:
      parsed[Field.OUTPUT] && USDPrices[Field.OUTPUT]
        ? parsed[Field.OUTPUT].multiply(USDPrices[Field.OUTPUT] as Fraction).toFixed(2, { groupSeparator: ',' })
        : undefined,
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
      if (isIPFS) {
        window.history.replaceState(null, '', `.${pathname}.html`)
      } else {
        replace(pathname, undefined, { shallow: true })
      }
    }
  })

  // get input allowance for validation purposes
  const { data: _allowance } = useTokenAllowance(tokens[Field.INPUT], account, ROUTER_ADDRESS)
  const allowance = tokens[Field.INPUT]?.equals(WETH[(tokens[Field.INPUT] as Token).chainId])
    ? new TokenAmount(WETH[(tokens[Field.INPUT] as Token).chainId], MAX_UINT256)
    : _allowance

  // get permitAndCall allowance if the input token supports permit
  const { data: permitAndCallAllowance } = useTokenAllowance(
    canPermit(tokens[Field.INPUT]) ? tokens[Field.INPUT] : undefined,
    account,
    PERMIT_AND_CALL_ADDRESS
  )

  // get input balance for validation purposes
  const ETHBalance = useETHBalance(account)
  const _balance = useTokenBalance(tokens[Field.INPUT], account)
  const balance = tokens[Field.INPUT]?.equals(WETH[(tokens[Field.INPUT] as Token)?.chainId])
    ? ETHBalance.data
    : _balance.data

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
    !tokens[Field.INPUT]?.equals(WETH[(tokens[Field.INPUT] as Token).chainId]) &&
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

    async function innerSwap(deadline: number, mockGas = false, permit?: Permit): Promise<{ hash: string }> {
      let routerFunctionNames: string[]
      let routerArguments: any[] // eslint-disable-line @typescript-eslint/no-explicit-any
      let value: Required<PayableOverrides>['value'] = 0

      if (trade?.tradeType === TradeType.EXACT_INPUT) {
        if ((tokens[Field.INPUT] as Token).equals(WETH[(tokens[Field.INPUT] as Token).chainId])) {
          routerFunctionNames = ['swapExactETHForTokens', 'swapExactETHForTokensSupportingFeeOnTransferTokens']
          routerArguments = [
            `0x${parsed[Field.OUTPUT].raw.toString(16)}`,
            (route as Route).path.map((token) => token.address),
            account,
            deadline,
          ]
          value = `0x${parsed[Field.INPUT].raw.toString(16)}`
        } else if ((tokens[Field.OUTPUT] as Token).equals(WETH[(tokens[Field.OUTPUT] as Token).chainId])) {
          routerFunctionNames = ['swapExactTokensForETH', 'swapExactTokensForETHSupportingFeeOnTransferTokens']
          routerArguments = [
            `0x${parsed[Field.INPUT].raw.toString(16)}`,
            `0x${parsed[Field.OUTPUT].raw.toString(16)}`,
            (route as Route).path.map((token) => token.address),
            account,
            deadline,
          ]
        } else {
          routerFunctionNames = ['swapExactTokensForTokens', 'swapExactTokensForTokensSupportingFeeOnTransferTokens']
          routerArguments = [
            `0x${parsed[Field.INPUT].raw.toString(16)}`,
            `0x${parsed[Field.OUTPUT].raw.toString(16)}`,
            (route as Route).path.map((token) => token.address),
            account,
            deadline,
          ]
        }
      } else {
        if ((tokens[Field.INPUT] as Token).equals(WETH[(tokens[Field.INPUT] as Token).chainId])) {
          routerFunctionNames = ['swapETHForExactTokens']
          routerArguments = [
            `0x${parsed[Field.OUTPUT].raw.toString(16)}`,
            (route as Route).path.map((token) => token.address),
            account,
            deadline,
          ]
          value = `0x${parsed[Field.INPUT].raw.toString(16)}`
        } else if ((tokens[Field.OUTPUT] as Token).equals(WETH[(tokens[Field.OUTPUT] as Token).chainId])) {
          routerFunctionNames = ['swapTokensForExactETH']
          routerArguments = [
            `0x${parsed[Field.OUTPUT].raw.toString(16)}`,
            `0x${parsed[Field.INPUT].raw.toString(16)}`,
            (route as Route).path.map((token) => token.address),
            account,
            deadline,
          ]
        } else {
          routerFunctionNames = ['swapTokensForExactTokens']
          routerArguments = [
            `0x${parsed[Field.OUTPUT].raw.toString(16)}`,
            `0x${parsed[Field.INPUT].raw.toString(16)}`,
            (route as Route).path.map((token) => token.address),
            account,
            deadline,
          ]
        }
      }

      // we have an approve tx pending
      if (mockGas) {
        // because we can't estimate gas, as it will fail b/c of the approve, we are forced to use the first function
        const routerFunctionName = routerFunctionNames[0]
        return await (router as Contract)
          [routerFunctionName](...routerArguments, {
            value,
            gasLimit: GAS_LIMIT_WHEN_MOCKING,
          })
          .catch((error: ErrorWithCode) => {
            if (error?.code !== 4001) {
              console.log(`${routerFunctionName} failed with a mocked gas limit.`, error)
            }
            throw error
          })
      }

      // we have permit data
      if (permit) {
        const permitAndCall = new Contract(
          PERMIT_AND_CALL_ADDRESS,
          [
            'function permitAndCall(address token, uint256 value, bytes4 permitSelector, bytes calldata permitData, bytes4 routerFunctionSelector, bytes calldata routerFunctionData)',
          ],
          library.getSigner(account).connectUnchecked()
        )

        // try to get a gas limit for each function name in turn
        for (const routerFunctionName of routerFunctionNames) {
          const routerFunctionFragment = (router as Contract).interface.fragments.filter(
            ({ name }) => name === routerFunctionName
          )[0]
          const routerFunctionSelector = hexDataSlice(
            id(`${routerFunctionName}(${routerFunctionFragment?.inputs.map(({ type }) => type).join(',')})`),
            0,
            4
          )
          const permitAndCallArguments = [
            (tokens[Field.INPUT] as Token).address,
            `0x${parsed[Field.INPUT].raw.toString(16)}`,
            permit.permitSelector,
            permit.permitData,
            routerFunctionSelector,
            defaultAbiCoder.encode(routerFunctionFragment.inputs, routerArguments),
          ]
          const gasLimit: BigNumber | void = await permitAndCall.estimateGas
            .permitAndCall(...permitAndCallArguments, { value })
            .then((gasLimit) => gasLimit.mul(105).div(100))
            .catch((error) => {
              console.log(`estimateGas failed for ${routerFunctionName} via permitAndCall.`, error)
            })
          if (BigNumber.isBigNumber(gasLimit)) {
            return await permitAndCall
              .permitAndCall(...permitAndCallArguments, {
                value,
                gasLimit,
              })
              .catch((error: ErrorWithCode) => {
                if (error?.code !== 4001) {
                  console.log(`${routerFunctionName} failed via permitAndCall.`, error)
                }
                throw error
              })
          }
        }
        // if we're here, it means all estimateGas calls failed
        console.log(
          routerFunctionNames.length === 1
            ? "If you're trying to swap a token that takes a transfer fee, you must specify an exact input amount."
            : "If you're trying to swap a token that takes a transfer fee, ensure your slippage tolerance is higher than the fee."
        )
        throw Error()
      }

      // try to get a gas limit for each function name in turn
      for (const routerFunctionName of routerFunctionNames) {
        const gasLimit: BigNumber | void = await (router as Contract).estimateGas[
          routerFunctionName
        ](...routerArguments, { value })
          .then((gasLimit) => gasLimit.mul(105).div(100))
          .catch((error) => {
            console.log(`estimateGas failed for ${routerFunctionName}.`, error)
          })
        if (BigNumber.isBigNumber(gasLimit)) {
          return await (router as Contract)
            [routerFunctionName](...routerArguments, { value, gasLimit })
            .catch((error: ErrorWithCode) => {
              if (error?.code !== 4001) {
                console.log(`${routerFunctionName} failed.`, error)
              }
              throw error
            })
        }
      }
      // if we're here, it means all estimateGas calls failed
      console.log(
        routerFunctionNames.length === 1
          ? "If you're trying to swap a token that takes a transfer fee, you must specify an exact input amount."
          : "If you're trying to swap a token that takes a transfer fee, ensure your slippage tolerance is higher than the fee."
      )
      throw Error()
    }

    const deadline = Math.floor(Date.now() / 1000) + deadlineDelta
    let approved = JSBI.greaterThanOrEqual((allowance as TokenAmount).raw, parsed[Field.INPUT].raw)
    let mockGas = false
    let permit: Permit | undefined
    if (!approved) {
      let tryToManuallyApprove = true

      // attempt to gather a permit signature where possible
      if (canPermit(tokens[Field.INPUT])) {
        // in the slightly weird case where the user has already approved PermitAndCall, just fake the permit
        if (permitAndCallAllowance && JSBI.greaterThanOrEqual(permitAndCallAllowance.raw, parsed[Field.INPUT].raw)) {
          approved = true
          tryToManuallyApprove = false
          permit = {
            permitSelector: '0x00000000',
            permitData: '0x',
          }
        } else {
          await gatherPermit(
            account as string,
            deadline,
            approveMax ? MAX_UINT256 : parsed[Field.INPUT].raw,
            tokens[Field.INPUT] as Token,
            library
          )
            .then((gatheredPermit) => {
              approved = true
              tryToManuallyApprove = false
              permit = gatheredPermit
            })
            .catch((error) => {
              // if the error code is 4001 (EIP-1193 user rejected request), we don't want to try a manual approve
              if (error?.code === 4001) {
                tryToManuallyApprove = false
              } else {
                console.log(`permit failed.`, error)
              }
            })
        }
      }

      if (tryToManuallyApprove) {
        await (inputToken as Contract)
          .approve(ROUTER_ADDRESS, `0x${(approveMax ? MAX_UINT256 : parsed[Field.INPUT].raw).toString(16)}`)
          .then(({ hash }: { hash: string }) => {
            addTransaction(chainId as number, hash)
            approved = true
            mockGas = true
          })
          .catch((error: ErrorWithCode) => {
            if (error?.code !== 4001) {
              console.log(`approve failed.`, error)
            }
          })
      }
    }

    if (approved) {
      return (
        innerSwap(deadline, mockGas, permit)
          .then(({ hash }) => {
            addTransaction(chainId as number, hash)
            dispatch({
              type: ActionType.TYPE,
              payload: { field: independentField, value: '' },
            })
            setSwapping(false)
          })
          // we don't do anything with the error here, innerSwap is responsible for handling it
          .catch(() => {
            setSwapping(false)
          })
      )
    } else {
      setSwapping(false)
    }
  }

  const formattedQueryParams = formatQueryParams({
    ...(tokens[Field.INPUT]?.address ? { [QueryParameters.INPUT]: (tokens[Field.INPUT] as Token).address } : {}),
    ...(tokens[Field.OUTPUT]?.address ? { [QueryParameters.OUTPUT]: (tokens[Field.OUTPUT] as Token).address } : {}),
  })

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
          isIPFS ? (
            <Button
              as="a"
              {...{
                href: `./${buy ? 'sell' : 'buy'}.html${formattedQueryParams}`,
              }}
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
          ) : (
            <NextLink href={`/${buy ? 'sell' : 'buy'}${formattedQueryParams}`} passHref>
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
            </NextLink>
          )
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
          isDisabled={showUSD || swapping}
          isInvalid={isInvalidTrade || (!buy && isInvalidBalance)}
          value={
            showUSD && USDAmountsFormatted[buy ? Field.OUTPUT : Field.INPUT]
              ? `$${USDAmountsFormatted[buy ? Field.OUTPUT : Field.INPUT]}`
              : formatted[buy ? Field.OUTPUT : Field.INPUT]
          }
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
                payload: { field: Field.INPUT, value: balance?.toExact() },
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
          isDisabled={showUSD || swapping}
          isInvalid={isInvalidTrade || (buy && isInvalidBalance)}
          value={
            showUSD && USDAmountsFormatted[buy ? Field.INPUT : Field.OUTPUT]
              ? `$${USDAmountsFormatted[buy ? Field.INPUT : Field.OUTPUT]}`
              : formatted[buy ? Field.INPUT : Field.OUTPUT]
          }
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
                payload: { field: Field.INPUT, value: balance?.toExact() },
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
