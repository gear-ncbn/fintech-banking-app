"""
Real-time analytics engine with comprehensive metric calculations.
Processes financial data to provide actionable insights.
"""
import logging
from collections import defaultdict
from datetime import UTC, datetime, timedelta
from statistics import mean, stdev
from typing import Any

from dateutil.relativedelta import relativedelta

logger = logging.getLogger(__name__)


class AnalyticsEngine:
    """Real-time analytics calculation engine."""

    def __init__(self, data_manager):
        self.data_manager = data_manager
        self._cache: dict[str, tuple[Any, datetime]] = {}
        self._cache_ttl = 300  # 5 minutes

    def _get_user_accounts(self, user_id: int) -> list:
        """Get accounts for a user."""
        return [acc for acc in self.data_manager.accounts if acc.get('user_id') == user_id]

    def _get_user_transactions_for_account(self, account_id: int) -> list:
        """Get transactions for an account."""
        return [tx for tx in self.data_manager.transactions if tx.get('account_id') == account_id]

    def _get_user_budgets(self, user_id: int) -> list:
        """Get budgets for a user."""
        return [b for b in self.data_manager.budgets if b.get('user_id') == user_id]

    def _get_user_goals(self, user_id: int) -> list:
        """Get goals for a user."""
        return [g for g in self.data_manager.goals if g.get('user_id') == user_id]

    def _get_user_subscriptions(self, user_id: int) -> list:
        """Get subscriptions for a user."""
        return [s for s in self.data_manager.subscriptions if s.get('user_id') == user_id]

    def _get_user_loans(self, user_id: int) -> list:
        """Get loans for a user."""
        if hasattr(self.data_manager, 'loans'):
            return [loan for loan in self.data_manager.loans if loan.get('user_id') == user_id]
        return []

    def _get_user_investments(self, user_id: int) -> list:
        """Get investments for a user.

        Investment data is stored as positions belonging to portfolios, which
        belong to investment accounts owned by a user. Flatten that hierarchy
        into per-position dicts using the field names the performance
        calculation expects.
        """
        if hasattr(self.data_manager, 'holdings') and self.data_manager.holdings:
            return [h for h in self.data_manager.holdings if h.get('user_id') == user_id]

        account_ids = {
            acc['id']
            for acc in getattr(self.data_manager, 'investment_accounts', [])
            if acc.get('user_id') == user_id
        }
        portfolio_ids = {
            p['id']
            for p in getattr(self.data_manager, 'investment_portfolios', [])
            if p.get('account_id') in account_ids
        }

        investments = []
        for pos in getattr(self.data_manager, 'investment_positions', []):
            if pos.get('portfolio_id') not in portfolio_ids:
                continue
            shares = pos.get('shares') or 0
            current_value = pos.get('current_value') or 0
            cost_basis = pos.get('cost_basis') or 0
            investments.append({
                'symbol': pos.get('symbol'),
                'asset_type': pos.get('asset_type'),
                'quantity': shares,
                'current_price': (current_value / shares) if shares else 0,
                'purchase_price': (cost_basis / shares) if shares else 0,
            })
        return investments

    def _get_category(self, category_id: int | None) -> dict | None:
        """Get a category by ID."""
        if category_id is None:
            return None
        for cat in self.data_manager.categories:
            if cat.get('id') == category_id:
                return cat
        return None

    def _get_cached(self, key: str) -> Any | None:
        """Get cached value if not expired."""
        if key in self._cache:
            value, timestamp = self._cache[key]
            if (datetime.now(UTC) - timestamp).total_seconds() < self._cache_ttl:
                return value
            del self._cache[key]
        return None

    def _set_cached(self, key: str, value: Any):
        """Set cached value with timestamp."""
        self._cache[key] = (value, datetime.now(UTC))

    def calculate_transaction_velocity(
        self,
        user_id: int,
        days: int = 30
    ) -> dict[str, Any]:
        """
        Calculate transaction velocity and patterns.
        """
        cache_key = f"tx_velocity_{user_id}_{days}"
        cached = self._get_cached(cache_key)
        if cached:
            return cached

        start_date = datetime.now(UTC) - timedelta(days=days)
        accounts = self._get_user_accounts(user_id)
        account_ids = [acc['id'] for acc in accounts]

        transactions = []
        for acc_id in account_ids:
            acc_txs = self._get_user_transactions_for_account(acc_id)
            transactions.extend([
                tx for tx in acc_txs
                if tx.get('transaction_date') >= start_date
            ])

        if not transactions:
            result = {
                'transactions_per_day': 0,
                'transactions_per_week': 0,
                'transactions_per_month': 0,
                'average_transaction_size': 0,
                'total_transactions': 0,
                'trend': 'stable'
            }
            self._set_cached(cache_key, result)
            return result

        # Calculate velocities
        total_txs = len(transactions)
        txs_per_day = total_txs / days
        txs_per_week = txs_per_day * 7
        txs_per_month = txs_per_day * 30

        # Calculate average size
        avg_size = mean([abs(tx.get('amount')) for tx in transactions])

        # Detect trend (compare first half vs second half)
        mid_date = start_date + timedelta(days=days / 2)
        first_half = [tx for tx in transactions if tx.get('transaction_date') < mid_date]
        second_half = [tx for tx in transactions if tx.get('transaction_date') >= mid_date]

        trend = 'stable'
        if len(second_half) > len(first_half) * 1.2:
            trend = 'increasing'
        elif len(second_half) < len(first_half) * 0.8:
            trend = 'decreasing'

        result = {
            'transactions_per_day': round(txs_per_day, 2),
            'transactions_per_week': round(txs_per_week, 2),
            'transactions_per_month': round(txs_per_month, 2),
            'average_transaction_size': round(avg_size, 2),
            'total_transactions': total_txs,
            'trend': trend
        }

        self._set_cached(cache_key, result)
        return result

    def calculate_cash_flow(
        self,
        user_id: int,
        period_days: int = 30
    ) -> dict[str, Any]:
        """
        Calculate cash flow intelligence with categorization.
        """
        cache_key = f"cash_flow_{user_id}_{period_days}"
        cached = self._get_cached(cache_key)
        if cached:
            return cached

        # Inclusive "last N days" window aligned to midnight so it matches the
        # transactions /stats endpoint (today plus the preceding period_days-1
        # days). This keeps the Analytics figures consistent with the Dashboard
        # and Transactions pages.
        start_date = (datetime.now(UTC) - timedelta(days=period_days - 1)).replace(
            hour=0, minute=0, second=0, microsecond=0
        )
        accounts = self._get_user_accounts(user_id)
        account_ids = [acc['id'] for acc in accounts]

        transactions = []
        for acc_id in account_ids:
            acc_txs = self._get_user_transactions_for_account(acc_id)
            transactions.extend([
                tx for tx in acc_txs
                if tx.get('transaction_date') >= start_date
            ])

        # Categorize by transaction type and category
        money_in = 0.0
        money_out = 0.0
        by_category = defaultdict(float)

        for tx in transactions:
            category = self._get_category(tx.get('category_id')) if tx.get('category_id') else None
            # Classify purely by transaction type (credit = income, debit =
            # expense) so the totals match the transactions /stats endpoint,
            # which is the single source of truth for these figures.
            is_income = tx.get('transaction_type') == 'credit'

            # Bucket every transaction (including uncategorized ones) under the same
            # income/expense classification used for the money_in/money_out totals so
            # the category breakdown always reconciles with those totals.
            if is_income:
                money_in += tx.get('amount')
                name = category.get('name') if category else 'Other'
                by_category[f"income:{name}"] += tx.get('amount')
            else:
                money_out += abs(tx.get('amount'))
                name = category.get('name') if category else 'Other'
                by_category[f"expense:{name}"] += abs(tx.get('amount'))

        net_flow = money_in - money_out
        savings_rate = (net_flow / money_in * 100) if money_in > 0 else 0

        # Build the breakdown per type, limiting each type to its top categories and
        # folding any remainder into an "Other" bucket so the returned categories always
        # sum back to money_in / money_out (no silently dropped amounts).
        def _limited_breakdown(prefix: str, top_n: int = 7) -> list[dict[str, Any]]:
            items = sorted(
                ((k.split(':', 1)[1], v) for k, v in by_category.items() if k.startswith(f"{prefix}:")),
                key=lambda x: x[1],
                reverse=True,
            )
            if len(items) > top_n:
                head = items[:top_n]
                remainder = sum(v for _, v in items[top_n:])
                merged: dict[str, float] = {name: amount for name, amount in head}
                merged['Other'] = merged.get('Other', 0.0) + remainder
                items = sorted(merged.items(), key=lambda x: x[1], reverse=True)
            return [
                {'category': name, 'type': prefix, 'amount': round(amount, 2)}
                for name, amount in items
            ]

        categories_breakdown = _limited_breakdown('income') + _limited_breakdown('expense')
        categories_breakdown.sort(key=lambda x: x['amount'], reverse=True)

        result = {
            'period_days': period_days,
            'money_in': round(money_in, 2),
            'money_out': round(money_out, 2),
            'net_flow': round(net_flow, 2),
            'savings_rate': round(savings_rate, 2),
            'categories': categories_breakdown
        }

        self._set_cached(cache_key, result)
        return result

    def calculate_investment_performance(
        self,
        user_id: int
    ) -> dict[str, Any]:
        """
        Calculate investment portfolio performance metrics.
        """
        cache_key = f"investment_perf_{user_id}"
        cached = self._get_cached(cache_key)
        if cached:
            return cached

        investments = self._get_user_investments(user_id)

        if not investments:
            return {
                'total_value': 0,
                'total_cost_basis': 0,
                'total_gain_loss': 0,
                'total_gain_loss_percentage': 0,
                'asset_allocation': [],
                'top_performers': [],
                'worst_performers': []
            }

        total_value = 0.0
        total_cost = 0.0
        by_asset_type = defaultdict(float)
        performances = []

        for inv in investments:
            current_value = inv.get('quantity') * inv.get('current_price')
            cost_basis = inv.get('quantity') * inv.get('purchase_price')
            gain_loss = current_value - cost_basis
            gain_loss_pct = (gain_loss / cost_basis * 100) if cost_basis > 0 else 0

            total_value += current_value
            total_cost += cost_basis
            by_asset_type[inv.get('asset_type')] += current_value

            performances.append({
                'symbol': inv.get('symbol'),
                'asset_type': inv.get('asset_type'),
                'current_value': round(current_value, 2),
                'gain_loss': round(gain_loss, 2),
                'gain_loss_percentage': round(gain_loss_pct, 2)
            })

        # Asset allocation
        asset_allocation = [
            {
                'asset_type': asset_type,
                'value': round(value, 2),
                'percentage': round(value / total_value * 100, 2) if total_value > 0 else 0
            }
            for asset_type, value in by_asset_type.items()
        ]

        # Sort performances
        performances.sort(key=lambda x: x['gain_loss_percentage'], reverse=True)

        result = {
            'total_value': round(total_value, 2),
            'total_cost_basis': round(total_cost, 2),
            'total_gain_loss': round(total_value - total_cost, 2),
            'total_gain_loss_percentage': round(
                ((total_value - total_cost) / total_cost * 100) if total_cost > 0 else 0, 2
            ),
            'asset_allocation': asset_allocation,
            'top_performers': performances[:5],
            'worst_performers': performances[-5:] if len(performances) > 5 else []
        }

        self._set_cached(cache_key, result)
        return result

    def detect_anomalies(
        self,
        user_id: int,
        lookback_days: int = 90
    ) -> list[dict[str, Any]]:
        """
        Smart anomaly detection for unusual financial activities.
        """
        start_date = datetime.now(UTC) - timedelta(days=lookback_days)
        accounts = self._get_user_accounts(user_id)
        account_ids = [acc['id'] for acc in accounts]

        transactions = []
        for acc_id in account_ids:
            acc_txs = self._get_user_transactions_for_account(acc_id)
            transactions.extend([
                tx for tx in acc_txs
                if tx.get('transaction_date') >= start_date
            ])

        if len(transactions) < 10:
            return []

        anomalies = []

        # Calculate baseline statistics
        amounts = [abs(tx.get('amount')) for tx in transactions]
        avg_amount = mean(amounts)
        std_amount = stdev(amounts) if len(amounts) > 1 else 0

        # Detect amount anomalies (3x above baseline or 3 standard deviations)
        threshold_3x = avg_amount * 3
        threshold_3std = avg_amount + (3 * std_amount)

        for tx in transactions[-30:]:  # Check last 30 transactions
            amount = abs(tx.get('amount'))

            if amount > threshold_3x:
                anomalies.append({
                    'type': 'unusual_amount',
                    'severity': 'high' if amount > avg_amount * 5 else 'medium',
                    'transaction_id': tx.get('id'),
                    'amount': amount,
                    'baseline_average': round(avg_amount, 2),
                    'description': f"Transaction amount ${amount:.2f} is {amount/avg_amount:.1f}x your average",
                    'detected_at': datetime.now(UTC).isoformat()
                })

            if amount > threshold_3std and std_amount > 0:
                std_devs = (amount - avg_amount) / std_amount
                anomalies.append({
                    'type': 'statistical_outlier',
                    'severity': 'medium',
                    'transaction_id': tx.get('id'),
                    'amount': amount,
                    'standard_deviations': round(std_devs, 2),
                    'description': f"Transaction is {std_devs:.1f} standard deviations from normal",
                    'detected_at': datetime.now(UTC).isoformat()
                })

        # Detect velocity spikes (many transactions in short time)
        recent_24h = [tx for tx in transactions if tx.get('transaction_date') >= datetime.now(UTC) - timedelta(days=1)]
        avg_daily_txs = len(transactions) / lookback_days

        if len(recent_24h) > avg_daily_txs * 3:
            anomalies.append({
                'type': 'velocity_spike',
                'severity': 'medium',
                'transaction_count': len(recent_24h),
                'baseline_daily': round(avg_daily_txs, 1),
                'description': f"{len(recent_24h)} transactions in 24h vs average of {avg_daily_txs:.1f}/day",
                'detected_at': datetime.now(UTC).isoformat()
            })

        return anomalies

    def calculate_subscription_insights(
        self,
        user_id: int
    ) -> dict[str, Any]:
        """
        Subscription cost optimization and utilization analysis.
        """
        cache_key = f"subscription_insights_{user_id}"
        cached = self._get_cached(cache_key)
        if cached:
            return cached

        subscriptions = self._get_user_subscriptions(user_id)

        if not subscriptions:
            return {
                'total_monthly_cost': 0,
                'total_annual_cost': 0,
                'subscription_count': 0,
                'recommendations': []
            }

        total_monthly = 0.0
        total_annual = 0.0
        recommendations = []

        for sub in subscriptions:
            if sub.get('billing_cycle') == 'monthly':
                monthly_cost = sub.get('amount')
                annual_cost = sub.get('amount') * 12
            elif sub.get('billing_cycle') == 'annual':
                monthly_cost = sub.get('amount') / 12
                annual_cost = sub.get('amount')
            else:
                monthly_cost = sub.get('amount')
                annual_cost = sub.get('amount') * 12

            total_monthly += monthly_cost
            total_annual += annual_cost

            # Check for high-cost subscriptions
            if monthly_cost > 50:
                recommendations.append({
                    'subscription_id': sub.get('id'),
                    'service_name': sub.get('service_name'),
                    'type': 'high_cost',
                    'monthly_cost': round(monthly_cost, 2),
                    'suggestion': f"Review if ${monthly_cost:.2f}/month subscription is being utilized"
                })

            # Check for annual billing opportunity
            if sub.get('billing_cycle') == 'monthly' and monthly_cost > 10:
                potential_savings = monthly_cost * 12 * 0.15  # Assume 15% savings
                recommendations.append({
                    'subscription_id': sub.get('id'),
                    'service_name': sub.get('service_name'),
                    'type': 'annual_billing_opportunity',
                    'potential_annual_savings': round(potential_savings, 2),
                    'suggestion': f"Switch to annual billing to potentially save ${potential_savings:.2f}/year"
                })

        result = {
            'total_monthly_cost': round(total_monthly, 2),
            'total_annual_cost': round(total_annual, 2),
            'subscription_count': len(subscriptions),
            'active_subscriptions': len([s for s in subscriptions if s.is_active]),
            'recommendations': recommendations[:5]  # Top 5 recommendations
        }

        self._set_cached(cache_key, result)
        return result

    def calculate_loan_risk_score(
        self,
        user_id: int
    ) -> dict[str, Any]:
        """
        Loan payment schedule analysis and delinquency risk scoring.
        """
        cache_key = f"loan_risk_{user_id}"
        cached = self._get_cached(cache_key)
        if cached:
            return cached

        loans = self._get_user_loans(user_id)

        if not loans:
            return {
                'total_outstanding': 0,
                'monthly_payment_total': 0,
                'risk_score': 0,
                'risk_level': 'none',
                'loans': []
            }

        total_outstanding = 0.0
        total_monthly_payment = 0.0
        risk_factors = []
        loan_details = []

        for loan in loans:
            if loan.get('status') != 'active':
                continue

            total_outstanding += loan.get('principal_remaining')
            total_monthly_payment += loan.get('monthly_payment')

            # Calculate risk factors
            loan_risk = 0

            # Check payment history
            if hasattr(loan, 'missed_payments') and loan.get('missed_payments') > 0:
                risk_factors.append(f"Loan {loan.get('id')}: {loan.get('missed_payments')} missed payments")
                loan_risk += loan.get('missed_payments') * 20

            # Check upcoming payment
            if loan.get('next_payment_date'):
                days_until_payment = (loan.get('next_payment_date') - datetime.now(UTC).date()).days
                if days_until_payment < 0:
                    risk_factors.append(f"Loan {loan.get('id')}: Payment overdue by {abs(days_until_payment)} days")
                    loan_risk += min(abs(days_until_payment) * 2, 50)

            # Check debt-to-value ratio
            if loan.get('loan_type') == 'mortgage' and hasattr(loan, 'property_value'):
                ltv = loan.get('principal_remaining') / loan.get('property_value') if loan.get('property_value') > 0 else 0
                if ltv > 0.8:
                    risk_factors.append(f"Loan {loan.get('id')}: High LTV ratio {ltv:.1%}")
                    loan_risk += 15

            loan_details.append({
                'loan_id': loan.get('id'),
                'loan_type': loan.get('loan_type'),
                'principal_remaining': round(loan.get('principal_remaining'), 2),
                'monthly_payment': round(loan.get('monthly_payment'), 2),
                'next_payment_date': loan.get('next_payment_date').isoformat() if loan.get('next_payment_date') else None,
                'risk_score': min(loan_risk, 100)
            })

        # Calculate overall risk score (0-100)
        overall_risk = min(sum([ld['risk_score'] for ld in loan_details]) / len(loan_details) if loan_details else 0, 100)

        risk_level = 'low'
        if overall_risk > 70:
            risk_level = 'critical'
        elif overall_risk > 50:
            risk_level = 'high'
        elif overall_risk > 30:
            risk_level = 'medium'

        result = {
            'total_outstanding': round(total_outstanding, 2),
            'monthly_payment_total': round(total_monthly_payment, 2),
            'risk_score': round(overall_risk, 2),
            'risk_level': risk_level,
            'risk_factors': risk_factors[:5],
            'loans': loan_details
        }

        self._set_cached(cache_key, result)
        return result

    def calculate_budget_adherence(
        self,
        user_id: int
    ) -> dict[str, Any]:
        """
        Budget adherence tracking with predictive variance alerts.
        """
        cache_key = f"budget_adherence_{user_id}"
        cached = self._get_cached(cache_key)
        if cached:
            return cached

        budgets = self._get_user_budgets(user_id)

        if not budgets:
            return {
                'total_budgets': 0,
                'on_track_count': 0,
                'over_budget_count': 0,
                'at_risk_count': 0,
                'budgets': []
            }

        accounts = self._get_user_accounts(user_id)
        account_ids = [acc['id'] for acc in accounts]

        budget_status = []
        on_track = 0
        over_budget = 0
        at_risk = 0

        for budget in budgets:
            if not budget.get('is_active'):
                continue

            # Get spending for this budget's category in current period
            today = datetime.now(UTC).date()
            if budget.get('period') == 'monthly':
                period_start = today.replace(day=1)
                period_end = (period_start + relativedelta(months=1)) - timedelta(days=1)
            elif budget.get('period') == 'weekly':
                period_start = today - timedelta(days=today.weekday())
                period_end = period_start + timedelta(days=6)
            else:  # yearly
                period_start = today.replace(month=1, day=1)
                period_end = today.replace(month=12, day=31)

            # Calculate spending
            spent = 0.0
            for acc_id in account_ids:
                txs = self._get_user_transactions_for_account(acc_id)
                for tx in txs:
                    if (tx.get('category_id') == budget.get('category_id') and
                        period_start <= tx.get('transaction_date').date() <= period_end and
                        tx.get('transaction_type') == 'debit'):
                        spent += abs(tx.get('amount'))

            percentage_used = (spent / budget.get('amount') * 100) if budget.get('amount') > 0 else 0

            # Predict end-of-period spending
            days_elapsed = (today - period_start).days + 1
            total_days = (period_end - period_start).days + 1
            if days_elapsed > 0:
                projected_spend = (spent / days_elapsed) * total_days
                projected_percentage = (projected_spend / budget.get('amount') * 100) if budget.get('amount') > 0 else 0
            else:
                projected_spend = spent
                projected_percentage = percentage_used

            # Categorize status
            status = 'on_track'
            if percentage_used >= 100:
                status = 'over_budget'
                over_budget += 1
            elif projected_percentage >= 100 or percentage_used >= 80:
                status = 'at_risk'
                at_risk += 1
            else:
                on_track += 1

            category = self._get_category(budget.get('category_id'))

            budget_status.append({
                'budget_id': budget.get('id'),
                'category_name': category.get('name') if category else 'Unknown',
                'budgeted_amount': round(budget.get('amount'), 2),
                'spent_amount': round(spent, 2),
                'percentage_used': round(percentage_used, 2),
                'projected_spend': round(projected_spend, 2),
                'projected_percentage': round(projected_percentage, 2),
                'status': status,
                'period': budget.get('period'),
                'period_start': period_start.isoformat(),
                'period_end': period_end.isoformat()
            })

        result = {
            'total_budgets': len([b for b in budgets if b.get('is_active')]),
            'on_track_count': on_track,
            'over_budget_count': over_budget,
            'at_risk_count': at_risk,
            'budgets': budget_status
        }

        self._set_cached(cache_key, result)
        return result

    def calculate_spending_trends(
        self,
        user_id: int,
        months: int = 6
    ) -> dict[str, Any]:
        """
        Category-wise spending trends with seasonal adjustments.
        """
        cache_key = f"spending_trends_{user_id}_{months}"
        cached = self._get_cached(cache_key)
        if cached:
            return cached

        start_date = datetime.now(UTC) - relativedelta(months=months)
        accounts = self._get_user_accounts(user_id)
        account_ids = [acc['id'] for acc in accounts]

        transactions = []
        for acc_id in account_ids:
            acc_txs = self._get_user_transactions_for_account(acc_id)
            transactions.extend([
                tx for tx in acc_txs
                if tx.get('transaction_date') >= start_date and tx.get('transaction_type') == 'debit'
            ])

        # Group by category and month
        by_category_month = defaultdict(lambda: defaultdict(float))

        for tx in transactions:
            if tx.get('category_id'):
                category = self._get_category(tx.get('category_id'))
                if category and not category.get('is_income'):
                    month_key = tx.get('transaction_date').strftime('%Y-%m')
                    by_category_month[category.get('name')][month_key] += abs(tx.get('amount'))

        # Calculate trends
        trends = []
        for category, monthly_data in by_category_month.items():
            if not monthly_data:
                continue

            amounts = list(monthly_data.values())
            avg_monthly = mean(amounts)
            std_monthly = stdev(amounts) if len(amounts) > 1 else 0

            # Calculate trend direction
            if len(amounts) >= 2:
                recent_avg = mean(amounts[-2:])
                earlier_avg = mean(amounts[:2])
                change_pct = ((recent_avg - earlier_avg) / earlier_avg * 100) if earlier_avg > 0 else 0

                trend_direction = 'stable'
                if change_pct > 10:
                    trend_direction = 'increasing'
                elif change_pct < -10:
                    trend_direction = 'decreasing'
            else:
                trend_direction = 'stable'
                change_pct = 0

            trends.append({
                'category': category,
                'average_monthly': round(avg_monthly, 2),
                'standard_deviation': round(std_monthly, 2),
                'trend_direction': trend_direction,
                'change_percentage': round(change_pct, 2),
                'monthly_breakdown': {
                    month: round(amount, 2)
                    for month, amount in sorted(monthly_data.items())
                }
            })

        # Sort by average monthly spending
        trends.sort(key=lambda x: x['average_monthly'], reverse=True)

        result = {
            'period_months': months,
            'total_categories': len(trends),
            'trends': trends[:15]  # Top 15 categories
        }

        self._set_cached(cache_key, result)
        return result

    def calculate_financial_health_score(
        self,
        user_id: int
    ) -> dict[str, Any]:
        """
        Comprehensive financial health score (0-100).
        """
        cache_key = f"health_score_{user_id}"
        cached = self._get_cached(cache_key)
        if cached:
            return cached

        score = 0
        factors = []

        # Factor 1: Savings rate (0-20 points)
        cash_flow = self.calculate_cash_flow(user_id, 30)
        savings_rate = cash_flow['savings_rate']
        if savings_rate >= 20:
            savings_points = 20
        elif savings_rate >= 10:
            savings_points = 15
        elif savings_rate >= 5:
            savings_points = 10
        elif savings_rate >= 0:
            savings_points = 5
        else:
            savings_points = 0

        score += savings_points
        factors.append({
            'factor': 'Savings Rate',
            'score': savings_points,
            'max_score': 20,
            'value': f"{savings_rate:.1f}%"
        })

        # Factor 2: Budget adherence (0-20 points)
        budget_adh = self.calculate_budget_adherence(user_id)
        if budget_adh['total_budgets'] > 0:
            adherence_rate = budget_adh['on_track_count'] / budget_adh['total_budgets']
            budget_points = int(adherence_rate * 20)
            score += budget_points
            factors.append({
                'factor': 'Budget Adherence',
                'score': budget_points,
                'max_score': 20,
                'value': f"{adherence_rate*100:.0f}% on track"
            })
        else:
            factors.append({
                'factor': 'Budget Adherence',
                'score': 10,
                'max_score': 20,
                'value': 'No budgets set'
            })
            score += 10

        # Factor 3: Loan risk (0-20 points, inverse)
        loan_risk = self.calculate_loan_risk_score(user_id)
        loan_points = max(0, 20 - int(loan_risk['risk_score'] / 5))
        score += loan_points
        factors.append({
            'factor': 'Debt Management',
            'score': loan_points,
            'max_score': 20,
            'value': f"{loan_risk['risk_level']} risk"
        })

        # Factor 4: Investment portfolio (0-20 points)
        inv_perf = self.calculate_investment_performance(user_id)
        if inv_perf['total_value'] > 0:
            if inv_perf['total_gain_loss_percentage'] > 10:
                inv_points = 20
            elif inv_perf['total_gain_loss_percentage'] > 0:
                inv_points = 15
            elif inv_perf['total_gain_loss_percentage'] > -10:
                inv_points = 10
            else:
                inv_points = 5
        else:
            inv_points = 10  # Neutral if no investments

        score += inv_points
        factors.append({
            'factor': 'Investment Performance',
            'score': inv_points,
            'max_score': 20,
            'value': f"{inv_perf['total_gain_loss_percentage']:.1f}% return"
        })

        # Factor 5: Emergency fund (0-20 points)
        accounts = self._get_user_accounts(user_id)
        liquid_assets = sum([
            acc['balance'] for acc in accounts
            if acc['account_type'] in ['checking', 'savings'] and acc['is_active']
        ])
        monthly_expenses = abs(cash_flow['money_out'])
        emergency_fund_months = (liquid_assets / monthly_expenses) if monthly_expenses > 0 else 0

        if emergency_fund_months >= 6:
            emergency_points = 20
        elif emergency_fund_months >= 3:
            emergency_points = 15
        elif emergency_fund_months >= 1:
            emergency_points = 10
        else:
            emergency_points = 5

        score += emergency_points
        factors.append({
            'factor': 'Emergency Fund',
            'score': emergency_points,
            'max_score': 20,
            'value': f"{emergency_fund_months:.1f} months"
        })

        # Determine overall rating
        if score >= 80:
            rating = 'Excellent'
        elif score >= 60:
            rating = 'Good'
        elif score >= 40:
            rating = 'Fair'
        else:
            rating = 'Needs Improvement'

        result = {
            'overall_score': score,
            'rating': rating,
            'factors': factors,
            'recommendations': self._generate_health_recommendations(factors)
        }

        self._set_cached(cache_key, result)
        return result

    def _generate_health_recommendations(self, factors: list[dict]) -> list[str]:
        """Generate recommendations based on health factors."""
        recommendations = []

        for factor in factors:
            if factor['score'] < factor['max_score'] * 0.5:
                if factor['factor'] == 'Savings Rate':
                    recommendations.append("Increase your savings rate by reviewing expenses and setting up automatic transfers")
                elif factor['factor'] == 'Budget Adherence':
                    recommendations.append("Set realistic budgets for your top spending categories and track progress regularly")
                elif factor['factor'] == 'Debt Management':
                    recommendations.append("Focus on paying down high-interest debt and avoid missing payments")
                elif factor['factor'] == 'Investment Performance':
                    recommendations.append("Consider diversifying your investment portfolio or consulting with a financial advisor")
                elif factor['factor'] == 'Emergency Fund':
                    recommendations.append("Build your emergency fund to cover at least 3-6 months of expenses")

        return recommendations[:3]  # Top 3 recommendations
