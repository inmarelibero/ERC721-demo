task("set-minting-paused", "Set the minting paused")
  .addParam("contract", "The contract address")
  .setAction(async (taskArgs) => {
    const contractAddr = taskArgs.contract;

    const accounts = await ethers.getSigners();
    const signer = accounts[0];
    const Contract = await ethers.getContractFactory("NFT");
    const contract = await new ethers.Contract(contractAddr, Contract.interface, signer);

    console.log("Pausing minting");
    await contract.pauseMinting();
    console.log("Done.");
    console.log("");
  });

module.exports = {};
