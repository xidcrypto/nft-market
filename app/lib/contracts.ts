import { ethers } from "ethers";
import { CONFIG } from "./config";

export const AEGIS_CROWN_ABI = [
  "function mint(uint256 nonce) external",
  "function challengeFor(address wallet) external view returns (bytes32)",
  "function tierOf(uint256 tokenId) external view returns (uint8)",
  "function totalMinted() external view returns (uint256)",
  "function hasMinted(address wallet) external view returns (bool)",
  "function tokenURI(uint256 tokenId) external view returns (string)",
] as const;

export const AEGIS_MARKET_ABI = [
  "function list(uint256 tokenId, uint256 price) external",
  "function buy(uint256 tokenId) external payable",
  "function cancel(uint256 tokenId) external",
  "function listings(uint256 tokenId) external view returns (address seller, uint256 price, bool active)",
  "function feeRecipient() external view returns (address)",
  "function sellFeePercent() external view returns (uint256)",
  "event Listed(address indexed seller, uint256 indexed tokenId, uint256 price)",
  "event Bought(address indexed buyer, uint256 indexed tokenId, uint256 price, uint256 fee)",
  "event Cancelled(address indexed seller, uint256 indexed tokenId)",
] as const;

export const ERC721_ABI = [
  "function balanceOf(address owner) external view returns (uint256)",
  "function ownerOf(uint256 tokenId) external view returns (address)",
  "function approve(address to, uint256 tokenId) external",
  "function setApprovalForAll(address operator, bool approved) external",
  "function isApprovedForAll(address owner, address operator) external view returns (bool)",
  "function tokenURI(uint256 tokenId) external view returns (string)",
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)",
  "event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId)",
  "event ApprovalForAll(address indexed owner, address indexed operator, bool approved)",
] as const;

export const REGISTRY_ABI = [
  "function balanceOf(address owner) external view returns (uint256)",
] as const;

export class ContractService {
  private mode: "mock" | "live" = "mock";
  private aegisCrownContract: ethers.Contract | null = null;
  private aegisMarketContract: ethers.Contract | null = null;
  private registryContract: ethers.Contract | null = null;
  private provider: ethers.JsonRpcProvider | ethers.BrowserProvider | null = null;
  private signer: ethers.Signer | null = null;

  setMode(mode: "mock" | "live") {
    this.mode = mode;
    this.aegisCrownContract = null;
    this.aegisMarketContract = null;
    this.registryContract = null;
    this.provider = null;
    this.signer = null;
  }

  async init(browserProvider: ethers.BrowserProvider) {
    this.provider = browserProvider;
    this.signer = await browserProvider.getSigner();

    await this.provider.send("wallet_switchEthereumChain", [
      { chainId: `0x${CONFIG.chainId.toString(16)}` },
    ]);

    this.aegisCrownContract = new ethers.Contract(
      CONFIG.aegisCrownAddress,
      AEGIS_CROWN_ABI,
      this.signer
    );
    this.aegisMarketContract = new ethers.Contract(
      CONFIG.aegisMarketAddress,
      AEGIS_MARKET_ABI,
      this.signer
    );
    this.registryContract = new ethers.Contract(
      CONFIG.registryAddress,
      REGISTRY_ABI,
      this.signer
    );
  }

  get isMock() { return this.mode === "mock"; }

  async totalMinted(): Promise<number> {
    if (this.mode === "mock") return Math.floor(Math.random() * 100);
    if (!this.aegisCrownContract) throw new Error("NFT contract not initialized");
    const total = await this.aegisCrownContract.totalMinted();
    return Number(ethers.toBigInt(total));
  }

  async hasMinted(wallet: string): Promise<boolean> {
    if (this.mode === "mock") return Math.random() > 0.5;
    if (!this.aegisCrownContract) throw new Error("NFT contract not initialized");
    return await this.aegisCrownContract.hasMinted(wallet);
  }

  async hasAgentId(wallet: string): Promise<number> {
    if (this.mode === "mock") return Math.floor(Math.random() * 2) + 1;
    if (!this.registryContract) throw new Error("Registry contract not initialized");
    const result = await this.registryContract.balanceOf(wallet);
    return Number(ethers.toBigInt(result));
  }

