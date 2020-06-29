# `hypertext`

A text-forward [Uniswap](https://uniswap.org) interface.

## IPFS/IPNS/DNSLink/ENS

In addition to being served from [hypertext.finance](https://hypertext.finance), the website is also available via [IPNS](https://docs.ipfs.io/concepts/ipns/). Every push to master uploads the latest build to [IPFS](https://ipfs.io/) and references it with [DNSLink](https://docs.ipfs.io/concepts/dnslink/). This means that e.g. [ipfs.io/ipns/hypertext.finance/](https://ipfs.io/ipns/hypertext.finance/) will always serve up-to-date content.

In addition, the ENS name [hypertext.eth](https://app.ens.domains/name/hypertext.eth) has a [contenthash](https://eips.ethereum.org/EIPS/eip-1577) of `/ipns/hypertext.finance`, meaning that the site can be accessed via e.g. [eth.link](https://eth.link) at [hypertext.eth.link](https://hypertext.eth.link).

## URL Parameters

### `chain`

- Mainnet: `1` or `mainnet`
- Ropsten: `3` or `ropsten`
- Rinkeby: `4` or `rinkeby`
- Görli: `5` or `görli` or `goerli`
- Kovan: `42` or `mainnet`

Example: `?chain=mainnet`

### `input`

Example: `?input={address}`

### `output`

Example: `?output={address}`
