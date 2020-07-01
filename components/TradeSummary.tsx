import { useState } from 'react'
import {
  Stack,
  Stat,
  useColorMode,
  StatLabel,
  StatNumber,
  StatHelpText,
  IconButton,
  Icon,
  StatArrow,
} from '@chakra-ui/core'
import { Route, Trade } from '@uniswap/sdk'

import { getTokenDisplayValue, getPercentChange } from '../utils'
import { useWindowSize, useUSDTokenPrice } from '../hooks'
import { useShowUSD } from '../context'

function InvisibleWidthMaintainer({ children }: { children: string }): JSX.Element {
  return <span style={{ display: 'block', maxHeight: 0, visibility: 'hidden' }}>{children}</span>
}

export default function TradeSummary({
  route,
  trade,
  warning,
  danger,
}: {
  route?: Route
  trade?: Trade
  warning: boolean
  danger: boolean
}): JSX.Element {
  const { colorMode } = useColorMode()

  const size = useWindowSize()
  const isVertical = size?.height > size?.width

  const [invert, setInvert] = useState(false)

  const path = !!!route ? [] : (invert ? route.path : route.path.slice().reverse()).map(getTokenDisplayValue)

  const [showUSD] = useShowUSD()
  const USDTokenPrice = useUSDTokenPrice(invert ? route?.input : route?.output)

  // mid price
  const formattedMidPrice = (invert ? route?.midPrice?.invert() : route?.midPrice)?.toSignificant(4, {
    groupSeparator: ',',
  })
  const hiddenMidPrice = (invert ? route?.midPrice : route?.midPrice?.invert())?.toSignificant(4, {
    groupSeparator: ',',
  })
  const USDMidPrice =
    USDTokenPrice &&
    (invert ? route?.midPrice?.invert() : route?.midPrice)?.adjusted?.multiply(USDTokenPrice)?.toFixed(2, {
      groupSeparator: ',',
    })

  // fill price
  const formattedFillPrice = (invert ? trade?.executionPrice?.invert() : trade?.executionPrice)?.toSignificant(4, {
    groupSeparator: ',',
  })
  const hiddenFillPrice = (invert ? trade?.executionPrice : trade?.executionPrice?.invert())?.toSignificant(4, {
    groupSeparator: ',',
  })
  const USDFillPrice =
    USDTokenPrice &&
    (invert ? trade?.executionPrice?.invert() : trade?.executionPrice)?.adjusted?.multiply(USDTokenPrice)?.toFixed(2, {
      groupSeparator: ',',
    })

  // next mid price
  const formattedNextMidPrice = (invert ? trade?.nextMidPrice?.invert() : trade?.nextMidPrice)?.toSignificant(4, {
    groupSeparator: ',',
  })
  const hiddenNextMidPrice = (invert ? trade?.nextMidPrice : trade?.nextMidPrice?.invert())?.toSignificant(4, {
    groupSeparator: ',',
  })
  const USDNextMidPrice =
    USDTokenPrice &&
    (invert ? trade?.nextMidPrice?.invert() : trade?.nextMidPrice)?.adjusted?.multiply(USDTokenPrice)?.toFixed(2, {
      groupSeparator: ',',
    })

  return (
    <Stack
      direction={isVertical ? 'column' : 'row'}
      align={isVertical ? 'center' : 'flex-start'}
      spacing={0}
      visibility={!!route ? 'visible' : 'hidden'}
    >
      <Stat
        p="1rem"
        backgroundColor={colorMode === 'light' ? 'gray.100' : 'rgba(255,255,255,0.04)'}
        borderRadius="0.25rem"
      >
        <IconButton
          transition="none"
          position="absolute"
          top={0}
          right={0}
          icon="view"
          variant="ghost"
          size="sm"
          aria-label="Invert"
          onClick={(): void => {
            setInvert((invert) => !invert)
          }}
        />

        <StatLabel w="max-content" pr="2rem">
          Mid Price
        </StatLabel>

        <StatNumber w="max-content">
          {!!!route ? (
            '0.0'
          ) : (
            <>
              <InvisibleWidthMaintainer>{hiddenMidPrice}</InvisibleWidthMaintainer>
              {showUSD && USDMidPrice ? `$${USDMidPrice}` : formattedMidPrice}
            </>
          )}
        </StatNumber>
        <StatHelpText w="max-content" m={0} height="initial">
          {showUSD && USDMidPrice ? (
            ` / 1 ${path.slice(-1)}`
          ) : (
            <>
              {path.length === 0 ? '‎' : path.slice(0, route.path.length - 1).join(' / ')}
              {path.length === 0 ? '‎' : ` / 1 ${path.slice(-1)}`}
            </>
          )}
        </StatHelpText>
      </Stat>

      {!!trade && (
        <>
          <Icon
            name={isVertical ? 'chevron-down' : 'chevron-right'}
            size="3rem"
            m={isVertical ? '1rem auto' : 'auto 1rem'}
          />

          <Stat
            p="1rem"
            backgroundColor={colorMode === 'light' ? 'gray.100' : 'rgba(255,255,255,0.04)'}
            borderRadius="0.25rem"
          >
            <StatLabel w="max-content">Fill Price</StatLabel>
            <StatNumber w="max-content">
              <InvisibleWidthMaintainer>{hiddenFillPrice}</InvisibleWidthMaintainer>
              {showUSD && USDNextMidPrice ? `$${USDNextMidPrice}` : formattedFillPrice}
            </StatNumber>
            <StatHelpText
              w="max-content"
              m={0}
              opacity={1}
              color={warning ? (colorMode === 'light' ? 'yellow.500' : 'yellow.200') : undefined}
              fontWeight={warning ? 600 : undefined}
            >
              {warning && (
                <StatArrow
                  {...{
                    name: !danger ? 'warning-2' : 'not-allowed',
                    color: colorMode === 'light' ? 'yellow.500' : 'yellow.200',
                  }}
                />
              )}
              {trade.slippage.toSignificant(3, { groupSeparator: ',' })}% price impact
            </StatHelpText>
          </Stat>

          <Icon
            name={isVertical ? 'chevron-down' : 'chevron-right'}
            size="3rem"
            m={isVertical ? '1rem auto' : 'auto 1rem'}
          />

          <Stat
            p="1rem"
            backgroundColor={colorMode === 'light' ? 'gray.100' : 'rgba(255,255,255,0.04)'}
            borderRadius="0.25rem"
          >
            <StatLabel w="max-content">Mid Price</StatLabel>
            <StatNumber w="max-content">
              <InvisibleWidthMaintainer>{hiddenNextMidPrice}</InvisibleWidthMaintainer>
              {showUSD && USDFillPrice ? `$${USDFillPrice}` : formattedNextMidPrice}
            </StatNumber>
            <StatHelpText w="max-content" m={0}>
              <StatArrow type={invert ? 'increase' : 'decrease'} />
              {getPercentChange(
                invert ? trade.route.midPrice.invert() : trade.route.midPrice,
                invert ? trade.nextMidPrice.invert() : trade.nextMidPrice,
                invert
              ).toSignificant(3, { groupSeparator: ',' })}
              %
            </StatHelpText>
          </Stat>
        </>
      )}
    </Stack>
  )
}
