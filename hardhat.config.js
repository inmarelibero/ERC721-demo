require("dotenv").config();

require("@nomiclabs/hardhat-etherscan");
require("@nomiclabs/hardhat-waffle");
require("hardhat-gas-reporter");
require("solidity-coverage");

require("./tasks/add-to-whitelist");
require("./tasks/mint");
require("./tasks/set-mint-mode-access-default");
require("./tasks/set-mint-mode-access-whitelist");
require("./tasks/set-minting-paused");
require("./tasks/set-minting-unpaused");

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  networks: {
    hardhat: {
      throwOnTransactionFailures: true,
      throwOnCallFailures: true,
      allowUnlimitedContractSize: true,
      // gasLimit: 6000000000,
      // blockGasLimit: 0xffffffffffffff,
      // accounts: accounts()
    },
    ganache: {
      url: "http://127.0.0.1:7545/",
      // saveDeployments: true,
      allowUnlimitedContractSize: true,
      chainId: 1337,
      // gasLimit: 6000000000,
      // defaultBalanceEther: 10,
      // accounts: [`0x...`]
    },
    rinkeby: {
      url: "https://eth-rinkeby.alchemyapi.io/v2/" + process.env.RINKEBY_ALCHEMY_API,
      accounts: [process.env.RINKEBY_DEPLOY_ACCOUNT],
      gas: 2100000,
    },
  },
  gasReporter: {
    // enabled: process.env.REPORT_GAS !== undefined,
    coinmarketcap: process.env.COINMARKETCAP_API_KEY,
    currency: "USD",
  },
  // etherscan: {
  //   apiKey: process.env.ETHERSCAN_API_KEY,
  // },
  solidity: {
    compilers: [
      {
        version: "0.8.11",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          },
        },
      },
    ],
  },
};
