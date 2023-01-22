import { ethers } from "hardhat";
import { getNamedAccounts } from "hardhat";

async function main() {
  const { deployer } = await getNamedAccounts();
  const fundMe = await ethers.getContract("FundMe", deployer);
  console.log("Funding Contract...");
  const transcationResponse = await fundMe.withdraw();
  await transcationResponse.wait(1)
  console.log("Contract Withdrawed!")
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
