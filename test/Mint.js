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

describe("[Test] Minting", (accounts) => {
    before(async function () {
        [signer, mainWallet, alice] = await ethers.getSigners();
    });

    beforeEach(async function () {
        NFTContract = await TestUtils.deploySmartContract();
    });

    /**
     *
     */
    it("Buy 1 NFT", async function () {
        // initial situation
        const mainWalletBalance = await ethers.provider.getBalance(mainWallet.address);
        // const aliceBalance = await ethers.provider.getBalance(alice.address);

        // buy 1 NFT
        await NFTContract.connect(alice).mint(1, {
            value: EvmBn.toBn("0.08"),
        });

        // check
        const newMainWalletBalance = await ethers.provider.getBalance(mainWallet.address);
        expect(newMainWalletBalance.sub(mainWalletBalance).toString()).to.equal(
            EvmBn.toBn("0.08").toString()
        );
    });

    /**
     *
     */
    it("Buy 3 NFTs", async function () {
        // initial situation
        const mainWalletBalance = await ethers.provider.getBalance(mainWallet.address);

        // buy 3 NFTs
        await NFTContract.connect(alice).mint(3, {
            value: EvmBn.toBn("0.24"),
        });

        // check
        const newMainWalletBalance = await ethers.provider.getBalance(mainWallet.address);
        expect(newMainWalletBalance.sub(mainWalletBalance).toString()).to.equal(
            EvmBn.toBn("0.24").toString()
        );
    });

    /**
     *
     */
    it("Buy all the NFTs", async function () {
        // just for test purposes, lower the actual price per mint
        const price = EvmBn.toBn("0.0002");
        const maxSupply = 12;

        NFTContract = await TestUtils.deploySmartContract(maxSupply);
        await NFTContract.setPrice(price);

        // initial situation
        const mainWalletBalance = await ethers.provider.getBalance(mainWallet.address);

        // buy all the NFTs
        for (let i = 0; i < maxSupply; i++) {
            await NFTContract.connect(alice).mint(1, {
                value: price,
            });
        }

        // check alice's balance
        expect(
            (await NFTContract.balanceOf(alice.address)).toString()
        ).to.equal(maxSupply.toString());

        const newMainWalletBalance = await ethers.provider.getBalance(mainWallet.address);
        expect(newMainWalletBalance.sub(mainWalletBalance).toString()).to.equal(
            price.mul(maxSupply).toString()
        );

        /**
         * check token ID uniqueness
         */
        const tokensOfUser = (await NFTContract.tokensOfOwner(alice.address)).map(id => id.toNumber()).sort((a, b) => a - b);
        const tokensOfUserUnique = tokensOfUser.filter((v, i, a) => a.indexOf(v) === i);
        expect(tokensOfUser.length).to.equal(tokensOfUserUnique.length);

        /**
         * try to buy 1 more
         */
        await expectRevert(
            NFTContract.connect(alice).mint(1, {
                value: price,
            }),
            "There are currently no mintable NFTs."
        );
    });

    /**
     *
     */
    it("Buy all the NFTs with batches", async function () {
        // just for test purposes, lower the actual price per mint
        const price = EvmBn.toBn("0.001");
        const maxSupply = 120; // 100 by users, 20 by owner

        NFTContract = await TestUtils.deploySmartContract(maxSupply);
        await NFTContract.setPrice(price);

        // initial situation
        const signerWalletBalance = await ethers.provider.getBalance(signer.address);
        const mainWalletBalance = await ethers.provider.getBalance(mainWallet.address);
        const aliceWalletBalance = await ethers.provider.getBalance(alice.address);

        // mint with whitelist
        await NFTContract.setMintAccessModeWhitelist(price, -1, 25, true, false);
        await NFTContract.addToWhitelist([alice.address]);

        expect(await NFTContract.pauseAfterMintingTokenCount()).to.equal(25);

        // buy all the NFTs of the batch
        for (let i = 0; i < 25; i++) {
            await NFTContract.connect(alice).mint(1, {
                value: price,
            });
        }
        expect((await NFTContract.countMinted()).toNumber()).to.equal(25);

        // check minting status
        expect(await NFTContract.isMintingPaused()).to.equal(true);

        // mint some by owner
        await NFTContract.connect(signer).mintByOwner(5, signer.address);
        expect((await NFTContract.countMinted()).toNumber()).to.equal(30);

        // check minting status
        expect(await NFTContract.isMintingPaused()).to.equal(true);

        // mint with default access mode
        await NFTContract.setMintAccessModeDefault(
            price,
            -1,
            (await NFTContract.countMinted()).toNumber() + 25,
            true
        );
        expect(await NFTContract.pauseAfterMintingTokenCount()).to.equal(55);

        // buy all the NFTs of the batch
        for (let i = 0; i < 25; i++) {
            await NFTContract.connect(alice).mint(1, {
                value: price,
            });
        }

        expect((await NFTContract.countMinted()).toNumber()).to.equal(55);

        // check minting status
        expect(await NFTContract.isMintingPaused()).to.equal(true);

        // mint some by owner
        await NFTContract.connect(signer).mintByOwner(3, signer.address);
        expect((await NFTContract.countMinted()).toNumber()).to.equal(58);

        // check minting status
        expect(await NFTContract.isMintingPaused()).to.equal(true);

        // mint with default access mode
        await NFTContract.setMintAccessModeDefault(
            price,
            -1,
            (await NFTContract.countMinted()).toNumber() + 25,
            true
        );
        expect(await NFTContract.pauseAfterMintingTokenCount()).to.equal(83);

        // buy all the NFTs of the batch
        for (let i = 0; i < 25; i++) {
            await NFTContract.connect(alice).mint(1, {
                value: price,
            });
        }

        expect((await NFTContract.countMinted()).toNumber()).to.equal(83);

        // check minting status
        expect(await NFTContract.isMintingPaused()).to.equal(true);

        // mint some by owner
        await NFTContract.connect(signer).mintByOwner(11, signer.address);

        // check minting status
        expect(await NFTContract.isMintingPaused()).to.equal(true);

        // mint with default access mode
        await NFTContract.setMintAccessModeDefault(
            price,
            -1,
            (await NFTContract.countMinted()).toNumber() + 25,
            true
        );
        expect(await NFTContract.pauseAfterMintingTokenCount()).to.equal(119);

        // buy all the NFTs of the batch
        for (let i = 0; i < 25; i++) {
            await NFTContract.connect(alice).mint(1, {
                value: price,
            });
        }

        expect((await NFTContract.countMinted()).toNumber()).to.equal(119);

        // check minting status
        expect(await NFTContract.isMintingPaused()).to.equal(true);

        // mint some by owner
        await NFTContract.connect(signer).mintByOwner(1, signer.address);

        // check minting status
        expect(await NFTContract.isMintingPaused()).to.equal(true);

        /**
         * check token ID uniqueness
         */
        const owners = [signer.address, alice.address];
        for (let i = 0; i < maxSupply; i++) {
            expect(owners).to.contain(
                await NFTContract.ownerOf(i)
            );
        }

        /**
         * try to buy 1 more
         */
        await expectRevert(
            NFTContract.connect(alice).mint(1, {
                value: price,
            }),
            "There are currently no mintable NFTs."
        );
    });

    /**
     *
     */
    it("Buy 0 NFTs", async function () {
        await expectRevert(
            NFTContract.connect(alice).mint(0, {
                value: EvmBn.toBn("0.0002"),
            }),
            "Cannot mint 0 NFTs"
        );
    });

    /**
     *
     */
    it("Buy more NFTs than allowed", async function () {
        await expectRevert(
            NFTContract.connect(alice).mint(11, {
                value: EvmBn.toBn("0.0002"),
            }),
            "Cannot mint more than allowed at once."
        );
    });

    /**
     *
     */
    it("(WHITELIST) Buy NFTs", async function () {
        // put Minting in WHITELIST mode
        await NFTContract.setMintAccessModeWhitelist(
            EvmBn.toBn("0.0002"),
            2,
            2,
            true,
            false
        );

        // try to buy without being whitelisted
        await expectRevert(
            NFTContract.connect(alice).mint(1, {
                value: EvmBn.toBn("0.0002"),
            }),
            "You are not whitelisted."
        );

        // add to whitelist
        await NFTContract.addToWhitelist([alice.address]);

        // buy 1 NFT after being whitelisted
        await NFTContract.connect(alice).mint(1, {
            value: EvmBn.toBn("0.0002"),
        });

        // buy 1 NFT
        await NFTContract.connect(alice).mint(1, {
            value: EvmBn.toBn("0.0002"),
        });

        // next mint reverts because there's a limit on the overall mintable tokens in Whitelist mode
        await expectRevert(
            NFTContract.connect(alice).mint(1, {
                value: EvmBn.toBn("0.0002"),
            }),
            "There are currently no mintable NFTs."
        );
    });

    /**
     *
     */
    it("(WHITELIST) Buy too many NFTs", async function () {
        // put Minting in WHITELIST mode
        await NFTContract.setMintAccessModeWhitelist(
            EvmBn.toBn("0.08"),
            2,
            5,
            true,
            false
        );
        await NFTContract.setMaxMintablePerUser(10);

        // add to whitelist
        await NFTContract.addToWhitelist([alice.address]);

        //
        await NFTContract.connect(alice).mint(5, {
            value: EvmBn.toBn("0.08").mul(5),
        });

        // next mint reverts because there's a limit on the number of mintable NFT during the whitelist
        await expectRevert(
            NFTContract.connect(alice).mint(1, {
                value: EvmBn.toBn("0.08"),
            }),
            "There are currently no mintable NFTs."
        );
    });

    /**
     *
     */
    it("(WHITELIST) Close and open whitelists", async function () {
        // configure the contract for this test
        NFTContract = await TestUtils.deploySmartContract(4);

        // buy 1 NFT
        await NFTContract.connect(alice).mint(1, {
            value: EvmBn.toBn("0.08"),
        });

        // put Minting in WHITELIST mode
        await NFTContract.setMintAccessModeWhitelist(EvmBn.toBn("0.08"), 2, 2, true, false);

        // try to buy without being whitelisted
        await expectRevert(
            NFTContract.connect(alice).mint(1, {
                value: EvmBn.toBn("0.0002"),
            }),
            "You are not whitelisted."
        );

        // add to whitelist
        expect((await NFTContract.isInWhitelist(alice.address))).to.equal(false);
        await NFTContract.addToWhitelist([alice.address]);
        expect((await NFTContract.isInWhitelist(alice.address))).to.equal(true);

        // buy 1 NFT
        await NFTContract.connect(alice).mint(1, {
            value: EvmBn.toBn("0.08"),
        });

        await expectRevert(
            NFTContract.connect(alice).mint(1, {
                value: EvmBn.toBn("0.08"),
            }),
            "There are currently no mintable NFTs."
        );

        // put Minting in DEFAULT mode
        await NFTContract.setMintAccessModeDefault(EvmBn.toBn("0.08"), -1, -1, true);

        // buy 1 NFT
        await NFTContract.connect(alice).mint(1, {
            value: EvmBn.toBn("0.08"),
        });

        //
        await NFTContract.startNewWhitelist();

        // check
        expect((await NFTContract.isInWhitelist(alice.address))).to.equal(false);

        // put Minting in WHITELIST mode
        await NFTContract.setMintAccessModeWhitelist(EvmBn.toBn("0.08"), 2, 1, true, false);

        // try to buy without being whitelisted
        await expectRevert(
            NFTContract.connect(alice).mint(1, {
                value: EvmBn.toBn("0.0002"),
            }),
            "You are not whitelisted."
        );

        // add to whitelist
        expect((await NFTContract.isInWhitelist(alice.address))).to.equal(false);
        await NFTContract.addToWhitelist([alice.address]);
        expect((await NFTContract.isInWhitelist(alice.address))).to.equal(true);

        // buy 1 NFT
        await NFTContract.connect(alice).mint(1, {
            value: EvmBn.toBn("0.08"),
        });


        // try to buy more than supply
        await expectRevert(
            NFTContract.connect(alice).mint(1, {
                value: EvmBn.toBn("0.08"),
            }),
            "There are currently no mintable NFTs."
        );

        // put Minting in DEFAULT mode
        await NFTContract.setMintAccessModeDefault(EvmBn.toBn("0.08"), -1, -1, false);

        // try to buy more than supply
        await expectRevert(
            NFTContract.connect(alice).mint(1, {
                value: EvmBn.toBn("0.08"),
            }),
            "There are currently no mintable NFTs."
        );
    });

    /**
     *
     */
    it("Test getCountMintablePerUser()", async function () {
        const price = EvmBn.toBn("0.08");

        expect((await NFTContract.getCountMintablePerUser(alice.address))).to.equal(-1);

        // buy 1 NFT
        await NFTContract.connect(alice).mint(1, {
            value: price,
        });

        // mint with whitelist
        await NFTContract.setMintAccessModeWhitelist(price, 5, 10, true, true);
        await NFTContract.addToWhitelist([alice.address]);

        expect((await NFTContract.getCountMintablePerUser(alice.address))).to.equal(5);

        // buy 5 NFTs
        await NFTContract.connect(alice).mint(5, {
            value: price.mul(5),
        });

        // mint with default mode
        await NFTContract.setMintAccessModeDefault(price, 10, -1, true);

        expect((await NFTContract.getCountMintablePerUser(alice.address))).to.equal(4);

        // buy NFTs
        await NFTContract.connect(alice).mint(1, {
            value: price,
        });

        // mint with whitelist
        await NFTContract.setMintAccessModeWhitelist(price, 1, 20, true, true);
        await NFTContract.addToWhitelist([alice.address]);

        expect((await NFTContract.getCountMintablePerUser(alice.address))).to.equal(1);

        // buy NFTs
        await NFTContract.connect(alice).mint(1, {
            value: price,
        });

        // try to buy more than supply
        await expectRevert(
            NFTContract.connect(alice).mint(1, {
                value: price,
            }),
            "You cannot mint more NFT currently."
        );

        // mint with default mode
        await NFTContract.setMintAccessModeDefault(price, 12, -1, true);

        expect((await NFTContract.getCountMintablePerUser(alice.address))).to.equal(4);

        // buy NFTs
        await NFTContract.connect(alice).mint(4, {
            value: price.mul(4),
        });

        // try to buy more than supply
        await expectRevert(
            NFTContract.connect(alice).mint(1, {
                value: price,
            }),
            "You cannot mint more NFT currently."
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
