"""
Crypto manager for handling digital asset data generation and management.
"""
import hashlib
import random
from datetime import UTC, datetime, timedelta

from ..models import (
    BlockchainNetwork,
    CryptoAsset,
    CryptoAssetType,
    CryptoTransaction,
    CryptoTransactionStatus,
    CryptoWallet,
    DeFiPosition,
    DeFiProtocolType,
    NFTAsset,
    TransactionDirection,
)


def compute_user_crypto_holdings(data_manager, user_id: int) -> tuple[float, dict[str, float]]:
    """Single source of truth for a user's crypto wallet holdings.

    Returns the total USD value of all crypto assets held across the user's
    wallets along with a breakdown of that value by asset type. Both the crypto
    portfolio summary and the investment portfolio summary use this so the two
    pages can never disagree about how much crypto the user holds.
    """
    wallet_ids = {
        w["id"] for w in data_manager.crypto_wallets if w.get("user_id") == user_id
    }
    total_value = 0.0
    value_by_type: dict[str, float] = {}

    for asset in data_manager.crypto_assets:
        if asset.get("wallet_id") not in wallet_ids:
            continue
        value = float(asset.get("usd_value") or 0.0)
        total_value += value
        asset_type = asset.get("asset_type") or "token"
        value_by_type[asset_type] = value_by_type.get(asset_type, 0.0) + value

    return total_value, value_by_type


