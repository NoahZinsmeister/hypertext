import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  useColorMode,
  Stack,
  Switch
} from '@chakra-ui/core'

import { COLOR } from '../constants'
import { useBodyKeyDown } from '../hooks'
import Text from './Text'

export default function Settings({ isOpen, onClose }) {
  const { colorMode, toggleColorMode } = useColorMode()

  useBodyKeyDown('d', toggleColorMode)

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered>
      <ModalOverlay />
      <ModalContent color={COLOR[colorMode]}>
        <ModalHeader>
          <Text>Settings</Text>
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Stack>
            <Stack direction="row" justify="space-between">
              <Text>Dark Mode</Text>
              <Switch isChecked={colorMode === 'dark'} onChange={toggleColorMode} />
            </Stack>
          </Stack>
        </ModalBody>
        <ModalFooter />
      </ModalContent>
    </Modal>
  )
}
