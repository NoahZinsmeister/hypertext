import Document, { Html, Head, Main, NextScript } from 'next/document'

class MyDocument extends Document {
  render(): JSX.Element {
    return (
      <Html lang="en">
        <Head>
          <meta key="description" name="Description" content="A text-forward Uniswap interface." />
        </Head>

        <body>
          <Main />
          <NextScript />
          <script
            defer
            src="https://static.cloudflareinsights.com/beacon.min.js"
            data-cf-beacon='{"token": "49191f37be44461dbce1d932a3d6ffeb"}'
          ></script>
        </body>
      </Html>
    )
  }
}

export default MyDocument
