// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "./WhitelistManager.sol";

import "hardhat/console.sol";

/**
 * todo: emit events
 * todo: add function to remove a single an address from whitelist
 * todo: add function to remove a list of addresses from whitelist
 */
contract NFT is Ownable, ERC721Enumerable, WhitelistManager {
    using Address for address;
    using SafeMath for uint256;
    using Strings for string;

    uint256 constant MAX_INT = 2**256 - 1;

    //
    uint256 public maxSupply;
    uint256 price;  // price for minting a single NFT
    uint256 public maxCountPerMint = 10;   // how many NFT a user can mint at once

    /*
     * Pause the minting when reaching a given number of minted tokens (eg. if 100: 100 tokens are minted, and then minting is paused)
     * Notes:
     *  - if >= 0, it pauses the minting as soon as countMinted reaches the limit
     *  - if < 0 (in particular -1 is used to indicate there's no limit), pausing will never be applied
     */
    int256 public pauseAfterMintingTokenCount = -1;

    //
    bool mintingPaused;
    uint256 public countMinted = 0; // number of tokens minted so far, by anyone

    /*
     * How many NFT a user can mint overall (useful during whitelist)
     * Notes:
     *  - if >= 0, limit is applied
     *  - if < 0 (in particular -1 is used to indicate there's no limit), there's no limit on how many NFTs a user can mint (overall, not ina single mint)
     *  - if mintAccessMode is Whitelist, it considers minted NFTs during that whitelist
     */
    int256 private maxMintablePerUser = -1;

    mapping(uint256 => bool) private mintedTokenIds;    // Used for random token ID assignment

    //
    address payable public mainWallet;  // the wallet receiving the NFT payment

    // minting access mode (DEFAULT = free minting, WHITELIST = with whitelist)
    enum MintAccessMode{ DEFAULT, WHITELIST }
    MintAccessMode mintAccessMode;

    // NFT configuration
    string public baseTokenURI;

    /**
     *
     */
    constructor(string memory _name, string memory _symbol, uint256 _price, uint256 _maxSupply, address payable _mainWallet) ERC721(_name, _symbol) ERC721Enumerable() {
        setMainWallet(_mainWallet);
        _setMaxSupply(_maxSupply);

        unpauseMinting();
        setMintAccessModeDefault(_price, -1, -1, false);
    }

    /************************************************************************************************************************************
     * MINT
     ***********************************************************************************************************************************/

    /**
     *
     */
    function mint(uint256 _count) public payable {
        address _buyer = msg.sender;
        uint256 previousCountMinted = countMinted;

        require(_count > 0, "Cannot mint 0 NFTs.");

        // check number of NFT to mint
        require(_count <= maxCountPerMint, "Cannot mint more than allowed at once.");

        // check collection supply limit
        require(countRemainingTokens() > 0, "There are currently no mintable NFTs.");
        require(_count <= countRemainingTokens(), "You want to mint too many NFTs: current limit would be crossed.");

        // check minting paused after limit
        if (pauseAfterMintingTokenCount >= 0 && previousCountMinted < uint256(pauseAfterMintingTokenCount)) {
            require(uint256(pauseAfterMintingTokenCount) >= countMinted + _count, "Minting would be paused before completion.");
        }

        // check per user limit
        int256 _countMintablePerUser = getCountMintablePerUser(_buyer);

        if (_countMintablePerUser >= 0) {
            require(_count <= uint256(_countMintablePerUser), "You cannot mint more NFT currently.");
        }

        // handle mode "whitelist"
        if (isMintAccessModeWhitelist()) {
            require(isInWhitelist(_buyer), "You are not whitelisted.");

            // keep track of minted NFT for each user
            WhitelistManager.updateTokenBalance(_buyer, _count);
        }

        /**
         * calculate total price
         */
        uint256 _totalPrice = calculatePricePerMint(_count);
        require(msg.value >= _totalPrice, "Amount of ETH to purchase NFTs is insufficient.");

        /**
         * handle payment
         */
        _handleNFTPayment(_totalPrice);
        
        /**
         * if msg.value is larger than the amount to pay, give the exceeding back to sender
         */
        uint256 exceedingAmount = msg.value - _totalPrice;

        if (exceedingAmount > 0) {
            _transferToWallet(exceedingAmount, payable(_buyer));
        }

        /**
         * mint
         */
        _mint(_count, _buyer);

        // pause minting if count minted is greater then limit to pause
        if (pauseAfterMintingTokenCount > 0 && previousCountMinted < uint256(pauseAfterMintingTokenCount) && countMinted >= uint256(pauseAfterMintingTokenCount)) {
            pauseMinting();
        }
    }

    /**
     *
     */
    function mintByOwner(uint256 _count, address _receiver) public onlyOwner {
        bool previouslyPaused = isMintingPaused();

        if (previouslyPaused) {
            unpauseMinting();
        }

        _mint(_count, _receiver);

        if (previouslyPaused && !isMintingPaused()) {
            pauseMinting();
        }
    }

    /**
     *
     */
    function _mint(uint256 _count, address _receiver) internal {
        require(_count > 0, "Cannot mint 0 NFTs.");

        for (uint i = 0; i < _count; i++) {
            _mintSingleNFT(_receiver);
        }
    }

    /**
     *
     */
    function _mintSingleNFT(address _to) internal mintingNotPaused {
        // check collection supply limit
        require(maxSupply >= countMinted + 1, "Max supply reached.");

        // generate token id and mint
        uint256 _tokenId = _getRandomTokenId();
        _safeMint(_to, _tokenId);
        mintedTokenIds[_tokenId] = true;

        //
        countMinted++;
    }

    /**
     *
     */
    function _getRandomTokenId() internal view returns (uint256) {
        uint256 _randomTokenId = uint256(keccak256(
            abi.encodePacked(
                msg.sender,
                block.coinbase,
                block.difficulty,
                block.gaslimit,
                block.timestamp,
                countMinted
            )
        )) % maxSupply;

        // if the random token id has not been used, return it
        if (_isTokenIdUsable(_randomTokenId)) {
            return _randomTokenId;
        }

        // search on the right
        for (uint256 i = _randomTokenId+1; i < maxSupply; i++) {
            if (_isTokenIdUsable(i)) {
                return i;
            }
        }

        // search on the left
        for (uint256 i = _randomTokenId-1; i >= 0; i--) {
            if (_isTokenIdUsable(i)) {
                return i;
            }
        }

        require(false, "Unable to find a random token ID");
        return 0;
    }

    /**
     * Return true if "tokenId" can be used to mint a new NFT (as to say that it has not been used already)
     */
    function _isTokenIdUsable(uint256 tokenId) internal view returns(bool) {
        return mintedTokenIds[tokenId] != true;
    }

    /**
     *
     */
    function calculatePricePerMint(uint256 _count) public view returns (uint256) {
        return price.mul(_count);
    }

    /**
     * Return the number of tokens left before reaching the total supply
     */
    function countRemainingTokens() public view returns (uint256) {
        if (pauseAfterMintingTokenCount > 0 && countMinted <= uint256(pauseAfterMintingTokenCount)) {
            return uint256(pauseAfterMintingTokenCount) - countMinted;
        }

        return maxSupply - countMinted;
    }

    /**
     * Return the number of tokens that a single user can still mint overall (not in a single mint)
     */
    function getCountMintablePerUser(address _user) public view returns (int256) {
        if (maxMintablePerUser < 0) {
            return maxMintablePerUser;
        }

        if (isMintAccessModeWhitelist()) {
            return int256(uint256(maxMintablePerUser) - WhitelistManager.getTokenBalance(_user));
        }

        int256 output = maxMintablePerUser - int256(balanceOf(_user));

        if (output < 0) {
            return 0;
        }

        return output;
    }

    /**
     * Return the list of Token IDs owned by _owner
     */
    function tokensOfOwner(address _owner) external view returns (uint256[] memory) {
        uint tokenCount = balanceOf(_owner);
        uint[] memory tokensId = new uint256[](tokenCount);

        for (uint i = 0; i < tokenCount; i++) {
            tokensId[i] = tokenOfOwnerByIndex(_owner, i);
        }

        return tokensId;
    }

    /**
     *
     */
    function setMintAccessModeDefault(uint256 _price, int256 _maxMintablePerUser, int256 _pauseAfterMintingTokenCount, bool _unpauseMinting) public onlyOwner {
        mintAccessMode = MintAccessMode.DEFAULT;

        _updateMintingConfiguration(_price, _maxMintablePerUser, _pauseAfterMintingTokenCount, _unpauseMinting);
    }

    /**
     *
     */
    function setMintAccessModeWhitelist(uint256 _price, int256 _maxMintablePerUser, int256 _pauseAfterMintingTokenCount, bool _unpauseMinting, bool _startNewWhitelist) public onlyOwner {
        mintAccessMode = MintAccessMode.WHITELIST;

        _updateMintingConfiguration(_price, _maxMintablePerUser, _pauseAfterMintingTokenCount, _unpauseMinting);

        if (_startNewWhitelist == true) {
            startNewWhitelist();
        }
    }

    /**
     *
     */
    function _updateMintingConfiguration(uint256 _price, int256 _maxMintablePerUser, int256 _pauseAfterMintingTokenCount, bool _unpauseMinting) internal {
        price = _price;
        maxMintablePerUser = _maxMintablePerUser;
        pauseAfterMintingTokenCount = _pauseAfterMintingTokenCount;

        // unpause minting
        if (_unpauseMinting == true && isMintingPaused()) {
            unpauseMinting();
        }
    }

    /************************************************************************************************************************************
     * PAYMENT UTILS
     ***********************************************************************************************************************************/

    /**
     *
     */
    function _handleNFTPayment(uint256 _amount) internal {
        _transferToWallet(_amount, mainWallet);
    }

    /**
     *
     */
    function _transferToWallet(uint256 _amount, address payable receiver) internal {
        (bool success, ) = receiver.call{value: _amount}("");
        require(success, "Transfer failed.");
    }

    /************************************************************************************************************************************
     * UTILS
     ***********************************************************************************************************************************/

    /**
     * var percentage eg. 600 = 6%
     */
    function _calculatePercentage(uint256 amount, uint256 percentage) internal pure returns (uint256) {
        return amount * percentage / 10000;
    }

    /**
     * 
     */
    modifier mintingNotPaused {
        require(!isMintingPaused(), "Minting is paused.");
        _;
    }

    /************************************************************************************************************************************
     * WHITELIST UTILS
     ***********************************************************************************************************************************/

    /**
     *
     */
    function setMaxMintablePerUser(int256 _value) public onlyOwner {
        maxMintablePerUser = _value;
    }

    /**
     * todo: rename to isWhitelisted
     */
    function isInWhitelist(address _address) public view returns (bool) {
        return WhitelistManager.isWhitelisted(_address);
    }

    /**
     * todo: improve checking how much gas is left and returning the number of "accepted" addresses
     */
    function addToWhitelist(address[] calldata _addresses) external onlyOwner {
        WhitelistManager.add(_addresses);
    }

    /**
     * todo: add test
     */
    function removeFromWhitelist(address[] calldata _addresses) external onlyOwner {
        WhitelistManager.remove(_addresses);
    }

    /**
     * todo: add a method to easily empty the whitelist
     * todo: add a method to get the length of the whitelist
     */
    function startNewWhitelist() public onlyOwner {
        WhitelistManager.startNew();
    }

    /************************************************************************************************************************************
     * NFT
     ***********************************************************************************************************************************/

    /**
     *
     */
    function _baseURI() internal view virtual override returns (string memory) {
        return baseTokenURI;
    }

    /**
     *
     */
    function getBaseURI() public view returns (string memory) {
        return baseTokenURI;
    }

    /**
     *
     */
    function setBaseURI(string memory _baseTokenURI) public onlyOwner {
        baseTokenURI = _baseTokenURI;
    }

    /**
     *
     */
    function setMainWallet(address payable _address) public onlyOwner {
        mainWallet = _address;
    }

    /**
     *
     */
    function _setMaxSupply(uint256 _amount) internal {
//        require(_amount >= countMinted, "New supply cannot be less than he number of already minted tokens.");

        maxSupply = _amount;
    }

    /************************************************************************************************************************************
     * Minting
     ***********************************************************************************************************************************/

    /**
     *
     */
    function setPrice(uint256 _amount) public onlyOwner {
        price = _amount;
    }

    /**
     *
     */
    function setMaxCountPerMint(uint256 _amount) public onlyOwner {
        maxCountPerMint = _amount;
    }

    /**
     *
     */
    function setPauseAfterMintingTokenCount(int256 _value) public onlyOwner {
        pauseAfterMintingTokenCount = _value;
    }

    /**
     *
     */
    function isMintingPaused() public view returns (bool) {
        return mintingPaused;
    }

    /**
     *
     */
    function pauseMinting() public {
        mintingPaused = true;
    }

    /**
     *
     */
    function unpauseMinting() public {
        mintingPaused = false;
    }

    /**
     *
     */
    function isMintAccessModeDefault() public view returns (bool) {
        return mintAccessMode == MintAccessMode.DEFAULT;
    }

    /**
     *
     */
    function isMintAccessModeWhitelist() public view returns (bool) {
        return mintAccessMode == MintAccessMode.WHITELIST;
    }

    /************************************************************************************************************************************
     *
     ***********************************************************************************************************************************/

    /**
     *
     */
    function getInfo() public view returns (bool, bool, bool, uint256, uint256, uint256, uint256) {
        return (
            isMintAccessModeDefault(),
            isMintAccessModeWhitelist(),
            isMintingPaused(),
            maxSupply,
            countMinted,
            countRemainingTokens(),
            maxCountPerMint
        );
    }
}
