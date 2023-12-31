// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

import "hardhat/console.sol";

contract Tender is Ownable {
    uint256 immutable public _submissionEnds;
    uint256 immutable public _disclosureEnds;
    mapping(address => bytes32) public _submittedHashes;
    mapping(address => uint256) public _disclosedPrices;
    address[] public _disclosedAddresses;
    address public _winner;

    event Submitted(address indexed addr_);
    event Disclosed(address indexed addr_, uint256 price_);
    event Rejected(address indexed addr_);
    event Win(address indexed winner_);

    error WrongValueForHash();

    constructor(uint256 submissionPeriod_, uint256 disclosurePeriod_) Ownable(msg.sender) {
        require(submissionPeriod_ != 0, "Submission period should be positive");
        require(disclosurePeriod_ != 0, "Disclosure period should be positive");
        
        _submissionEnds = block.timestamp + submissionPeriod_;
        _disclosureEnds = _submissionEnds + disclosurePeriod_;
    }

    function submitHash(bytes32 hash_) external {
        require(block.timestamp < _submissionEnds, "Submission period has ended");
        // I believe it's ok to resubmit so no need for the following check
        // require(_submittedHashes[msg.sender] == address(0), "Hash has already been submitted");

        _submittedHashes[msg.sender] = hash_;

        emit Submitted(msg.sender);
    }

    function disclosePrice(uint256 price_, uint256 salt_) external {
        require(block.timestamp < _disclosureEnds, "Disclosure period has ended");
        require(block.timestamp >= _submissionEnds, "Disclosure period has not started yet");
        require(price_ != 0, "Invalid price");

        if (_submittedHashes[msg.sender] != keccak256(abi.encode(price_, salt_))) {
            revert WrongValueForHash();
        }

        // this is recovering 1846 gas!!!
        _submittedHashes[msg.sender] = 0;
        _disclosedPrices[msg.sender] = price_;
        _disclosedAddresses.push(msg.sender);

        emit Disclosed(msg.sender, price_);
    }

    function rejectAddress(uint256[] calldata orderedIndexes_) external onlyOwner {
        require(block.timestamp >= _disclosureEnds, "Disclosure period has not ended");
        require(_winner == address(0), "The winner has been announced");

        uint256 lastAddressIndex = _disclosedAddresses.length - 1;
        for (uint256 i = orderedIndexes_.length; i != 0; --i) {
            uint256 rejectIndex = orderedIndexes_[i - 1];
            emit Rejected(_disclosedAddresses[rejectIndex]);

            _disclosedAddresses[rejectIndex] = _disclosedAddresses[lastAddressIndex];
            _disclosedAddresses.pop();
            --lastAddressIndex;
        }
    }

    function announceWinner() external onlyOwner {
        require(block.timestamp >= _disclosureEnds, "Disclosure period has not ended");
        require(_winner == address(0), "The winner has been announced");
        require(_disclosedAddresses.length != 0, "No participants to choose the winner from");

        address[] memory addressesCopy = _disclosedAddresses;

        address winner = addressesCopy[0];
        uint256 winningPrice = _disclosedPrices[winner];
        for (uint256 i = 1; i < addressesCopy.length; ++i) {
            address currentAddress = addressesCopy[i];
            uint256 currentPrice = _disclosedPrices[currentAddress];
            if (currentPrice < winningPrice) {
                winningPrice = currentPrice;
                winner = currentAddress;
            }
        }
        
        _winner = winner;
        emit Win(winner);
    }
}
