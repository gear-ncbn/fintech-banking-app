"""
Investment management repository for handling ETF, stock, and crypto trading operations.
"""
import random
import string
from datetime import UTC, date, datetime, timedelta
from decimal import Decimal
from typing import Any

from app.models.entities.investment_models import (
    AssetResponse,
    AssetType,
    ETFDetailResponse,
    InvestmentAccountCreate,
    InvestmentAccountResponse,
    InvestmentAccountType,
    InvestmentSummaryResponse,
    MarketDataResponse,
    OrderSide,
    OrderStatus,
    OrderType,
    PortfolioAnalysisResponse,
    PortfolioResponse,
    PortfolioRiskLevel,
    PositionResponse,
    StockDetailResponse,
    TradeOrderCreate,
    TradeOrderResponse,
    WatchlistCreate,
    WatchlistResponse,
)


class InvestmentManager:
    """Manages investment-related data and operations."""

    def __init__(self, data_manager):
        self.data_manager = data_manager

    def _generate_account_number(self) -> str:
        """Generate unique investment account number."""
        prefix = "INV"
        random_part = ''.join(random.choices(string.digits, k=8))
        return f"{prefix}-{random_part}"

    def _generate_order_number(self) -> str:
        """Generate unique order number."""
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        random_part = ''.join(random.choices(string.digits, k=4))
        return f"ORD-{timestamp}-{random_part}"

    def _generate_trade_number(self) -> str:
        """Generate unique trade number."""
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        random_part = ''.join(random.choices(string.digits, k=4))
        return f"TRD-{timestamp}-{random_part}"

    def create_investment_account(self, user_id: int,
                                account_data: InvestmentAccountCreate) -> InvestmentAccountResponse:
        """Create a new investment account."""
        # Generate new ID
        new_id = len(self.data_manager.investment_accounts) + 1

        # Create account record
        account = {
            'id': new_id,
            'user_id': user_id,
            'account_type': account_data.account_type.value,
            'account_number': self._generate_account_number(),
            'account_name': account_data.account_name,
            'balance': float(account_data.initial_deposit),
            'buying_power': float(account_data.initial_deposit),
            'portfolio_value': float(account_data.initial_deposit),
            'total_return': 0.0,
            'total_return_percent': 0.0,
            'is_retirement': account_data.is_retirement,
            'risk_tolerance': account_data.risk_tolerance.value,
            'created_at': datetime.now(UTC),
            'updated_at': datetime.now(UTC)
        }

        self.data_manager.investment_accounts.append(account)

        # Create default portfolio for the account
        portfolio_id = len(self.data_manager.investment_portfolios) + 1
        portfolio = {
            'id': portfolio_id,
            'account_id': new_id,
            'name': f"{account_data.account_name} Portfolio",
            'total_value': float(account_data.initial_deposit),
            'total_cost_basis': float(account_data.initial_deposit),
            'total_gain_loss': 0.0,
            'total_gain_loss_percent': 0.0,
            'positions_count': 0,
            'asset_allocation': {'cash': 100.0},
            'risk_score': 1.0,  # Low risk for cash
            'created_at': datetime.now(UTC)
        }

        self.data_manager.investment_portfolios.append(portfolio)

        return self._account_to_response(account)

    def get_user_accounts(self, user_id: int) -> list[InvestmentAccountResponse]:
        """Get all investment accounts for a user."""
        accounts = [a for a in self.data_manager.investment_accounts
                   if a['user_id'] == user_id]

        return [self._account_to_response(a) for a in accounts]

    def get_account(self, account_id: int, user_id: int) -> InvestmentAccountResponse | None:
        """Get specific investment account."""
        account = next((a for a in self.data_manager.investment_accounts
                       if a['id'] == account_id and a['user_id'] == user_id), None)

        return self._account_to_response(account) if account else None

    def get_portfolio(self, account_id: int, user_id: int) -> PortfolioResponse | None:
        """Get portfolio for an account."""
        # Verify account ownership
        account = self.get_account(account_id, user_id)
        if not account:
            return None

        portfolio = next((p for p in self.data_manager.investment_portfolios
                         if p['account_id'] == account_id), None)

        if not portfolio:
            return None

        # Calculate asset allocation
        positions = [p for p in self.data_manager.investment_positions
                    if p['portfolio_id'] == portfolio['id']]

        asset_allocation = self._calculate_asset_allocation(positions, float(account.balance))
        portfolio['asset_allocation'] = asset_allocation
        portfolio['positions_count'] = len(positions)

        return self._portfolio_to_response(portfolio)

    def get_positions(self, portfolio_id: int, user_id: int) -> list[PositionResponse]:
        """Get all positions in a portfolio."""
        # Verify portfolio ownership through account
        portfolio = next((p for p in self.data_manager.investment_portfolios
                         if p['id'] == portfolio_id), None)

        if not portfolio:
            return []

        account = self.get_account(portfolio['account_id'], user_id)
        if not account:
            return []

        positions = [p for p in self.data_manager.investment_positions
                    if p['portfolio_id'] == portfolio_id]

        # Update current prices and calculate gains
        total_value = sum(p['current_value'] for p in positions)

        responses = []
        for position in positions:
            position['percentage_of_portfolio'] = (position['current_value'] / total_value * 100) if total_value > 0 else 0
            responses.append(self._position_to_response(position))

        return responses

    def place_order(self, user_id: int, order_data: TradeOrderCreate) -> TradeOrderResponse:
        """Place a new trade order."""
        # Verify account ownership
        account = self.get_account(order_data.account_id, user_id)
        if not account:
            raise ValueError("Account not found or unauthorized")

        # Check buying power for buy orders
        if order_data.order_side == OrderSide.BUY:
            estimated_cost = self._estimate_order_cost(order_data)
            if estimated_cost > float(account.buying_power):
                raise ValueError("Insufficient buying power")

        # Create order
        order_id = len(self.data_manager.investment_trades) + 1
        order = {
            'id': order_id,
            'account_id': order_data.account_id,
            'order_number': self._generate_order_number(),
            'symbol': order_data.symbol,
            'asset_type': order_data.asset_type.value,
            'order_type': order_data.order_type.value,
            'order_side': order_data.order_side.value,
            'quantity': float(order_data.quantity),
            'filled_quantity': 0.0,
            'limit_price': float(order_data.limit_price) if order_data.limit_price else None,
            'stop_price': float(order_data.stop_price) if order_data.stop_price else None,
            'average_fill_price': None,
            'status': OrderStatus.SUBMITTED.value,
            'time_in_force': order_data.time_in_force,
            'extended_hours': order_data.extended_hours,
            'commission': self._calculate_commission(order_data),
            'submitted_at': datetime.now(UTC),
            'filled_at': None,
            'cancelled_at': None
        }

        self.data_manager.investment_trades.append(order)

        # Simulate order execution for market orders
        if order_data.order_type == OrderType.MARKET:
            self._execute_order(order)

        return self._order_to_response(order)

    def cancel_order(self, order_id: int, user_id: int) -> bool:
        """Cancel a pending order."""
        order = next((o for o in self.data_manager.investment_trades
                     if o['id'] == order_id), None)

        if not order:
            return False

        # Verify ownership
        account = self.get_account(order['account_id'], user_id)
        if not account:
            return False

        # Can only cancel pending/submitted orders
        if order['status'] not in [OrderStatus.PENDING.value, OrderStatus.SUBMITTED.value]:
            return False

        order['status'] = OrderStatus.CANCELLED.value
        order['cancelled_at'] = datetime.now(UTC)

        return True

    def get_orders(self, account_id: int, user_id: int,
                  status: OrderStatus | None = None) -> list[TradeOrderResponse]:
        """Get orders for an account."""
        # Verify account ownership
        account = self.get_account(account_id, user_id)
        if not account:
            return []

        orders = [o for o in self.data_manager.investment_trades
                 if o['account_id'] == account_id]

        if status:
            orders = [o for o in orders if o['status'] == status.value]

        return [self._order_to_response(o) for o in orders]

    def get_watchlists(self, user_id: int) -> list[WatchlistResponse]:
        """Get all watchlists for a user."""
        watchlists = [w for w in self.data_manager.investment_watchlists
                     if w['user_id'] == user_id]

        return [self._watchlist_to_response(w) for w in watchlists]

    def create_watchlist(self, user_id: int,
                        watchlist_data: WatchlistCreate) -> WatchlistResponse:
        """Create a new watchlist."""
        watchlist_id = len(self.data_manager.investment_watchlists) + 1

        watchlist = {
            'id': watchlist_id,
            'user_id': user_id,
            'name': watchlist_data.name,
            'description': watchlist_data.description,
            'symbols': watchlist_data.symbols,
            'created_at': datetime.now(UTC),
            'updated_at': datetime.now(UTC)
        }

        self.data_manager.investment_watchlists.append(watchlist)

        return self._watchlist_to_response(watchlist)

    def get_market_data(self, symbol: str) -> MarketDataResponse:
        """Get real-time market data for a symbol."""
        # In real implementation, this would fetch from market data provider
        # For now, return mock data based on stored assets

        # Try ETF first
        etf = next((e for e in self.data_manager.etf_assets if e['symbol'] == symbol), None)
        if etf:
            return self._generate_market_data(symbol, etf['price'])

        # Try stock
        stock = next((s for s in self.data_manager.stock_assets if s['symbol'] == symbol), None)
        if stock:
            return self._generate_market_data(symbol, stock['price'])

        # Default mock data
        return self._generate_market_data(symbol, 100.0)

    def get_investment_summary(self, user_id: int) -> InvestmentSummaryResponse:
        """Get comprehensive investment summary for a user."""
        accounts = self.get_user_accounts(user_id)

        if not accounts:
            return InvestmentSummaryResponse(
                total_accounts=0,
                total_portfolio_value=Decimal('0'),
                total_buying_power=Decimal('0'),
                total_gain_loss=Decimal('0'),
                total_gain_loss_percent=Decimal('0'),
                accounts_by_type={},
                asset_allocation={},
                top_performers=[],
                worst_performers=[],
                recent_trades=[]
            )

        # Calculate totals
        total_portfolio_value = sum(a.portfolio_value for a in accounts)
        total_buying_power = sum(a.buying_power for a in accounts)
        total_gain_loss = sum(a.total_return for a in accounts)
        total_gain_loss_percent = (total_gain_loss / (total_portfolio_value - total_gain_loss) * 100) if total_portfolio_value > total_gain_loss else 0

        # Group accounts by type
        accounts_by_type = {}
        for account in accounts:
            account_type = account.account_type.value
            accounts_by_type[account_type] = accounts_by_type.get(account_type, 0) + 1

        # Calculate overall asset allocation
        all_positions = []
        for account in accounts:
            portfolio = next((p for p in self.data_manager.investment_portfolios
                            if p['account_id'] == account.id), None)
            if portfolio:
                positions = [p for p in self.data_manager.investment_positions
                           if p['portfolio_id'] == portfolio['id']]
                all_positions.extend(positions)

        asset_allocation = self._calculate_overall_asset_allocation(all_positions, float(total_portfolio_value))

        # Get top and worst performers
        performers = []
        for position in all_positions:
            gain_loss_percent = ((position['current_value'] - position['cost_basis']) / position['cost_basis'] * 100) if position['cost_basis'] > 0 else 0
            performers.append({
                'symbol': position['symbol'],
                'name': position.get('name', position['symbol']),
                'gain_loss_percent': gain_loss_percent,
                'gain_loss_amount': position['current_value'] - position['cost_basis']
            })

        performers.sort(key=lambda x: x['gain_loss_percent'], reverse=True)
        top_performers = performers[:5] if len(performers) >= 5 else performers
        worst_performers = performers[-5:] if len(performers) >= 5 else []
        worst_performers.reverse()

        # Get recent trades
        all_trades = []
        for account in accounts:
            trades = [t for t in self.data_manager.investment_trades
                     if t['account_id'] == account.id and t['status'] == OrderStatus.FILLED.value]
            all_trades.extend(trades)

        all_trades.sort(key=lambda x: x['filled_at'] or x['submitted_at'], reverse=True)
        recent_trades = []
        for trade in all_trades[:10]:
            recent_trades.append({
                'symbol': trade['symbol'],
                'side': trade['order_side'],
                'quantity': trade['quantity'],
                'price': trade['average_fill_price'],
                'total': trade['quantity'] * trade['average_fill_price'] if trade['average_fill_price'] else 0,
                'date': trade['filled_at'] or trade['submitted_at']
            })

        return InvestmentSummaryResponse(
            total_accounts=len(accounts),
            total_portfolio_value=Decimal(str(total_portfolio_value)),
            total_buying_power=Decimal(str(total_buying_power)),
            total_gain_loss=Decimal(str(total_gain_loss)),
            total_gain_loss_percent=Decimal(str(round(total_gain_loss_percent, 2))),
            accounts_by_type=accounts_by_type,
            asset_allocation=asset_allocation,
            top_performers=top_performers,
            worst_performers=worst_performers,
            recent_trades=recent_trades
        )

    def analyze_portfolio(self, portfolio_id: int, user_id: int) -> PortfolioAnalysisResponse | None:
        """Analyze portfolio and provide recommendations."""
        portfolio = self.get_portfolio(portfolio_id, user_id)
        if not portfolio:
            return None

        positions = self.get_positions(portfolio_id, user_id)

        # Calculate risk score (simplified)
        risk_score = self._calculate_portfolio_risk(positions)

        # Calculate diversification score
        diversification_score = self._calculate_diversification_score(portfolio.asset_allocation)

        # Performance score
        performance_score = min(100, max(0, 50 + float(portfolio.total_gain_loss_percent)))

        # Generate recommendations
        recommendations = []

        if diversification_score < 60:
            recommendations.append({
                'type': 'diversification',
                'priority': 'high',
                'message': 'Your portfolio lacks diversification. Consider adding different asset types.',
                'action': 'Add ETFs or bonds to reduce risk'
            })

        if risk_score > 80:
            recommendations.append({
                'type': 'risk',
                'priority': 'high',
                'message': 'Your portfolio has high risk exposure.',
                'action': 'Consider adding more conservative investments'
            })

        # Rebalancing suggestions
        rebalancing_suggestions = []
        target_allocation = self._get_target_allocation(risk_score)

        for asset_type, current_pct in portfolio.asset_allocation.items():
            target_pct = target_allocation.get(asset_type, 0)
            diff = target_pct - current_pct

            if abs(diff) > 5:  # 5% threshold
                action = 'increase' if diff > 0 else 'decrease'
                rebalancing_suggestions.append({
                    'asset_type': asset_type,
                    'current_allocation': current_pct,
                    'target_allocation': target_pct,
                    'action': action,
                    'amount_percent': abs(diff)
                })

        # Tax loss harvesting opportunities
        tax_loss_opportunities = []
        for position in positions:
            if position.unrealized_gain_loss < -100:  # $100 loss threshold
                tax_loss_opportunities.append({
                    'symbol': position.symbol,
                    'loss_amount': float(position.unrealized_gain_loss),
                    'holding_period_days': (date.today() - position.first_purchase_date).days,
                    'tax_benefit_estimate': abs(float(position.unrealized_gain_loss)) * 0.25  # Assuming 25% tax rate
                })

        return PortfolioAnalysisResponse(
            portfolio_id=portfolio_id,
            risk_score=risk_score,
            diversification_score=diversification_score,
            performance_score=performance_score,
            recommendations=recommendations,
            rebalancing_suggestions=rebalancing_suggestions,
            tax_loss_harvesting_opportunities=tax_loss_opportunities
        )

    # Helper methods
    def _execute_order(self, order: dict[str, Any]):
        """Execute a market order (simulation)."""
        # Get current price
        market_data = self.get_market_data(order['symbol'])
        fill_price = float(market_data.last_price)

        # Update order
        order['status'] = OrderStatus.FILLED.value
        order['filled_quantity'] = order['quantity']
        order['average_fill_price'] = fill_price
        order['filled_at'] = datetime.now(UTC)

        # Update account balance and positions
        account = next((a for a in self.data_manager.investment_accounts
                       if a['id'] == order['account_id']), None)

        if not account:
            return

        total_cost = fill_price * order['quantity'] + order['commission']

        if order['order_side'] == OrderSide.BUY.value:
            # Deduct from buying power
            account['buying_power'] -= total_cost
            account['balance'] -= total_cost

            # Add or update position
            portfolio = next((p for p in self.data_manager.investment_portfolios
                            if p['account_id'] == account['id']), None)

            if portfolio:
                self._update_or_create_position(portfolio['id'], order)
        else:  # SELL
            # Add to buying power
            account['buying_power'] += total_cost
            account['balance'] += total_cost

            # Update position
            portfolio = next((p for p in self.data_manager.investment_portfolios
                            if p['account_id'] == account['id']), None)

            if portfolio:
                self._update_position_for_sell(portfolio['id'], order)

    def _update_or_create_position(self, portfolio_id: int, order: dict[str, Any]):
        """Update existing position or create new one."""
        position = next((p for p in self.data_manager.investment_positions
                        if p['portfolio_id'] == portfolio_id and p['symbol'] == order['symbol']), None)

        if position:
            # Update existing position
            old_quantity = position['shares']
            old_cost = position['cost_basis']
            new_quantity = old_quantity + order['quantity']
            new_cost = old_cost + (order['average_fill_price'] * order['quantity'])

            position['shares'] = new_quantity
            position['cost_basis'] = new_cost
            position['current_value'] = new_quantity * order['average_fill_price']
        else:
            # Create new position
            position_id = len(self.data_manager.investment_positions) + 1
            new_position = {
                'id': position_id,
                'portfolio_id': portfolio_id,
                'asset_type': order['asset_type'],
                'asset_id': None,  # Would link to asset in real implementation
                'symbol': order['symbol'],
                'shares': order['quantity'],
                'cost_basis': order['average_fill_price'] * order['quantity'],
                'current_value': order['average_fill_price'] * order['quantity'],
                'realized_gains': 0.0,
                'first_purchase_date': date.today()
            }
            self.data_manager.investment_positions.append(new_position)

    def _update_position_for_sell(self, portfolio_id: int, order: dict[str, Any]):
        """Update position for sell order."""
        position = next((p for p in self.data_manager.investment_positions
                        if p['portfolio_id'] == portfolio_id and p['symbol'] == order['symbol']), None)

        if not position:
            return

        # Calculate realized gains
        avg_cost = position['cost_basis'] / position['shares'] if position['shares'] > 0 else 0
        realized_gain = (order['average_fill_price'] - avg_cost) * order['quantity']

        # Update position
        position['shares'] -= order['quantity']
        position['cost_basis'] -= avg_cost * order['quantity']
        position['current_value'] = position['shares'] * order['average_fill_price']
        position['realized_gains'] += realized_gain

        # Remove position if fully sold
        if position['shares'] <= 0:
            self.data_manager.investment_positions.remove(position)

    def _estimate_order_cost(self, order_data: TradeOrderCreate) -> float:
        """Estimate the cost of an order."""
        market_data = self.get_market_data(order_data.symbol)

        if order_data.order_type == OrderType.MARKET:
            price = float(market_data.ask_price)
        elif order_data.order_type == OrderType.LIMIT and order_data.limit_price:
            price = order_data.limit_price
        else:
            price = float(market_data.last_price)

        commission = self._calculate_commission(order_data)
        return (price * order_data.quantity) + commission

    def _calculate_commission(self, order_data: TradeOrderCreate) -> float:
        """Calculate commission for an order."""
        # Simple commission structure
        if order_data.asset_type == AssetType.CRYPTO:
            return order_data.quantity * 0.01  # 1% for crypto
        return 0.0  # Free stock/ETF trades

    def _calculate_asset_allocation(self, positions: list[dict[str, Any]],
                                  cash_balance: float) -> dict[str, float]:
        """Calculate asset allocation percentages."""
        total_value = sum(p['current_value'] for p in positions) + float(cash_balance)

        if total_value == 0:
            return {'cash': 100.0}

        allocation = {}

        # Group by asset type
        for position in positions:
            asset_type = position['asset_type']
            if asset_type not in allocation:
                allocation[asset_type] = 0
            allocation[asset_type] += position['current_value']

        # Convert to percentages
        for asset_type in allocation:
            allocation[asset_type] = round(allocation[asset_type] / total_value * 100, 2)

        # Add cash
        if cash_balance > 0:
            allocation['cash'] = round(cash_balance / total_value * 100, 2)

        return allocation

    def _calculate_overall_asset_allocation(self, positions: list[dict[str, Any]],
                                          total_value: float) -> dict[str, float]:
        """Calculate overall asset allocation across all accounts."""
        if total_value == 0:
            return {}

        allocation = {}

        for position in positions:
            asset_type = position['asset_type']
            if asset_type not in allocation:
                allocation[asset_type] = 0
            allocation[asset_type] += position['current_value']

        # Convert to percentages
        for asset_type in allocation:
            allocation[asset_type] = round(allocation[asset_type] / total_value * 100, 2)

        return allocation

    def _calculate_portfolio_risk(self, positions: list[PositionResponse]) -> float:
        """Calculate portfolio risk score (0-100)."""
        if not positions:
            return 0.0

        # Simple risk calculation based on asset types
        risk_weights = {
            AssetType.CRYPTO.value: 90,
            AssetType.STOCK.value: 60,
            AssetType.ETF.value: 40,
            AssetType.BOND.value: 20,
            AssetType.MUTUAL_FUND.value: 35
        }

        total_value = sum(p.current_value for p in positions)
        if total_value == 0:
            return 0.0

        weighted_risk = 0
        for position in positions:
            weight = float(position.current_value) / float(total_value)
            asset_risk = risk_weights.get(position.asset_type.value, 50)
            weighted_risk += weight * asset_risk

        return round(weighted_risk, 2)

    def _calculate_diversification_score(self, asset_allocation: dict[str, float]) -> float:
        """Calculate diversification score (0-100)."""
        if not asset_allocation:
            return 0.0

        # Higher score for more asset types and balanced allocation
        num_assets = len(asset_allocation)

        # Base score for number of asset types
        base_score = min(num_assets * 20, 60)

        # Calculate concentration (Herfindahl index)
        concentration = sum(pct ** 2 for pct in asset_allocation.values()) / 100
        balance_score = (1 - concentration) * 40

        return round(base_score + balance_score, 2)

    def _get_target_allocation(self, risk_score: float) -> dict[str, float]:
        """Get target allocation based on risk score."""
        if risk_score < 30:  # Conservative
            return {
                'bond': 60,
                'etf': 30,
                'stock': 10,
                'cash': 0
            }
        if risk_score < 60:  # Moderate
            return {
                'bond': 30,
                'etf': 40,
                'stock': 25,
                'crypto': 5
            }
        # Aggressive
        return {
            'stock': 50,
            'etf': 30,
            'crypto': 15,
            'bond': 5
        }

    def _generate_market_data(self, symbol: str, base_price: float) -> MarketDataResponse:
        """Generate mock market data."""
        # Add some randomness
        volatility = 0.02  # 2% volatility
        change = random.uniform(-volatility, volatility)

        last_price = base_price * (1 + change)
        bid_price = last_price * 0.999
        ask_price = last_price * 1.001

        open_price = base_price
        high_price = base_price * (1 + abs(change))
        low_price = base_price * (1 - abs(change))

        return MarketDataResponse(
            symbol=symbol,
            bid_price=Decimal(str(round(bid_price, 2))),
            ask_price=Decimal(str(round(ask_price, 2))),
            last_price=Decimal(str(round(last_price, 2))),
            volume=random.randint(100000, 10000000),
            open_price=Decimal(str(round(open_price, 2))),
            high_price=Decimal(str(round(high_price, 2))),
            low_price=Decimal(str(round(low_price, 2))),
            close_price=Decimal(str(round(base_price, 2))),
            timestamp=datetime.now(UTC)
        )

    # Response conversion methods
    def _account_to_response(self, account: dict[str, Any]) -> InvestmentAccountResponse:
        """Convert account dict to response model."""
        return InvestmentAccountResponse(
            id=account['id'],
            user_id=account['user_id'],
            account_type=InvestmentAccountType(account['account_type']),
            account_number=account['account_number'],
            account_name=account['account_name'],
            balance=Decimal(str(account['balance'])),
            buying_power=Decimal(str(account['buying_power'])),
            portfolio_value=Decimal(str(account['portfolio_value'])),
            total_return=Decimal(str(account['total_return'])),
            total_return_percent=Decimal(str(account['total_return_percent'])),
            is_retirement=account['is_retirement'],
            risk_tolerance=PortfolioRiskLevel(account['risk_tolerance']),
            created_at=account['created_at'],
            updated_at=account['updated_at']
        )

    def _portfolio_to_response(self, portfolio: dict[str, Any]) -> PortfolioResponse:
        """Convert portfolio dict to response model."""
        return PortfolioResponse(
            id=portfolio['id'],
            account_id=portfolio['account_id'],
            name=portfolio.get('name', f"Portfolio {portfolio['id']}"),
            total_value=Decimal(str(portfolio.get('total_value', 0))),
            total_cost_basis=Decimal(str(portfolio.get('total_cost_basis', 0))),
            total_gain_loss=Decimal(str(portfolio.get('total_gain_loss', 0))),
            total_gain_loss_percent=Decimal(str(portfolio.get('total_gain_loss_percent', 0))),
            positions_count=portfolio.get('positions_count', 0),
            asset_allocation=portfolio.get('asset_allocation', {}),
            risk_score=portfolio.get('risk_score', 0)
        )

    def _position_to_response(self, position: dict[str, Any]) -> PositionResponse:
        """Convert position dict to response model."""
        return PositionResponse(
            id=position['id'],
            portfolio_id=position['portfolio_id'],
            asset_type=AssetType(position['asset_type']),
            symbol=position['symbol'],
            name=position.get('name', position['symbol']),
            quantity=Decimal(str(position['shares'])),
            average_cost=Decimal(str(position['cost_basis'] / position['shares'])) if position['shares'] > 0 else Decimal('0'),
            current_price=Decimal(str(position['current_value'] / position['shares'])) if position['shares'] > 0 else Decimal('0'),
            current_value=Decimal(str(position['current_value'])),
            cost_basis=Decimal(str(position['cost_basis'])),
            unrealized_gain_loss=Decimal(str(position['current_value'] - position['cost_basis'])),
            unrealized_gain_loss_percent=Decimal(str((position['current_value'] - position['cost_basis']) / position['cost_basis'] * 100)) if position['cost_basis'] > 0 else Decimal('0'),
            realized_gain_loss=Decimal(str(position.get('realized_gains', 0))),
            percentage_of_portfolio=position.get('percentage_of_portfolio', 0),
            first_purchase_date=position.get('first_purchase_date', date.today())
        )

    def _order_to_response(self, order: dict[str, Any]) -> TradeOrderResponse:
        """Convert order dict to response model."""
        # Map old status values to new ones
        status = order.get('status', 'submitted')
        if status == 'completed':
            status = 'filled'
        elif status == 'open':
            status = 'submitted'

        return TradeOrderResponse(
            id=order['id'],
            account_id=order['account_id'],
            order_number=order.get('order_number', self._generate_order_number()),
            symbol=order.get('symbol', ''),
            asset_type=AssetType(order.get('asset_type', 'stock')),
            order_type=OrderType(order.get('order_type', 'market')),
            order_side=OrderSide(order.get('order_side', 'buy')),
            quantity=Decimal(str(order.get('quantity', 0))),
            filled_quantity=Decimal(str(order.get('filled_quantity', 0))),
            limit_price=Decimal(str(order['limit_price'])) if order.get('limit_price') else None,
            stop_price=Decimal(str(order['stop_price'])) if order.get('stop_price') else None,
            average_fill_price=Decimal(str(order['average_fill_price'])) if order.get('average_fill_price') else None,
            status=OrderStatus(status),
            time_in_force=order.get('time_in_force', 'day'),
            extended_hours=order.get('extended_hours', False),
            commission=Decimal(str(order.get('commission', 0))),
            submitted_at=order.get('submitted_at', datetime.now(UTC)),
            filled_at=order.get('filled_at'),
            cancelled_at=order.get('cancelled_at')
        )

    def _watchlist_to_response(self, watchlist: dict[str, Any]) -> WatchlistResponse:
        """Convert watchlist dict to response model."""
        return WatchlistResponse(
            id=watchlist['id'],
            user_id=watchlist['user_id'],
            name=watchlist['name'],
            description=watchlist.get('description'),
            symbols=watchlist['symbols'],
            created_at=watchlist['created_at'],
            updated_at=watchlist['updated_at']
        )

    def get_market_summary(self) -> dict[str, Any]:
        """Get market summary with indices, gainers, losers, and trending."""
        import random

        # Mock indices data. Derive the absolute change and current value from a
        # single percentage so the sign and magnitude stay consistent.
        def _build_index(name: str, base: float, pct_range: float) -> dict[str, Any]:
            change_percentage = random.uniform(-pct_range, pct_range)
            change = base * change_percentage / 100
            return {
                'name': name,
                'value': base + change,
                'change': change,
                'change_percentage': change_percentage
            }

        indices = [
            _build_index('S&P 500', 4500, 2),
            _build_index('Dow Jones', 35000, 2),
            _build_index('NASDAQ', 14000, 3)
        ]

        # Get all assets with market data
        all_assets = self.get_all_assets()

        # Sort by change percentage
        sorted_by_change = sorted(all_assets, key=lambda x: x['change_percentage_24h'], reverse=True)

        # Get top gainers and losers
        gainers = [a for a in sorted_by_change if a['change_percentage_24h'] > 0][:10]
        losers = [a for a in sorted_by_change if a['change_percentage_24h'] < 0][-10:]

        # Mock trending (random selection)
        trending = random.sample(all_assets, min(10, len(all_assets)))

        return {
            'indices': indices,
            'gainers': gainers,
            'losers': losers,
            'trending': trending
        }

    def get_all_assets(self, asset_type: str | None = None) -> list[dict[str, Any]]:
        """Get all available investment assets with current market data."""
        assets = []

        # Add ETFs
        if not asset_type or asset_type == 'etf':
            for etf in self.data_manager.etf_assets:
                market_data = self._generate_market_data(etf['symbol'], etf.get('price', 100.0))
                # Calculate change and change percentage
                change_24h = float(market_data.last_price - market_data.open_price)
                change_percentage_24h = (change_24h / float(market_data.open_price)) * 100 if market_data.open_price > 0 else 0

                assets.append({
                    'id': f"etf_{etf['id']}_{etf['symbol']}",
                    'symbol': etf['symbol'],
                    'name': etf['name'],
                    'type': 'etf',
                    'current_price': float(market_data.last_price),
                    'change_24h': change_24h,
                    'change_percentage_24h': change_percentage_24h,
                    'volume_24h': market_data.volume,
                    'sector': etf.get('category', 'ETF'),
                    'description': etf.get('description', f"{etf['name']} ETF")
                })

        # Add Stocks
        if not asset_type or asset_type == 'stock':
            for stock in self.data_manager.stock_assets:
                market_data = self._generate_market_data(stock['symbol'], stock.get('price', 100.0))
                # Calculate change and change percentage
                change_24h = float(market_data.last_price - market_data.open_price)
                change_percentage_24h = (change_24h / float(market_data.open_price)) * 100 if market_data.open_price > 0 else 0

                assets.append({
                    'id': f"stock_{stock['id']}_{stock['symbol']}",
                    'symbol': stock['symbol'],
                    'name': stock['name'],
                    'type': 'stock',
                    'current_price': float(market_data.last_price),
                    'change_24h': change_24h,
                    'change_percentage_24h': change_percentage_24h,
                    'volume_24h': market_data.volume,
                    'market_cap': stock.get('market_cap', float(market_data.last_price) * 1e9),
                    'sector': stock.get('sector', 'Technology'),
                    'description': stock.get('description', f"{stock['name']} stock")
                })

        # Add Crypto
        if not asset_type or asset_type == 'crypto':
            for crypto in self.data_manager.crypto_assets:
                market_data = self._generate_market_data(crypto['symbol'], crypto.get('price', 50000.0))
                # Calculate change and change percentage
                change_24h = float(market_data.last_price - market_data.open_price)
                change_percentage_24h = (change_24h / float(market_data.open_price)) * 100 if market_data.open_price > 0 else 0

                assets.append({
                    'id': f"crypto_{crypto['id']}_{crypto['symbol']}",
                    'symbol': crypto['symbol'],
                    'name': crypto['name'],
                    'type': 'crypto',
                    'current_price': float(market_data.last_price),
                    'change_24h': change_24h,
                    'change_percentage_24h': change_percentage_24h,
                    'volume_24h': market_data.volume,
                    'market_cap': crypto.get('market_cap', float(market_data.last_price) * 1e8),
                    'description': crypto.get('description', f"{crypto['name']} cryptocurrency")
                })

        # Deduplicate by symbol, keeping first occurrence
        seen_symbols: set[str] = set()
        unique_assets = []
        for asset in assets:
            if asset['symbol'] not in seen_symbols:
                seen_symbols.add(asset['symbol'])
                unique_assets.append(asset)
        return unique_assets

    def get_etf_detail(self, symbol: str) -> ETFDetailResponse | None:
        """Get detailed information about an ETF."""
        # Find ETF
        etf = next((e for e in self.data_manager.etf_assets if e['symbol'] == symbol), None)
        if not etf:
            return None

        # Get market data
        market_data = self.get_market_data(symbol)

        # Calculate change
        change_24h = float(market_data.last_price - market_data.open_price)
        change_percentage_24h = (change_24h / float(market_data.open_price)) * 100 if market_data.open_price > 0 else 0

        # Generate top holdings (mock data)
        top_holdings = []
        if etf['category'] == 'equity':
            holdings_data = [
                {'symbol': 'AAPL', 'name': 'Apple Inc.', 'weight': 7.1},
                {'symbol': 'MSFT', 'name': 'Microsoft Corporation', 'weight': 6.8},
                {'symbol': 'GOOGL', 'name': 'Alphabet Inc.', 'weight': 3.9},
                {'symbol': 'AMZN', 'name': 'Amazon.com Inc.', 'weight': 3.2},
                {'symbol': 'META', 'name': 'Meta Platforms Inc.', 'weight': 2.4}
            ]
        else:
            holdings_data = [
                {'symbol': 'TLT', 'name': 'iShares 20+ Year Treasury Bond ETF', 'weight': 15.2},
                {'symbol': 'IEF', 'name': 'iShares 7-10 Year Treasury Bond ETF', 'weight': 12.8},
                {'symbol': 'AGG', 'name': 'iShares Core U.S. Aggregate Bond ETF', 'weight': 10.5},
                {'symbol': 'LQD', 'name': 'iShares iBoxx $ Investment Grade Corporate Bond ETF', 'weight': 8.3},
                {'symbol': 'HYG', 'name': 'iShares iBoxx $ High Yield Corporate Bond ETF', 'weight': 6.7}
            ]

        for holding in holdings_data:
            top_holdings.append({
                'symbol': holding['symbol'],
                'name': holding['name'],
                'weight': holding['weight'],
                'shares': random.randint(100000, 5000000),
                'value': holding['weight'] * etf.get('net_assets', 1e9) / 100
            })

        # Generate sector allocation
        sector_allocation = {}
        if etf['category'] == 'equity':
            sectors = ['Technology', 'Healthcare', 'Financials', 'Consumer Discretionary',
                      'Industrials', 'Consumer Staples', 'Energy', 'Materials', 'Utilities', 'Real Estate']
            remaining = 100.0
            for _i, sector in enumerate(sectors[:-1]):
                allocation = random.uniform(5, 25) if remaining > 25 else remaining * 0.8
                sector_allocation[sector] = round(allocation, 1)
                remaining -= allocation
            sector_allocation[sectors[-1]] = round(remaining, 1)
        else:
            sector_allocation = {
                'Government': 45.5,
                'Corporate': 30.2,
                'Municipal': 15.3,
                'International': 5.5,
                'Cash': 3.5
            }

        return ETFDetailResponse(
            id=etf['id'],
            symbol=etf['symbol'],
            name=etf['name'],
            asset_type=AssetType.ETF,
            current_price=Decimal(str(market_data.last_price)),
            price_change=Decimal(str(change_24h)),
            price_change_percent=Decimal(str(change_percentage_24h)),
            volume=market_data.volume,
            market_cap=Decimal(str(etf.get('net_assets', random.uniform(1e9, 5e10)))),
            pe_ratio=None,
            dividend_yield=random.uniform(1.5, 4.5) if etf['category'] == 'equity' else random.uniform(2.0, 5.0),
            week_52_high=Decimal(str(float(market_data.last_price) * random.uniform(1.05, 1.15))),
            week_52_low=Decimal(str(float(market_data.last_price) * random.uniform(0.85, 0.95))),
            expense_ratio=etf.get('expense_ratio', 0.1),
            net_assets=Decimal(str(etf.get('net_assets', random.uniform(1e9, 5e10)))),
            category=etf['category'],
            holdings_count=random.randint(50, 500),
            top_holdings=top_holdings,
            sector_allocation=sector_allocation
        )

    def get_stock_detail(self, symbol: str) -> StockDetailResponse | None:
        """Get detailed information about a stock."""
        # Find stock
        stock = next((s for s in self.data_manager.stock_assets if s['symbol'] == symbol), None)
        if not stock:
            return None

        # Get market data
        market_data = self.get_market_data(symbol)

        # Calculate change
        change_24h = float(market_data.last_price - market_data.open_price)
        change_percentage_24h = (change_24h / float(market_data.open_price)) * 100 if market_data.open_price > 0 else 0

        # Generate analyst data
        analyst_ratings = ['Strong Buy', 'Buy', 'Hold', 'Sell', 'Strong Sell']
        analyst_rating = random.choice(analyst_ratings)

        return StockDetailResponse(
            id=stock['id'],
            symbol=stock['symbol'],
            name=stock['name'],
            asset_type=AssetType.STOCK,
            current_price=Decimal(str(market_data.last_price)),
            price_change=Decimal(str(change_24h)),
            price_change_percent=Decimal(str(change_percentage_24h)),
            volume=market_data.volume,
            market_cap=Decimal(str(stock.get('market_cap', float(market_data.last_price) * random.uniform(1e9, 1e12)))),
            pe_ratio=stock.get('pe_ratio', random.uniform(10, 35)),
            dividend_yield=stock.get('dividend_yield', random.uniform(0, 4)),
            week_52_high=Decimal(str(float(market_data.last_price) * random.uniform(1.1, 1.3))),
            week_52_low=Decimal(str(float(market_data.last_price) * random.uniform(0.7, 0.9))),
            sector=stock.get('sector', 'Technology'),
            industry=stock.get('industry', 'Software'),
            earnings_date=date.today() + timedelta(days=random.randint(1, 90)),
            beta=random.uniform(0.5, 2.0),
            forward_pe=random.uniform(15, 40),
            profit_margin=random.uniform(5, 30),
            analyst_rating=analyst_rating,
            analyst_target_price=Decimal(str(float(market_data.last_price) * random.uniform(0.9, 1.3)))
        )

    def get_crypto_detail(self, symbol: str) -> AssetResponse | None:
        """Get detailed information about a cryptocurrency."""
        # Find crypto
        crypto = next((c for c in self.data_manager.crypto_assets if c['symbol'] == symbol), None)
        if not crypto:
            return None

        # Get market data
        market_data = self.get_market_data(symbol)

        # Calculate change
        change_24h = float(market_data.last_price - market_data.open_price)
        change_percentage_24h = (change_24h / float(market_data.open_price)) * 100 if market_data.open_price > 0 else 0

        return AssetResponse(
            id=crypto['id'],
            symbol=crypto['symbol'],
            name=crypto['name'],
            asset_type=AssetType.CRYPTO,
            current_price=Decimal(str(market_data.last_price)),
            price_change=Decimal(str(change_24h)),
            price_change_percent=Decimal(str(change_percentage_24h)),
            volume=market_data.volume,
            market_cap=Decimal(str(crypto.get('market_cap', float(market_data.last_price) * 1e8))),
            pe_ratio=None,
            dividend_yield=None,
            week_52_high=Decimal(str(float(market_data.last_price) * random.uniform(1.5, 3.0))),
            week_52_low=Decimal(str(float(market_data.last_price) * random.uniform(0.3, 0.7)))
        )

    def get_portfolio_summary(self, user_id: int) -> dict:
        """
        Get comprehensive portfolio summary for dashboard display.
        Includes portfolio value changes, asset allocation, top performers, and performance history.
        """
        accounts = self.get_user_accounts(user_id)

        if not accounts:
            return {
                "total_value": 0,
                "day_change": 0,
                "day_change_percent": 0,
                "week_change": 0,
                "week_change_percent": 0,
                "month_change": 0,
                "month_change_percent": 0,
                "year_change": 0,
                "year_change_percent": 0,
                "asset_allocation": {"stocks": 0, "etfs": 0, "crypto": 0, "cash": 0},
                "top_gainers": [],
                "top_losers": [],
                "performance_history": []
            }

        # Calculate total portfolio value
        total_value = sum(float(a.portfolio_value) for a in accounts)
        total_cost_basis = sum(float(a.portfolio_value) - float(a.total_return) for a in accounts)

        # Get all positions across accounts for analysis
        all_positions = []
        for account in accounts:
            portfolio = next((p for p in self.data_manager.investment_portfolios
                            if p['account_id'] == account.id), None)
            if portfolio:
                positions = [p for p in self.data_manager.investment_positions
                           if p['portfolio_id'] == portfolio['id']]
                all_positions.extend(positions)

        # Calculate asset allocation breakdown
        asset_allocation = {"stocks": 0.0, "etfs": 0.0, "crypto": 0.0, "cash": 0.0}
        for position in all_positions:
            asset_type = position.get('asset_type', 'stock').lower()
            if asset_type == 'etf':
                asset_allocation['etfs'] += float(position.get('current_value', 0))
            elif asset_type == 'crypto':
                asset_allocation['crypto'] += float(position.get('current_value', 0))
            else:  # stocks and others
                asset_allocation['stocks'] += float(position.get('current_value', 0))

        # Add cash (buying power) from accounts
        total_cash = sum(float(a.buying_power) for a in accounts)
        asset_allocation['cash'] = total_cash

        # Convert to percentages based on total of all allocations
        allocation_total = sum(asset_allocation.values())
        if allocation_total > 0:
            asset_allocation = {
                k: round((v / allocation_total) * 100, 2) for k, v in asset_allocation.items()
            }

        # Get top gainers and losers
        performers = []
        for position in all_positions:
            current_value = float(position.get('current_value', 0))
            cost_basis = float(position.get('cost_basis', 0))
            gain_loss = current_value - cost_basis
            gain_loss_percent = (gain_loss / cost_basis * 100) if cost_basis > 0 else 0

            performers.append({
                "symbol": position.get('symbol', 'N/A'),
                "name": position.get('name', position.get('symbol', 'N/A')),
                "asset_type": position.get('asset_type', 'stock'),
                "current_value": round(current_value, 2),
                "gain_loss": round(gain_loss, 2),
                "gain_loss_percent": round(gain_loss_percent, 2)
            })

        # Sort and get top 5 gainers and losers
        performers.sort(key=lambda x: x['gain_loss_percent'], reverse=True)
        gainers = [p for p in performers if p['gain_loss_percent'] > 0]
        losers = [p for p in performers if p['gain_loss_percent'] < 0]
        top_gainers = gainers[:5]
        top_losers = list(reversed(losers[-5:]))

        # Calculate period changes (using overall return data)
        total_return = sum(float(a.total_return) for a in accounts)
        total_return_percent = (total_return / total_cost_basis * 100) if total_cost_basis > 0 else 0

        # Simulate period-based changes (in real scenario, would use historical data)
        day_change = round(total_return * 0.01, 2)  # Approximate 1% daily volatility
        day_change_percent = round(total_return_percent * 0.01, 2)

        week_change = round(total_return * 0.05, 2)
        week_change_percent = round(total_return_percent * 0.05, 2)

        month_change = round(total_return * 0.15, 2)
        month_change_percent = round(total_return_percent * 0.15, 2)

        year_change = total_return
        year_change_percent = total_return_percent

        # Generate performance history (simulated), oldest month first.
        # Value grows linearly from the starting value (12 months ago) to the
        # current total value, so the trend is consistent with total_return.
        performance_history = []
        base_value = total_value - total_return
        now = datetime.now()
        for i in range(12):  # Last 12 months, oldest -> newest
            months_ago = 11 - i
            fraction = i / 11 if i > 0 else 0
            simulated_value = base_value + (total_return * fraction)
            month_index = (now.year * 12 + (now.month - 1)) - months_ago
            label = datetime(month_index // 12, (month_index % 12) + 1, 1).strftime("%b %Y")
            performance_history.append({
                "month": label,
                "value": round(simulated_value, 2)
            })

        return {
            "total_value": round(total_value, 2),
            "day_change": day_change,
            "day_change_percent": day_change_percent,
            "week_change": week_change,
            "week_change_percent": week_change_percent,
            "month_change": month_change,
            "month_change_percent": month_change_percent,
            "year_change": year_change,
            "year_change_percent": year_change_percent,
            "asset_allocation": asset_allocation,
            "top_gainers": top_gainers,
            "top_losers": top_losers,
            "performance_history": performance_history
        }
