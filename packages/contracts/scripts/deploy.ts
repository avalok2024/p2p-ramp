import { ethers } from "hardhat";
import fs from "fs";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  // 1. Deploy P2PEscrow
  const Escrow = await ethers.getContractFactory("P2PEscrow");
  const escrowContract = await Escrow.deploy();
  await escrowContract.waitForDeployment();
  const escrowAddress = await escrowContract.getAddress();
  console.log("✅ P2PEscrow deployed to:", escrowAddress);

  // Output Addresses to a local JSON for the frontends to consume
  const output = {
    P2PEscrow: escrowAddress
  };
  fs.writeFileSync('./deployed_addresses.json', JSON.stringify(output, null, 2));
  console.log("Contracts tracked in deployed_addresses.json");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
