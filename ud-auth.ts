import UAuth from '@uauth/js'

export const uauth = new UAuth({
  clientID: process.env.UAUTH_CLIENTID!,
  clientSecret: process.env.UAUTH_CLIENTSECRET!,
  redirectUri: process.env.UAUTH_REDIRECT_URI!,
})