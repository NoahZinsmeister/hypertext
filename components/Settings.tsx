import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  Text,
  Stack,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  useColorMode,
  Button,
  Link,
  useTheme,
  Switch,
} from '@chakra-ui/core'

import { COLOR, DEFAULT_DEADLINE, DEFAULT_SLIPPAGE } from '../constants'
import { useBodyKeyDown } from '../hooks'
import { useApproveMax, useDeadline, useSlippage } from '../context'

export default function Settings({ isOpen, onClose }) {
  const { colorMode, toggleColorMode } = useColorMode()
  const { fonts } = useTheme()

  useBodyKeyDown('d', toggleColorMode)

  const [approveMax, toggleApproveMax] = useApproveMax()
  const [deadline, setDeadline] = useDeadline()
  const [slippage, setSlippage] = useSlippage()

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered>
      <ModalOverlay />
      <ModalContent color={COLOR[colorMode]}>
        <ModalHeader>
          <Text>Settings</Text>
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Stack direction="column">
            <Stack direction="row" justify="space-between">
              <Text>Dark Mode</Text>
              <Switch isChecked={colorMode === 'dark'} onChange={toggleColorMode} />
            </Stack>
            <Stack direction="row" justify="space-between">
              <Text>Approve Max</Text>
              <Switch isChecked={approveMax} onChange={toggleApproveMax} />
            </Stack>
            <Stack direction="row" justify="space-between">
              <Text>Deadline</Text>
              <Stack direction="column" spacing={0} alignItems="flex-end" w="50%" flexShrink={0}>
                <Slider min={60} max={60 * 60} step={60} value={deadline} onChange={setDeadline}>
                  <SliderTrack />
                  <SliderFilledTrack />
                  <SliderThumb />
                </Slider>
                <Stack direction="row" minHeight="1.5rem">
                  {deadline !== DEFAULT_DEADLINE && (
                    <Button size="xs" onClick={() => setDeadline(DEFAULT_DEADLINE)}>
                      Reset
                    </Button>
                  )}
                  <Text>
                    {deadline / 60} {deadline === 60 ? 'minute' : 'minutes'}
                  </Text>
                </Stack>
              </Stack>
            </Stack>
            <Stack direction="row" justify="space-between">
              <Text>Front-Running Tolerance</Text>
              <Stack direction="column" spacing={0} alignItems="flex-end" w="50%" flexShrink={0}>
                <Slider min={0} max={100 * 4} step={10} value={slippage} onChange={setSlippage}>
                  <SliderTrack />
                  <SliderFilledTrack />
                  <SliderThumb />
                </Slider>
                <Stack direction="row" minHeight="1.5rem">
                  {slippage !== DEFAULT_SLIPPAGE && (
                    <Button size="xs" onClick={() => setSlippage(DEFAULT_SLIPPAGE)}>
                      Reset
                    </Button>
                  )}
                  <Text>{(slippage / 100).toFixed(slippage === 0 ? 0 : 1)}%</Text>
                </Stack>
              </Stack>
            </Stack>
          </Stack>
        </ModalBody>
        <ModalFooter justifyContent="center">
          <Link
            textAlign="center"
            href={`https://github.com/NoahZinsmeister/hypertext/tree/${process.env.COMMIT_SHA}`}
            target="_blank"
            rel="noopener noreferrer"
            color="blue.500"
            fontFamily={fonts.mono}
          >
            {process.env.COMMIT_SHA}
          </Link>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
