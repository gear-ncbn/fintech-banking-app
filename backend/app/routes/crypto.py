import random
from datetime import UTC, datetime, timedelta
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status

from ..models import (
    BlockchainNetwork,
    CryptoAsset,
    CryptoTransaction,
    CryptoTransactionStatus,
    CryptoWallet,
    DeFiPosition,
    NFTAsset,
    TransactionDirection,
)
from ..models.entities.crypto_models import (
    CryptoAssetResponse,
    CryptoPortfolioSummary,
    CryptoSwapQuote,
    CryptoSwapRequest,
    CryptoTransactionCreate,
    CryptoTransactionResponse,
    CryptoWalletCreate,
    CryptoWalletResponse,
    DeFiPositionResponse,
    NFTAssetResponse,
)
from ..storage.memory_adapter import db, desc
from ..utils.auth import get_current_user
from ..utils.money import format_money

router = APIRouter()

# Mock crypto prices for demo
CRYPTO_PRICES = {
    "BTC": {"price": 45000.00, "change_24h": 2.5},
    "ETH": {"price": 2500.00, "change_24h": -1.2},
    "USDC": {"price": 1.00, "change_24h": 0.0},
    "USDT": {"price": 1.00, "change_24h": 0.0},
    "SOL": {"price": 100.00, "change_24h": 5.3},
    "MATIC": {"price": 0.85, "change_24h": -3.1},
}

@router.get("/wallets", response_model=list[CryptoWalletResponse])
async def get_wallets(
    current_user: dict = Depends(get_current_user),
    db_session: Any = Depends(db.get_db_dependency)
):
    """Get all crypto wallets for the current user"""
    wallets = db_session.query(CryptoWallet).filter(
        CryptoWallet.user_id == current_user['user_id']
    ).all()

    return [CryptoWalletResponse.model_validate(w) for w in wallets]

@router.post("/wallets", response_model=CryptoWalletResponse, status_code=status.HTTP_201_CREATED)
async def create_wallet(
    request: Request,
    wallet_data: CryptoWalletCreate,
    current_user: dict = Depends(get_current_user),
    db_session: Any = Depends(db.get_db_dependency)
):
    """Create a new crypto wallet"""

    # Check if making this wallet primary
    if wallet_data.is_primary:
        # Unset any existing primary wallet
        existing_primary = db_session.query(CryptoWallet).filter(
            CryptoWallet.user_id == current_user['user_id'],
            CryptoWallet.is_primary
        ).first()
        if existing_primary:
            existing_primary.is_primary = False

    # Create new wallet
    new_wallet = CryptoWallet(
        user_id=current_user['user_id'],
        name=wallet_data.name,
        network=wallet_data.network.value,
        is_primary=wallet_data.is_primary,
        last_synced=datetime.now(UTC)
    )

    db_session.add(new_wallet)
    db_session.commit()
    db_session.refresh(new_wallet)

    # Log wallet creation

    return CryptoWalletResponse.model_validate(new_wallet)

@router.get("/wallets/{wallet_id}/assets", response_model=list[CryptoAssetResponse])
async def get_wallet_assets(
    wallet_id: int,
    current_user: dict = Depends(get_current_user),
    db_session: Any = Depends(db.get_db_dependency)
):
    """Get all crypto assets in a wallet"""
    # Verify wallet ownership
    wallet = db_session.query(CryptoWallet).filter(
        CryptoWallet.id == wallet_id,
        CryptoWallet.user_id == current_user['user_id']
    ).first()

    if not wallet:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Wallet not found"
        )

    assets = db_session.query(CryptoAsset).filter(
        CryptoAsset.wallet_id == wallet_id
    ).all()

    return [CryptoAssetResponse.model_validate(a) for a in assets]

@router.get("/wallets/{wallet_id}/nfts", response_model=list[NFTAssetResponse])
async def get_wallet_nfts(
    wallet_id: int,
    current_user: dict = Depends(get_current_user),
    db_session: Any = Depends(db.get_db_dependency)
):
    """Get all NFTs in a wallet"""
    # Verify wallet ownership
    wallet = db_session.query(CryptoWallet).filter(
        CryptoWallet.id == wallet_id,
        CryptoWallet.user_id == current_user['user_id']
    ).first()

    if not wallet:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Wallet not found"
        )

    nfts = db_session.query(NFTAsset).filter(
        NFTAsset.wallet_id == wallet_id
    ).all()

    return [NFTAssetResponse.model_validate(n) for n in nfts]

@router.get("/transactions", response_model=list[CryptoTransactionResponse])
async def get_crypto_transactions(
    wallet_id: int | None = Query(None),
    status: str | None = Query(None),
    limit: int = Query(50, le=100),
    current_user: dict = Depends(get_current_user),
    db_session: Any = Depends(db.get_db_dependency)
):
    """Get crypto transactions for the current user"""
    query = db_session.query(CryptoTransaction).filter(
        CryptoTransaction.user_id == current_user['user_id']
    )

    if wallet_id:
        query = query.filter(CryptoTransaction.wallet_id == wallet_id)

    if status:
        query = query.filter(CryptoTransaction.status == status)

    transactions = query.order_by(desc(CryptoTransaction.created_at)).limit(limit).all()

    return [CryptoTransactionResponse.model_validate(t) for t in transactions]

