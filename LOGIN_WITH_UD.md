# Login With Unstoppable Domains implem

- [Login With Unstoppable Domains implem](#login-with-unstoppable-domains-implem)
  - [Note to project maintainers](#note-to-project-maintainers)
  - [Abstract](#abstract)
  - [Hackaton informations](#hackaton-informations)
  - [Quickstart](#quickstart)
  - [Additional](#additional)
  - [References & resources](#references--resources)
  - [Instructions for project maintainers](#instructions-for-project-maintainers)

## Note to project maintainers

> Instructions for backend integration can be found [Instructions for project maintainers](#intructions-for-project-maintainers)

## Abstract

> This PR is the entry for [Gitcoin bounty, Hackaton #12](https://gitcoin.co/issue/unstoppabledomains/gitcoin-bounties/1/100027208)

> The implementation has been been done on [Hypertext](https://github.com/NoahZinsmeister/hypertext).  
> [hypertext.finance](https://hypertext.finance/buy) is an app to estimate the viable quantity of tokens to buy for another token.

> I'm not the original author of this project. I opened a PR on the repo so they can merge and publish it.

## Hackaton informations

| Project name | Formerly `Posther`, changed for `Hypertext` (`HypertextLWU` on ud).        |
| ------------ | -------------------------------------------------------------------------- |
| Video        | https://www.youtube.com/watch?v=xoYQrQWGwjc                                |
| App url      | https://hypertext-lwu.netlify.app                                          |
| PR Opened    | https://github.com/NoahZinsmeister/hypertext/pull/11                       |
| Source Code  | https://github.com/somq/hypertext/tree/feat/login-with-unstoppable-domains |
| Discord id   | `soma#6972`                                                                |
| email        | `mail.clement@gmail.com`                                                   |

Tested with both `WalletConnect` & `Metamask` provider

## Quickstart

1. Clone the repo

```sh
git clone https://github.com/somq/hypertext.git
git checkout -n feat/login-wuth-unstoppable-domains
```

2. Edit env variables, especially the one related to the UD auth server

```sh
mv .env.example .env
vi .env
```

3. Bootstrap the app

```sh
yarn
yarn dev
```

## Additional

## References & resources

- https://docs.unstoppabledomains.com/login-with-unstoppable/login-integration-guides
- https://docs.unstoppabledomains.com/login-with-unstoppable/login-integration-guides/web3-react-guide
- https://docs.unstoppabledomains.com/login-with-unstoppable/login-integration-guides/login-with-popup
- https://docs.unstoppabledomains.com/login-with-unstoppable/high-level-overview
- https://unstoppabledomains.com/developers
- https://github.com/unstoppabledomains/uauth
- https://docs.unstoppabledomains.com/login-with-unstoppable/high-level-overview
- https://openid.net/connect/

## Instructions for project maintainers

1. Create an app on [Unstoppable Domains](https://unstoppabledomains.com/app-dashboard)
2. Set url (callback slug is `/callback`)
3. Generate credentials (`clientId` & `clientSecret`)
4. Set env variables in CI (or .env for local dev) according to this [example env file](.env.example)
5. 🚀 Deploy

> Note: This readme can be safely delete when integration is done.
