const { ethers } = require("hardhat");

const { expectEvent, expectRevert } = require("@openzeppelin/test-helpers");
const { assert, expect } = require("chai");

const chai = require("chai");
const { solidity } = require("ethereum-waffle");
chai.use(solidity);

const EvmBn = require("evm-bn");
const TestUtils = require("./utils/TestUtils");


let NFTContract;
let signer;
let mainWallet;  // main wallet, the one who receives the payments
let alice;   // test buyer wallet

describe("[Test] Mint by owner", (accounts) => {
    before(async function () {
        [signer, mainWallet, alice] = await ethers.getSigners();
    });

    beforeEach(async function () {
        NFTContract = await TestUtils.deploySmartContract();
    });

    /**
     *
     */
    it("Mint by owner", async function () {
        // configure the contract for this test
        NFTContract = await TestUtils.deploySmartContract(10);

        // try to call mintByOwner() by a not-owner
        await expectRevert(
            NFTContract.connect(alice).mintByOwner(1, signer.address),
            "Ownable: caller is not the owner"
        );

        // call mintByOwner() by the owner
        await NFTContract.connect(signer).mintByOwner(1, signer.address)
        expect(
            (await NFTContract.balanceOf(signer.address)).toNumber()
        ).to.equal(1);

        // start whitelist
        await NFTContract.setMintAccessModeWhitelist(EvmBn.toBn("0.08"), 2, 2, true, false);

        // buy 1 NFT by whitelisted user
        await NFTContract.addToWhitelist([alice.address]);
        await NFTContract.connect(alice).mint(1, {
            value: EvmBn.toBn("0.08"),
        });

        // mint many NFTs by owner
        await NFTContract.connect(signer).mintByOwner(8, signer.address)
        expect(
            (await NFTContract.balanceOf(signer.address)).toNumber()
        ).to.equal(9);

        await expectRevert(
            NFTContract.connect(signer).mintByOwner(1, signer.address),
            "Max supply reached."
        );
    });
});

async function advanceMinutes(minutes) {
    await advanceSeconds(60 * minutes);
}

async function advanceSeconds(seconds) {
    await ethers.provider.send("evm_increaseTime", [seconds]);
    await mintBlocks(1);
}

async function mintBlocks(blocks) {
    for (let i = 0; i < blocks; i++) {
        await ethers.provider.send("evm_mine");
    }
}
