import { resolve } from 'url'
import Head from 'next/head'

export default function Base(): JSX.Element {
  return (
    <Head>
      <base
        key="base"
        href={
          process.env.IPFS === 'true'
            ? resolve(
                window.location.origin, // e.g. https://ipfs.io"
                window.location.pathname.split('/').slice(0, 3).join('/') + '/' // e.g. /ipfs/.../
              )
            : document.baseURI
        }
      />
    </Head>
  )
}
