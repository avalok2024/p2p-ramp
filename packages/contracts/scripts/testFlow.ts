import { ethers } from "hardhat";

async function main() {
  const [owner, depositor, recipient] = await ethers.getSigners();
  console.log("==================================================");
  console.log("🧪 Starting P2P Ramp Escrow & Token Flow Test 🧪");
  console.log("==================================================");
  console.log("🤖 Owner/Admin:", owner.address);
  console.log("🧑 Depositor (Buyer/Seller):", depositor.address);
  console.log("🧑‍💼 Recipient:", recipient.address);

  // 1. Deploy MockUSDT
  const USDT = await ethers.getContractFactory("MockUSDT");
  const usdt = await USDT.deploy();
  await usdt.waitForDeployment();
  const usdtAddress = await usdt.getAddress();
  console.log("\n✅ MockUSDT deployed to:", usdtAddress);

  // 2. Deploy P2PEscrow
  const Escrow = await ethers.getContractFactory("P2PEscrow");
  const escrow = await Escrow.deploy(usdtAddress);
  await escrow.waitForDeployment();
  const escrowAddress = await escrow.getAddress();
  console.log("✅ P2PEscrow deployed to:", escrowAddress);

  // 3. Mint and Distribute USDT to Depositor
  console.log("\n💸 Minting 1000 USDT to Depositor...");
  await usdt.mint(depositor.address, ethers.parseUnits("1000", 6));

  let depositorBalance = await usdt.balanceOf(depositor.address);
  console.log(`📊 Depositor Balance: ${ethers.formatUnits(depositorBalance, 6)} USDT`);

  // 4. Depositor Approves Escrow
  console.log("\n🔓 Depositor approving P2PEscrow to spend 100 USDT...");
  const depositAmount = ethers.parseUnits("100", 6);
  await usdt.connect(depositor).approve(escrowAddress, depositAmount);

  // 5. Depositor locks funds in Escrow
  const orderId = ethers.id("order-12345"); // Simulate bytes32 off-chain Order ID
  console.log(`\n🔒 Depositor locking 100 USDT into Escrow for Order [ ${orderId} ]...`);
  await escrow.connect(depositor).deposit(orderId, depositAmount, recipient.address);

  const escrowBalance = await usdt.balanceOf(escrowAddress);
  depositorBalance = await usdt.balanceOf(depositor.address);
  console.log(`📊 Escrow Contract Balance: ${ethers.formatUnits(escrowBalance, 6)} USDT`);
  console.log(`📊 Depositor Balance (After lock): ${ethers.formatUnits(depositorBalance, 6)} USDT`);

  // 6. Release funds to Recipient
  console.log("\n🔑 Owner (Backend API) releasing Escrow funds to Recipient...");
  await escrow.connect(owner).release(orderId);

  const recipientBalance = await usdt.balanceOf(recipient.address);
  const finalEscrowBalance = await usdt.balanceOf(escrowAddress);
  console.log(`\n🎉 Recipient Balance: ${ethers.formatUnits(recipientBalance, 6)} USDT (Successfully Delivered!)`);
  console.log(`📊 Final Escrow Balance: ${ethers.formatUnits(finalEscrowBalance, 6)} USDT`);
  console.log("==================================================");
  console.log("✅ Token Flow Test Completed Successfully!");
  console.log("==================================================");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
