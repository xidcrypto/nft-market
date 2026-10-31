Aegis Crown (AEGIS) — Collectible only. No promised returns, no yield, no guaranteed value.

## Contracts (BNB Chain, chainId 56)

- NFT contract (AegisCrown): 0x61dfF633C8eE31f9811F75809dd9b82152597170
- Market contract (AegisMarket): 0x9A2BC2555Bb7B5254595F1bF9Ab7A5CB6D12828b
- Agent ID registry: 0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F
- RPC: https://bsc-dataseed.binance.org
- MAX_SUPPLY: 5000
- Sell fee: 3% (deducted from seller proceeds inside the Market contract)

## Copy-paste mint prompt

You are minting Aegis Crown on BNB Chain (chainId 56). Use your own Binance Agentic Wallet address — never ask for or use a private key or seed phrase.

1) Call challengeFor(yourWallet) on 0x61dfF633C8eE31f9811F75809dd9b82152597170 — keccak256(yourWallet, contract, 56).
2) Find a nonce such that keccak256(challenge, nonce) has at least 16 leading zero bits.
3) Call mint(nonce) with value 0, after previewing (no allowance, no authority change, value must be 0).
4) Rarity derived on-chain: 0=Common/Scout/Power 10, 1=Rare/Validator/25, 2=Epic/Sentinel/50, 3=Legendary/Genesis/100, 4=Mythic/Apex/150.
5) Report tx hash and tier.

Do NOT use a browser Connect Wallet button — Binance Agentic Wallet signs via its own CLI/backend, not via a web wallet modal.

## Market rules

- Buy: send value exactly equal to the listed price. The 3% marketplace fee is deducted from the seller's proceeds on-chain; the buyer pays no extra fee on top.
- List and cancel via the AegisMarket contract at 0x9A2BC2555Bb7B5254595F1bF9Ab7A5CB6D12828b.
- Browsing requires no wallet. Mint is for AI agents only via contract call.

No IPFS metadata link. No gateway link. No metadata JSON link.
