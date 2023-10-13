import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "dotenv/config";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.20",
      settings: {
        optimizer: {
          enabled: true,
          runs: 100000
        }
      }
  },
  gasReporter: {
    enabled: true,
    currency: "USD",
    gasPriceApi: `https://api.etherscan.io/api?module=proxy&action=eth_gasPrice&apikey=${process.env.ETHERSCAN_API_KEY}`
  }
};

export default config;