@router.post("/transactions", response_model=CryptoTransactionResponse, status_code=status.HTTP_201_CREATED)
async def create_crypto_transaction(
    request: Request,
    transaction_data: CryptoTransactionCreate,
    current_user: dict = Depends(get_current_user),
    db_session: Any = Depends(db.get_db_dependency)
):
    """Create a new crypto transaction (send)"""

    # Verify wallet ownership
    if transaction_data.from_wallet_id:
        wallet = db_session.query(CryptoWallet).filter(
            CryptoWallet.id == transaction_data.from_wallet_id,
            CryptoWallet.user_id == current_user['user_id']
        ).first()

        if not wallet:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Wallet not found"
            )

        # Check if asset exists in wallet
        asset = db_session.query(CryptoAsset).filter(
            CryptoAsset.wallet_id == transaction_data.from_wallet_id,
            CryptoAsset.symbol == transaction_data.asset_symbol
        ).first()

        if not asset:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Asset {transaction_data.asset_symbol} not found in wallet"
            )

        # Check balance
        if float(asset.balance) < float(transaction_data.amount):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Insufficient balance"
            )

    # Calculate USD value
    price_info = CRYPTO_PRICES.get(transaction_data.asset_symbol, {"price": 0})
    usd_value = float(transaction_data.amount) * price_info["price"]

    # Calculate gas fee (mock)
    gas_fee = "0.005" if transaction_data.network == BlockchainNetwork.ETHEREUM else "0.0001"
    gas_fee_usd = float(gas_fee) * CRYPTO_PRICES.get("ETH", {"price": 2500})["price"]

    # Create transaction
    new_transaction = CryptoTransaction(
        user_id=current_user['user_id'],
        wallet_id=transaction_data.from_wallet_id,
        direction=TransactionDirection.SEND.value,
        asset_symbol=transaction_data.asset_symbol,
        amount=transaction_data.amount,
        usd_value_at_time=usd_value,
        from_address=wallet.address if transaction_data.from_wallet_id else None,
        to_address=transaction_data.to_address,
        network=transaction_data.network.value,
        gas_fee=gas_fee,
        gas_fee_usd=gas_fee_usd,
        status=CryptoTransactionStatus.PENDING,
        note=transaction_data.note
    )

    db_session.add(new_transaction)

    # Update asset balance if sending from wallet
    if transaction_data.from_wallet_id and asset:
        asset.balance = str(float(asset.balance) - float(transaction_data.amount))
        asset.usd_value = float(asset.balance) * price_info["price"]

    db_session.commit()
    db_session.refresh(new_transaction)

    # Log transaction

    # Simulate confirmation after a few seconds
    new_transaction.status = CryptoTransactionStatus.CONFIRMED
    new_transaction.confirmations = 6
    new_transaction.confirmed_at = datetime.now(UTC)
    db_session.commit()

    return CryptoTransactionResponse.model_validate(new_transaction)

@router.get("/defi/positions", response_model=list[DeFiPositionResponse])
async def get_defi_positions(
    wallet_id: int | None = Query(None),
    current_user: dict = Depends(get_current_user),
    db_session: Any = Depends(db.get_db_dependency)
):
    """Get all DeFi positions for the current user"""
    query = db_session.query(DeFiPosition)

    if wallet_id:
        # Verify wallet ownership
        wallet = db_session.query(CryptoWallet).filter(
            CryptoWallet.id == wallet_id,
            CryptoWallet.user_id == current_user['user_id']
        ).first()

        if not wallet:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Wallet not found"
            )

        query = query.filter(DeFiPosition.wallet_id == wallet_id)
    else:
        # Get all positions for user's wallets
        user_wallet_ids = db_session.query(CryptoWallet.id).filter(
            CryptoWallet.user_id == current_user['user_id']
        ).subquery()
        query = query.filter(DeFiPosition.wallet_id.in_(user_wallet_ids))

    positions = query.all()

    return [DeFiPositionResponse.model_validate(p) for p in positions]

