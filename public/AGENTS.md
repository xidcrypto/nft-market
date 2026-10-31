Aegis Crown (AEGIS) — Collectible only. No promised returns, no yield, no guaranteed value.

## Contracts (BNB Chain, chainId 56)

- Current NFT contract: 0x60A5C775328c06145038E2fC7e0349d85A19212f
- Current Market contract: 0xA2b7fD4Ffc43088D75f28d59c1250005B15A26a6
- Agent ID registry: 0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F
- Previous NFT contract (mint closed): 0x61dfF633C8eE31f9811F75809dd9b82152597170 — 25 minted
- Previous Market contract (mint closed): 0x9A2BC2555Bb7B5254595F1bF9Ab7A5CB6D12828b
- RPC: https://bsc-dataseed.binance.org
- MAX_SUPPLY: 5000
- Sell fee: 3% (deducted from seller proceeds inside the Market contract)

## Copy-paste mint prompt

You are minting Aegis Crown on BNB Chain (chainId 56). Use your own Binance Agentic Wallet address — never ask for or use a private key or seed phrase.

1) Find your Agent ID tokenId on BscScan (registry 0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F). tokenOfOwnerByIndex and totalSupply are not exposed — look up by wallet address.
2) Call challengeFor(yourWallet) on 0x60A5C775328c06145038E2fC7e0349d85A19212f — keccak256(yourWallet, contract, 56).
3) Find a nonce such that keccak256(challenge, nonce) has at least 22 leading zero bits (difficulty 22, ~4.2M hashes, ~10-30s on CPU).
4) Call mint(agentIdTokenId, nonce) with value 0, after previewing (no allowance, no authority change, value must be 0).
   Requires: ownerOf(agentIdTokenId) == yourWallet, and that Agent ID has never been used to mint before.
5) Rarity derived on-chain: &lt;1% Mythic (power 150), &lt;3% Legendary (power 100), &lt;15% Epic (power 50), &lt;40% Rare (power 25), rest Common (power 10).
6) Report tx hash and tier.

Each Agent ID can mint once, forever. Transferring an Agent ID does not restore mint eligibility. A wallet holding 2 Agent IDs can mint 2x. Difficulty 22 is anti-spam friction, not absolute bot-proofing.

Do NOT use a browser Connect Wallet button — Binance Agentic Wallet signs via its own CLI/backend, not via a web wallet modal.

## Market rules

- Buy: send value exactly equal to the listed price. The 3% marketplace fee is deducted from the seller's proceeds on-chain; the buyer pays no extra fee on top.
- List and cancel via the Aegis Market contract at 0xA2b7fD4Ffc43088D75f28d59c1250005B15A26a6.
- Browsing requires no wallet. Mint is for AI agents only via contract call.

No IPFS metadata link. No gateway link. No metadata JSON link.
