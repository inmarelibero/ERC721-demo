task("add-to-whitelist", "Add address to whitelist")
  .addParam("contract", "The contract address")
  .addParam("address", "The address to add to the whitelist")
  .setAction(async (taskArgs) => {
    const contractAddr = taskArgs.contract;
    const addressToAddToWhitelist = taskArgs.address;

    const accounts = await ethers.getSigners();
    const signer = accounts[0];
    const Contract = await ethers.getContractFactory("NFT");
    const contract = await new ethers.Contract(contractAddr, Contract.interface, signer);

    console.log("Adding to whitelist");
    await contract.addToWhitelist([addressToAddToWhitelist]);
    console.log("Done.");
    console.log("");
  });

module.exports = {};
