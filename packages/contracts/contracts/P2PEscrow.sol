// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract P2PEscrow is Ownable {
    IERC20 public usdt;

    enum EscrowStatus { NONE, LOCKED, RELEASED, REFUNDED }

    struct Escrow {
        uint256 amount;
        address depositor;
        address intendedRecipient;
        EscrowStatus status;
    }

    // Mapping from off-chain Order ID (bytes32) to Escrow
    mapping(bytes32 => Escrow) public escrows;

    event EscrowLocked(bytes32 indexed orderId, address indexed depositor, address indexed recipient, uint256 amount);
    event EscrowReleased(bytes32 indexed orderId, address indexed recipient, uint256 amount);
    event EscrowRefunded(bytes32 indexed orderId, address indexed depositor, uint256 amount);

    constructor(address _usdtAddress) Ownable(msg.sender) {
        usdt = IERC20(_usdtAddress);
    }

    /**
     * @dev Depositor locks funds for a specific off-chain order.
     * Depositor must have approved the contract to spend the amount.
     */
    function deposit(bytes32 orderId, uint256 amount, address recipient) external {
        require(escrows[orderId].status == EscrowStatus.NONE, "Escrow already exists");
        require(amount > 0, "Amount must be greater than 0");
        require(recipient != address(0), "Invalid recipient");

        escrows[orderId] = Escrow({
            amount: amount,
            depositor: msg.sender,
            intendedRecipient: recipient,
            status: EscrowStatus.LOCKED
        });

        require(usdt.transferFrom(msg.sender, address(this), amount), "Transfer failed");

        emit EscrowLocked(orderId, msg.sender, recipient, amount);
    }

    /**
     * @dev Release funds to the intended recipient.
     * Can be called by the platform owner (backend) after admin approval,
     * or by the depositor themselves.
     */
    function release(bytes32 orderId) external {
        Escrow storage esc = escrows[orderId];
        require(esc.status == EscrowStatus.LOCKED, "Escrow not locked");
        require(msg.sender == esc.depositor || msg.sender == owner(), "Not authorized");

        esc.status = EscrowStatus.RELEASED;
        require(usdt.transfer(esc.intendedRecipient, esc.amount), "Transfer failed");

        emit EscrowReleased(orderId, esc.intendedRecipient, esc.amount);
    }

    /**
     * @dev Refund funds back to the depositor.
     * Can only be called by the platform owner (dispute resolution)
     * or by the intended recipient (cancelling the order).
     */
    function refund(bytes32 orderId) external {
        Escrow storage esc = escrows[orderId];
        require(esc.status == EscrowStatus.LOCKED, "Escrow not locked");
        require(msg.sender == esc.intendedRecipient || msg.sender == owner(), "Not authorized");

        esc.status = EscrowStatus.REFUNDED;
        require(usdt.transfer(esc.depositor, esc.amount), "Transfer failed");

        emit EscrowRefunded(orderId, esc.depositor, esc.amount);
    }
}
