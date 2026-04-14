// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

contract P2PEscrow is Ownable {
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

    constructor() Ownable(msg.sender) {}

    /**
     * @dev Depositor locks funds for a specific off-chain order.
     * Depositor must supply the exact ETH via msg.value.
     */
    function deposit(bytes32 orderId, address recipient) external payable {
        require(escrows[orderId].status == EscrowStatus.NONE, "Escrow already exists");
        require(msg.value > 0, "Amount must be greater than 0");
        require(recipient != address(0), "Invalid recipient");

        escrows[orderId] = Escrow({
            amount: msg.value,
            depositor: msg.sender,
            intendedRecipient: recipient,
            status: EscrowStatus.LOCKED
        });

        emit EscrowLocked(orderId, msg.sender, recipient, msg.value);
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
        
        (bool success, ) = payable(esc.intendedRecipient).call{value: esc.amount}("");
        require(success, "Transfer failed");

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
        
        (bool success, ) = payable(esc.depositor).call{value: esc.amount}("");
        require(success, "Transfer failed");

        emit EscrowRefunded(orderId, esc.depositor, esc.amount);
    }
}
