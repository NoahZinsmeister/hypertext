import { useEffect } from 'react'
import { useRouter } from 'next/router'

import { modifyUrlObjectForIPFS } from '../utils'

export default function Redirect(): null {
  const { replace } = useRouter()

  const { href: url, as } = modifyUrlObjectForIPFS('/buy')

  useEffect(() => {
    replace(url, as)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return null
}
