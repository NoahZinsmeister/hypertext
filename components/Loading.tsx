import { Flex, Spinner } from '@chakra-ui/core'
import { useState, useEffect } from 'react'

export default function Loading(): JSX.Element {
  const [show, setShow] = useState(false)
  useEffect(() => {
    let stale = false

    function showSpinner() {
      if (!stale) {
        setShow(true)
      }
    }

    const timeout = setTimeout(showSpinner, 500)

    return () => {
      stale = true
      clearTimeout(timeout)
    }
  }, [])

  return (
    <Flex flexGrow={1} alignItems="center" justifyContent="center">
      {show && <Spinner size="xl" />}
    </Flex>
  )
}
