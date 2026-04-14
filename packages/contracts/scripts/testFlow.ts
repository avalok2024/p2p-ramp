import { ethers } from "hardhat";

async function main() {
  const [owner, depositor, recipient] = await ethers.getSigners();
  console.log("==================================================");
  console.log("🧪 Starting P2P Ramp Escrow & Token Flow Test 🧪");
  console.log("==================================================");
  console.log("🤖 Owner/Admin:", owner.address);
  console.log("🧑 Depositor (Buyer/Seller):", depositor.address);
  console.log("🧑‍💼 Recipient:", recipient.address);

  // 1. Deploy P2PEscrow
  const Escrow = await ethers.getContractFactory("P2PEscrow");
  const escrow = await Escrow.deploy();
  await escrow.waitForDeployment();
  const escrowAddress = await escrow.getAddress();
  console.log("✅ P2PEscrow deployed to:", escrowAddress);

  // 2. Depositor locks ETH in Escrow
  const orderId = ethers.id("order-12345"); // Simulate bytes32 off-chain Order ID
  const depositAmount = ethers.parseEther("1.5");
  
  console.log(`\n🔒 Depositor locking 1.5 ETH into Escrow for Order [ ${orderId} ]...`);
  await escrow.connect(depositor).deposit(orderId, recipient.address, { value: depositAmount });

  const escrowBalance = await ethers.provider.getBalance(escrowAddress);
  console.log(`📊 Escrow Contract Balance: ${ethers.formatEther(escrowBalance)} ETH`);

  // 3. Release funds to Recipient
  const recipientBalanceBefore = await ethers.provider.getBalance(recipient.address);
  console.log("\n🔑 Owner (Backend API) releasing Escrow funds to Recipient...");
  await escrow.connect(owner).release(orderId);

  const recipientBalanceAfter = await ethers.provider.getBalance(recipient.address);
  const finalEscrowBalance = await ethers.provider.getBalance(escrowAddress);
  console.log(`\n🎉 Recipient received: ${ethers.formatEther(recipientBalanceAfter - recipientBalanceBefore)} ETH (Successfully Delivered!)`);
  console.log(`📊 Final Escrow Balance: ${ethers.formatEther(finalEscrowBalance)} ETH`);
  console.log("==================================================");
  console.log("✅ Token Flow Test Completed Successfully!");
  console.log("==================================================");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
