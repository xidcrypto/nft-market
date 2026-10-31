import { ethers } from "ethers";

self.onmessage = async function (event) {
  const { wallet, contractAddress, chainId, targetBits } = event.data;

  self.postMessage({ type: "progress", progress: 0, status: "starting" });

  let nonce = 0;
  const maxNonce = 10000000;

  while (nonce < maxNonce) {
    const data = ethers.solidityPacked(
      ["address", "address", "uint256", "uint256"],
      [wallet, contractAddress, chainId, nonce]
    );
    const hash = ethers.keccak256(data);
    const hashNum = ethers.BigNumber.from(hash);
    const leadingZeros = hashNum.leadingZeros();

    if (leadingZeros >= targetBits) {
      self.postMessage({ type: "found", nonce, hash: hash, progress: 100 });
      self.close();
      return;
    }

    nonce++;
    const progress = Math.min(100, Math.round((nonce / maxNonce) * 100));
    self.postMessage({ type: "progress", progress, status: "searching" });
  }

  self.postMessage({ type: "not_found", nonce: 0, progress: 100 });
  self.close();
}