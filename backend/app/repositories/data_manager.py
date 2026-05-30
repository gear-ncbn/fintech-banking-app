"""
Simplified data manager for mock testing system.
"""
import hashlib
import random
import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

from app.models import AssetClass
from app.repositories.base_repository import BaseRepository
from app.services.auth_service import AuthService
from app.utils.auth import AuthHandler


class DataManager:
    """Data manager for memory-based storage system."""

    def __init__(self):
        # Core data stores
        self.users: list[dict[str, Any]] = []
        self.sessions: list[dict[str, Any]] = []
        self.accounts: list[dict[str, Any]] = []
        self.transactions: list[dict[str, Any]] = []
        self.categories: list[dict[str, Any]] = []
        self.cards: list[dict[str, Any]] = []
        self.budgets: list[dict[str, Any]] = []
        self.goals: list[dict[str, Any]] = []
        self.notifications: list[dict[str, Any]] = []
        self.messages: list[dict[str, Any]] = []
        self.bills: list[dict[str, Any]] = []
        self.subscriptions: list[dict[str, Any]] = []
        self.merchants: list[dict[str, Any]] = []
        self.logs: list[dict[str, Any]] = []  # Add logs store

        # Additional stores for compatibility
        self.credit_scores: list[dict[str, Any]] = []
        self.social_connections: list[dict[str, Any]] = []
        self.p2p_transactions: list[dict[str, Any]] = []
        self.investment_accounts: list[dict[str, Any]] = []
        self.holdings: list[dict[str, Any]] = []
        self.support_tickets: list[dict[str, Any]] = []
        self.faq_items: list[dict[str, Any]] = []
        self.analytics_events: list[dict[str, Any]] = []

        # Additional stores needed by routes
        self.goal_contributions: list[dict[str, Any]] = []
        self.contacts: list[dict[str, Any]] = []
        self.conversations: list[dict[str, Any]] = []
        self.conversation_participants: list[dict[str, Any]] = []
        self.message_read_receipts: list[dict[str, Any]] = []
        self.recurring_rules: list[dict[str, Any]] = []
        self.notes: list[dict[str, Any]] = []
        self.security_events: list[dict[str, Any]] = []
        self.payment_methods: list[dict[str, Any]] = []
        self.alerts: list[dict[str, Any]] = []
        self.bank_links: list[dict[str, Any]] = []
        self.plaid_accounts: list[dict[str, Any]] = []
        self.transactions_sync_status: list[dict[str, Any]] = []
        self.linked_accounts: list[dict[str, Any]] = []
        self.credit_simulations: list[dict[str, Any]] = []
        self.two_factor_auth: list[dict[str, Any]] = []
        self.user_devices: list[dict[str, Any]] = []
        self.security_audit_logs: list[dict[str, Any]] = []

        # Security module stores
        self.audit_logs: list[dict[str, Any]] = []
        self.login_attempts: list[dict[str, Any]] = []
        self.transaction_anomalies: list[dict[str, Any]] = []
        self.security_incidents: list[dict[str, Any]] = []
        self.account_lockouts: list[dict[str, Any]] = []
        self.trusted_devices: list[dict[str, Any]] = []

        self.spending_limits: list[dict[str, Any]] = []
        self.round_up_configs: list[dict[str, Any]] = []
        self.round_up_transactions: list[dict[str, Any]] = []
        self.savings_rules: list[dict[str, Any]] = []
        self.savings_challenges: list[dict[str, Any]] = []
        self.challenge_participants: list[dict[str, Any]] = []
        self.invoices: list[dict[str, Any]] = []
        self.expense_reports: list[dict[str, Any]] = []
        self.receipts: list[dict[str, Any]] = []
        self.cancellation_reminders: list[dict[str, Any]] = []
        self.direct_messages: list[dict[str, Any]] = []
        self.message_attachments: list[dict[str, Any]] = []
        self.message_folders: list[dict[str, Any]] = []
        self.blocked_users: list[dict[str, Any]] = []
        self.message_settings: list[dict[str, Any]] = []

        # Crypto-related stores
        self.crypto_wallets: list[dict[str, Any]] = []
        self.crypto_assets: list[dict[str, Any]] = []
        self.nft_assets: list[dict[str, Any]] = []
        self.crypto_transactions: list[dict[str, Any]] = []
        self.defi_positions: list[dict[str, Any]] = []

        # Credit-related stores
        self.credit_alerts: list[dict[str, Any]] = []
        self.credit_disputes: list[dict[str, Any]] = []
        self.credit_builder_accounts: list[dict[str, Any]] = []

        # Unified system stores
        self.unified_balances: list[dict[str, Any]] = []
        self.asset_bridges: list[dict[str, Any]] = []
        self.conversion_rates: list[dict[str, Any]] = []
        self.collateral_positions: list[dict[str, Any]] = []
        self.unified_transactions: list[dict[str, Any]] = []

        # Loan-related stores
        self.loans: list[dict[str, Any]] = []
        self.loan_applications: list[dict[str, Any]] = []
        self.loan_offers: list[dict[str, Any]] = []
        self.loan_payments: list[dict[str, Any]] = []
        self.loan_payment_schedules: list[dict[str, Any]] = []

        # Insurance-related stores
        self.insurance_policies: list[dict[str, Any]] = []
        self.insurance_claims: list[dict[str, Any]] = []
        self.insurance_providers: list[dict[str, Any]] = []
        self.insurance_quotes: list[dict[str, Any]] = []
        self.insurance_beneficiaries: list[dict[str, Any]] = []

        # Investment-related stores
        self.investment_accounts: list[dict[str, Any]] = []
        self.investment_portfolios: list[dict[str, Any]] = []
        self.investment_positions: list[dict[str, Any]] = []
        self.investment_trades: list[dict[str, Any]] = []
        self.investment_watchlists: list[dict[str, Any]] = []
        self.etf_assets: list[dict[str, Any]] = []
        self.stock_assets: list[dict[str, Any]] = []
        self.market_data: list[dict[str, Any]] = []

        # Credit card application stores
        self.card_applications: list[dict[str, Any]] = []
        self.card_offers: list[dict[str, Any]] = []
        self.card_benefits: list[dict[str, Any]] = []
        self.card_recommendations: list[dict[str, Any]] = []

        # Currency converter stores (Airtm-like)
        self.supported_currencies: list[dict[str, Any]] = []
        self.exchange_rates: dict[str, float] = {}
        self.conversion_quotes: list[dict[str, Any]] = []
        self.conversion_orders: list[dict[str, Any]] = []
        self.peer_offers: list[dict[str, Any]] = []
        self.p2p_trades: list[dict[str, Any]] = []
        self.currency_balances: list[dict[str, Any]] = []

        # Create simple repositories
        self.user_repository = BaseRepository(self.users)
        self.account_repository = BaseRepository(self.accounts)
        self.transaction_repository = BaseRepository(self.transactions)

        # Initialize auth service
        self.auth_service = AuthService(self)

        # Initialize auth handler for password hashing
        self.auth_handler = AuthHandler()

        # Generate initial data
        self.reset()

    def reset(self, seed: int = 42, demo_mode: bool = True):
        """Reset all data and generate mock data.

        Args:
            seed: Random seed for data generation
            demo_mode: If True, generates rich demo data. If False, generates minimal test data.
        """
        # Seed the RNG up front so the entire dataset (transactions, budgets,
        # etc.) is reproducible for a given seed. Without this the demo data
        # changed on every restart, which made cross-module figures impossible
        # to verify.
        random.seed(seed)

        # Clear all data
        for attr in dir(self):
            if isinstance(getattr(self, attr), list):
                getattr(self, attr).clear()

        # Reset BaseMemoryModel ID counters so they reinitialize
        from app.models.memory_models import BaseMemoryModel
        BaseMemoryModel._id_counter.clear()
        BaseMemoryModel._initialized = False

        # Generate data based on mode
        self._generate_test_users()
        self._generate_categories(demo_mode)
        self._generate_merchants(demo_mode)
        self._generate_accounts(demo_mode)

        if demo_mode:
            # Generate rich demo data
            self._generate_transactions()
            self._generate_budgets()
            self._generate_goals()
            self._generate_notifications()
            self._generate_social_connections()
            self._generate_direct_messages()
            self._generate_payment_methods()
            self._generate_cards()
            self._generate_subscriptions()
            self._generate_invoices()
            self._generate_crypto_data()
            self._generate_credit_data()
            self._generate_unified_data()
            self._generate_loan_data()
            self._generate_insurance_data()
            self._generate_investment_data()
            self._generate_card_application_data()
            self._generate_currency_data()
            # Runs last (after contacts and messages exist) so it can rewrite
            # message/contact notifications to reference each user's real
            # connections without disturbing the seeded RNG of the dataset.
            self._personalize_notifications()

    def _personalize_notifications(self):
        """Point message/contact notifications at each user's real connections.

        Notifications are generated before conversations exist, so by default a
        "new message from ..." can name someone the user has no thread with.
        Rewrite those messages here using the user's actual message partners
        (and accepted contacts) so notifications are consistent with the data.
        """
        def name_for(user_id):
            return next(
                (u['full_name'] for u in self.users if u['id'] == user_id),
                None,
            )

        for notif in self.notifications:
            notif_type = notif.get('type')
            if notif_type not in ('new_message', 'contact_request'):
                continue

            user_id = notif['user_id']
            if notif_type == 'new_message':
                # People who actually sent this user a message.
                candidate_ids = [
                    m['sender_id'] for m in self.direct_messages
                    if m['recipient_id'] == user_id
                ]
            else:
                candidate_ids = [
                    c['contact_id'] for c in self.contacts
                    if c['user_id'] == user_id and c.get('status') == 'accepted'
                ]

            names = []
            for cid in candidate_ids:
                name = name_for(cid)
                if name and name not in names:
                    names.append(name)

            if not names:
                continue

            # Deterministic pick (keeps the dataset reproducible).
            chosen = names[notif['id'] % len(names)]
            if notif_type == 'new_message':
                notif['message'] = f"You have a new message from {chosen}"
            else:
                notif['message'] = f"New contact request from {chosen}"

    def _generate_test_users(self):
        """Generate test users."""
        test_users = [
            # Main demo users
            {'username': 'john_doe', 'email': 'john@example.com', 'full_name': 'John Doe'},
            {'username': 'jane_smith', 'email': 'jane@example.com', 'full_name': 'Jane Smith'},
            {'username': 'mike_wilson', 'email': 'mike@example.com', 'full_name': 'Mike Wilson'},
            {'username': 'sarah_jones', 'email': 'sarah@example.com', 'full_name': 'Sarah Jones'},
            {'username': 'david_brown', 'email': 'david@example.com', 'full_name': 'David Brown'},
            # Additional users for search functionality (not connected to main users)
            {'username': 'emily_davis', 'email': 'emily@example.com', 'full_name': 'Emily Davis'},
            {'username': 'alex_martin', 'email': 'alex@example.com', 'full_name': 'Alex Martin'},
            {'username': 'lisa_anderson', 'email': 'lisa@example.com', 'full_name': 'Lisa Anderson'},
            {'username': 'robert_taylor', 'email': 'robert@example.com', 'full_name': 'Robert Taylor'},
            {'username': 'maria_garcia', 'email': 'maria@example.com', 'full_name': 'Maria Garcia'},
            # Admin user
            {'username': 'admin', 'email': 'admin@example.com', 'full_name': 'Admin User', 'is_admin': True}
        ]

        for idx, user_data in enumerate(test_users, 1):
            # Split full_name into first and last
            name_parts = user_data['full_name'].split(None, 1)
            first_name = name_parts[0] if name_parts else ""
            last_name = name_parts[1] if len(name_parts) > 1 else ""

            # Use proper password hashing
            password = 'AdminUser2026Banking' if user_data['username'] == 'admin' else 'DemoUser2026Banking'

            user = {
                'id': idx,  # Use integer ID
                'username': user_data['username'],
                'email': user_data['email'],
                'full_name': user_data['full_name'],
                'first_name': first_name,
                'last_name': last_name,
                'password_hash': self.auth_handler.get_password_hash(password),
                'is_active': True,
                'role': 'admin' if user_data.get('is_admin', False) else 'user',  # Use lowercase role values
                'phone': '',
                'currency': 'USD',
                'timezone': 'UTC',
                'created_at': datetime.now(UTC),
                'updated_at': None,
                'last_login': None
            }
            self.users.append(user)

    def _generate_categories(self, demo_mode: bool = True):
        """Generate transaction categories."""
        if demo_mode:
            # Rich categories for demo
            categories = [
                # Expense categories
                {'id': 1, 'name': 'Groceries', 'is_income': False, 'icon': '🛒', 'color': '#4CAF50', 'is_system': True},
                {'id': 2, 'name': 'Transportation', 'is_income': False, 'icon': '🚗', 'color': '#2196F3', 'is_system': True},
                {'id': 3, 'name': 'Entertainment', 'is_income': False, 'icon': '🎬', 'color': '#FF9800', 'is_system': True},
                {'id': 4, 'name': 'Utilities', 'is_income': False, 'icon': '💡', 'color': '#9C27B0', 'is_system': True},
                {'id': 5, 'name': 'Healthcare', 'is_income': False, 'icon': '🏥', 'color': '#F44336', 'is_system': True},
                {'id': 6, 'name': 'Education', 'is_income': False, 'icon': '📚', 'color': '#3F51B5', 'is_system': True},
                {'id': 7, 'name': 'Shopping', 'is_income': False, 'icon': '🛍️', 'color': '#E91E63', 'is_system': True},
                {'id': 8, 'name': 'Food & Dining', 'is_income': False, 'icon': '🍽️', 'color': '#FF5722', 'is_system': True},
                {'id': 9, 'name': 'Travel', 'is_income': False, 'icon': '✈️', 'color': '#00BCD4', 'is_system': True},
                {'id': 10, 'name': 'Personal Care', 'is_income': False, 'icon': '💆', 'color': '#9E9E9E', 'is_system': True},
                {'id': 11, 'name': 'Rent', 'is_income': False, 'icon': '🏠', 'color': '#795548', 'is_system': True},
                {'id': 12, 'name': 'Insurance', 'is_income': False, 'icon': '🛡️', 'color': '#607D8B', 'is_system': True},
                {'id': 13, 'name': 'Loan Payment', 'is_income': False, 'icon': '💳', 'color': '#424242', 'is_system': True},
                {'id': 14, 'name': 'Credit Card Payment', 'is_income': False, 'icon': '💳', 'color': '#616161', 'is_system': True},
                {'id': 15, 'name': 'Transfer', 'is_income': False, 'icon': '💸', 'color': '#9C27B0', 'is_system': True},
                # Income categories
                {'id': 16, 'name': 'Salary', 'is_income': True, 'icon': '💰', 'color': '#4CAF50', 'is_system': True},
                {'id': 17, 'name': 'Freelance', 'is_income': True, 'icon': '💼', 'color': '#8BC34A', 'is_system': True},
                {'id': 18, 'name': 'Investment Returns', 'is_income': True, 'icon': '📈', 'color': '#00ACC1', 'is_system': True},
                {'id': 19, 'name': 'Gift', 'is_income': True, 'icon': '🎁', 'color': '#FFC107', 'is_system': True},
                {'id': 20, 'name': 'Refund', 'is_income': True, 'icon': '↩️', 'color': '#607D8B', 'is_system': True},
                {'id': 21, 'name': 'Other Income', 'is_income': True, 'icon': '💵', 'color': '#795548', 'is_system': True}
            ]
        else:
            # Basic categories for testing
            categories = [
                {'id': 1, 'name': 'Food & Dining', 'is_income': False, 'is_system': True},
                {'id': 2, 'name': 'Shopping', 'is_income': False, 'is_system': True},
                {'id': 3, 'name': 'Transport', 'is_income': False, 'is_system': True},
                {'id': 4, 'name': 'Salary', 'is_income': True, 'is_system': True},
                {'id': 5, 'name': 'Investment', 'is_income': True, 'is_system': True}
            ]
        self.categories.extend(categories)

    def _generate_merchants(self, demo_mode: bool = True):
        """Generate merchants for transactions."""
        if not demo_mode:
            return

        # Map each merchant to the category it actually belongs to so that a
        # transaction's merchant and category are always consistent (e.g.
        # Starbucks is always "Food & Dining", not a random category).
        merchant_categories = {
            "Walmart": "Groceries",
            "Amazon": "Shopping",
            "Starbucks": "Food & Dining",
            "Target": "Shopping",
            "Shell Gas": "Transportation",
            "Netflix": "Entertainment",
            "Spotify": "Entertainment",
            "Uber": "Transportation",
            "McDonald's": "Food & Dining",
            "CVS Pharmacy": "Healthcare",
            "Home Depot": "Shopping",
            "Best Buy": "Shopping",
            "Whole Foods": "Groceries",
            "Delta Airlines": "Travel",
            "Airbnb": "Travel",
            "Apple Store": "Shopping",
            "Google Play": "Entertainment",
            "Steam": "Entertainment",
            "Nike": "Shopping",
            "Costco": "Groceries",
            "Trader Joe's": "Groceries",
        }

        expense_categories = [c for c in self.categories if not c.get('is_income', False)]
        category_by_name = {c['name']: c for c in expense_categories}

        for name, category_name in merchant_categories.items():
            category = category_by_name.get(category_name)
            self.merchants.append({
                'id': len(self.merchants) + 1,
                'name': name,
                'category_id': category['id'] if category else (
                    expense_categories[0]['id'] if expense_categories else None
                ),
                'created_at': datetime.now(UTC)
            })

    def _generate_accounts(self, demo_mode: bool = True):
        """Generate test accounts for users."""
        import random

        from app.utils.money import format_money

        # Skip admin user
        regular_users = [u for u in self.users if not u.get('is_admin', False)]


        account_id_counter = 1
        for user in regular_users:
            # Checking account (everyone has one)
            checking = {
                'id': account_id_counter,
                'user_id': user['id'],
                'name': f"{user['first_name']}'s Checking",
                'account_type': 'checking',
                'balance': format_money(random.uniform(1000, 10000)) if demo_mode else 5000.00,
                'currency': 'USD',
                'is_active': True,
                'created_at': datetime.now(UTC)
            }
            self.accounts.append(checking)
            account_id_counter += 1

            # Savings account (everyone has one)
            savings = {
                'id': account_id_counter,
                'user_id': user['id'],
                'name': f"{user['first_name']}'s Savings",
                'account_type': 'savings',
                'balance': format_money(random.uniform(5000, 25000)) if demo_mode else 10000.00,
                'currency': 'USD',
                'interest_rate': 2.5,
                'is_active': True,
                'created_at': datetime.now(UTC)
            }
            self.accounts.append(savings)
            account_id_counter += 1

            # Credit card (everyone has one in demo mode)
            if demo_mode:
                credit_card = {
                    'id': account_id_counter,
                    'user_id': user['id'],
                    'name': f"{user['first_name']}'s Credit Card",
                    'account_type': 'credit_card',
                    'balance': format_money(-random.uniform(100, 3000)),
                    'credit_limit': format_money(random.choice([5000, 10000, 15000, 20000])),
                    'currency': 'USD',
                    'is_active': True,
                    'created_at': datetime.now(UTC)
                }
                self.accounts.append(credit_card)
                account_id_counter += 1


    def _generate_transactions(self):
        """Generate transaction history for demo mode."""
        import random
        from datetime import timedelta

        regular_users = [u for u in self.users if not u.get('is_admin', False)]

        for user in regular_users:
            user_accounts = [a for a in self.accounts if a['user_id'] == user['id']]
            if not user_accounts:
                continue

            # Get user's accounts by type
            checking = next((a for a in user_accounts if a['account_type'] == 'checking'), None)
            next((a for a in user_accounts if a['account_type'] == 'savings'), None)
            credit_card = next((a for a in user_accounts if a['account_type'] == 'credit_card'), None)

            if not checking:
                continue

            # Generate transactions for current year and previous year to support yearly views
            # This ensures yearly budgets have full data
            # Create a map to track spending by category and month for consistent patterns
            monthly_spending = {}

            # Calculate days to cover: from Jan 1 of last year to today
            today = datetime.now(UTC)
            start_of_last_year = datetime(today.year - 1, 1, 1, tzinfo=UTC)
            days_to_generate = (today - start_of_last_year).days

            for days_ago in range(days_to_generate):
                date = datetime.now(UTC) - timedelta(days=days_ago)
                month_key = f"{date.year}-{date.month:02d}"

                if month_key not in monthly_spending:
                    monthly_spending[month_key] = {}

                # Different transaction patterns for different days
                # Weekends have fewer transactions
                is_weekend = date.weekday() >= 5

                base_transactions = 2 if is_weekend else 3

                variation = random.randint(-1, 1)  # -1, 0, or 1
                num_transactions = max(1, base_transactions + variation)

                # For dates more than a year ago, reduce frequency to save memory
                if days_ago > 365:
                    # Only generate transactions for every 3rd day for very old data
                    if days_ago % 3 != 0:
                        continue
                    num_transactions = random.randint(1, 2)

                for _ in range(num_transactions):
                    # Give each transaction a realistic time of day instead of
                    # reusing the seed-generation time for every record.
                    date = date.replace(
                        hour=random.randint(7, 22),
                        minute=random.randint(0, 59),
                        second=random.randint(0, 59),
                        microsecond=0,
                    )

                    # 80% expenses, 20% income
                    is_income = random.random() < 0.2

                    if is_income:
                        # Income transaction
                        amount = random.uniform(50, 3000)
                        category = random.choice([c for c in self.categories if c.get('is_income', False)])
                        account = checking
                        transaction_type = 'credit'
                        description = f"{category['name']} - {date.strftime('%B %Y')}"
                        merchant_id = None
                    else:
                        # Expense transaction. Pick a merchant first, then take
                        # the category from that merchant so the displayed
                        # merchant and category always agree.
                        merchant = random.choice(self.merchants) if self.merchants else None
                        category = None
                        if merchant:
                            category = next(
                                (c for c in self.categories if c['id'] == merchant['category_id']),
                                None,
                            )
                        if category is None:
                            expense_categories = [c for c in self.categories if not c.get('is_income', False)]
                            category = random.choice(expense_categories)

                        # 60% chance to use credit card if available, otherwise checking
                        account = credit_card if credit_card and random.random() < 0.6 else checking

                        transaction_type = 'debit'

                        # Vary amounts based on category - with consistent monthly patterns
                        # These amounts are per transaction, designed so monthly totals are predictable
                        if category['name'] == 'Groceries':
                            # Target ~$600/month, ~20 transactions = $30 average
                            amount = random.uniform(20, 40)
                        elif category['name'] == 'Food & Dining':
                            # Target ~$400/month, ~15 transactions = $27 average
                            amount = random.uniform(15, 40)
                        elif category['name'] == 'Transportation':
                            # Target ~$300/month, ~10 transactions = $30 average
                            amount = random.uniform(20, 40)
                        elif category['name'] == 'Utilities':
                            # Target ~$250/month, ~5 transactions = $50 average
                            amount = random.uniform(40, 60)
                        elif category['name'] == 'Shopping':
                            # Target ~$500/month, ~8 transactions = $62 average
                            amount = random.uniform(30, 95)
                        elif category['name'] == 'Entertainment':
                            # Target ~$200/month, ~6 transactions = $33 average
                            amount = random.uniform(20, 45)
                        elif category['name'] == 'Healthcare':
                            # Target ~$150/month, ~3 transactions = $50 average
                            amount = random.uniform(30, 70)
                        else:
                            amount = random.uniform(10, 100)

                        # Use the merchant name as the description.
                        if merchant:
                            description = merchant['name']
                        else:
                            description = f"{category['name']} Purchase"
                        merchant_id = merchant['id'] if merchant else None

                    # Generate notes (15% chance)
                    notes = None
                    if random.random() < 0.15:
                        note_templates = [
                            "Business expense - save receipt",
                            "Split with roommate",
                            "Birthday gift",
                            "Tax deductible",
                            "Reimbursement pending",
                            "Cash back earned",
                            "Used coupon code SAVE20",
                            "Price matched",
                            "Emergency purchase",
                            "Warranty included"
                        ]
                        notes = random.choice(note_templates)

                    # Generate tags (20% chance)
                    tags = []
                    if random.random() < 0.20:
                        available_tags = [
                            "business", "personal", "recurring", "medical", "travel",
                            "gift", "tax-deductible", "reimbursable", "subscription",
                            "essential", "luxury", "emergency", "planned"
                        ]
                        num_tags = random.randint(1, 3)
                        tags = random.sample(available_tags, num_tags)

                    # Generate attachments (10% chance, higher for business expenses)
                    attachments = []
                    attachment_chance = 0.25 if "business" in tags else 0.10
                    if random.random() < attachment_chance:
                        attachment_types = [
                            ("receipt", "pdf"), ("invoice", "pdf"),
                            ("statement", "pdf"), ("contract", "pdf")
                        ]
                        attachment_type, ext = random.choice(attachment_types)
                        attachments.append({
                            'id': len(self.transactions) + 1000,  # Simple ID generation
                            'transaction_id': len(self.transactions) + 1,
                            'file_name': f"{attachment_type}_{date.strftime('%Y%m%d')}_{random.randint(1000, 9999)}.{ext}",
                            'file_type': f"application/{ext}",
                            'file_size': random.randint(50000, 500000),  # 50KB to 500KB
                            'uploaded_at': date
                        })

                    transaction = {
                        'id': len(self.transactions) + 1,
                        'account_id': account['id'],
                        'category_id': category['id'],
                        'merchant_id': merchant_id,
                        'amount': round(amount, 2),
                        'transaction_type': transaction_type,
                        'status': 'completed',
                        'description': description,
                        'transaction_date': date,
                        'created_at': date,
                        'notes': notes,
                        'tags': tags,
                        'attachments': attachments,
                        'reference_number': f"TXN{len(self.transactions) + 1:08d}"
                    }
                    self.transactions.append(transaction)

            # Add some recurring monthly transactions
            recurring_transactions = [
                {'name': 'Netflix Subscription', 'amount': 15.99, 'category': 'Entertainment', 'day': 5},
                {'name': 'Spotify Premium', 'amount': 9.99, 'category': 'Entertainment', 'day': 10},
                {'name': 'Electric Bill', 'amount': round(random.uniform(80, 150), 2), 'category': 'Utilities', 'day': 15},
                {'name': 'Internet Service', 'amount': 69.99, 'category': 'Utilities', 'day': 20},
                {'name': 'Phone Bill', 'amount': 45.00, 'category': 'Utilities', 'day': 25},
            ]

            # Add recurring transactions for the last 3 months
            for month_offset in range(3):
                current_date = datetime.now(UTC) - timedelta(days=month_offset * 30)
                month_start = current_date.replace(day=1)

                for recurring in recurring_transactions:
                    if random.random() < 0.9:  # 90% chance to have the recurring transaction
                        transaction_date = month_start.replace(day=recurring['day'])
                        if transaction_date <= datetime.now(UTC):
                            category = next((c for c in self.categories if c['name'] == recurring['category']), None)
                            if category:
                                transaction = {
                                    'id': len(self.transactions) + 1,
                                    'account_id': checking['id'],
                                    'category_id': category['id'],
                                    'merchant_id': None,
                                    'amount': round(recurring['amount'], 2),
                                    'transaction_type': 'debit',
                                    'status': 'completed',
                                    'description': recurring['name'],
                                    'transaction_date': transaction_date,
                                    'created_at': transaction_date,
                                    'notes': 'Monthly subscription',
                                    'tags': ['recurring', 'subscription'],
                                    'attachments': [],
                                    'reference_number': f"TXN{len(self.transactions) + 1:08d}"
                                }
                                self.transactions.append(transaction)

        # Sort all transactions by date (newest first)
        self.transactions.sort(key=lambda x: x['transaction_date'], reverse=True)


    def _generate_budgets(self):
        """Generate budgets for demo mode.

        Budgets are seeded deterministically so the Budget page reconciles with
        the rest of the app: every expense category the user actually spends in
        gets exactly one **monthly** budget. Because all budgets share the same
        (calendar-month) period as the canonical "monthly spending" window, the
        Budget page's per-category "spent" figures and "Total Spent" always sum
        to the same monthly total shown on the Dashboard and Analytics pages.
        """
        import math

        regular_users = [u for u in self.users if not u.get('is_admin', False)]
        category_by_id = {c['id']: c for c in self.categories}

        now = datetime.now(UTC)
        start_date = now.replace(day=1).date()
        current_month_key = f"{now.year}-{now.month:02d}"

        budget_id_counter = 1
        for user in regular_users:
            user_account_ids = {a['id'] for a in self.accounts if a['user_id'] == user['id']}

            # Build per-category monthly spend history from the user's actual
            # expense transactions so budget *amounts* reflect real spending
            # (deterministic, not hand-tuned to any one screen).
            spent_category_ids = []
            seen = set()
            monthly_by_category: dict[int, dict[str, float]] = {}
            for tx in self.transactions:
                if tx.get('account_id') not in user_account_ids:
                    continue
                if tx.get('transaction_type') != 'debit':
                    continue
                cid = tx.get('category_id')
                category = category_by_id.get(cid)
                if not category or category.get('is_income', False):
                    continue
                if cid not in seen:
                    seen.add(cid)
                    spent_category_ids.append(cid)
                tx_date = tx.get('transaction_date')
                month_key = f"{tx_date.year}-{tx_date.month:02d}"
                monthly_by_category.setdefault(cid, {}).setdefault(month_key, 0.0)
                monthly_by_category[cid][month_key] += float(tx.get('amount') or 0.0)

            for cid in spent_category_ids:
                # Average monthly spend across the most recent *complete* months
                # (exclude the current partial month and the older, sparsely
                # generated history) then add ~20% headroom and round up to a
                # tidy number. This keeps budget amounts realistic and usually a
                # little above actual spend, without hand-tuning any figure.
                by_month = monthly_by_category.get(cid, {})
                complete_months = sorted(
                    (k for k in by_month if k != current_month_key), reverse=True
                )[:6]
                if complete_months:
                    avg_monthly = sum(by_month[k] for k in complete_months) / len(complete_months)
                else:
                    avg_monthly = by_month.get(current_month_key, 0.0)
                amount = max(50.0, math.ceil((avg_monthly * 1.2) / 50.0) * 50.0)

                budget = {
                    'id': budget_id_counter,
                    'user_id': user['id'],
                    'category_id': cid,
                    'amount': round(float(amount), 2),
                    'period': 'monthly',
                    'start_date': start_date,
                    'alert_threshold': 0.8,
                    'is_active': True,
                    'created_at': datetime.now(UTC)
                }
                self.budgets.append(budget)
                budget_id_counter += 1

    def _generate_goals(self):
        """Generate savings goals for demo mode."""
        import random
        from datetime import timedelta

        regular_users = [u for u in self.users if not u.get('is_admin', False)]

        goal_templates = [
            ("Vacation Fund", 5000),
            ("Emergency Fund", 10000),
            ("New Car", 25000),
            ("Home Down Payment", 50000),
            ("Christmas Shopping", 2000),
            ("Wedding Fund", 20000),
            ("Education Fund", 15000),
            ("Retirement Boost", 30000)
        ]

        for user in regular_users:
            # Get user's savings account
            savings_account = next((a for a in self.accounts if a['user_id'] == user['id'] and a['account_type'] == 'savings'), None)
            if not savings_account:
                continue

            # Create 1-3 goals per user
            num_goals = random.randint(1, 3)
            selected_goals = random.sample(goal_templates, num_goals)

            for idx, (goal_name, target_amount) in enumerate(selected_goals):
                # Use auto-incrementing integer ID
                goal_id = len(self.goals) + idx + 1

                # Set up automatic allocation for some goals (60% chance)
                has_auto_allocation = random.random() < 0.6

                # Vary allocation percentage based on goal priority
                allocation_percentage = 0.0
                allocation_priority = 1
                if has_auto_allocation:
                    if goal_name in ["Emergency Fund", "Retirement Boost"]:
                        allocation_percentage = random.uniform(15, 25)  # High priority goals
                        allocation_priority = 3
                    elif goal_name in ["Education Fund", "Home Down Payment"]:
                        allocation_percentage = random.uniform(10, 20)  # Medium priority
                        allocation_priority = 2
                    else:
                        allocation_percentage = random.uniform(5, 15)  # Lower priority
                        allocation_priority = 1

                from app.utils.money import format_money

                goal = {
                    'id': goal_id,
                    'user_id': user['id'],
                    'name': goal_name,
                    'target_amount': format_money(target_amount),
                    'current_amount': format_money(random.uniform(0, target_amount * 0.7)),
                    'target_date': (datetime.now(UTC) + timedelta(days=random.randint(90, 365))).date(),
                    'status': 'active',  # Use lowercase for enum
                    'account_id': savings_account['id'],  # Link to savings account
                    'created_at': datetime.now(UTC),
                    # Automatic allocation fields
                    'auto_allocate_percentage': round(allocation_percentage, 2),
                    'auto_allocate_fixed_amount': 0.0,
                    'allocation_priority': allocation_priority,
                    'allocation_source_types': ['income', 'deposit'],
                    'category': 'other',
                    'priority': 'medium'
                }
                self.goals.append(goal)

    def _generate_notifications(self):
        """Generate notifications for demo mode."""
        import random
        from datetime import timedelta

        regular_users = [u for u in self.users if not u.get('is_admin', False)]

        notification_templates = [
            ('budget_warning', 'Budget Alert', "You've used 85% of your {category} budget"),
            ('goal_milestone', 'Goal Progress', "You're 50% closer to your {goal} goal!"),
            ('transaction_alert', 'Large Transaction', "Transaction of ${amount} at {merchant}"),
            ('account_update', 'Account Update', "Your {account} balance has been updated"),
            ('new_message', 'New Message', "You have a new message from {sender}"),
            ('contact_request', 'Contact Request', "New contact request from {user}")
        ]

        for user in regular_users:
            # Create 3-8 notifications per user
            num_notifications = random.randint(3, 8)

            for _ in range(num_notifications):
                notif_type, title, message_template = random.choice(notification_templates)

                # Fill in template variables
                message = message_template.format(
                    category="Groceries",
                    goal="Vacation Fund",
                    amount="150.00",
                    merchant="Amazon",
                    account="Checking",
                    sender="Jane Smith",
                    user="Mike Wilson"
                )

                notification = {
                    'id': len(self.notifications) + 1,
                    'user_id': user['id'],
                    'type': notif_type,
                    'title': title,
                    'message': message,
                    'is_read': random.random() < 0.7,
                    'created_at': (datetime.now(UTC) - timedelta(hours=random.randint(1, 72)))
                }
                self.notifications.append(notification)

    def _generate_social_connections(self):
        """Generate social connections and messages for demo mode."""
        import random
        from datetime import timedelta

        regular_users = [u for u in self.users if not u.get('is_admin', False)]
        # Only connect the main demo users (first 5)
        main_users = regular_users[:5]

        # Create contacts between main users only
        for i, user in enumerate(main_users):
            other_users = [u for j, u in enumerate(main_users) if j != i]
            num_contacts = random.randint(1, min(3, len(other_users)))
            contacts = random.sample(other_users, num_contacts)

            for contact_user in contacts:
                # Check if contact already exists in reverse
                existing = next((c for c in self.contacts if c['user_id'] == contact_user['id'] and c['contact_id'] == user['id']), None)

                if not existing:
                    contact = {
                        'id': len(self.contacts) + 1,
                        'user_id': user['id'],
                        'contact_id': contact_user['id'],
                        'status': 'accepted',
                        'is_favorite': random.random() < 0.3,
                        'created_at': datetime.now(UTC)
                    }
                    self.contacts.append(contact)

                    # Create conversation
                    conversation = {
                        'id': len(self.conversations) + 1,
                        'is_group': False,
                        'created_by_id': user['id'],
                        'created_at': datetime.now(UTC)
                    }
                    self.conversations.append(conversation)

                    # Add participants
                    for participant_user in [user, contact_user]:
                        participant = {
                            'id': len(self.conversation_participants) + 1,
                            'conversation_id': conversation['id'],
                            'user_id': participant_user['id'],
                            'is_admin': participant_user['id'] == user['id'],
                            'joined_at': datetime.now(UTC)
                        }
                        self.conversation_participants.append(participant)

                    # Create messages
                    message_templates = [
                        "Hey! Want to split the dinner bill from last night?",
                        "I sent you $50 for the concert tickets",
                        "Can you pay me back for the Uber?",
                        "Thanks for covering lunch!",
                        "Here's my share for the groceries"
                    ]

                    num_messages = random.randint(2, 8)
                    for _j in range(num_messages):
                        sender = random.choice([user, contact_user])
                        message = {
                            'id': len(self.messages) + 1,
                            'conversation_id': conversation['id'],
                            'sender_id': sender['id'],
                            'content': random.choice(message_templates),
                            'message_type': 'text',
                            'status': 'read',
                            'created_at': (datetime.now(UTC) - timedelta(hours=random.randint(1, 168)))
                        }
                        self.messages.append(message)

    def _generate_payment_methods(self):
        """Generate payment methods for demo mode."""
        import random

        regular_users = [u for u in self.users if not u.get('is_admin', False)]

        card_brands = ['Visa', 'Mastercard', 'American Express', 'Discover']

        for user in regular_users:
            # Everyone has at least one payment method
            payment_method = {
                'id': len(self.payment_methods) + 1,
                'user_id': user['id'],
                'type': 'credit_card',
                'nickname': f"{user['first_name']}'s Card",
                'card_last_four': f"{random.randint(1000, 9999)}",
                'card_brand': random.choice(card_brands),
                'expiry_month': random.randint(1, 12),
                'expiry_year': random.randint(2025, 2030),
                'is_default': True,
                'status': 'active',
                'created_at': datetime.now(UTC)
            }
            self.payment_methods.append(payment_method)

            # 30% chance of having a second payment method
            if random.random() < 0.3:
                payment_method2 = {
                    'id': len(self.payment_methods) + 1,
                    'user_id': user['id'],
                    'type': 'debit_card',
                    'nickname': f"{user['first_name']}'s Debit",
                    'card_last_four': f"{random.randint(1000, 9999)}",
                    'card_brand': random.choice(card_brands[:2]),  # Visa or Mastercard
                    'expiry_month': random.randint(1, 12),
                    'expiry_year': random.randint(2025, 2030),
                    'is_default': False,
                    'status': 'active',
                    'created_at': datetime.now(UTC)
                }
                self.payment_methods.append(payment_method2)

    def _generate_direct_messages(self):
        """Generate direct message conversations for demo mode."""
        import random
        from datetime import timedelta

        regular_users = [u for u in self.users if not u.get('is_admin', False)]
        # Only create messages between main demo users (first 5)
        main_users = regular_users[:5]

        # Message ID counter to ensure unique IDs
        message_id_counter = 1

        # Message templates for realistic conversations
        message_templates = {
            'money_request': [
                "Hey! Can you pay me back for dinner last night? It was $45",
                "Hi! Just a reminder about the Uber from yesterday - $23.50",
                "Could you send me your half for the concert tickets? $85 per ticket",
                "Hey, can you split the grocery bill? Total was $120",
                "Just sent the request for the movie tickets - $15 each"
            ],
            'money_sent': [
                "Just sent you $45 for dinner. Thanks for covering!",
                "Paid you back for the Uber - $23.50 sent!",
                "Sent $85 for the concert ticket. Can't wait!",
                "Just sent my half for groceries - $60",
                "Money sent for the movie! $15"
            ],
            'general': [
                "Thanks! Got it 👍",
                "Perfect, received it!",
                "No worries! Anytime",
                "Are we still on for lunch tomorrow?",
                "Let me know if you need anything else",
                "See you at the meeting later!",
                "Thanks for handling that",
                "Sure thing! Happy to help",
                "What time works for you?",
                "Sounds good to me!"
            ],
            'transaction': [
                "I'll send it right now",
                "Let me transfer that to you",
                "What's your preferred payment method?",
                "Can you send me a payment request?",
                "I'll pay you back tomorrow"
            ]
        }

        # Create direct message conversations between connected users
        for contact in self.contacts:
            if contact['status'] != 'accepted':
                continue

            user1 = next((u for u in self.users if u['id'] == contact['user_id']), None)
            user2 = next((u for u in self.users if u['id'] == contact['contact_id']), None)

            if not user1 or not user2:
                continue

            # Skip if not main users
            if user1 not in main_users or user2 not in main_users:
                continue

            # Generate 3-10 messages per conversation
            num_messages = random.randint(3, 10)
            base_time = datetime.now(UTC) - timedelta(days=random.randint(1, 30))
            # Track text already used in this thread so the same canned line
            # isn't repeated across multiple days within one conversation.
            used_texts: set[str] = set()

            for i in range(num_messages):
                # Alternate senders for natural conversation flow
                if i == 0:
                    sender = user1
                    recipient = user2
                # 70% chance to alternate, 30% chance same sender sends multiple
                elif random.random() < 0.7:
                    sender = user2 if sender == user1 else user1
                    recipient = user1 if sender == user2 else user2
                else:
                    recipient = user1 if sender == user2 else user2

                # Choose message type
                if i == 0 and random.random() < 0.5:
                    # Start with money request
                    message_type = 'money_request'
                    has_transaction = True
                elif i == 1 and 'money_request' in str(self.direct_messages[-1:]):
                    # Reply to money request
                    message_type = 'money_sent'
                    has_transaction = True
                else:
                    message_type = random.choice(['general', 'transaction'])
                    has_transaction = random.random() < 0.3 and message_type == 'transaction'

                # Keep the random.choice on the full list so the seeded RNG
                # stream (and therefore the rest of the demo dataset) is
                # unchanged; only swap in an unused line — deterministically,
                # without drawing from the RNG — when it would repeat.
                message_text = random.choice(message_templates[message_type])
                if message_text in used_texts:
                    message_text = next(
                        (t for t in message_templates[message_type] if t not in used_texts),
                        message_text,
                    )
                used_texts.add(message_text)

                # Create the direct message
                message = {
                    'id': message_id_counter,
                    'sender_id': sender['id'],
                    'recipient_id': recipient['id'],
                    'subject': 'Message from conversation',
                    'message': message_text,
                    'priority': 'normal',
                    'is_read': random.random() < 0.8,  # 80% read
                    'read_at': base_time + timedelta(hours=i+1) if random.random() < 0.8 else None,
                    'is_draft': False,
                    'parent_message_id': None,
                    'folder_id': None,
                    'deleted_by_sender': False,
                    'deleted_by_recipient': False,
                    'sent_at': base_time + timedelta(hours=i),
                    'created_at': base_time + timedelta(hours=i),
                    'updated_at': None
                }
                message_id_counter += 1

                self.direct_messages.append(message)

                # Add transaction details if it's a money-related message
                if has_transaction and random.random() < 0.7:
                    amount = random.choice([15, 20, 25, 30, 35, 40, 45, 50, 60, 75, 85, 100])
                    transaction_attachment = {
                        'message_id': message['id'],
                        'transaction_id': random.randint(1000, 9999),
                        'amount': float(amount),
                        'direction': 'sent' if sender['id'] == user1['id'] else 'received',
                        'transaction_date': message['sent_at'],
                        'note': message_text[:50]
                    }
                    # Store this in message for frontend to use
                    message['transaction_details'] = transaction_attachment

                # Increment time for next message
                base_time = base_time + timedelta(hours=random.randint(1, 24))

    def _generate_cards(self):
        """Generate both physical and virtual cards for demo mode."""
        import random

        from ..utils.money import format_money

        regular_users = [u for u in self.users if not u.get('is_admin', False)]
        card_id = 1

        # Card issuers for physical cards
        issuers = ['Chase', 'Bank of America', 'Capital One', 'Wells Fargo', 'Citi']
        card_names = ['Platinum', 'Gold', 'Silver', 'Rewards', 'Cash Back', 'Travel']

        for user in regular_users:
            user_accounts = [a for a in self.accounts if a['user_id'] == user['id']]

            # Generate physical cards for each account
            for account in user_accounts:
                # Debit card for checking/savings accounts
                if account['account_type'] in ['checking', 'savings']:
                    card = {
                        'id': card_id,
                        'user_id': user['id'],
                        'account_id': account['id'],
                        'card_number': f"{random.randint(4000, 4999)} {random.randint(1000, 9999)} {random.randint(1000, 9999)} {random.randint(1000, 9999)}",
                        'cvv': f"{random.randint(100, 999)}",
                        'card_type': 'debit',
                        'card_name': f"{random.choice(issuers)} Debit Card",
                        'issuer': random.choice(issuers),
                        'status': 'active',
                        'credit_limit': None,
                        'current_balance': 0.0,
                        'expiry_date': (datetime.now(UTC) + timedelta(days=random.randint(365, 1460))).strftime('%Y-%m-%d'),
                        'is_contactless_enabled': True,
                        'is_online_enabled': True,
                        'is_international_enabled': random.choice([True, False]),
                        'created_at': datetime.now(UTC) - timedelta(days=random.randint(30, 730))
                    }
                    self.cards.append(card)
                    card_id += 1

                # Credit card for credit card accounts
                elif account['account_type'] == 'credit_card':
                    credit_limit = account.get('credit_limit', 5000)
                    # Keep the card balance in sync with its linked credit
                    # account. A negative account balance represents the
                    # amount currently owed on the card.
                    account_balance = account.get('balance') or 0
                    current_balance = format_money(
                        abs(account_balance) if account_balance < 0 else 0.0
                    )
                    card = {
                        'id': card_id,
                        'user_id': user['id'],
                        'account_id': account['id'],
                        'card_number': f"{random.randint(5000, 5999)} {random.randint(1000, 9999)} {random.randint(1000, 9999)} {random.randint(1000, 9999)}",
                        'cvv': f"{random.randint(100, 999)}",
                        'card_type': 'credit',
                        'card_name': f"{random.choice(issuers)} {random.choice(card_names)} Card",
                        'issuer': random.choice(issuers),
                        'status': 'active',
                        'credit_limit': credit_limit,
                        'current_balance': current_balance,
                        'available_credit': format_money(credit_limit - current_balance),
                        'interest_rate': random.choice([14.99, 17.99, 19.99, 22.99, 24.99]),
                        'minimum_payment': format_money(max(25, current_balance * 0.02)),
                        'payment_due_date': (datetime.now(UTC) + timedelta(days=random.randint(15, 25))).strftime('%Y-%m-%d'),
                        'rewards_program': random.choice(['cash_back', 'points', 'miles', None]),
                        'rewards_rate': random.choice([1.0, 1.5, 2.0, 3.0]) if random.random() > 0.3 else None,
                        'rewards_balance': random.randint(0, 50000) if random.random() > 0.3 else 0,
                        'expiry_date': (datetime.now(UTC) + timedelta(days=random.randint(365, 1460))).strftime('%Y-%m-%d'),
                        'is_contactless_enabled': True,
                        'is_online_enabled': True,
                        'is_international_enabled': True,
                        'created_at': datetime.now(UTC) - timedelta(days=random.randint(180, 1095))
                    }
                    self.cards.append(card)
                    card_id += 1

            # Generate virtual cards (60% of users have at least one)
            if random.random() < 0.6:
                # Link virtual cards to checking accounts
                checking_account = next((a for a in user_accounts if a['account_type'] == 'checking'), None)
                if checking_account:
                    num_virtual_cards = random.randint(1, 3)
                    for _i in range(num_virtual_cards):
                        card = {
                            'id': card_id,
                            'user_id': user['id'],
                            'account_id': checking_account['id'],
                            'parent_card_id': next((c['id'] for c in self.cards if c['user_id'] == user['id'] and c['card_type'] == 'debit'), None),
                            'card_number': f"{random.randint(3000, 3999)} {random.randint(1000, 9999)} {random.randint(1000, 9999)} {random.randint(1000, 9999)}",
                            'cvv': f"{random.randint(100, 999)}",
                            'card_type': 'virtual',
                            'card_name': random.choice(['Online Shopping', 'Subscriptions', 'Travel', 'General Use']) + ' Virtual Card',
                            'status': random.choice(['active', 'active', 'active', 'expired']),
                            'spending_limit': format_money(random.choice([100, 250, 500, 1000, 2000])),
                            'spent_amount': format_money(random.uniform(0, 500)),
                            'single_use': random.choice([True, False, False, False]),
                            'merchant_restrictions': random.choice([[], ['Amazon'], ['Netflix', 'Spotify'], []]),
                            'expiry_date': (datetime.now(UTC) + timedelta(days=random.randint(7, 90))).strftime('%Y-%m-%d'),
                            'is_contactless_enabled': False,
                            'is_online_enabled': True,
                            'is_international_enabled': False,
                            'created_at': datetime.now(UTC) - timedelta(days=random.randint(1, 60))
                        }
                        self.cards.append(card)
                        card_id += 1

    def _generate_subscriptions(self):
        """Generate subscriptions for demo mode."""
        import random
        from datetime import timedelta

        regular_users = [u for u in self.users if not u.get('is_admin', False)]

        subscription_data = [
            ("Netflix", 15.99, "streaming", "monthly"),
            ("Spotify", 9.99, "music", "monthly"),
            ("Amazon Prime", 139.00, "other", "annual"),
            ("Gym Membership", 49.99, "fitness", "monthly"),
            ("Cloud Storage", 9.99, "cloud_storage", "monthly"),
            ("News Subscription", 19.99, "news", "monthly"),
            ("Meal Kit Service", 79.99, "food_delivery", "weekly"),
            ("Software License", 299.00, "software", "annual")
        ]

        for user in regular_users:
            # Each user has 2-5 subscriptions
            num_subs = random.randint(2, 5)
            selected_subs = random.sample(subscription_data, num_subs)

            for merchant_name, amount, category, cycle in selected_subs:
                # Find a payment method for this user
                payment_method = next((pm for pm in self.payment_methods if pm['user_id'] == user['id']), None)

                # Calculate proper start_date and next_billing_date
                start_date = datetime.now(UTC).date() - timedelta(days=random.randint(30, 365))

                # Calculate next billing date based on cycle
                if cycle == "weekly":
                    next_billing_date = datetime.now(UTC).date() + timedelta(days=7)
                elif cycle == "monthly":
                    next_billing_date = datetime.now(UTC).date() + timedelta(days=30)
                elif cycle == "quarterly":
                    next_billing_date = datetime.now(UTC).date() + timedelta(days=90)
                elif cycle == "semi_annual":
                    next_billing_date = datetime.now(UTC).date() + timedelta(days=180)
                elif cycle == "annual":
                    next_billing_date = datetime.now(UTC).date() + timedelta(days=365)
                else:
                    next_billing_date = datetime.now(UTC).date() + timedelta(days=30)

                subscription = {
                    'id': len(self.subscriptions) + 1,
                    'user_id': user['id'],
                    'name': merchant_name,
                    'merchant_name': merchant_name,
                    'amount': amount,
                    'billing_cycle': cycle,
                    'category': category,
                    'status': 'active',
                    'start_date': start_date,
                    'next_billing_date': next_billing_date,
                    'payment_method_id': payment_method['id'] if payment_method else None,
                    'detected_automatically': random.random() < 0.3,
                    'created_at': datetime.now(UTC),
                    'updated_at': datetime.now(UTC)
                }
                self.subscriptions.append(subscription)

    def _generate_invoices(self):
        """Generate invoices for demo mode."""
        import random
        from datetime import timedelta

        regular_users = [u for u in self.users if not u.get('is_admin', False)]

        # Invoice templates with realistic client names and services
        invoice_templates = [
            {
                'client': 'Acme Corporation',
                'email': 'billing@acme-corp.com',
                'address': '123 Business Ave, New York, NY 10001',
                'services': ['Website Development', 'SEO Optimization', 'Content Creation'],
                'hourly_rate': 150,
                'hours_range': (10, 40)
            },
            {
                'client': 'TechStart Inc',
                'email': 'accounts@techstart.io',
                'address': '456 Innovation Blvd, San Francisco, CA 94105',
                'services': ['Mobile App Development', 'API Integration', 'Cloud Migration'],
                'hourly_rate': 175,
                'hours_range': (20, 60)
            },
            {
                'client': 'Global Retail Ltd',
                'email': 'finance@globalretail.com',
                'address': '789 Commerce St, Chicago, IL 60601',
                'services': ['E-commerce Platform', 'Inventory Management System', 'Analytics Dashboard'],
                'hourly_rate': 160,
                'hours_range': (15, 45)
            },
            {
                'client': 'Creative Agency Co',
                'email': 'payments@creativeagency.net',
                'address': '321 Design Way, Los Angeles, CA 90001',
                'services': ['UI/UX Design', 'Brand Identity', 'Marketing Materials'],
                'hourly_rate': 125,
                'hours_range': (8, 25)
            },
            {
                'client': 'Health Solutions LLC',
                'email': 'billing@healthsolutions.med',
                'address': '654 Medical Plaza, Boston, MA 02101',
                'services': ['Patient Portal Development', 'HIPAA Compliance Audit', 'Database Optimization'],
                'hourly_rate': 200,
                'hours_range': (30, 80)
            }
        ]

        invoice_id_counter = 1

        for user in regular_users:
            # Get user's business account (create one if doesn't exist)
            business_account = next((a for a in self.accounts if a['user_id'] == user['id'] and a.get('account_type') == 'business'), None)

            # Generate 3-8 invoices per user
            num_invoices = random.randint(3, 8)

            for _i in range(num_invoices):
                template = random.choice(invoice_templates)

                # Generate invoice date (within last 6 months)
                days_ago = random.randint(0, 180)
                issue_date = datetime.now(UTC) - timedelta(days=days_ago)

                # Payment terms
                payment_terms = random.choice(['due_on_receipt', 'net_15', 'net_30', 'net_45', 'net_60'])
                days_due = {
                    'due_on_receipt': 0,
                    'net_15': 15,
                    'net_30': 30,
                    'net_45': 45,
                    'net_60': 60
                }[payment_terms]

                due_date = issue_date + timedelta(days=days_due)

                # Generate invoice number
                invoice_number = f"INV-{issue_date.strftime('%Y%m')}-{invoice_id_counter:04d}"

                # Determine status based on dates
                now = datetime.now(UTC)
                if due_date > now:
                    # Not yet due
                    if random.random() < 0.7:
                        status = 'sent'
                        amount_paid = 0.0
                    elif random.random() < 0.9:
                        status = 'paid'
                        amount_paid = 0.0  # Will be set to full amount later
                    else:
                        status = 'draft'
                        amount_paid = 0.0
                # Past due
                elif random.random() < 0.6:
                    status = 'paid'
                    amount_paid = 0.0  # Will be set to full amount later
                elif random.random() < 0.8:
                    status = 'overdue'
                    amount_paid = 0.0
                else:
                    status = 'cancelled'
                    amount_paid = 0.0

                # Generate line items
                num_items = random.randint(1, len(template['services']))
                selected_services = random.sample(template['services'], num_items)

                line_items = []
                total_amount = 0.0

                for service in selected_services:
                    hours = random.uniform(*template['hours_range'])
                    quantity = round(hours, 2)
                    unit_price = template['hourly_rate']

                    # Apply random tax and discount
                    tax_rate = random.choice([0, 5, 8.25, 10]) if random.random() < 0.5 else 0
                    discount_percentage = random.choice([0, 5, 10, 15]) if random.random() < 0.3 else 0

                    subtotal = quantity * unit_price
                    discount_amount = subtotal * (discount_percentage / 100)
                    subtotal_after_discount = subtotal - discount_amount
                    tax_amount = subtotal_after_discount * (tax_rate / 100)
                    item_total = subtotal_after_discount + tax_amount

                    line_items.append({
                        'description': f"{service} - Professional Services",
                        'quantity': quantity,
                        'unit_price': unit_price,
                        'tax_rate': tax_rate,
                        'discount_percentage': discount_percentage,
                        'subtotal': round(subtotal, 2),
                        'discount_amount': round(discount_amount, 2),
                        'tax_amount': round(tax_amount, 2),
                        'total': round(item_total, 2)
                    })

                    total_amount += item_total

                # Apply invoice-level tax and discount
                invoice_tax_rate = random.choice([0, 5, 8.25]) if random.random() < 0.3 else 0
                invoice_discount_percentage = random.choice([0, 5, 10]) if random.random() < 0.2 else 0

                # If paid, set amount_paid to total
                if status == 'paid':
                    amount_paid = round(total_amount, 2)

                # Generate notes
                notes_options = [
                    "Thank you for your business!",
                    "Payment due within terms. Late payments subject to 1.5% monthly interest.",
                    "Please reference invoice number on all payments.",
                    "Wire transfer preferred for amounts over $10,000.",
                    "Contact us for any questions about this invoice."
                ]

                invoice = {
                    'id': invoice_id_counter,
                    'user_id': user['id'],
                    'business_account_id': business_account['id'] if business_account else None,
                    'invoice_number': invoice_number,
                    'client_name': template['client'],
                    'client_email': template['email'],
                    'client_address': template['address'],
                    'issue_date': issue_date.date(),
                    'due_date': due_date.date(),
                    'payment_terms': payment_terms,
                    'status': status,
                    'items': line_items,
                    'subtotal': round(sum(item['subtotal'] for item in line_items), 2),
                    'tax_rate': invoice_tax_rate,
                    'tax_amount': round(total_amount * (invoice_tax_rate / 100), 2),
                    'discount_percentage': invoice_discount_percentage,
                    'discount_amount': round(total_amount * (invoice_discount_percentage / 100), 2),
                    'total_amount': round(total_amount, 2),
                    'amount_paid': amount_paid,
                    'notes': random.choice(notes_options),
                    'created_at': issue_date,
                    'updated_at': issue_date if status == 'draft' else issue_date + timedelta(days=random.randint(1, 5))
                }

                self.invoices.append(invoice)
                invoice_id_counter += 1

    def _generate_crypto_data(self):
        """Generate crypto data for demo users."""
        from .crypto_manager import CryptoManager

        crypto_manager = CryptoManager(self)

        # Generate crypto data for main demo users
        demo_users = ['john_doe', 'jane_smith', 'mike_wilson', 'sarah_jones', 'david_brown']

        for username in demo_users:
            user = next((u for u in self.users if u['username'] == username), None)
            if user:
                # Generate crypto data with different seeds for variety
                crypto_manager.generate_crypto_data(user['id'], seed=42 + user['id'])

    def _generate_credit_data(self):
        """Generate credit data for demo users."""
        from .credit_manager import CreditManager

        credit_manager = CreditManager(self)

        # Generate credit data for all non-admin users
        regular_users = [u for u in self.users if not u.get('is_admin', False)]

        for user in regular_users:
            # Generate credit data with different seeds for variety
            credit_manager.generate_credit_data(user['id'], seed=42 + user['id'])

    def _generate_unified_data(self):
        """Generate unified financial data and cross-asset operations."""
        from .unified_manager import UnifiedManager

        unified_manager = UnifiedManager(self)

        # Generate conversion rates
        unified_manager.generate_conversion_rates()

        # Create unified balances for main demo users
        demo_users = ['john_doe', 'jane_smith', 'mike_wilson', 'sarah_jones', 'david_brown']

        for username in demo_users:
            user = next((u for u in self.users if u['username'] == username), None)
            if user:
                # Calculate unified balance (this aggregates all assets)
                unified_manager.calculate_unified_balance(user['id'])

                # Create some asset bridges (conversions)
                if random.random() > 0.6:
                    # Fiat to crypto conversion
                    accounts = [a for a in self.accounts if a['user_id'] == user['id'] and a['account_type'] != 'credit_card']
                    if accounts:
                        account = random.choice(accounts)
                        unified_manager.create_asset_bridge(
                            user_id=user['id'],
                            from_asset_class=AssetClass.FIAT,
                            from_asset_id=str(account['id']),
                            from_amount=random.uniform(100, 1000),
                            to_asset_class=AssetClass.CRYPTO,
                            to_asset_type=random.choice(['ETH', 'BTC', 'USDC'])
                        )

                # Create collateral positions for users with crypto
                wallets = [w for w in self.crypto_wallets if w['user_id'] == user['id']]
                if wallets and random.random() > 0.7:
                    # Get crypto assets for collateral
                    wallet = wallets[0]
                    crypto_assets = [
                        {
                            'asset_class': AssetClass.CRYPTO,
                            'asset_id': str(wallet['id']),
                            'symbol': 'ETH',
                            'value_usd': random.uniform(5000, 20000)
                        }
                    ]

                    try:
                        unified_manager.create_collateral_position(
                            user_id=user['id'],
                            collateral_assets=crypto_assets,
                            borrow_amount=random.uniform(1000, 5000),
                            currency='USD',
                            position_type='loan'
                        )
                    except ValueError:
                        # Insufficient collateral, skip
                        pass

    def _generate_loan_data(self):
        """Generate loan-related mock data."""
        # Generate loan providers
        providers = [
            {'name': 'QuickCash', 'type': 'personal', 'min_amount': 1000, 'max_amount': 50000},
            {'name': 'HomeLoans Plus', 'type': 'mortgage', 'min_amount': 50000, 'max_amount': 1000000},
            {'name': 'AutoFinance Pro', 'type': 'auto', 'min_amount': 5000, 'max_amount': 100000},
            {'name': 'CryptoCredit', 'type': 'crypto_backed', 'min_amount': 500, 'max_amount': 100000},
            {'name': 'BizCapital', 'type': 'business', 'min_amount': 10000, 'max_amount': 500000},
        ]

        # Generate loans for active users
        for user in self.users[:5]:  # First 5 users
            # Create 1-3 loan applications
            for _ in range(random.randint(1, 3)):
                provider = random.choice(providers)
                app_id = len(self.loan_applications) + 1
                application = {
                    'id': app_id,
                    'user_id': user['id'],
                    'loan_type': provider['type'],
                    'requested_amount': random.randint(provider['min_amount'], provider['max_amount']),
                    'purpose': random.choice(['Home improvement', 'Debt consolidation', 'Medical expenses', 'Business expansion']),
                    'term_months': random.choice([12, 24, 36, 48, 60, 120, 180, 360]),
                    'employment_status': random.choice(['employed', 'self_employed', 'retired']),
                    'annual_income': random.randint(30000, 200000),
                    'monthly_expenses': random.randint(1000, 5000),
                    'status': random.choice(['pending', 'approved', 'rejected']),
                    'created_at': datetime.now(UTC) - timedelta(days=random.randint(1, 90))
                }
                self.loan_applications.append(application)

                # If approved, create loan offers and possibly an active loan
                if application['status'] == 'approved':
                    # Create 1-3 offers
                    for i in range(random.randint(1, 3)):
                        offer_id = len(self.loan_offers) + 1
                        interest_rate = random.uniform(3.5, 18.9)
                        offer = {
                            'id': offer_id,
                            'application_id': app_id,
                            'lender_name': f"{provider['name']} #{i+1}",
                            'approved_amount': application['requested_amount'],
                            'interest_rate': round(interest_rate, 2),
                            'term_months': application['term_months'],
                            'monthly_payment': application['requested_amount'] * (1 + interest_rate/100) / application['term_months'],
                            'total_cost': application['requested_amount'] * (1 + interest_rate/100),
                            'expires_at': datetime.now(UTC) + timedelta(days=7)
                        }
                        self.loan_offers.append(offer)

                        # Create active loan from first offer
                        if i == 0 and random.random() > 0.5:
                            loan_id = len(self.loans) + 1
                            loan = {
                                'id': loan_id,
                                'user_id': user['id'],
                                'application_id': app_id,
                                'offer_id': offer_id,
                                'loan_type': application['loan_type'],
                                'principal_amount': offer['approved_amount'],
                                'interest_rate': offer['interest_rate'],
                                'term_months': offer['term_months'],
                                'monthly_payment': offer['monthly_payment'],
                                'remaining_balance': offer['approved_amount'],
                                'status': 'active',
                                'originated_date': datetime.now(UTC) - timedelta(days=random.randint(30, 365)),
                                'next_payment_date': datetime.now(UTC) + timedelta(days=random.randint(1, 30))
                            }
                            self.loans.append(loan)

                            # Generate payment history
                            payments_made = random.randint(0, min(12, loan['term_months']))
                            for p in range(payments_made):
                                payment = {
                                    'id': len(self.loan_payments) + 1,
                                    'loan_id': loan_id,
                                    'amount': loan['monthly_payment'],
                                    'payment_date': loan['originated_date'] + timedelta(days=30 * (p + 1)),
                                    'payment_type': 'regular',
                                    'status': 'completed'
                                }
                                self.loan_payments.append(payment)
                                loan['remaining_balance'] -= loan['monthly_payment'] * 0.8  # Principal portion

    def _generate_insurance_data(self):
        """Generate insurance-related mock data."""
        # Insurance providers
        providers = [
            {'name': 'SafeGuard Insurance', 'types': ['health', 'life', 'auto', 'home']},
            {'name': 'Premier Coverage', 'types': ['health', 'dental', 'vision']},
            {'name': 'AutoShield', 'types': ['auto', 'motorcycle']},
            {'name': 'HomeProtect', 'types': ['home', 'renters']},
            {'name': 'LifeSecure', 'types': ['life', 'disability']},
        ]

        # Add providers to data store
        for i, provider in enumerate(providers):
            self.insurance_providers.append({
                'id': i + 1,
                'name': provider['name'],
                'types': provider['types'],
                'rating': round(random.uniform(3.5, 5.0), 1),
                'is_active': True
            })

        # Generate policies for users
        policy_types = ['health', 'auto', 'home', 'life', 'dental', 'vision', 'renters']

        for user in self.users[:5]:  # First 5 users
            # Create 2-4 insurance policies
            for _ in range(random.randint(2, 4)):
                policy_type = random.choice(policy_types)
                provider = random.choice([p for p in self.insurance_providers if policy_type in p['types']])

                policy_id = len(self.insurance_policies) + 1
                policy = {
                    'id': policy_id,
                    'user_id': user['id'],
                    'provider_id': provider['id'],
                    'policy_number': f"POL-{policy_id:06d}",
                    'policy_type': policy_type,
                    'coverage_amount': random.choice([50000, 100000, 250000, 500000, 1000000]),
                    'premium_amount': random.randint(50, 500),
                    'premium_frequency': random.choice(['monthly', 'quarterly', 'annual']),
                    'deductible': random.choice([250, 500, 1000, 2500]),
                    'status': random.choice(['active', 'pending', 'expired']),
                    'start_date': datetime.now(UTC) - timedelta(days=random.randint(30, 730)),
                    'end_date': datetime.now(UTC) + timedelta(days=random.randint(30, 365))
                }
                self.insurance_policies.append(policy)

                # Add beneficiaries for life insurance
                if policy_type == 'life':
                    self.insurance_beneficiaries.append({
                        'id': len(self.insurance_beneficiaries) + 1,
                        'policy_id': policy_id,
                        'name': f"Beneficiary {random.randint(1, 100)}",
                        'relationship': random.choice(['spouse', 'child', 'parent', 'sibling']),
                        'percentage': 100
                    })

                # Generate claims for some policies
                if policy['status'] == 'active' and random.random() > 0.7:
                    claim_id = len(self.insurance_claims) + 1
                    claim = {
                        'id': claim_id,
                        'policy_id': policy_id,
                        'claim_number': f"CLM-{claim_id:06d}",
                        'claim_type': random.choice(['accident', 'illness', 'damage', 'theft']),
                        'amount_claimed': random.randint(500, min(10000, policy['coverage_amount'])),
                        'amount_approved': 0,
                        'status': random.choice(['pending', 'approved', 'rejected', 'processing']),
                        'filed_date': datetime.now(UTC) - timedelta(days=random.randint(1, 60)),
                        'description': 'Mock insurance claim'
                    }
                    if claim['status'] == 'approved':
                        claim['amount_approved'] = claim['amount_claimed'] * random.uniform(0.7, 1.0)
                    self.insurance_claims.append(claim)

    def _generate_global_investment_assets(self):
        """Generate global investment assets available for trading."""
        # Generate ETF assets
        etf_data = [
            {'symbol': 'SPY', 'name': 'SPDR S&P 500 ETF', 'category': 'equity', 'expense_ratio': 0.09, 'price': 445.50},
            {'symbol': 'QQQ', 'name': 'Invesco QQQ Trust', 'category': 'equity', 'expense_ratio': 0.20, 'price': 385.25},
            {'symbol': 'DIA', 'name': 'SPDR Dow Jones Industrial', 'category': 'equity', 'expense_ratio': 0.16, 'price': 355.80},
            {'symbol': 'IWM', 'name': 'iShares Russell 2000 ETF', 'category': 'equity', 'expense_ratio': 0.19, 'price': 198.45},
            {'symbol': 'VTI', 'name': 'Vanguard Total Stock Market', 'category': 'equity', 'expense_ratio': 0.03, 'price': 228.90},
            {'symbol': 'VOO', 'name': 'Vanguard S&P 500 ETF', 'category': 'equity', 'expense_ratio': 0.03, 'price': 412.65},
            {'symbol': 'AGG', 'name': 'iShares Core U.S. Aggregate Bond', 'category': 'bond', 'expense_ratio': 0.03, 'price': 102.35},
            {'symbol': 'GLD', 'name': 'SPDR Gold Shares', 'category': 'commodity', 'expense_ratio': 0.40, 'price': 178.95}
        ]

        for i, etf in enumerate(etf_data):
            self.etf_assets.append({
                'id': i + 1,
                'symbol': etf['symbol'],
                'name': etf['name'],
                'category': etf['category'],
                'expense_ratio': etf['expense_ratio'],
                'price': etf['price'],
                'change_percent': random.uniform(-3, 3)
            })

        # Generate stock assets
        stock_data = [
            {'symbol': 'AAPL', 'name': 'Apple Inc.', 'sector': 'technology', 'price': 185.50, 'market_cap': 2.9e12, 'pe_ratio': 30.5},
            {'symbol': 'GOOGL', 'name': 'Alphabet Inc.', 'sector': 'technology', 'price': 138.25, 'market_cap': 1.7e12, 'pe_ratio': 25.8},
            {'symbol': 'MSFT', 'name': 'Microsoft Corporation', 'sector': 'technology', 'price': 378.90, 'market_cap': 2.8e12, 'pe_ratio': 34.2},
            {'symbol': 'AMZN', 'name': 'Amazon.com Inc.', 'sector': 'technology', 'price': 155.45, 'market_cap': 1.6e12, 'pe_ratio': 48.5},
            {'symbol': 'TSLA', 'name': 'Tesla Inc.', 'sector': 'automotive', 'price': 245.80, 'market_cap': 780e9, 'pe_ratio': 65.3},
            {'symbol': 'META', 'name': 'Meta Platforms Inc.', 'sector': 'technology', 'price': 325.40, 'market_cap': 825e9, 'pe_ratio': 22.8},
            {'symbol': 'NVDA', 'name': 'NVIDIA Corporation', 'sector': 'technology', 'price': 486.20, 'market_cap': 1.2e12, 'pe_ratio': 68.5},
            {'symbol': 'JPM', 'name': 'JPMorgan Chase & Co.', 'sector': 'finance', 'price': 158.75, 'market_cap': 460e9, 'pe_ratio': 11.2}
        ]

        for i, stock in enumerate(stock_data):
            self.stock_assets.append({
                'id': i + 1,
                'symbol': stock['symbol'],
                'name': stock['name'],
                'sector': stock['sector'],
                'price': stock['price'],
                'change_percent': random.uniform(-5, 5),
                'market_cap': stock['market_cap'],
                'pe_ratio': stock['pe_ratio']
            })

        # Generate crypto assets for investment
        crypto_data = [
            {'symbol': 'BTC', 'name': 'Bitcoin', 'price': 42850.00},
            {'symbol': 'ETH', 'name': 'Ethereum', 'price': 2280.50},
            {'symbol': 'BNB', 'name': 'Binance Coin', 'price': 315.25},
            {'symbol': 'SOL', 'name': 'Solana', 'price': 98.45},
            {'symbol': 'ADA', 'name': 'Cardano', 'price': 0.58},
            {'symbol': 'DOT', 'name': 'Polkadot', 'price': 7.85}
        ]

        for i, crypto in enumerate(crypto_data):
            self.crypto_assets.append({
                'id': i + 1,
                'symbol': crypto['symbol'],
                'name': crypto['name'],
                'price': crypto['price'],
                'change_percent': random.uniform(-10, 10),
                'market_cap': crypto['price'] * random.uniform(1e8, 1e11)
            })

    def _generate_investment_data(self):
        """Generate investment-related mock data."""
        # First, create global investment assets (once, not per user)
        self._generate_global_investment_assets()

        # Create investment accounts
        account_types = ['individual', 'ira', 'roth_ira', '401k']

        for user in self.users[:5]:  # First 5 users
            # Create 1-2 investment accounts
            for _ in range(random.randint(1, 2)):
                account_id = len(self.investment_accounts) + 1
                account_type = random.choice(account_types)
                initial_balance = random.uniform(1000, 100000)
                account = {
                    'id': account_id,
                    'user_id': user['id'],
                    'account_type': account_type,
                    'account_number': f"INV-{account_id:06d}",
                    'account_name': f"{user['first_name']}'s {account_type.replace('_', ' ').title()} Account",
                    'balance': initial_balance,
                    'buying_power': initial_balance * 0.9,  # 90% buying power
                    'portfolio_value': initial_balance,
                    'total_return': random.uniform(-1000, 5000),
                    'total_return_percent': random.uniform(-10, 25),
                    'is_retirement': account_type == 'retirement_401k',
                    'risk_tolerance': random.choice(['conservative', 'moderate', 'aggressive']),
                    'created_at': datetime.now(UTC) - timedelta(days=random.randint(90, 730)),
                    'updated_at': datetime.now(UTC)
                }
                self.investment_accounts.append(account)

                # Create portfolio
                portfolio_id = len(self.investment_portfolios) + 1
                portfolio = {
                    'id': portfolio_id,
                    'account_id': account_id,
                    'name': f"{user['username']}'s Portfolio",
                    'risk_level': random.choice(['conservative', 'moderate', 'aggressive']),
                    'total_value': account['balance'],
                    'total_cost_basis': account['balance'] * random.uniform(0.8, 1.2),
                    'created_at': account['created_at']
                }
                self.investment_portfolios.append(portfolio)

                # No need to add assets here - they're already created globally

                # Create positions
                # ETF positions (low risk)
                etf_allocation = 0.5 if portfolio['risk_level'] == 'conservative' else 0.3
                etf_value = portfolio['total_value'] * etf_allocation
                for etf in random.sample(self.etf_assets, min(3, len(self.etf_assets))):
                    position_value = etf_value / 3
                    shares = position_value / etf['price']
                    self.investment_positions.append({
                        'id': len(self.investment_positions) + 1,
                        'portfolio_id': portfolio_id,
                        'asset_type': 'etf',
                        'asset_id': etf['id'],
                        'symbol': etf['symbol'],
                        'shares': round(shares, 2),
                        'cost_basis': position_value * random.uniform(0.9, 1.1),
                        'current_value': position_value,
                        'realized_gains': random.uniform(-100, 500)
                    })

                # Stock positions (medium risk)
                stock_allocation = 0.3 if portfolio['risk_level'] == 'conservative' else 0.5
                stock_value = portfolio['total_value'] * stock_allocation
                for stock in random.sample(self.stock_assets, min(4, len(self.stock_assets))):
                    position_value = stock_value / 4
                    shares = position_value / stock['price']
                    self.investment_positions.append({
                        'id': len(self.investment_positions) + 1,
                        'portfolio_id': portfolio_id,
                        'asset_type': 'stock',
                        'asset_id': stock['id'],
                        'symbol': stock['symbol'],
                        'shares': round(shares, 2),
                        'cost_basis': position_value * random.uniform(0.8, 1.2),
                        'current_value': position_value,
                        'realized_gains': random.uniform(-500, 2000)
                    })

                # Generate some trades
                for _ in range(random.randint(5, 15)):
                    trade_type = random.choice(['buy', 'sell'])
                    asset_type = random.choice(['etf', 'stock'])
                    assets = self.etf_assets if asset_type == 'etf' else self.stock_assets
                    asset = random.choice(assets)

                    self.investment_trades.append({
                        'id': len(self.investment_trades) + 1,
                        'account_id': account_id,
                        'portfolio_id': portfolio_id,
                        'trade_type': trade_type,
                        'asset_type': asset_type,
                        'symbol': asset['symbol'],
                        'shares': random.randint(1, 100),
                        'price': asset['price'] * random.uniform(0.95, 1.05),
                        'total_amount': 0,  # Will calculate
                        'commission': random.uniform(0, 10),
                        'status': 'completed',
                        'executed_at': datetime.now(UTC) - timedelta(days=random.randint(1, 90))
                    })
                    self.investment_trades[-1]['total_amount'] = (
                        self.investment_trades[-1]['shares'] * self.investment_trades[-1]['price'] +
                        self.investment_trades[-1]['commission']
                    )

    def _generate_card_application_data(self):
        """Generate credit card application and recommendation data."""
        # Credit card offers
        card_offers = [
            {
                'card_name': 'Cash Rewards Plus',
                'issuer': 'MegaBank',
                'category': 'cash_back',
                'annual_fee': 0,
                'min_credit_score': 650,
                'cashback_rate': 2.0,
                'signup_bonus': 200,
                'benefits': ['2% cashback on all purchases', '$200 signup bonus', 'No annual fee']
            },
            {
                'card_name': 'Travel Elite',
                'issuer': 'Premium Bank',
                'category': 'travel',
                'annual_fee': 450,
                'min_credit_score': 750,
                'points_multiplier': 3,
                'signup_bonus': 1000,
                'benefits': ['3x points on travel', 'Airport lounge access', 'Travel insurance']
            },
            {
                'card_name': 'Student Starter',
                'issuer': 'EduBank',
                'category': 'student',
                'annual_fee': 0,
                'min_credit_score': 0,
                'cashback_rate': 1.0,
                'signup_bonus': 50,
                'benefits': ['1% cashback', 'No credit history required', 'Financial education resources']
            },
            {
                'card_name': 'Business Platinum',
                'issuer': 'Corporate Bank',
                'category': 'business',
                'annual_fee': 250,
                'min_credit_score': 700,
                'cashback_rate': 3.0,
                'signup_bonus': 500,
                'benefits': ['3% cashback on business purchases', 'Expense tracking', 'Employee cards']
            }
        ]

        # Add card offers to data store
        for i, offer in enumerate(card_offers):
            # Apply a sensible floor so cards with a low/zero minimum score
            # (e.g. student/starter cards) still advertise a real limit range
            # instead of "$0-$0".
            min_limit = max(offer['min_credit_score'] * 10, 500)
            max_limit = max(offer['min_credit_score'] * 50, 2500)
            self.card_offers.append({
                'id': i + 1,
                **offer,
                'apr_range': f"{random.uniform(12, 18):.1f}-{random.uniform(20, 26):.1f}%",
                'credit_limit_range': f"${min_limit}-${max_limit}"
            })

        # Generate applications and recommendations for users
        for user in self.users[:5]:
            # Get user's credit score (mock)
            credit_score = random.randint(550, 850)

            # Generate card recommendations based on credit score
            eligible_cards = [c for c in self.card_offers if c['min_credit_score'] <= credit_score]
            for card in eligible_cards:
                self.card_recommendations.append({
                    'id': len(self.card_recommendations) + 1,
                    'user_id': user['id'],
                    'card_offer_id': card['id'],
                    'recommendation_score': random.uniform(0.7, 1.0),
                    'reason': f"Based on your {credit_score} credit score",
                    'created_at': datetime.now(UTC)
                })

            # Create 0-2 card applications
            for _ in range(random.randint(0, 2)):
                card = random.choice(eligible_cards) if eligible_cards else None
                if card:
                    self.card_applications.append({
                        'id': len(self.card_applications) + 1,
                        'user_id': user['id'],
                        'card_offer_id': card['id'],
                        'status': random.choice(['pending', 'approved', 'rejected']),
                        'credit_score_at_application': credit_score,
                        'requested_credit_limit': random.randint(1000, 10000),
                        'approved_credit_limit': random.randint(1000, 10000) if random.random() > 0.3 else 0,
                        'application_date': datetime.now(UTC) - timedelta(days=random.randint(1, 60))
                    })

    def _generate_currency_data(self):
        """Generate currency converter and P2P trading data."""
        # Supported currencies
        currencies = [
            {'code': 'USD', 'name': 'US Dollar', 'symbol': '$', 'type': 'fiat', 'flag': '🇺🇸'},
            {'code': 'EUR', 'name': 'Euro', 'symbol': '€', 'type': 'fiat', 'flag': '🇪🇺'},
            {'code': 'GBP', 'name': 'British Pound', 'symbol': '£', 'type': 'fiat', 'flag': '🇬🇧'},
            {'code': 'JPY', 'name': 'Japanese Yen', 'symbol': '¥', 'type': 'fiat', 'flag': '🇯🇵'},
            {'code': 'CAD', 'name': 'Canadian Dollar', 'symbol': 'C$', 'type': 'fiat', 'flag': '🇨🇦'},
            {'code': 'AUD', 'name': 'Australian Dollar', 'symbol': 'A$', 'type': 'fiat', 'flag': '🇦🇺'},
            {'code': 'MXN', 'name': 'Mexican Peso', 'symbol': 'Mex$', 'type': 'fiat', 'flag': '🇲🇽'},
            {'code': 'BRL', 'name': 'Brazilian Real', 'symbol': 'R$', 'type': 'fiat', 'flag': '🇧🇷'},
            {'code': 'BTC', 'name': 'Bitcoin', 'symbol': '₿', 'type': 'crypto', 'icon': '₿'},
            {'code': 'ETH', 'name': 'Ethereum', 'symbol': 'Ξ', 'type': 'crypto', 'icon': 'Ξ'},
            {'code': 'USDT', 'name': 'Tether', 'symbol': '₮', 'type': 'crypto', 'icon': '₮'}
        ]

        for i, currency in enumerate(currencies):
            self.supported_currencies.append({
                'id': i + 1,
                **currency,
                'is_active': True,
                'decimal_places': 2 if currency['type'] == 'fiat' else 8
            })

        # Generate exchange rates (USD as base)
        base_rates = {
            'EUR': 0.92, 'GBP': 0.79, 'JPY': 149.50, 'CAD': 1.36,
            'AUD': 1.52, 'MXN': 17.10, 'BRL': 4.95,
            'BTC': 0.000023, 'ETH': 0.00031, 'USDT': 1.0
        }

        # Generate all currency pairs
        for from_curr in currencies:
            for to_curr in currencies:
                if from_curr['code'] != to_curr['code']:
                    if from_curr['code'] == 'USD':
                        rate = base_rates.get(to_curr['code'], 1.0)
                    elif to_curr['code'] == 'USD':
                        rate = 1.0 / base_rates.get(from_curr['code'], 1.0)
                    else:
                        # Cross rate
                        from_usd_rate = 1.0 / base_rates.get(from_curr['code'], 1.0)
                        to_usd_rate = base_rates.get(to_curr['code'], 1.0)
                        rate = from_usd_rate * to_usd_rate

                    key = f"{from_curr['code']}_{to_curr['code']}"
                    self.exchange_rates[key] = round(rate, 6)

        # Generate user balances
        for user in self.users[:5]:
            # Give each user some currency balances
            user_currencies = random.sample(currencies, random.randint(2, 5))
            for currency in user_currencies:
                balance = random.uniform(100, 10000) if currency['type'] == 'fiat' else random.uniform(0.01, 2.0)
                self.currency_balances.append({
                    'id': len(self.currency_balances) + 1,
                    'user_id': user['id'],
                    'currency': currency['code'],
                    'balance': round(balance, currency.get('decimal_places', 2)),
                    'available_balance': round(balance * 0.95, currency.get('decimal_places', 2)),
                    'pending_balance': round(balance * 0.05, currency.get('decimal_places', 2)),
                    'currency_type': currency['type']
                })

        # Generate P2P offers
        offer_types = ['buy', 'sell']
        payment_methods = ['bank_transfer', 'paypal', 'cash_deposit', 'crypto_wallet']

        for i in range(20):
            seller_user = random.choice(self.users[:5])
            from_currency = random.choice(['USD', 'EUR', 'MXN', 'BRL'])
            to_currency = random.choice(['USD', 'EUR', 'BTC', 'USDT'])
            if from_currency == to_currency:
                continue

            amount = random.uniform(100, 5000)
            base_rate = self.exchange_rates.get(f"{from_currency}_{to_currency}", 1.0)
            # P2P rates have spread
            spread = random.uniform(0.02, 0.05)  # 2-5% spread
            offer_rate = base_rate * (1 + spread if random.choice(offer_types) == 'sell' else 1 - spread)

            self.peer_offers.append({
                'id': i + 1,
                'user_id': seller_user['id'],
                'offer_type': random.choice(offer_types),
                'from_currency': from_currency,
                'to_currency': to_currency,
                'amount': round(amount, 2),
                'exchange_rate': round(offer_rate, 6),
                'min_amount': round(amount * 0.1, 2),
                'max_amount': round(amount, 2),
                'payment_methods': random.sample(payment_methods, random.randint(1, 3)),
                'status': 'active',
                'created_at': datetime.now(UTC) - timedelta(hours=random.randint(1, 48)),
                'expires_at': datetime.now(UTC) + timedelta(hours=random.randint(1, 24)),
                'completed_trades': random.randint(0, 100),
                'user_rating': round(random.uniform(4.0, 5.0), 1)
            })

        # Generate some completed P2P trades
        for i in range(10):
            offer = random.choice(self.peer_offers)
            buyer = random.choice([u for u in self.users[:5] if u['id'] != offer['user_id']])

            trade_amount = random.uniform(offer['min_amount'], offer['max_amount'])
            status = random.choice(['completed', 'pending', 'processing'])
            completed_at = datetime.now(UTC) - timedelta(days=random.randint(0, 29)) if status == 'completed' else None

            self.p2p_trades.append({
                'id': i + 1,
                'trade_number': f"P2P-{datetime.now(UTC).strftime('%Y%m%d')}-{i+1:06d}",
                'offer_id': offer['id'],
                'buyer_id': buyer['id'],
                'seller_id': offer['user_id'],
                'amount': round(trade_amount, 2),
                'currency': offer['from_currency'],
                'rate': offer['exchange_rate'],
                'total_cost': round(trade_amount * offer['exchange_rate'], 2),
                'fee_amount': round(trade_amount * 0.01, 2),
                'transfer_method': random.choice(offer['payment_methods']),
                'payment_details': {},
                'chat_enabled': True,
                'status': status,
                'escrow_released': status == 'completed',
                'dispute_id': None,
                'created_at': datetime.now(UTC) - timedelta(days=random.randint(1, 30)),
                'expires_at': datetime.now(UTC) + timedelta(hours=2),
                'completed_at': completed_at
            })

        # Generate conversion quotes for recent activity
        for i in range(5):
            user = random.choice(self.users[:5])
            from_curr = random.choice(['USD', 'EUR', 'GBP'])
            to_curr = random.choice(['EUR', 'GBP', 'MXN', 'BTC'])
            if from_curr == to_curr:
                continue

            amount = random.uniform(100, 2000)
            rate = self.exchange_rates.get(f"{from_curr}_{to_curr}", 1.0)
            fee_percent = 0.015  # 1.5% fee

            self.conversion_quotes.append({
                'id': i + 1,
                'quote_id': f"QUOTE-{i+1:06d}",
                'user_id': user['id'],
                'from_currency': from_curr,
                'to_currency': to_curr,
                'from_amount': round(amount, 2),
                'to_amount': round(amount * rate * (1 - fee_percent), 2),
                'exchange_rate': round(rate, 6),
                'fee_amount': round(amount * fee_percent, 2),
                'fee_percentage': fee_percent * 100,
                'total_amount': round(amount * (1 + fee_percent), 2),
                'expires_at': datetime.now(UTC) + timedelta(minutes=15),
                'created_at': datetime.now(UTC)
            })


