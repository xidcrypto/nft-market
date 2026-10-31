export const AEGIS_CROWN_ABI = [
  "function mint(uint256 nonce) external",
  "function challengeFor(address wallet) external view returns (bytes32)",
  "function tierOf(uint256 tokenId) external view returns (uint8)",
  "function totalMinted() external view returns (uint256)",
  "function hasMinted(address wallet) external view returns (bool)",
  "function tokenURI(uint256 tokenId) external view returns (string)",
  "function balanceOf(address owner) external view returns (uint256)",
  "function ownerOf(uint256 tokenId) external view returns (address)",
  "function approve(address to, uint256 tokenId) external",
  "function setApprovalForAll(address operator, bool approved) external",
  "function isApprovedForAll(address owner, address operator) external view returns (bool)",
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)",
  "event Minted(address indexed minter, uint256 indexed tokenId, uint8 indexed tier)",
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