  async challengeFor(wallet: string): Promise<string> {
    if (this.mode === "mock") {
      const data = ethers.solidityPacked(
        ["address", "address", "uint256"],
        [wallet, CONFIG.aegisCrownAddress, CONFIG.chainId]
      );
      return ethers.keccak256(data);
    }
    if (!this.aegisCrownContract) throw new Error("NFT contract not initialized");
    return await this.aegisCrownContract.challengeFor(wallet);
  }

  async tierOf(tokenId: number): Promise<number> {
    if (this.mode === "mock") {
      const rng = Math.random() * 100;
      if (rng < 60) return 1;
      if (rng < 85) return 2;
      if (rng < 97) return 3;
      if (rng < 99) return 4;
      return 5;
    }
    if (!this.aegisCrownContract) throw new Error("NFT contract not initialized");
    const result = await this.aegisCrownContract.tierOf(tokenId);
    return Number(ethers.toBigInt(result));
  }

  async tokenURI(tokenId: number): Promise<string> {
    if (this.mode === "mock") {
      const tier = await this.tierOf(tokenId);
      return `${CONFIG.baseUri}${getTierName(tier as 1 | 2 | 3 | 4 | 5)}.json`;
    }
    if (!this.aegisCrownContract) throw new Error("NFT contract not initialized");
    return await this.aegisCrownContract.tokenURI(tokenId);
  }

  async mint(nonce: number): Promise<{ to: string; value: string; gasLimit: string; description: string }> {
    if (this.mode === "mock") {
      return {
        to: CONFIG.aegisCrownAddress,
        value: "0",
        gasLimit: "150000",
        description: `Mint Aegis Crown with nonce ${nonce}`,
      };
    }
    if (!this.aegisCrownContract || !this.signer) throw new Error("NFT contract not initialized");
    const tx = await this.aegisCrownContract.mint(nonce);
    return {
      to: CONFIG.aegisCrownAddress,
      value: "0",
      gasLimit: tx.gasLimit.toString(),
      description: `Mint Aegis Crown with nonce ${nonce}`,
    };
  }
}

export function getTierName(tierNum: 1 | 2 | 3 | 4 | 5): string {
  const names: Record<1 | 2 | 3 | 4 | 5, string> = {
    1: "common",
    2: "rare",
    3: "epic",
    4: "legendary",
    5: "mythic",
  };
  return names[tierNum];
}

export class MarketContractService {
  private mode: "mock" | "live" = "mock";
  private marketContract: ethers.Contract | null = null;
  private erc721Contract: ethers.Contract | null = null;

  setMode(mode: "mock" | "live") {
    this.mode = mode;
    this.marketContract = null;
    this.erc721Contract = null;
  }

  async init(signer: ethers.Signer) {
    this.marketContract = new ethers.Contract(
      CONFIG.aegisMarketAddress,
      AEGIS_MARKET_ABI,
      signer
    );
    this.erc721Contract = new ethers.Contract(
      CONFIG.aegisCrownAddress,
      ERC721_ABI,
      signer
    );
  }

  get isMock() { return this.mode === "mock"; }

  async getListings(): Promise<Listing[]> {
    if (this.mode === "mock") {
      const count = Math.floor(Math.random() * 8) + 1;
      const listings: Listing[] = [];
      for (let i = 0; i < count; i++) {
        listings.push({
          tokenId: i + 1,
          seller: `0x${Math.random().toString(16).slice(2, 42)}`,
          price: ethers.parseUnits((Math.random() * 0.1 + 0.01).toFixed(4), 18).toString(),
          active: true,
          tier: Math.random() > 0.7 ? 5 : Math.floor(Math.random() * 4) + 1,
        });
      }
      return listings;
    }
    if (!this.marketContract) throw new Error("Market contract not initialized");
    return [];
  }

