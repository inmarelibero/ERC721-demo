const { ethers } = require("hardhat");
const EvmBn = require("evm-bn");

module.exports.deploySmartContract = async function(maxSupply = 4000) {
    const [signer, mainWallet,] = await ethers.getSigners();

    /**
     * NFTContract
     */
    let NFTContract = await ethers.getContractFactory("NFT");
    NFTContract = await NFTContract.deploy(
        "NFT",
        "NFT",
        EvmBn.toBn("0.08"),
        maxSupply,
        mainWallet.address,
    );
    await NFTContract.deployed();
    await NFTContract.unpauseMinting();

    return NFTContract;
}