class CryptoManager:
    """Manager for crypto-related data generation and operations."""

    # Crypto assets with realistic data
    CRYPTO_ASSETS = {
        "BTC": {
            "name": "Bitcoin",
            "type": CryptoAssetType.NATIVE,
            "networks": [BlockchainNetwork.BITCOIN],
            "price_range": (40000, 50000),
            "volatility": 0.05
        },
        "ETH": {
            "name": "Ethereum",
            "type": CryptoAssetType.NATIVE,
            "networks": [BlockchainNetwork.ETHEREUM, BlockchainNetwork.POLYGON, BlockchainNetwork.ARBITRUM],
            "price_range": (2000, 3000),
            "volatility": 0.06
        },
        "USDC": {
            "name": "USD Coin",
            "type": CryptoAssetType.STABLECOIN,
            "networks": [BlockchainNetwork.ETHEREUM, BlockchainNetwork.POLYGON, BlockchainNetwork.SOLANA],
            "price_range": (0.99, 1.01),
            "volatility": 0.001,
            "contract_address": "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"
        },
        "USDT": {
            "name": "Tether",
            "type": CryptoAssetType.STABLECOIN,
            "networks": [BlockchainNetwork.ETHEREUM, BlockchainNetwork.POLYGON, BlockchainNetwork.SOLANA],
            "price_range": (0.99, 1.01),
            "volatility": 0.001,
            "contract_address": "0xdac17f958d2ee523a2206206994597c13d831ec7"
        },
        "SOL": {
            "name": "Solana",
            "type": CryptoAssetType.NATIVE,
            "networks": [BlockchainNetwork.SOLANA],
            "price_range": (80, 120),
            "volatility": 0.08
        },
        "MATIC": {
            "name": "Polygon",
            "type": CryptoAssetType.NATIVE,
            "networks": [BlockchainNetwork.POLYGON],
            "price_range": (0.7, 1.0),
            "volatility": 0.07
        },
        "LINK": {
            "name": "Chainlink",
            "type": CryptoAssetType.TOKEN,
            "networks": [BlockchainNetwork.ETHEREUM, BlockchainNetwork.POLYGON],
            "price_range": (12, 18),
            "volatility": 0.06,
            "contract_address": "0x514910771af9ca656af840dff83e8264ecf986ca"
        },
        "UNI": {
            "name": "Uniswap",
            "type": CryptoAssetType.TOKEN,
            "networks": [BlockchainNetwork.ETHEREUM, BlockchainNetwork.POLYGON],
            "price_range": (5, 8),
            "volatility": 0.07,
            "contract_address": "0x1f9840a85d5af5bf1d1762f925bdaddc4201f984"
        },
        "AAVE": {
            "name": "Aave",
            "type": CryptoAssetType.TOKEN,
            "networks": [BlockchainNetwork.ETHEREUM, BlockchainNetwork.POLYGON],
            "price_range": (80, 120),
            "volatility": 0.06,
            "contract_address": "0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9"
        }
    }

    # NFT Collections
    NFT_COLLECTIONS = [
        {
            "name": "Bored Ape Yacht Club",
            "contract_address": "0xbc4ca0eda7647a8ab7c2061c2e118a18a936f13d",
            "floor_price_range": (25, 35),
            "network": BlockchainNetwork.ETHEREUM
        },
        {
            "name": "CryptoPunks",
            "contract_address": "0xb47e3cd837ddf8e4c57f05d70ab865de6e193bbb",
            "floor_price_range": (40, 60),
            "network": BlockchainNetwork.ETHEREUM
        },
        {
            "name": "Azuki",
            "contract_address": "0xed5af388653567af2f388e6224dc7c4b3241c544",
            "floor_price_range": (10, 15),
            "network": BlockchainNetwork.ETHEREUM
        },
        {
            "name": "Doodles",
            "contract_address": "0x8a90cab2b38dba80c64b7734e58ee1db38b8992e",
            "floor_price_range": (5, 8),
            "network": BlockchainNetwork.ETHEREUM
        }
    ]

    # DeFi Protocols
    DEFI_PROTOCOLS = [
        {
            "name": "Aave",
            "type": DeFiProtocolType.LENDING,
            "networks": [BlockchainNetwork.ETHEREUM, BlockchainNetwork.POLYGON],
            "apy_range": (2, 8)
        },
        {
            "name": "Compound",
            "type": DeFiProtocolType.LENDING,
            "networks": [BlockchainNetwork.ETHEREUM],
            "apy_range": (1.5, 6)
        },
        {
            "name": "Lido",
            "type": DeFiProtocolType.STAKING,
            "networks": [BlockchainNetwork.ETHEREUM],
            "apy_range": (4, 6)
        },
        {
            "name": "Uniswap V3",
            "type": DeFiProtocolType.LIQUIDITY,
            "networks": [BlockchainNetwork.ETHEREUM, BlockchainNetwork.POLYGON],
            "apy_range": (10, 30)
        },
        {
            "name": "Curve",
            "type": DeFiProtocolType.LIQUIDITY,
            "networks": [BlockchainNetwork.ETHEREUM],
            "apy_range": (5, 15)
        }
    ]

    def __init__(self, data_manager):
        self.data_manager = data_manager
        self._price_map: dict[str, dict[str, float]] = {}

    def generate_crypto_data(self, user_id: int, seed: int = 42):
        """Generate crypto data for a user."""
        random.seed(seed + user_id)

        # Build a single consistent price per symbol for this user so the same
        # token never shows two different prices across wallets. Uses its own
        # RNG so it doesn't disturb the rest of the deterministic generation.
        price_rng = random.Random(seed + user_id + 99999)
        self._price_map = {
            symbol: {
                "price": price_rng.uniform(*data["price_range"]),
                "change_24h": price_rng.uniform(-10, 10) * data["volatility"],
            }
            for symbol, data in self.CRYPTO_ASSETS.items()
        }

        # Create 1-3 wallets
        num_wallets = random.randint(1, 3)
        wallets = []

        for i in range(num_wallets):
            network = random.choice(list(BlockchainNetwork))
            wallet = CryptoWallet(
                user_id=user_id,
                name=f"{network.value.capitalize()} Wallet {i+1}",
                network=network.value,
                is_primary=(i == 0),
                last_synced=datetime.now(UTC) - timedelta(hours=random.randint(1, 24))
            )
            self.data_manager.crypto_wallets.append(wallet.to_dict())
            wallets.append(wallet)

        # Generate assets for each wallet
        for wallet in wallets:
            self._generate_wallet_assets(wallet, seed)

            # Generate NFTs for Ethereum wallets
            if wallet.network == BlockchainNetwork.ETHEREUM.value:
                self._generate_wallet_nfts(wallet, seed)

            # Generate DeFi positions
            self._generate_defi_positions(wallet, seed)

        # Generate transaction history
        self._generate_transaction_history(user_id, wallets, seed)

    def _generate_wallet_assets(self, wallet, seed: int):
        """Generate crypto assets for a wallet."""
        random.seed(seed + wallet.id)

        # Filter assets available on this network
        available_assets = [
            (symbol, data) for symbol, data in self.CRYPTO_ASSETS.items()
            if any(network.value == wallet.network for network in data["networks"])
        ]

        # Generate 2-6 assets (or all available if less than 2)
        if len(available_assets) <= 2:
            selected_assets = available_assets
        else:
            num_assets = random.randint(2, min(6, len(available_assets)))
            selected_assets = random.sample(available_assets, num_assets)

        for symbol, asset_data in selected_assets:
            # Generate balance
            if asset_data["type"] == CryptoAssetType.STABLECOIN:
                balance = str(round(random.uniform(100, 10000), 2))
            elif symbol in ["BTC", "ETH"]:
                balance = str(round(random.uniform(0.01, 2), 6))
            else:
                balance = str(round(random.uniform(10, 1000), 4))

            # Use the per-symbol consistent price so the same token shows the
            # same price/24h change in every wallet.
            symbol_price = self._price_map.get(symbol)
            if symbol_price is not None:
                price = symbol_price["price"]
                change_24h = symbol_price["change_24h"]
            else:
                price = random.uniform(*asset_data["price_range"])
                change_24h = random.uniform(-10, 10) * asset_data["volatility"]
            usd_value = float(balance) * price

            asset = CryptoAsset(
                wallet_id=wallet.id,
                symbol=symbol,
                name=asset_data["name"],
                asset_type=asset_data["type"].value,
                network=wallet.network,
                contract_address=asset_data.get("contract_address"),
                balance=balance,
                usd_value=usd_value,
                price_usd=price,
                change_24h=change_24h,
                last_updated=datetime.now(UTC)
            )
            self.data_manager.crypto_assets.append(asset.to_dict())

    def _generate_wallet_nfts(self, wallet, seed: int):
        """Generate NFTs for a wallet."""
        random.seed(seed + wallet.id + 1000)

        # 30% chance to have NFTs
        if random.random() > 0.3:
            return

        # Generate 1-5 NFTs
        num_nfts = random.randint(1, 5)

        for _ in range(num_nfts):
            collection = random.choice(self.NFT_COLLECTIONS)
            token_id = str(random.randint(1, 10000))

            # Generate metadata
            metadata = {
                "attributes": [
                    {"trait_type": "Background", "value": random.choice(["Blue", "Red", "Green", "Purple"])},
                    {"trait_type": "Type", "value": random.choice(["Common", "Rare", "Epic", "Legendary"])},
                    {"trait_type": "Edition", "value": random.randint(1, 100)}
                ]
            }

            floor_price = random.uniform(*collection["floor_price_range"]) * 2500  # ETH price
            estimated_value = floor_price * random.uniform(0.8, 1.5)

            nft = NFTAsset(
                wallet_id=wallet.id,
                collection_name=collection["name"],
                token_id=token_id,
                name=f"{collection['name']} #{token_id}",
                description=f"A unique NFT from the {collection['name']} collection",
                image_url=f"https://example.com/nft/{collection['name'].lower().replace(' ', '-')}/{token_id}.png",
                metadata=metadata,
                network=collection["network"].value,
                contract_address=collection["contract_address"],
                floor_price_usd=floor_price,
                estimated_value_usd=estimated_value,
                acquired_at=datetime.now(UTC) - timedelta(days=random.randint(30, 365))
            )
            self.data_manager.nft_assets.append(nft.to_dict())

    def _generate_defi_positions(self, wallet, seed: int):
        """Generate DeFi positions for a wallet."""
        random.seed(seed + wallet.id + 2000)

        # 40% chance to have DeFi positions
        if random.random() > 0.4:
            return

        # Filter protocols available on this network
        available_protocols = [
            p for p in self.DEFI_PROTOCOLS
            if any(network.value == wallet.network for network in p["networks"])
        ]

        if not available_protocols:
            return

        # Generate 1-3 positions
        num_positions = random.randint(1, min(3, len(available_protocols)))
        selected_protocols = random.sample(available_protocols, num_positions)

        for protocol in selected_protocols:
            # Select asset for position
            wallet_assets = [
                a for a in self.data_manager.crypto_assets
                if a.get("wallet_id") == wallet.id
            ]

            if not wallet_assets:
                continue

            asset = random.choice(wallet_assets)

            # Generate position data
            if protocol["type"] == DeFiProtocolType.LENDING:
                position_type = random.choice(["lending", "borrowing"])
            elif protocol["type"] == DeFiProtocolType.STAKING:
                position_type = "staking"
            else:
                position_type = "LP"

            amount = str(round(float(asset["balance"]) * random.uniform(0.1, 0.5), 6))
            usd_value = float(amount) * asset["price_usd"]
            apy = random.uniform(*protocol["apy_range"])

            # Calculate rewards (mock)
            days_active = random.randint(30, 180)
            daily_reward = (usd_value * apy / 100) / 365
            total_rewards = daily_reward * days_active
            rewards_earned = str(round(total_rewards / asset["price_usd"], 6))

            position = DeFiPosition(
                wallet_id=wallet.id,
                protocol=protocol["name"],
                protocol_type=protocol["type"].value,
                position_type=position_type,
                asset_symbol=asset["symbol"],
                amount=amount,
                usd_value=usd_value,
                apy=apy,
                rewards_earned=rewards_earned,
                rewards_usd=total_rewards,
                started_at=datetime.now(UTC) - timedelta(days=days_active)
            )
            self.data_manager.defi_positions.append(position.to_dict())

    def _generate_transaction_history(self, user_id: int, wallets: list[CryptoWallet], seed: int):
        """Generate transaction history for user's wallets."""
        random.seed(seed + user_id + 3000)

        # Generate 10-30 transactions
        num_transactions = random.randint(10, 30)

        for i in range(num_transactions):
            wallet = random.choice(wallets)

            # Get wallet assets
            wallet_assets = [
                a for a in self.data_manager.crypto_assets
                if a.get("wallet_id") == wallet.id
            ]

            if not wallet_assets:
                continue

            asset = random.choice(wallet_assets)

            # Determine transaction type
            direction = random.choice(list(TransactionDirection))

            # Generate transaction data
            amount = str(round(random.uniform(0.01, float(asset["balance"]) * 0.1), 6))
            usd_value = float(amount) * asset["price_usd"]

            # Generate addresses
            if direction == TransactionDirection.SEND:
                from_address = wallet.address
                to_address = "0x" + hashlib.sha256(f"{i}".encode()).hexdigest()[:40]
            elif direction == TransactionDirection.RECEIVE:
                from_address = "0x" + hashlib.sha256(f"{i}".encode()).hexdigest()[:40]
                to_address = wallet.address
            else:  # SWAP, MINT, BURN
                from_address = wallet.address
                to_address = "0x" + hashlib.sha256(f"contract{i}".encode()).hexdigest()[:40]

            # Gas fees
            if wallet.network == BlockchainNetwork.ETHEREUM.value:
                gas_fee = str(round(random.uniform(0.001, 0.01), 6))
                gas_fee_usd = float(gas_fee) * 2500  # ETH price
            else:
                gas_fee = str(round(random.uniform(0.00001, 0.0001), 6))
                gas_fee_usd = random.uniform(0.01, 0.1)

            # Transaction timing
            created_at = datetime.now(UTC) - timedelta(
                days=random.randint(0, 180),
                hours=random.randint(0, 23),
                minutes=random.randint(0, 59)
            )

            transaction = CryptoTransaction(
                user_id=user_id,
                wallet_id=wallet.id,
                direction=direction.value,
                asset_symbol=asset["symbol"],
                amount=amount,
                usd_value_at_time=usd_value,
                from_address=from_address,
                to_address=to_address,
                network=wallet.network,
                gas_fee=gas_fee,
                gas_fee_usd=gas_fee_usd,
                status=CryptoTransactionStatus.CONFIRMED,
                confirmations=random.randint(6, 1000),
                created_at=created_at,
                confirmed_at=created_at + timedelta(minutes=random.randint(1, 30))
            )
            self.data_manager.crypto_transactions.append(transaction.to_dict())

    def get_current_prices(self) -> dict[str, float]:
        """Get current mock prices for all assets."""
        prices = {}
        for symbol, data in self.CRYPTO_ASSETS.items():
            prices[symbol] = random.uniform(*data["price_range"])
        return prices

    def update_asset_prices(self):
        """Update all asset prices and values."""
        prices = self.get_current_prices()

        for asset in self.data_manager.crypto_assets:
            if asset["symbol"] in prices:
                old_price = asset["price_usd"]
                new_price = prices[asset["symbol"]]

                # Update price and value
                asset["price_usd"] = new_price
                asset["usd_value"] = float(asset["balance"]) * new_price

                # Calculate 24h change
                asset["change_24h"] = ((new_price - old_price) / old_price) * 100
                asset["last_updated"] = datetime.now(UTC)
