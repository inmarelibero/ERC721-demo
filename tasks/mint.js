const EvmBn = require("evm-bn");

task("mint", "Mint 1 NFT")
  .addParam("contract", "Minting 1 NFT")
  .setAction(async (taskArgs) => {
    const contractAddr = taskArgs.contract;

    const accounts = await ethers.getSigners();
    const signer = accounts[0];
    const Contract = await ethers.getContractFactory("NFT");
    const contract = await new ethers.Contract(contractAddr, Contract.interface, signer);

    console.log("Minting 1 NFT");
    await contract.mint(1, {
        value: EvmBn.toBn("0.001"),
    });
    console.log("Done.");
    console.log("");
  });

module.exports = {};
