from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


# Crypto-specific enums
class CryptoAssetType(str, Enum):
    NATIVE = "native"  # ETH, BTC, etc
    TOKEN = "token"    # ERC-20, etc
    STABLECOIN = "stablecoin"  # USDC, USDT
    NFT = "nft"

class BlockchainNetwork(str, Enum):
    ETHEREUM = "ethereum"
    BITCOIN = "bitcoin"
    POLYGON = "polygon"
    SOLANA = "solana"
    ARBITRUM = "arbitrum"

class TransactionDirection(str, Enum):
    SEND = "send"
    RECEIVE = "receive"
    SWAP = "swap"
    MINT = "mint"
    BURN = "burn"

class DeFiProtocolType(str, Enum):
    LENDING = "lending"
    STAKING = "staking"
    LIQUIDITY = "liquidity"
    YIELD_FARMING = "yield_farming"

# Request/Response Models
class CryptoWalletCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    network: BlockchainNetwork
    is_primary: bool = False

class CryptoWalletResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    name: str
    address: str
    network: BlockchainNetwork
    is_primary: bool
    created_at: datetime
    last_synced: datetime | None = None

class CryptoAssetResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    wallet_id: int
    symbol: str
    name: str
    asset_type: CryptoAssetType
    network: BlockchainNetwork
    contract_address: str | None = None
    balance: str  # Using string for precision
    usd_value: float
    price_usd: float
    change_24h: float
    last_updated: datetime

class NFTAssetResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    wallet_id: int
    collection_name: str
    token_id: str
    name: str
    description: str | None = None
    image_url: str | None = None
    metadata: dict[str, Any]
    network: BlockchainNetwork
    contract_address: str
    floor_price_usd: float | None = None
    estimated_value_usd: float | None = None
    acquired_at: datetime
    last_updated: datetime

class CryptoTransactionCreate(BaseModel):
    from_wallet_id: int | None = None
    to_address: str
    asset_symbol: str
    amount: str
    network: BlockchainNetwork
    gas_price_gwei: float | None = None
    note: str | None = None

class CryptoTransactionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    wallet_id: int | None = None
    direction: TransactionDirection
    asset_symbol: str
    amount: str
    usd_value_at_time: float
    from_address: str | None = None
    to_address: str | None = None
    network: BlockchainNetwork
    transaction_hash: str
    gas_fee: str | None = None
    gas_fee_usd: float | None = None
    status: str  # pending, confirmed, failed
    confirmations: int
    note: str | None = None
    created_at: datetime
    confirmed_at: datetime | None = None

class DeFiPositionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    wallet_id: int
    protocol: str
    protocol_type: DeFiProtocolType
    position_type: str  # lending, borrowing, staking, LP
    asset_symbol: str
    amount: str
    usd_value: float
    apy: float
    rewards_earned: str
    rewards_usd: float
    started_at: datetime
    last_updated: datetime

class CryptoPortfolioSummary(BaseModel):
    total_usd_value: float
    total_assets: int
    total_nfts: int
    chains: list[str]
    top_holdings: list[dict[str, Any]]
    asset_allocation: list[dict[str, Any]] = []
    defi_positions_value: float
    total_24h_change: float
    total_24h_change_percent: float

class CryptoSwapRequest(BaseModel):
    from_asset: str
    to_asset: str
    amount: str
    slippage_tolerance: float = 0.5  # percentage
    wallet_id: int

class CryptoSwapQuote(BaseModel):
    from_asset: str
    to_asset: str
    from_amount: str
    to_amount: str
    price_impact: float
    gas_estimate_usd: float
    route: list[str]
    expires_at: datetime