@router.get("/portfolio/summary", response_model=CryptoPortfolioSummary)
async def get_portfolio_summary(
    current_user: dict = Depends(get_current_user),
    db_session: Any = Depends(db.get_db_dependency)
):
    """Get crypto portfolio summary for the current user"""
    # Get all user wallets
    wallets = db_session.query(CryptoWallet).filter(
        CryptoWallet.user_id == current_user['user_id']
    ).all()

    total_usd_value = 0.0
    total_assets = 0
    total_nfts = 0
    chains = set()
    top_holdings = []
    allocation_by_type: dict[str, float] = {}
    defi_positions_value = 0.0

    # Calculate totals
    for wallet in wallets:
        chains.add(wallet.network)

        # Get assets
        assets = db_session.query(CryptoAsset).filter(
            CryptoAsset.wallet_id == wallet.id
        ).all()

        for asset in assets:
            total_assets += 1
            total_usd_value += asset.usd_value
            allocation_by_type[asset.asset_type] = (
                allocation_by_type.get(asset.asset_type, 0.0) + asset.usd_value
            )
            top_holdings.append({
                "symbol": asset.symbol,
                "name": asset.name,
                "balance": asset.balance,
                "usd_value": asset.usd_value,
                "percentage": 0  # Will calculate after
            })

        # Get NFTs
        nfts_count = db_session.query(NFTAsset).filter(
            NFTAsset.wallet_id == wallet.id
        ).count()
        total_nfts += nfts_count

        # Get DeFi positions
        defi_positions = db_session.query(DeFiPosition).filter(
            DeFiPosition.wallet_id == wallet.id
        ).all()

        for position in defi_positions:
            defi_positions_value += position.usd_value

    # Calculate percentages and sort top holdings
    if total_usd_value > 0:
        for holding in top_holdings:
            holding["percentage"] = round((holding["usd_value"] / total_usd_value) * 100, 2)

    top_holdings.sort(key=lambda x: x["usd_value"], reverse=True)
    top_holdings = top_holdings[:5]  # Top 5 holdings

    # Build asset allocation grouped by asset type
    asset_allocation = [
        {
            "asset_type": asset_type,
            "usd_value": format_money(value),
            "percentage": round((value / total_usd_value) * 100, 2) if total_usd_value > 0 else 0,
        }
        for asset_type, value in sorted(
            allocation_by_type.items(), key=lambda x: x[1], reverse=True
        )
    ]

    # Calculate 24h change (mock)
    total_24h_change = random.uniform(-1000, 2000)
    total_24h_change_percent = (total_24h_change / total_usd_value * 100) if total_usd_value > 0 else 0

    return CryptoPortfolioSummary(
        total_usd_value=format_money(total_usd_value),
        total_assets=total_assets,
        total_nfts=total_nfts,
        chains=list(chains),
        top_holdings=top_holdings,
        asset_allocation=asset_allocation,
        defi_positions_value=format_money(defi_positions_value),
        total_24h_change=format_money(total_24h_change),
        total_24h_change_percent=round(total_24h_change_percent, 2)
    )

@router.post("/swap/quote", response_model=CryptoSwapQuote)
async def get_swap_quote(
    swap_request: CryptoSwapRequest,
    current_user: dict = Depends(get_current_user),
    db_session: Any = Depends(db.get_db_dependency)
):
    """Get a quote for a crypto swap"""
    # Verify wallet ownership
    wallet = db_session.query(CryptoWallet).filter(
        CryptoWallet.id == swap_request.wallet_id,
        CryptoWallet.user_id == current_user['user_id']
    ).first()

    if not wallet:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Wallet not found"
        )

    # Get prices
    from_price = CRYPTO_PRICES.get(swap_request.from_asset, {"price": 0})["price"]
    to_price = CRYPTO_PRICES.get(swap_request.to_asset, {"price": 0})["price"]

    if from_price == 0 or to_price == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid asset pair"
        )

    # Calculate swap
    from_value_usd = float(swap_request.amount) * from_price
    to_amount = from_value_usd / to_price

    # Apply slippage
    price_impact = random.uniform(0.1, 2.0)  # Mock price impact
    to_amount = to_amount * (1 - swap_request.slippage_tolerance / 100)

    # Mock gas estimate
    gas_estimate_usd = random.uniform(5, 25)

    # Mock route
    route = [swap_request.from_asset]
    if swap_request.from_asset != "ETH" and swap_request.to_asset != "ETH":
        route.append("ETH")
    route.append(swap_request.to_asset)

    return CryptoSwapQuote(
        from_asset=swap_request.from_asset,
        to_asset=swap_request.to_asset,
        from_amount=swap_request.amount,
        to_amount=str(round(to_amount, 6)),
        price_impact=round(price_impact, 2),
        gas_estimate_usd=round(gas_estimate_usd, 2),
        route=route,
        expires_at=datetime.now(UTC) + timedelta(minutes=1)
    )

@router.post("/wallets/{wallet_id}/sync")
async def sync_wallet(
    wallet_id: int,
    request: Request,
    current_user: dict = Depends(get_current_user),
    db_session: Any = Depends(db.get_db_dependency)
):
    """Sync wallet data from blockchain"""

    # Verify wallet ownership
    wallet = db_session.query(CryptoWallet).filter(
        CryptoWallet.id == wallet_id,
        CryptoWallet.user_id == current_user['user_id']
    ).first()

    if not wallet:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Wallet not found"
        )

    # Update last synced time
    wallet.last_synced = datetime.now(UTC)
    db_session.commit()

    # Log sync

    return {"message": "Wallet synced successfully", "last_synced": wallet.last_synced}
