// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

import "hardhat/console.sol";

/**
 *
 */
contract WhitelistManager {
    // Add the library methods
    using EnumerableSet for EnumerableSet.AddressSet;

    struct Whitelist {
        EnumerableSet.AddressSet addresses;    // whitelisted addresses for a given Whitelist
        mapping(address => uint256) tokensBalance; // how many tokens an address has purchased during whitelist for a given Whitelist
    }

    uint256 private currentWhitelistIndex;   // index of the currently used whitelist
    mapping(uint256 => Whitelist) private whitelists;

    /**
     * todo: change name
     */
    function _getCurrentWhitelist() private view returns(Whitelist storage) {
        return whitelists[currentWhitelistIndex];
    }

    /**
     *
     */
    function startNew() internal {
        currentWhitelistIndex++;
    }

    /**
     * todo: change name
     */
    function updateTokenBalance(address _address, uint256 _count) internal {
        _getCurrentWhitelist().tokensBalance[_address] += _count;
    }

    /**
     *
     */
    function getTokenBalance(address _address) internal view returns(uint256) {
        return _getCurrentWhitelist().tokensBalance[_address];
    }

    /**
     *
     */
    function isWhitelisted(address _address) internal view returns(bool) {
        return _getCurrentWhitelist().addresses.contains(_address);
    }

    /**
     *
     */
    function add(address[] calldata _addresses) internal {
        uint256 _count = _addresses.length;

        for (uint i = 0; i < _count; i++) {
            _getCurrentWhitelist().addresses.add(_addresses[i]);
        }
    }

    /**
     *
     */
    function remove(address[] calldata _addresses) internal {
        uint256 _count = _addresses.length;

        for (uint i = 0; i < _count; i++) {
            _getCurrentWhitelist().addresses.remove(_addresses[i]);
        }
    }
}

