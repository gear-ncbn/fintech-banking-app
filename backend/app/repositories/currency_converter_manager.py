"""
Virtual currency converter management (Airtm-like P2P currency exchange).
"""
import random
import string
from datetime import UTC, date, datetime, timedelta
from decimal import Decimal
from typing import Any

from app.models.entities.currency_converter_models import (
    ConversionHistoryResponse,
    ConversionOrderCreate,
    ConversionOrderResponse,
    ConversionQuoteRequest,
    ConversionQuoteResponse,
    CurrencyBalanceResponse,
    CurrencyPair,
    CurrencySupportedResponse,
    CurrencyType,
    ExchangeRateResponse,
    P2PTradeRequest,
    P2PTradeResponse,
    PeerOfferCreate,
    PeerOfferResponse,
    TransferLimitResponse,
    TransferMethod,
    TransferStatus,
    VerificationLevel,
)


class CurrencyConverterManager:
    """Manages P2P currency conversion and virtual currency operations."""

    def __init__(self, data_manager):
        self.data_manager = data_manager
        self._init_supported_currencies()
        self._init_exchange_rates()

    def _init_supported_currencies(self):
        """Initialize supported currencies."""
        if not hasattr(self.data_manager, 'supported_currencies'):
            self.data_manager.supported_currencies = [
                # Major fiat currencies
                {'code': 'USD', 'name': 'US Dollar', 'type': 'fiat', 'symbol': '$', 'decimals': 2},
                {'code': 'EUR', 'name': 'Euro', 'type': 'fiat', 'symbol': '€', 'decimals': 2},
                {'code': 'GBP', 'name': 'British Pound', 'type': 'fiat', 'symbol': '£', 'decimals': 2},
                {'code': 'JPY', 'name': 'Japanese Yen', 'type': 'fiat', 'symbol': '¥', 'decimals': 0},
                {'code': 'CNY', 'name': 'Chinese Yuan', 'type': 'fiat', 'symbol': '¥', 'decimals': 2},
                {'code': 'MXN', 'name': 'Mexican Peso', 'type': 'fiat', 'symbol': '$', 'decimals': 2},
                {'code': 'BRL', 'name': 'Brazilian Real', 'type': 'fiat', 'symbol': 'R$', 'decimals': 2},
                {'code': 'ARS', 'name': 'Argentine Peso', 'type': 'fiat', 'symbol': '$', 'decimals': 2},
                {'code': 'COP', 'name': 'Colombian Peso', 'type': 'fiat', 'symbol': '$', 'decimals': 0},
                {'code': 'VES', 'name': 'Venezuelan Bolivar', 'type': 'fiat', 'symbol': 'Bs', 'decimals': 2},
                # Cryptocurrencies
                {'code': 'BTC', 'name': 'Bitcoin', 'type': 'crypto', 'symbol': '₿', 'decimals': 8},
                {'code': 'ETH', 'name': 'Ethereum', 'type': 'crypto', 'symbol': 'Ξ', 'decimals': 18},
                {'code': 'USDT', 'name': 'Tether', 'type': 'crypto', 'symbol': '₮', 'decimals': 6},
                {'code': 'USDC', 'name': 'USD Coin', 'type': 'crypto', 'symbol': '$', 'decimals': 6},
                # Virtual currency
                {'code': 'VIRT', 'name': 'Virtual Dollar', 'type': 'virtual', 'symbol': 'V$', 'decimals': 2}
            ]

    def _init_exchange_rates(self):
        """Initialize exchange rates."""
        if not hasattr(self.data_manager, 'exchange_rates'):
            self.data_manager.exchange_rates = {}

        # Base rates (to USD)
        base_rates = {
            'USD': 1.0,
            'EUR': 0.85,
            'GBP': 0.73,
            'JPY': 110.0,
            'CNY': 6.45,
            'MXN': 20.0,
            'BRL': 5.2,
            'ARS': 98.0,
            'COP': 3800.0,
            'VES': 4000000.0,
            'BTC': 0.000023,
            'ETH': 0.00032,
            'USDT': 1.0,
            'USDC': 1.0,
            'VIRT': 1.0
        }

        # Calculate cross rates
        for from_curr, from_rate in base_rates.items():
            for to_curr, to_rate in base_rates.items():
                if from_curr != to_curr:
                    pair_key = f"{from_curr}/{to_curr}"
                    self.data_manager.exchange_rates[pair_key] = to_rate / from_rate

    def _generate_quote_id(self) -> str:
        """Generate unique quote ID."""
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        random_part = ''.join(random.choices(string.digits + string.ascii_uppercase, k=6))
        return f"QT-{timestamp}-{random_part}"

    def _generate_order_number(self) -> str:
        """Generate unique order number."""
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        random_part = ''.join(random.choices(string.digits, k=6))
        return f"CVT-{timestamp}-{random_part}"

    def _generate_trade_number(self) -> str:
        """Generate unique P2P trade number."""
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        random_part = ''.join(random.choices(string.digits, k=6))
        return f"P2P-{timestamp}-{random_part}"

    def get_supported_currencies(self, currency_type: CurrencyType | None = None) -> list[CurrencySupportedResponse]:
        """Get list of supported currencies."""
        currencies = []

        for curr in self.data_manager.supported_currencies:
            if currency_type and curr['type'] != currency_type.value:
                continue

            # Determine supported transfer methods
            methods = []
            if curr['type'] == 'fiat':
                methods = [TransferMethod.BANK_TRANSFER, TransferMethod.WIRE_TRANSFER]
                if curr['code'] == 'USD':
                    methods.extend([TransferMethod.PAYPAL, TransferMethod.ZELLE])
            elif curr['type'] == 'crypto':
                methods = [TransferMethod.CRYPTO_WALLET]
            else:  # virtual
                methods = list(TransferMethod)

            currencies.append(CurrencySupportedResponse(
                code=curr['code'],
                name=curr['name'],
                type=CurrencyType(curr['type']),
                symbol=curr['symbol'],
                decimal_places=curr.get('decimal_places', curr.get('decimals', 2)),
                min_amount=Decimal('10'),
                max_amount=Decimal('100000'),
                is_active=True,
                supported_methods=methods,
                countries=['US', 'MX', 'BR', 'AR', 'CO', 'VE'] if curr['type'] == 'fiat' else []
            ))

        return currencies

    def get_exchange_rate(self, from_currency: str, to_currency: str) -> ExchangeRateResponse | None:
        """Get exchange rate between two currencies."""
        # Try both key formats for compatibility
        pair_key_slash = f"{from_currency}/{to_currency}"
        pair_key_underscore = f"{from_currency}_{to_currency}"
        rate = self.data_manager.exchange_rates.get(pair_key_slash) or self.data_manager.exchange_rates.get(pair_key_underscore)

        if not rate:
            return None

        # Get currency types
        from_curr = next((c for c in self.data_manager.supported_currencies if c['code'] == from_currency), None)
        to_curr = next((c for c in self.data_manager.supported_currencies if c['code'] == to_currency), None)

        if not from_curr or not to_curr:
            return None

        # Calculate spread and fees
        base_spread = 0.02  # 2% spread
        if from_curr['type'] == 'crypto' or to_curr['type'] == 'crypto':
            base_spread = 0.015  # 1.5% for crypto

        # Calculate bid/ask with spread
        spread = rate * base_spread
        bid = rate - spread
        ask = rate + spread

        # Effective rate the customer actually receives when converting *from*
        # this currency: the mid rate reduced by the spread (i.e. the bid).
        # This makes the advertised spread real instead of cosmetic.
        effective_rate = bid

        return ExchangeRateResponse(
            from_currency=from_currency,
            to_currency=to_currency,
            rate=Decimal(str(rate)),
            bid=Decimal(str(bid)),
            ask=Decimal(str(ask)),
            spread_percentage=Decimal(str(base_spread * 100)),
            spread=Decimal(str(base_spread)),
            effective_rate=Decimal(str(effective_rate)),
            timestamp=datetime.now(UTC),
            source="market"
        )

    def create_conversion_quote(self, user_id: int, request: ConversionQuoteRequest) -> ConversionQuoteResponse:
        """Create a conversion quote."""
        # Get exchange rate
        rate_info = self.get_exchange_rate(request.from_currency, request.to_currency)
        if not rate_info:
            raise ValueError("Currency pair not supported")

        # Calculate amounts
        from_amount = Decimal(str(request.amount))

        # The spread is already baked into the effective (bid) rate, so the
        # customer's cost comes from the rate itself rather than an additional
        # explicit fee. Charging both would double-count the spread and make
        # the quote disagree with the advertised "Effective Rate".
        fee_percentage = rate_info.spread_percentage
        fee_amount = Decimal("0")
        total_cost = from_amount

        # Final amount the user receives, using the effective (spread-adjusted)
        # rate that is advertised on the exchange-rate response.
        effective_rate = rate_info.effective_rate
        to_amount = from_amount * effective_rate

        quote_id = self._generate_quote_id()

        # Store quote
        if not hasattr(self.data_manager, 'conversion_quotes'):
            self.data_manager.conversion_quotes = []

        quote_data = {
            'id': quote_id,
            'quote_id': quote_id,  # Add both for compatibility
            'user_id': user_id,
            'from_currency': request.from_currency,
            'to_currency': request.to_currency,
            'from_amount': float(from_amount),
            'to_amount': float(to_amount),
            'exchange_rate': float(effective_rate),
            'fee_amount': float(fee_amount),
            'fee_percentage': float(fee_percentage),
            'total_cost': float(total_cost),
            'transfer_method': request.transfer_method,
            'created_at': datetime.now(UTC),
            'expires_at': datetime.now(UTC) + timedelta(minutes=15)
        }

        self.data_manager.conversion_quotes.append(quote_data)

        # Determine estimated completion time
        is_crypto = any(c['code'] == request.from_currency and c['type'] == 'crypto'
                       for c in self.data_manager.supported_currencies)
        estimated_completion = "1-2 hours" if is_crypto else "1-3 business days"

        return ConversionQuoteResponse(
            quote_id=quote_id,
            from_currency=request.from_currency,
            to_currency=request.to_currency,
            from_amount=from_amount,
            to_amount=to_amount,
            exchange_rate=effective_rate,
            fee_amount=fee_amount,
            fee_percentage=fee_percentage,
            total_cost=total_cost,
            you_receive=to_amount,
            transfer_method=request.transfer_method,
            estimated_completion=estimated_completion,
            expires_at=quote_data['expires_at'],
            breakdown={
                'exchange_rate': float(effective_rate),
                'spread': float(rate_info.spread_percentage),
                'platform_fee': float(fee_amount),
                'network_fee': 0
            }
        )

    def create_conversion_order(self, user_id: int, order_data: ConversionOrderCreate) -> ConversionOrderResponse:
        """Create a conversion order from a quote."""
        # Find quote
        if not hasattr(self.data_manager, 'conversion_quotes'):
            raise ValueError("Quote not found")

        quote = next((q for q in self.data_manager.conversion_quotes
                     if q['id'] == order_data.quote_id and q['user_id'] == user_id), None)

        if not quote:
            raise ValueError("Quote not found or expired")

        if quote['expires_at'] < datetime.now(UTC):
            raise ValueError("Quote has expired")

        # Create order
        if not hasattr(self.data_manager, 'conversion_orders'):
            self.data_manager.conversion_orders = []

        order_id = len(self.data_manager.conversion_orders) + 1
        order_number = self._generate_order_number()

        order = {
            'id': order_id,
            'order_number': order_number,
            'user_id': user_id,
            'status': TransferStatus.PENDING.value,
            'from_currency': quote['from_currency'],
            'to_currency': quote['to_currency'],
            'from_amount': quote['from_amount'],
            'to_amount': quote['to_amount'],
            'exchange_rate': quote['exchange_rate'],
            'fee_amount': quote['fee_amount'],
            'transfer_method': quote['transfer_method'] or TransferMethod.BANK_TRANSFER.value,
            'recipient_details': order_data.recipient_details,
            'purpose': order_data.purpose,
            'reference': order_data.reference,
            'peer_id': None,
            'created_at': datetime.now(UTC),
            'updated_at': datetime.now(UTC),
            'completed_at': None,
            'tracking_updates': [{
                'status': TransferStatus.PENDING.value,
                'timestamp': datetime.now(UTC),
                'message': 'Order created'
            }]
        }

        self.data_manager.conversion_orders.append(order)

        # Simulate processing
        self._process_conversion_order(order)

        return self._order_to_response(order)

    def get_user_orders(self, user_id: int, status: TransferStatus | None = None) -> list[ConversionOrderResponse]:
        """Get conversion orders for a user."""
        if not hasattr(self.data_manager, 'conversion_orders'):
            return []

        orders = [o for o in self.data_manager.conversion_orders if o['user_id'] == user_id]

        if status:
            orders = [o for o in orders if o['status'] == status.value]

        return [self._order_to_response(o) for o in orders]

    def create_peer_offer(self, user_id: int, offer_data: PeerOfferCreate) -> PeerOfferResponse:
        """Create a P2P currency offer."""
        if not hasattr(self.data_manager, 'peer_offers'):
            self.data_manager.peer_offers = []

        offer_id = len(self.data_manager.peer_offers) + 1

        # Get user verification level (mock)
        verification_level = self._get_user_verification_level(user_id)

        offer = {
            'id': offer_id,
            'peer_id': user_id,
            'currency': offer_data.currency,
            'currency_type': offer_data.currency_type.value,
            'amount_available': float(offer_data.amount_available),
            'amount_remaining': float(offer_data.amount_available),
            'rate_adjustment': offer_data.rate_adjustment,
            'transfer_methods': [m.value for m in offer_data.transfer_methods],
            'min_transaction': float(offer_data.min_transaction),
            'max_transaction': float(offer_data.max_transaction),
            'availability_hours': offer_data.availability_hours,
            'is_active': True,
            'created_at': datetime.now(UTC),
            'updated_at': datetime.now(UTC)
        }

        self.data_manager.peer_offers.append(offer)

        return self._offer_to_response(offer, user_id, verification_level)

    def search_peer_offers(self, currency: str, amount: float,
                          transfer_method: TransferMethod | None = None) -> list[PeerOfferResponse]:
        """Search for P2P offers."""
        if not hasattr(self.data_manager, 'peer_offers'):
            return []

        offers = []

        for offer in self.data_manager.peer_offers:
            if not offer['is_active']:
                continue

            if offer['currency'] != currency:
                continue

            if amount < offer['min_transaction'] or amount > offer['max_transaction']:
                continue

            if amount > offer['amount_remaining']:
                continue

            if transfer_method and transfer_method.value not in offer['transfer_methods']:
                continue

            # Get peer info
            verification_level = self._get_user_verification_level(offer['peer_id'])
            offers.append(self._offer_to_response(offer, offer['peer_id'], verification_level))

        # Sort by rate (best first)
        offers.sort(key=lambda x: x.rate)

        return offers

    def create_p2p_trade(self, user_id: int, trade_request: P2PTradeRequest) -> P2PTradeResponse:
        """Create a P2P trade."""
        if not hasattr(self.data_manager, 'peer_offers'):
            raise ValueError("Offer not found")

        offer = next((o for o in self.data_manager.peer_offers if o['id'] == trade_request.offer_id), None)

        if not offer or not offer.get('is_active', True):
            raise ValueError("Offer not found or inactive")

        # Handle amount_remaining which may not exist in all offers
        amount_remaining = offer.get('amount_remaining', offer.get('amount', offer.get('max_amount', 0)))
        if trade_request.amount > amount_remaining:
            raise ValueError("Insufficient amount available")

        if user_id == offer.get('peer_id', offer.get('user_id')):
            raise ValueError("Cannot trade with yourself")

        # Create trade
        if not hasattr(self.data_manager, 'p2p_trades'):
            self.data_manager.p2p_trades = []

        trade_id = len(self.data_manager.p2p_trades) + 1
        trade_number = self._generate_trade_number()

        # Get currency from offer
        currency = offer.get('from_currency', offer.get('currency', 'USD'))

        # Calculate rate with adjustment
        base_rate = self.data_manager.exchange_rates.get(f"{currency}/USD", 1.0)
        rate_adjustment = offer.get('rate_adjustment', 0)
        adjusted_rate = base_rate * (1 + rate_adjustment / 100)

        # Handle payment method - accept both string and TransferMethod
        if trade_request.payment_method:
            # Convert string payment method to TransferMethod enum
            try:
                transfer_method = TransferMethod(trade_request.payment_method)
            except ValueError:
                # If not a valid enum, use a default
                transfer_method = TransferMethod.BANK_TRANSFER
        elif trade_request.transfer_method:
            transfer_method = trade_request.transfer_method
        else:
            transfer_method = TransferMethod.BANK_TRANSFER

        trade = {
            'id': trade_id,
            'trade_number': trade_number,
            'buyer_id': user_id,
            'seller_id': offer.get('peer_id', offer.get('user_id', 1)),
            'offer_id': offer['id'],
            'status': TransferStatus.PENDING.value,
            'amount': float(trade_request.amount),
            'currency': currency,
            'rate': adjusted_rate,
            'total_cost': float(trade_request.amount) * adjusted_rate,
            'fee_amount': float(trade_request.amount) * 0.01,  # 1% platform fee
            'transfer_method': transfer_method.value,
            'payment_details': trade_request.payment_details or {},
            'chat_enabled': True,
            'escrow_released': False,
            'dispute_id': None,
            'created_at': datetime.now(UTC),
            'expires_at': datetime.now(UTC) + timedelta(hours=2),
            'completed_at': None
        }

        self.data_manager.p2p_trades.append(trade)

        # Update offer
        if 'amount_remaining' in offer:
            offer['amount_remaining'] -= float(trade_request.amount)
        offer['updated_at'] = datetime.now(UTC)

        return self._trade_to_response(trade)

    def get_user_balances(self, user_id: int) -> list[CurrencyBalanceResponse]:
        """Get user's currency balances."""
        if not hasattr(self.data_manager, 'currency_balances'):
            self.data_manager.currency_balances = []

        # Get or create balances
        user_balances = [b for b in self.data_manager.currency_balances if b['user_id'] == user_id]

        if not user_balances:
            # Create default USD balance
            usd_balance = {
                'user_id': user_id,
                'currency': 'USD',
                'currency_type': CurrencyType.FIAT.value,
                'balance': 1000.0,  # Start with $1000
                'available_balance': 1000.0,
                'locked_balance': 0.0,
                'pending_balance': 0.0,
                'total_converted': 0.0,
                'last_activity': datetime.now(UTC)
            }
            self.data_manager.currency_balances.append(usd_balance)
            user_balances = [usd_balance]

        return [self._balance_to_response(b) for b in user_balances]

    def get_conversion_history(self, user_id: int) -> ConversionHistoryResponse:
        """Get user's conversion history and statistics."""
        orders = self.get_user_orders(user_id)

        if not orders:
            return ConversionHistoryResponse(
                total_conversions=0,
                total_volume=Decimal('0'),
                currencies_used=[],
                favorite_pairs=[],
                average_fee_percentage=Decimal('0'),
                total_fees_paid=Decimal('0'),
                member_since=date.today(),
                verification_level=VerificationLevel.BASIC
            )

        # Calculate statistics
        total_volume = sum(o.from_amount for o in orders)
        total_fees = sum(o.fee_amount for o in orders)
        currencies = set()
        pairs = []

        for order in orders:
            currencies.add(order.from_currency)
            currencies.add(order.to_currency)
            pairs.append((order.from_currency, order.to_currency))

        # Find most common pairs
        pair_counts = {}
        for pair in pairs:
            key = f"{pair[0]}/{pair[1]}"
            pair_counts[key] = pair_counts.get(key, 0) + 1

        favorite_pairs = []
        for pair_str, _count in sorted(pair_counts.items(), key=lambda x: x[1], reverse=True)[:3]:
            from_curr, to_curr = pair_str.split('/')
            from_type = next((c['type'] for c in self.data_manager.supported_currencies if c['code'] == from_curr), 'fiat')
            to_type = next((c['type'] for c in self.data_manager.supported_currencies if c['code'] == to_curr), 'fiat')

            favorite_pairs.append(CurrencyPair(
                from_currency=from_curr,
                to_currency=to_curr,
                from_type=CurrencyType(from_type),
                to_type=CurrencyType(to_type)
            ))

        avg_fee = (total_fees / total_volume * 100) if total_volume > 0 else 0

        return ConversionHistoryResponse(
            total_conversions=len(orders),
            total_volume=total_volume,
            currencies_used=list(currencies),
            favorite_pairs=favorite_pairs,
            average_fee_percentage=Decimal(str(round(avg_fee, 2))),
            total_fees_paid=total_fees,
            member_since=min(o.created_at.date() for o in orders),
            verification_level=self._get_user_verification_level(user_id)
        )

    def get_transfer_limits(self, user_id: int) -> TransferLimitResponse:
        """Get user's transfer limits based on verification level."""
        verification_level = self._get_user_verification_level(user_id)

        # Define limits by level
        limits = {
            VerificationLevel.UNVERIFIED: {'daily': 500, 'monthly': 1000, 'transaction': 200},
            VerificationLevel.BASIC: {'daily': 2000, 'monthly': 10000, 'transaction': 1000},
            VerificationLevel.INTERMEDIATE: {'daily': 10000, 'monthly': 50000, 'transaction': 5000},
            VerificationLevel.ADVANCED: {'daily': 50000, 'monthly': 200000, 'transaction': 25000},
            VerificationLevel.PREMIUM: {'daily': 100000, 'monthly': 500000, 'transaction': 50000}
        }

        user_limits = limits[verification_level]

        # Calculate usage
        orders = self.get_user_orders(user_id)
        today = date.today()
        month_start = date(today.year, today.month, 1)

        daily_usage = sum(o.from_amount for o in orders if o.created_at.date() == today)
        monthly_usage = sum(o.from_amount for o in orders if o.created_at.date() >= month_start)

        return TransferLimitResponse(
            verification_level=verification_level,
            daily_limit=Decimal(str(user_limits['daily'])),
            monthly_limit=Decimal(str(user_limits['monthly'])),
            per_transaction_limit=Decimal(str(user_limits['transaction'])),
            daily_remaining=Decimal(str(max(0, user_limits['daily'] - float(daily_usage)))),
            monthly_remaining=Decimal(str(max(0, user_limits['monthly'] - float(monthly_usage)))),
            next_limit_reset=datetime.combine(today + timedelta(days=1), datetime.min.time()),
            upgrade_available=verification_level != VerificationLevel.PREMIUM
        )

    # Helper methods
    def _calculate_fee_percentage(self, from_currency: str, to_currency: str) -> float:
        """Calculate fee percentage based on currency pair."""
        base_fee = 2.0  # 2% base fee

        # Lower fees for stablecoins
        if from_currency in ['USDT', 'USDC'] or to_currency in ['USDT', 'USDC']:
            base_fee = 1.0

        # Higher fees for volatile currencies
        if from_currency in ['VES', 'ARS'] or to_currency in ['VES', 'ARS']:
            base_fee = 3.0

        return base_fee

    def _estimate_arrival_time(self, from_type: str, to_type: str) -> str:
        """Estimate transfer arrival time."""
        if from_type == 'crypto' and to_type == 'crypto':
            return "10-30 minutes"
        if from_type == 'virtual' or to_type == 'virtual':
            return "Instant"
        if from_type == 'fiat' and to_type == 'fiat':
            return "1-3 business days"
        return "1-24 hours"

    def _get_user_verification_level(self, user_id: int) -> VerificationLevel:
        """Get user's verification level (mock)."""
        # In real implementation, this would check KYC status
        levels = list(VerificationLevel)
        return levels[min(user_id % 5, len(levels) - 1)]

    def _process_conversion_order(self, order: dict[str, Any]):
        """Process a conversion order (simulation)."""
        # Simulate processing steps
        order['status'] = TransferStatus.PROCESSING.value
        order['tracking_updates'].append({
            'status': TransferStatus.PROCESSING.value,
            'timestamp': datetime.now(UTC),
            'message': 'Payment received, processing conversion'
        })

        # Simulate completion (in real system, this would be async)
        order['status'] = TransferStatus.COMPLETED.value
        order['completed_at'] = datetime.now(UTC)
        order['tracking_updates'].append({
            'status': TransferStatus.COMPLETED.value,
            'timestamp': datetime.now(UTC),
            'message': 'Conversion completed, funds sent to recipient'
        })

    # Response conversion methods
    def _order_to_response(self, order: dict[str, Any]) -> ConversionOrderResponse:
        """Convert order dict to response model."""
        return ConversionOrderResponse(
            id=order['id'],
            order_number=order['order_number'],
            user_id=order['user_id'],
            status=TransferStatus(order['status']),
            from_currency=order['from_currency'],
            to_currency=order['to_currency'],
            from_amount=Decimal(str(order['from_amount'])),
            to_amount=Decimal(str(order['to_amount'])),
            exchange_rate=Decimal(str(order['exchange_rate'])),
            fee_amount=Decimal(str(order['fee_amount'])),
            transfer_method=TransferMethod(order['transfer_method']),
            recipient_details=order['recipient_details'],
            purpose=order.get('purpose'),
            reference=order.get('reference'),
            peer_id=order.get('peer_id'),
            created_at=order['created_at'],
            updated_at=order['updated_at'],
            completed_at=order.get('completed_at'),
            tracking_updates=order.get('tracking_updates', [])
        )

    def _offer_to_response(self, offer: dict[str, Any], peer_id: int,
                          verification_level: VerificationLevel) -> PeerOfferResponse:
        """Convert offer dict to response model."""
        # Get peer stats (mock)
        peer_username = f"peer_{peer_id}"
        peer_rating = 4.5 + (peer_id % 5) * 0.1
        completed_trades = peer_id * 10 + random.randint(0, 50)

        # Calculate effective rate
        base_rate = self.data_manager.exchange_rates.get(f"{offer['currency']}/USD", 1.0)
        effective_rate = base_rate * (1 + offer['rate_adjustment'] / 100)

        return PeerOfferResponse(
            id=offer['id'],
            peer_id=peer_id,
            peer_username=peer_username,
            peer_rating=peer_rating,
            peer_completed_trades=completed_trades,
            peer_verification_level=verification_level,
            currency=offer['currency'],
            currency_type=CurrencyType(offer['currency_type']),
            amount_available=Decimal(str(offer['amount_available'])),
            amount_remaining=Decimal(str(offer['amount_remaining'])),
            rate=Decimal(str(effective_rate)),
            transfer_methods=[TransferMethod(m) for m in offer['transfer_methods']],
            min_transaction=Decimal(str(offer['min_transaction'])),
            max_transaction=Decimal(str(offer['max_transaction'])),
            response_time_minutes=random.randint(1, 15),
            is_online=random.choice([True, True, True, False]),  # 75% chance online
            last_seen=datetime.now(UTC) - timedelta(minutes=random.randint(0, 60)),
            created_at=offer['created_at']
        )

    def _trade_to_response(self, trade: dict[str, Any]) -> P2PTradeResponse:
        """Convert trade dict to response model."""
        return P2PTradeResponse(
            id=trade['id'],
            trade_number=trade['trade_number'],
            buyer_id=trade['buyer_id'],
            seller_id=trade['seller_id'],
            offer_id=trade['offer_id'],
            status=TransferStatus(trade['status']),
            amount=Decimal(str(trade['amount'])),
            currency=trade['currency'],
            rate=Decimal(str(trade['rate'])),
            total_cost=Decimal(str(trade['total_cost'])),
            fee_amount=Decimal(str(trade['fee_amount'])),
            transfer_method=TransferMethod(trade['transfer_method']),
            payment_details=trade['payment_details'],
            chat_enabled=trade['chat_enabled'],
            escrow_released=trade['escrow_released'],
            dispute_id=trade.get('dispute_id'),
            created_at=trade['created_at'],
            expires_at=trade['expires_at'],
            completed_at=trade.get('completed_at')
        )

    def _balance_to_response(self, balance: dict[str, Any]) -> CurrencyBalanceResponse:
        """Convert balance dict to response model."""
        locked = Decimal(str(balance.get('locked_balance', balance.get('pending_balance', 0))))
        return CurrencyBalanceResponse(
            currency=balance['currency'],
            currency_type=CurrencyType(balance['currency_type']),
            balance=Decimal(str(balance.get('balance', 0))),
            available_balance=Decimal(str(balance.get('available_balance', 0))),
            locked_balance=locked,
            pending_balance=locked,  # Same value for compatibility
            total_converted=Decimal(str(balance.get('total_converted', 0))),
            last_activity=balance.get('last_activity')
        )
