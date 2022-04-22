const EvmBn = require("evm-bn");
const Confirm = require('prompt-confirm');

task("set-mint-mode-access-whitelist", "Start minting mode: WHITELIST")
  .addParam("contract", "The contract address")
  .addParam("price", "The price for a single NFT (in ETH, eg '0.15')")
  .addParam("maxMintablePerUser", "How many NFT every user can mint overall, during WHITELIST mode")
  .addParam("unpauseMinting", "If true, it will unpause the minting")
  .addParam("startNewWhitelist", "If true, it will start a new Whitelist")
  .setAction(async (taskArgs) => {
    const contractAddr = taskArgs.contract;
    const price = EvmBn.toBn(taskArgs.price);
    const maxMintablePerUser = taskArgs.maxMintablePerUser;
    const unpauseMinting = taskArgs.unpauseMinting.toLowerCase() === 'true';
    const startNewWhitelist = taskArgs.unpauseMinting.toLowerCase() === 'true';

    const accounts = await ethers.getSigners();
    const signer = accounts[0];
    const Contract = await ethers.getContractFactory("NFT");
    const contract = await new ethers.Contract(contractAddr, Contract.interface, signer);

    console.log("Starting minting mode: WHITELIST");
    console.log("");
    console.log("The following configuration will be applied:");
    console.log(`  price: ${price.toString()} (${taskArgs.price} ETH)`);
    console.log(`  maxMintablePerUser: ${maxMintablePerUser}`);
    console.log(`  unpauseMinting: ${unpauseMinting === true ? 'true' : 'false'}`);
    console.log(`  startNewWhitelist: ${startNewWhitelist === true ? 'true' : 'false'}`);
    console.log("");

    await new Confirm('Do you want to proceed?')
      .run()
      .then(async function (answer) {
          if (answer === true) {
            await contract.setMintAccessModeWhitelist(price, maxMintablePerUser, unpauseMinting, startNewWhitelist);
            console.log("Done.");
          } else {
              console.log('Operation cancelled by user.')
          }
      });

    console.log("");

    console.log(`Minting mode is DEFAULT: ${await contract.isMintAccessModeDefault() === true ? 'true' : 'false'}`);
    console.log(`Minting mode is WHITELIST: ${await contract.isMintAccessModeWhitelist() === true ? 'true' : 'false'}`);
  });

module.exports = {};