class AuthService:
    """Simple auth service for testing."""

    def __init__(self, data_manager):
        self.data_manager = data_manager

    def authenticate_user(self, username: str, password: str) -> dict[str, Any] | None:
        """Authenticate user."""
        password_hash = hashlib.sha256(password.encode()).hexdigest()

        for user in self.data_manager.users:
            if user['username'] == username and user.get('password_hash', user.get('hashed_password')) == password_hash:
                return user
        return None

    def create_session(self, user_id: str) -> str:
        """Create user session."""
        token = str(uuid.uuid4())
        session = {
            'id': str(uuid.uuid4()),
            'user_id': user_id,
            'token': token,
            'created_at': datetime.now(UTC),
            'expires_at': datetime.now(UTC)
        }
        self.data_manager.sessions.append(session)
        return token

    def get_current_user(self, token: str) -> dict[str, Any] | None:
        """Get user from token."""
        # Find session
        for session in self.data_manager.sessions:
            if session['token'] == token:
                # Find user
                for user in self.data_manager.users:
                    if user['id'] == session['user_id']:
                        return user
        return None

    def register_user(self, username: str, email: str, password: str, full_name: str) -> dict[str, Any]:
        """Register new user."""
        # Check if user exists
        for user in self.data_manager.users:
            if user['username'] == username or user['email'] == email:
                raise ValueError("User already exists")

        # Create new user
        user = {
            'id': len(self.data_manager.users) + 1,
            'username': username,
            'email': email,
            'full_name': full_name,
            'password_hash': hashlib.sha256(password.encode()).hexdigest(),
            'is_active': True,
            'is_admin': False,
            'created_at': datetime.now(UTC)
        }
        self.data_manager.users.append(user)
        return user

    def login(self, username: str, password: str, device_info: dict[str, Any]) -> dict[str, Any]:
        """Login user and create session."""
        user = self.authenticate_user(username, password)
        if not user:
            raise ValueError("Invalid username or password")

        token = self.create_session(user['id'])
        return {
            "user": user,
            "token": token
        }

    def logout(self, token: str) -> bool:
        """Logout user by removing session."""
        session = next((s for s in self.data_manager.sessions if s['token'] == token), None)
        if session:
            self.data_manager.sessions.remove(session)
            return True
        return False

    def change_password(self, user_id: str, old_password: str, new_password: str) -> bool:
        """Change user password."""
        user = next((u for u in self.data_manager.users if u['id'] == user_id), None)
        if not user:
            return False

        # Verify old password
        old_hash = hashlib.sha256(old_password.encode()).hexdigest()
        if user.get('password_hash', user.get('hashed_password')) != old_hash:
            raise ValueError("Incorrect password")

        # Validate new password length
        if len(new_password) < 8:
            raise ValueError("Password must be at least 8 characters")

        # Update password
        user['password_hash'] = hashlib.sha256(new_password.encode()).hexdigest()
        return True

    def get_active_sessions(self, user_id: str) -> list[dict[str, Any]]:
        """Get all active sessions for a user."""
        return [s for s in self.data_manager.sessions if s['user_id'] == user_id]

    def logout_all_sessions(self, user_id: str) -> int:
        """Logout all sessions for a user."""
        sessions = [s for s in self.data_manager.sessions if s['user_id'] == user_id]
        count = len(sessions)
        for session in sessions:
            self.data_manager.sessions.remove(session)
        return count

    def validate_session(self, token: str) -> bool:
        """Validate a session token."""
        session = next((s for s in self.data_manager.sessions if s['token'] == token), None)
        return session is not None


# Create global instance
data_manager = DataManager()