  async list(tokenId: number, price: string): Promise<{ to: string; value: string; gasLimit: string; description: string }> {
    if (this.mode === "mock") {
      return {
        to: CONFIG.aegisMarketAddress,
        value: "0",
        gasLimit: "150000",
        description: `List tokenId #${tokenId} for ${formatPriceBnb(price)} BNB`,
      };
    }
    if (!this.marketContract) throw new Error("Market contract not initialized");
    const value = ethers.parseUnits(price, 18);
    const tx = await this.marketContract.list(tokenId, value);
    return {
      to: CONFIG.aegisMarketAddress,
      value: "0",
      gasLimit: tx.gasLimit.toString(),
      description: `List tokenId #${tokenId} for ${formatPriceBnb(price)} BNB`,
    };
  }

  async buy(tokenId: number, price: string): Promise<{ to: string; value: string; gasLimit: string; description: string }> {
    if (this.mode === "mock") {
      const value = ethers.parseUnits(price, 18);
      const fee = value * BigInt(3) / BigInt(100);
      const total = value + fee;
      return {
        to: CONFIG.aegisMarketAddress,
        value: ethers.formatEther(total),
        gasLimit: "200000",
        description: `Buy tokenId #${tokenId} for ${formatPriceBnb(price)} BNB (includes 3% fee)`,
      };
    }
    if (!this.marketContract) throw new Error("Market contract not initialized");
    const value = ethers.parseUnits(price, 18);
    const tx = await this.marketContract.buy(tokenId, { value });
    const fee = value * BigInt(3) / BigInt(100);
    const total = value + fee;
    return {
      to: CONFIG.aegisMarketAddress,
      value: ethers.formatEther(total),
      gasLimit: tx.gasLimit.toString(),
      description: `Buy tokenId #${tokenId} for ${formatPriceBnb(price)} BNB`,
    };
  }

  async cancel(tokenId: number): Promise<{ to: string; value: string; gasLimit: string; description: string }> {
    if (this.mode === "mock") {
      return {
        to: CONFIG.aegisMarketAddress,
        value: "0",
        gasLimit: "100000",
        description: `Cancel listing for tokenId #${tokenId}`,
      };
    }
    if (!this.marketContract) throw new Error("Market contract not initialized");
    const tx = await this.marketContract.cancel(tokenId);
    return {
      to: CONFIG.aegisMarketAddress,
      value: "0",
      gasLimit: tx.gasLimit.toString(),
      description: `Cancel listing for tokenId #${tokenId}`,
    };
  }

  async isApprovedForAll(owner: string, operator: string): Promise<boolean> {
    if (this.mode === "mock") return false;
    if (!this.erc721Contract) throw new Error("ERC721 contract not initialized");
    return await this.erc721Contract.isApprovedForAll(owner, operator);
  }

  async approveForAll(operator: string, approved: boolean): Promise<{ to: string; value: string; gasLimit: string; description: string }> {
    if (this.mode === "mock") {
      return {
        to: CONFIG.aegisCrownAddress,
        value: "0",
        gasLimit: "80000",
        description: `${approved ? "Approve" : "Revoke"} all tokens for marketplace`,
      };
    }
    if (!this.erc721Contract) throw new Error("ERC721 contract not initialized");
    const tx = await this.erc721Contract.setApprovalForAll(operator, approved);
    return {
      to: CONFIG.aegisCrownAddress,
      value: "0",
      gasLimit: tx.gasLimit.toString(),
      description: `${approved ? "Approve" : "Revoke"} all tokens for marketplace`,
    };
  }
}

export function formatAddress(addr: string | null | undefined): string {
  if (!addr || addr.length <= 10) return addr ?? "";
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function formatPriceBnb(weiString: string): string {
  try {
    const bnb = parseFloat(ethers.formatUnits(weiString, 18));
    return bnb.toFixed(4);
  } catch {
    return "0";
  }
}

export function getDisclaimer(): string {
  return "Collectible only. No promised returns, no yield, no guaranteed value.";
}

export interface Listing {
  tokenId: number;
  seller: string;
  price: string;
  active: boolean;
  tier: number;
}

export const contractService = new ContractService();
export const marketContractService = new MarketContractService();