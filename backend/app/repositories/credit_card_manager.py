"""
Credit card recommendation and application management.
"""
import random
from datetime import UTC, datetime, timedelta
from typing import Any


class CreditCardManager:
    """Manages credit card recommendations and applications."""

    def __init__(self, data_manager):
        self.data_manager = data_manager
        self._init_card_offers()

    def _init_card_offers(self):
        """Initialize credit card offers if not already present."""
        if self.data_manager.card_offers:
            return  # Already initialized

        # These were already added in _generate_card_application_data
        # but let's ensure they exist for standalone usage
        card_offers = [
            {
                'id': 1,
                'card_name': 'Cash Rewards Plus',
                'issuer': 'MegaBank',
                'category': 'cash_back',
                'annual_fee': 0,
                'min_credit_score': 650,
                'cashback_rate': 2.0,
                'signup_bonus': 200,
                'benefits': ['2% cashback on all purchases', '$200 signup bonus', 'No annual fee'],
                'apr_range': '15.99%-23.99%',
                'credit_limit_range': '$1,000-$10,000'
            },
            {
                'id': 2,
                'card_name': 'Travel Elite',
                'issuer': 'Premium Bank',
                'category': 'travel',
                'annual_fee': 450,
                'min_credit_score': 750,
                'points_multiplier': 3,
                'signup_bonus': 1000,
                'benefits': ['3x points on travel', 'Airport lounge access', 'Travel insurance'],
                'apr_range': '14.99%-22.99%',
                'credit_limit_range': '$5,000-$50,000'
            },
            {
                'id': 3,
                'card_name': 'Student Starter',
                'issuer': 'EduBank',
                'category': 'student',
                'annual_fee': 0,
                'min_credit_score': 0,
                'cashback_rate': 1.0,
                'signup_bonus': 50,
                'benefits': ['1% cashback', 'No credit history required', 'Financial education resources'],
                'apr_range': '19.99%-26.99%',
                'credit_limit_range': '$500-$2,500'
            },
            {
                'id': 4,
                'card_name': 'Business Platinum',
                'issuer': 'Corporate Bank',
                'category': 'business',
                'annual_fee': 250,
                'min_credit_score': 700,
                'cashback_rate': 3.0,
                'signup_bonus': 500,
                'benefits': ['3% cashback on business purchases', 'Expense tracking', 'Employee cards'],
                'apr_range': '13.99%-21.99%',
                'credit_limit_range': '$5,000-$100,000'
            },
            {
                'id': 5,
                'card_name': 'Premium Rewards',
                'issuer': 'Elite Financial',
                'category': 'rewards',
                'annual_fee': 95,
                'min_credit_score': 700,
                'points_multiplier': 2,
                'signup_bonus': 50000,
                'benefits': ['2x points on all purchases', '50,000 bonus points', 'Concierge service'],
                'apr_range': '16.99%-24.99%',
                'credit_limit_range': '$2,000-$25,000'
            },
            {
                'id': 6,
                'card_name': 'Secured Builder',
                'issuer': 'BuildCredit Bank',
                'category': 'secured',
                'annual_fee': 39,
                'min_credit_score': 0,
                'cashback_rate': 1.0,
                'signup_bonus': 0,
                'benefits': ['Build credit history', 'Upgrade path to unsecured', 'Free credit monitoring'],
                'apr_range': '22.99%',
                'credit_limit_range': '$200-$3,000'
            },
            {
                'id': 7,
                'card_name': 'Zero Interest Card',
                'issuer': 'Balance Bank',
                'category': 'balance_transfer',
                'annual_fee': 0,
                'min_credit_score': 680,
                'intro_apr_period': 18,
                'signup_bonus': 0,
                'benefits': ['0% APR for 18 months', 'No balance transfer fee', 'No annual fee'],
                'apr_range': '18.99%-26.99%',
                'credit_limit_range': '$2,000-$15,000'
            }
        ]

        # Only add if not already present
        if not self.data_manager.card_offers:
            self.data_manager.card_offers.extend(card_offers)

    def get_user_credit_score(self, user_id: int) -> int:
        """Get user's credit score from credit scores data."""
        # Check if user has a credit score record
        credit_score = next((cs for cs in self.data_manager.credit_scores
                           if cs['user_id'] == user_id), None)

        if credit_score:
            return credit_score['score']

        # Generate a mock credit score if not found
        base_score = 650
        # Use user_id to create consistent score
        variation = (user_id * 17) % 200  # Creates variation 0-199
        return min(850, base_score + variation)

    def get_credit_factors(self, user_id: int) -> dict[str, Any]:
        """Analyze factors affecting credit score."""
        # Get user's financial data
        [a for a in self.data_manager.accounts if a['user_id'] == user_id]
        user_cards = [c for c in self.data_manager.cards if c['user_id'] == user_id]
        user_loans = [l for l in self.data_manager.loans if l['user_id'] == user_id and l['status'] == 'active']

        # Calculate credit utilization
        total_credit_limit = sum(c.get('credit_limit') or 0 for c in user_cards)
        total_balance = sum(c.get('current_balance') or 0 for c in user_cards)
        utilization = (total_balance / total_credit_limit * 100) if total_credit_limit > 0 else 0

        # Payment history (mock)
        on_time_payments = random.randint(90, 100)

        # Credit age (mock)
        oldest_account_months = random.randint(6, 120)

        # Credit mix
        credit_types = set()
        if user_cards:
            credit_types.add('credit_cards')
        if user_loans:
            credit_types.add('loans')
        if any(l['loan_type'] == 'mortgage' for l in user_loans):
            credit_types.add('mortgage')

        return {
            'payment_history': {
                'score': on_time_payments,
                'impact': 'high',
                'description': f'{on_time_payments}% on-time payments'
            },
            'credit_utilization': {
                'score': utilization,
                'impact': 'high',
                'description': f'{utilization:.1f}% credit utilization',
                'recommendation': 'Keep utilization below 30%' if utilization > 30 else 'Good utilization rate'
            },
            'credit_age': {
                'months': oldest_account_months,
                'impact': 'medium',
                'description': f'{oldest_account_months // 12} years {oldest_account_months % 12} months'
            },
            'credit_mix': {
                'types': list(credit_types),
                'impact': 'low',
                'description': f'{len(credit_types)} types of credit'
            },
            'recent_inquiries': {
                'count': random.randint(0, 3),
                'impact': 'low',
                'description': 'Hard inquiries in last 2 years'
            }
        }

    def get_card_recommendations(self, user_id: int) -> list[dict[str, Any]]:
        """Get personalized credit card recommendations."""
        credit_score = self.get_user_credit_score(user_id)
        self.get_credit_factors(user_id)

        # Get user's spending patterns (mock)
        # First get user's account IDs
        user_account_ids = [a['id'] for a in self.data_manager.accounts if a['user_id'] == user_id]
        # Then get transactions for those accounts
        user_transactions = [t for t in self.data_manager.transactions
                           if t.get('account_id') in user_account_ids]

        # Analyze spending categories
        category_spending = {}
        for trans in user_transactions[-100:]:  # Last 100 transactions
            category = trans.get('category', 'Other')
            category_spending[category] = category_spending.get(category, 0) + abs(trans['amount'])

        # Determine user preferences
        high_travel = category_spending.get('Travel', 0) > 1000
        category_spending.get('Dining', 0) > 500
        is_student = any('student' in str(t.get('description', '')).lower()
                        for t in user_transactions)

        recommendations = []

        for offer in self.data_manager.card_offers:
            # Check eligibility
            if credit_score < offer['min_credit_score']:
                continue

            # Calculate match score
            match_score = 0
            reasons = []

            # Base score on credit score match
            if credit_score >= offer['min_credit_score'] + 50:
                match_score += 30
                reasons.append("Your credit score exceeds this card's requirement")
            elif credit_score >= offer['min_credit_score']:
                match_score += 20
                reasons.append("Your credit score meets this card's requirement")

            # Match based on card type and spending
            card_type = offer.get('category', offer.get('type', 'unknown'))
            if card_type == 'travel' and high_travel:
                match_score += 40
                reasons.append('High travel spending detected')
            elif card_type in ['cash_back', 'cashback']:
                match_score += 30
                reasons.append('Great for everyday purchases')
            elif card_type == 'student' and is_student:
                match_score += 50
                reasons.append('Perfect for students')
            elif card_type == 'secured' and credit_score < 650:
                match_score += 40
                reasons.append('Build your credit history')

            # Annual fee consideration
            if offer['annual_fee'] == 0:
                match_score += 10
                reasons.append('No annual fee')

            # Add recommendation
            if match_score > 0:
                recommendations.append({
                    'card_offer_id': offer['id'],
                    'card_name': offer.get('card_name', offer.get('name', 'Unknown')),
                    'issuer': offer['issuer'],
                    'card_type': offer.get('category', offer.get('type', 'unknown')),
                    'match_score': match_score,
                    'reasons': reasons,
                    'annual_fee': offer['annual_fee'],
                    'benefits': offer['benefits'],
                    'apr_range': offer['apr_range'],
                    'estimated_credit_limit': self._estimate_credit_limit(credit_score, offer),
                    'pre_qualified': credit_score >= offer['min_credit_score'] + 20
                })

        # Sort by match score
        recommendations.sort(key=lambda x: x['match_score'], reverse=True)

        # Store recommendations
        for rec in recommendations[:5]:  # Top 5
            if not any(r['user_id'] == user_id and r['card_offer_id'] == rec['card_offer_id']
                      for r in self.data_manager.card_recommendations):
                self.data_manager.card_recommendations.append({
                    'id': len(self.data_manager.card_recommendations) + 1,
                    'user_id': user_id,
                    'card_offer_id': rec['card_offer_id'],
                    'recommendation_score': rec['match_score'] / 100,
                    'reason': ', '.join(rec['reasons']),
                    'created_at': datetime.now(UTC)
                })

        return recommendations[:5]  # Return top 5 recommendations

    def apply_for_card(self, user_id: int, card_offer_id: int,
                       requested_credit_limit: float | None = None) -> dict[str, Any]:
        """Apply for a credit card."""
        # Get card offer
        offer = next((o for o in self.data_manager.card_offers
                     if o['id'] == card_offer_id), None)

        if not offer:
            raise ValueError("Card offer not found")

        # Get user's credit score
        credit_score = self.get_user_credit_score(user_id)

        # Check eligibility
        if credit_score < offer['min_credit_score']:
            # Still create an application record even if rejected
            application_id = len(self.data_manager.card_applications) + 1
            application = {
                'id': application_id,
                'user_id': user_id,
                'card_offer_id': card_offer_id,
                'status': 'rejected',
                'credit_score_at_application': credit_score,
                'requested_credit_limit': requested_credit_limit or 0,
                'approved_credit_limit': 0,
                'application_date': datetime.now(UTC),
                'decision_date': datetime.now(UTC),
                'rejection_reason': f"Credit score {credit_score} below minimum {offer['min_credit_score']}"
            }
            self.data_manager.card_applications.append(application)

            return {
                'id': application_id,
                'application_id': application_id,
                'card_id': card_offer_id,
                'status': 'rejected',
                'reason': f"Credit score {credit_score} below minimum {offer['min_credit_score']}"
            }

        # Create application
        application_id = len(self.data_manager.card_applications) + 1

        # Determine approval and credit limit
        approval_probability = min(0.95, 0.5 + (credit_score - offer['min_credit_score']) / 200)
        is_approved = random.random() < approval_probability

        if is_approved:
            approved_limit = self._calculate_approved_limit(credit_score, offer, requested_credit_limit)
            status = 'approved'
        else:
            approved_limit = 0
            status = 'rejected'

        application = {
            'id': application_id,
            'user_id': user_id,
            'card_offer_id': card_offer_id,
            'status': status,
            'credit_score_at_application': credit_score,
            'requested_credit_limit': requested_credit_limit or 0,
            'approved_credit_limit': approved_limit,
            'application_date': datetime.now(UTC),
            'decision_date': datetime.now(UTC) + timedelta(seconds=5),  # Instant decision
            'rejection_reason': None if is_approved else 'Risk assessment'
        }

        self.data_manager.card_applications.append(application)

        # If approved, create the card
        if is_approved:
            self._create_card_from_application(user_id, offer, approved_limit)

        return {
            'id': application_id,
            'application_id': application_id,
            'card_id': card_offer_id,
            'status': status,
            'approved_credit_limit': approved_limit,
            'next_steps': 'Card will arrive in 7-10 business days' if is_approved else 'Consider secured card options'
        }

    def get_user_applications(self, user_id: int) -> list[dict[str, Any]]:
        """Get user's credit card applications."""
        applications = [app for app in self.data_manager.card_applications
                       if app['user_id'] == user_id]

        # Enhance with offer details
        enhanced_apps = []
        for app in applications:
            offer = next((o for o in self.data_manager.card_offers
                         if o['id'] == app['card_offer_id']), None)

            if offer:
                enhanced_apps.append({
                    **app,
                    'card_name': offer.get('card_name', offer.get('name', 'Unknown')),
                    'issuer': offer['issuer'],
                    'card_type': offer.get('category', offer.get('type', 'unknown'))
                })

        return enhanced_apps

    def simulate_credit_improvement(self, user_id: int,
                                  months: int = 6) -> dict[str, Any]:
        """Simulate credit score improvement over time."""
        current_score = self.get_user_credit_score(user_id)
        current_factors = self.get_credit_factors(user_id)

        simulations = []
        projected_score = current_score

        for month in range(1, months + 1):
            # Simulate improvements
            improvements = []

            # Payment history improvement
            if current_factors['payment_history']['score'] < 100:
                projected_score += 2
                improvements.append('Consistent on-time payments')

            # Credit utilization improvement
            if current_factors['credit_utilization']['score'] > 30:
                projected_score += 3
                improvements.append('Reduced credit utilization')

            # Credit age
            if month % 12 == 0:
                projected_score += 5
                improvements.append('Credit history aged 1 year')

            # Limit score to valid range
            projected_score = min(850, projected_score)

            simulations.append({
                'month': month,
                'projected_score': projected_score,
                'improvements': improvements,
                'new_card_eligibility': self._check_new_eligibility(projected_score, current_score)
            })

        return {
            'current_score': current_score,
            'projected_score': projected_score,
            'total_improvement': projected_score - current_score,
            'timeline': simulations,
            'recommendations': self._get_improvement_recommendations(current_factors)
        }

    # Helper methods
    def _estimate_credit_limit(self, credit_score: int, offer: dict[str, Any]) -> str:
        """Estimate credit limit based on score and offer."""
        limit_range = offer['credit_limit_range']
        # Parse range (e.g., "$1,000-$10,000")
        parts = limit_range.replace('$', '').replace(',', '').split('-')
        min_limit = float(parts[0])
        max_limit = float(parts[1])

        # Calculate based on credit score
        score_factor = (credit_score - offer['min_credit_score']) / 200
        estimated = min_limit + (max_limit - min_limit) * min(1, score_factor)

        return f"${int(estimated):,}"

    def _calculate_approved_limit(self, credit_score: int, offer: dict[str, Any],
                                requested: float | None) -> float:
        """Calculate approved credit limit."""
        limit_range = offer['credit_limit_range']
        parts = limit_range.replace('$', '').replace(',', '').split('-')
        min_limit = float(parts[0])
        max_limit = float(parts[1])

        # Base calculation
        score_factor = (credit_score - offer['min_credit_score']) / 200
        base_limit = min_limit + (max_limit - min_limit) * min(1, score_factor)

        # Consider requested amount
        approved = min(requested, base_limit) if requested else base_limit

        # Round to nice number
        if approved < 1000:
            return round(approved / 100) * 100
        if approved < 10000:
            return round(approved / 500) * 500
        return round(approved / 1000) * 1000

    def _create_card_from_application(self, user_id: int, offer: dict[str, Any],
                                    credit_limit: float):
        """Create a virtual card from approved application."""
        card_number = self._generate_card_number()

        card = {
            'id': len(self.data_manager.cards) + 1,
            'user_id': user_id,
            'card_name': offer['name'],
            'card_number': card_number,
            'card_type': 'credit',
            'issuer': offer['issuer'],
            'credit_limit': credit_limit,
            'current_balance': 0,
            'available_credit': credit_limit,
            'apr': float(offer['apr_range'].split('-')[0].replace('%', '')),
            'annual_fee': offer['annual_fee'],
            'status': 'active',
            'created_at': datetime.now(UTC),
            'expiry_date': (datetime.now(UTC) + timedelta(days=365*4)).strftime('%m/%y')
        }

        self.data_manager.cards.append(card)

    def _generate_card_number(self) -> str:
        """Generate a mock credit card number."""
        # Generate a valid-looking card number (not real)
        prefix = random.choice(['4', '5', '3'])  # Visa, Mastercard, Amex
        middle = ''.join(random.choices('0123456789', k=14))
        return f"{prefix}{middle}"

    def _check_new_eligibility(self, new_score: int, old_score: int) -> list[str]:
        """Check new card eligibility based on improved score."""
        newly_eligible = []

        for offer in self.data_manager.card_offers:
            if old_score < offer['min_credit_score'] <= new_score:
                newly_eligible.append(offer['name'])

        return newly_eligible

    def _get_improvement_recommendations(self, factors: dict[str, Any]) -> list[str]:
        """Get credit improvement recommendations."""
        recommendations = []

        if factors['credit_utilization']['score'] > 30:
            recommendations.append('Pay down credit card balances to below 30% utilization')

        if factors['payment_history']['score'] < 100:
            recommendations.append('Set up automatic payments to ensure on-time payments')

        if len(factors['credit_mix']['types']) < 3:
            recommendations.append('Consider diversifying credit types (cards, loans, etc.)')

        if factors['recent_inquiries']['count'] > 2:
            recommendations.append('Avoid applying for new credit for the next 6 months')

        if factors['credit_age']['months'] < 24:
            recommendations.append('Keep oldest accounts open to build credit history')

        return recommendations
