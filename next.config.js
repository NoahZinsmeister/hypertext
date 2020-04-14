module.exports = {
  reactStrictMode: true,
  assetPrefix: '.',
  env: {
    IPFS: process.env.IPFS === 'true' ? 'true' : 'false',
    COMMIT_SHA: process.env.NOW_GITHUB_COMMIT_SHA || process.env.GITHUB_SHA,
    INFURA_PROJECT_ID: process.env.INFURA_PROJECT_ID,
  },
}
