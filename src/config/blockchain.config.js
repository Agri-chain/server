// src/config/blockchain.config.js
module.exports = {
  // Hardhat local network (run `npx hardhat node` to start)
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
      accounts: [
        "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80", // Hardhat account 0
        "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d", // Hardhat account 1
        "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a"  // Hardhat account 2
      ]
    }
  },
  
  // Deployed contract addresses (update these after deployment)
  contracts: {
    EscrowContract: "0x5FbDB2315678afecb367f032d93F642f64180eA3", // Update after `npx hardhat run scripts/deploy.js --network localhost`
    AgriChainToken: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"  // Update after deployment
  },
  
  // Provider settings for ethers.js
  provider: {
    localhost: {
      url: "http://127.0.0.1:8545"
    }
  },
  
  // Default gas settings
  gasSettings: {
    gasLimit: 5000000,
    gasPrice: 20000000000 // 20 gwei
  }
};