Demo ERC-721 project
===================

This is a proof of concept of an ERC-721 token developed with Solidity.

You can study it, deploy locally and on testnets. It's not yet production ready, but worth to be studied.

# Features

It has the basic ERC-721 features, plus:
- whitelisted minting
- pause/unpause minting
- automatic pause when reaching a given limit

# How to run tests

1. run `yarn install` to install js dependencies
1. run `npx hardhat test` to run the tests suite

# How to deploy

### 1) local network

1. run `npx hardhat run scripts/deploy.js` to install js dependencies

### 2) Ganache

1. run `Ganache`
1. run `npx hardhat run scripts/deploy.js --network ganache`

### 3) Rinkeby

1. edit the `.env` file populate the keys:
    - `RINKEBY_ALCHEMY_API=...`
    - `RINKEBY_DEPLOY_ACCOUNT=...` (your private key)
1. run `npx hardhat run scripts/deploy.js --network rinkeby`

