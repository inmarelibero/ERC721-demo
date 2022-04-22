// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");
const fs = require('fs');
const os = require('os');
const path = require('path');

const EvmBn = require("evm-bn");

let deployer;
let mainWallet;

async function main() {
  [deployer, mainWallet] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());
  console.log("");

  const network = await ethers.provider.getNetwork();
  const chainId = network.chainId;
  console.log(`Using blockchain ${network.name} (Chain id: ${chainId})`);
  console.log("");

  /**
   * setup contract
   */
  let baseUri = null;
  let price = EvmBn.toBn("0.001");
  let mainWalletAddress = null;

  /**
   * local
   */
  if (chainId === 1 || chainId === 1337 || chainId === 31337) {
    baseUri = "http://localhost:3000/";
    mainWalletAddress = mainWallet.address;

  /**
   * rinkeby
   */
  } else if (chainId === 4) {
    baseUri = "http://localhost:3000/";
    mainWalletAddress = deployer.address;
  } else {
    throw new Error(`Unable to handle Chain ID = "${chainId}"`);
  }

  /**
   * deploy contract
   */
  const NFTContract = await publishContract(
    "NFT",
    ["Demo NFT", "OS-DEMO", price, 4200, mainWalletAddress],
    chainId
  );

  /**
   * local
   */
  if (chainId === 1 || chainId === 1337 || chainId === 31337) {
    await NFTContract.unpauseMinting();
  }

  /**
   * setup contract
   */
  await NFTContract.setBaseURI(baseUri);
}

/**
 *
 * @param contractName
 * @param constructorArguments
 * @param chainId
 * @return {Promise<*>}
 */
async function publishContract(contractName, constructorArguments, chainId) {
  // deploy the contract
  const contractFactory = await ethers.getContractFactory(contractName);
  const contract = await contractFactory.deploy(...constructorArguments);

  console.log(
    `  Contract "${contractName}" deployed at address: ${contract.address} on chain "${chainId}".`
  );
  console.log("");

  return contract;
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
