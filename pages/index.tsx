import { useEffect } from 'react'
import { useRouter } from 'next/router'

export default function Redirect() {
  const { push } = useRouter()
  useEffect(() => {
    push('/buy')
  }, [])
  return null
}
