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

describe("[Test] Get info", (accounts) => {
    before(async function () {
        [signer, mainWallet, alice] = await ethers.getSigners();
    });

    beforeEach(async function () {
        NFTContract = await TestUtils.deploySmartContract();
    });

    /**
     *
     */
    it("Get info", async function () {
        // configure the contract for this test
        let info = await NFTContract.getInfo();

        expect(info.length).to.equal(7);
        expect(info[0]).to.equal(true);
        expect(info[1]).to.equal(false);
        expect(info[2]).to.equal(false);
        expect(info[3].toNumber()).to.equal(4000);
        expect(info[4].toNumber()).to.equal(0);
        expect(info[5].toNumber()).to.equal(4000);
        expect(info[6].toNumber()).to.equal(10);

        // put Minting in WHITELIST mode
        await NFTContract.setMintAccessModeWhitelist(EvmBn.toBn("0.08"), 2, -1, true, false);
        await NFTContract.addToWhitelist([alice.address]);

        // buy 1 NFT
        await NFTContract.connect(alice).mint(2, {
            value: EvmBn.toBn("0.08").mul(2),
        });

        // configure the contract for this test
        info = await NFTContract.getInfo();

        expect(info.length).to.equal(7);
        expect(info[0]).to.equal(false);
        expect(info[1]).to.equal(true);
        expect(info[2]).to.equal(false);
        expect(info[3].toNumber()).to.equal(4000);
        expect(info[4].toNumber()).to.equal(2);
        expect(info[5].toNumber()).to.equal(3998);
        expect(info[6].toNumber()).to.equal(10);
    });
});
