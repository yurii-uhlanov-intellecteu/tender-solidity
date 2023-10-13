import {
  time,
  loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { keccak256 } from "@ethersproject/keccak256";

class Entry {
  signer: HardhatEthersSigner;
  price: bigint;
  salt: bigint;

  constructor(signer: HardhatEthersSigner, price: bigint, salt: bigint) {
    this.signer = signer;
    this.price = price;
    this.salt = salt;
  }
}

describe("Tender", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function fixtures() {
    const submissionPeriod = 30 * 24 * 3600;
    const disclosurePeriod = 14 * 24 * 3600;

    const signers = await ethers.getSigners();

    const entries = [
      new Entry(signers[1], BigInt(55425), BigInt("883776620088")),
      new Entry(signers[2], BigInt(3342), BigInt("47778283999429")),
      new Entry(signers[3], BigInt(8973), BigInt("287238787832")),
      new Entry(signers[4], BigInt(111229), BigInt("249892938299")),
      new Entry(signers[5], BigInt(56772), BigInt("382002982332")),
      new Entry(signers[6], BigInt(837366), BigInt("756610031873")),
    ];
    
    const contract = await ethers.deployContract("Tender", [submissionPeriod, disclosurePeriod]);

    return { 
      owner: signers[0],
      submissionPeriod,
      disclosurePeriod,
      entries,
      contract,
      numToBytes: (num: bigint) => {
        const buffer = Buffer.alloc(32);
        buffer.writeBigUInt64BE(num, 24);
        return buffer;
      },
      hasher: (buffer: Buffer) => keccak256(buffer),
    };
  }

  describe("Complete flow", function () {
    it("Should choose a winner", async function () {
      const { owner, submissionPeriod, disclosurePeriod, entries, contract, numToBytes, hasher } = await loadFixture(fixtures);

      await Promise.all(entries.map(entry => {
        const hash = hasher(Buffer.concat([numToBytes(entry.price), numToBytes(entry.salt)]));
        return contract.connect(entry.signer).submitHash(hash);
      }));

      await time.increase(submissionPeriod);

      await Promise.all(entries.map(entry => contract.connect(entry.signer).disclosePrice(entry.price, entry.salt)));

      await time.increase(disclosurePeriod);

      await contract.connect(owner).rejectAddress([0,1,3]);

      await contract.announceWinner();

      expect(await contract._winner()).to.equal(entries[2].signer.address);
    });
  });
});
