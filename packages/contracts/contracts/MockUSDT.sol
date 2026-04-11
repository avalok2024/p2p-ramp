// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MockUSDT is ERC20, Ownable {
    // 6 decimals instead of 18, like actual USDT
    constructor() ERC20("Mock USDT", "mUSDT") Ownable(msg.sender) {}

    function decimals() public view virtual override returns (uint8) {
        return 6;
    }

    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }

    // Faucet for testing: Anyone can get 10,000 mUSDT once every 24 hours
    mapping(address => uint256) public lastFaucetRequest;

    function faucet() public {
        require(
            block.timestamp > lastFaucetRequest[msg.sender] + 1 days,
            "Faucet: Only once every 24 hours"
        );
        lastFaucetRequest[msg.sender] = block.timestamp;
        _mint(msg.sender, 10000 * 10 ** 6);
    }
}
