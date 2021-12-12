module.exports = {
  reactStrictMode: true,
  assetPrefix: '.',
  env: {
    IPFS: process.env.IPFS === 'true' ? 'true' : 'false',
    COMMIT_SHA: process.env.VERCEL_GITHUB_COMMIT_SHA || process.env.GITHUB_SHA || 'master',
    INFURA_PROJECT_ID: '26d609e06df646d886d55d2b25523e9d',
    UAUTH_CLIENTID: process.env.UAUTH_CLIENTID,
    UAUTH_CLIENTSECRET: process.env.UAUTH_CLIENTSECRET,
    UAUTH_REDIRECT_URI: process.env.UAUTH_REDIRECT_URI,
    UAUTH_POSTREDIRECT_URI: process.env.UAUTH_POSTREDIRECT_URI,
  },
}
