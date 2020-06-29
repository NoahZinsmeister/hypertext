import { resolve } from 'url'
import Head from 'next/head'

import { isIPFS, isServerSide } from '../constants'

export default function Base(): JSX.Element {
  // during SSR/SSG, don't specify a base tag
  if (isServerSide) {
    return null
  }

  // on the client, specify a "default" base tag, e.g. https://hypertext.finance/
  let href: string = resolve(window.location.origin, '/')

  // on the client, if this was an IPFS build, and if it seems like we're being served from a gateway of the form
  // e.g. https://ipfs.io/ipns/hypertext.finance/, specify a base tag of the gateway root for this page
  if (isIPFS && ['ipfs', 'ipns'].some((identifier) => identifier === window.location.pathname.split('/')[1])) {
    href = resolve(
      window.location.origin, // https://ipfs.io"
      window.location.pathname // /ipns/hypertext.finance/
        .split('/')
        .slice(0, 3)
        .join('/') + '/'
    )
  }

  return (
    <Head>
      <base key="base" href={href} />
    </Head>
  )
}
