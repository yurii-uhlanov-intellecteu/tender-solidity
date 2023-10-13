import { ethers } from "hardhat";

async function main() {
  const submissionPeriod = 30 * 24 * 3600;
  const disclosurePeriod = 14 * 24 * 3600;

  const contract = await ethers.deployContract("Tender", [submissionPeriod, disclosurePeriod]);

  await contract.waitForDeployment();

  console.log(
    `Tender deployed to ${contract.target}`
  );
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
