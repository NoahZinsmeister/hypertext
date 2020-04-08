import { useEffect } from 'react'
import { useRouter } from 'next/router'

export default function Redirect(): null {
  const { push } = useRouter()
  useEffect(() => {
    push('/buy')
  }, [push])
  return null
}
