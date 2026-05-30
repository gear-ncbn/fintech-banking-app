"""
Mock data generator for the finance application.
Creates realistic, interconnected data for testing.
"""
import random
import uuid
from datetime import UTC, datetime, timedelta
from typing import Any


def generate_mock_data(data_manager: Any, seed: int = 42):
    """
    Generate comprehensive mock data for the finance application.

    Args:
        data_manager: DataManager instance to populate
        seed: Random seed for reproducible data
    """
    random.seed(seed)

    # Define test users
    users = [
        {
            'id': 'user-1',
            'username': 'john_doe',
            'email': 'john@example.com',
            'first_name': 'John',
            'last_name': 'Doe',
            'phone': '+1-555-123-4567',
            'password_hash': _hash_password('DemoUser2026Banking'),
            'is_active': True,
            'is_admin': False,
            'created_at': (datetime.now(UTC) - timedelta(days=365)).isoformat()
        },
        {
            'id': 'user-2',
            'username': 'jane_smith',
            'email': 'jane@example.com',
            'first_name': 'Jane',
            'last_name': 'Smith',
            'phone': '+1-555-234-5678',
            'password_hash': _hash_password('DemoUser2026Banking'),
            'is_active': True,
            'is_admin': False,
            'created_at': (datetime.now(UTC) - timedelta(days=300)).isoformat()
        },
        {
            'id': 'user-3',
            'username': 'admin',
            'email': 'admin@example.com',
            'first_name': 'Admin',
            'last_name': 'User',
            'phone': '+1-555-999-9999',
            'password_hash': _hash_password('AdminUser2026Banking'),
            'is_active': True,
            'is_admin': True,
            'created_at': (datetime.now(UTC) - timedelta(days=400)).isoformat()
        }
    ]
    data_manager.users.extend(users)

    # Create accounts for each user
    account_types = ['checking', 'savings', 'credit']
    for user in users[:2]:  # Only for non-admin users
        for i, acc_type in enumerate(account_types):
            account = {
                'id': f"{user['id']}-acc-{i+1}",
                'user_id': user['id'],
                'account_number': f"****{random.randint(1000, 9999)}",
                'account_type': acc_type,
                'balance': float(random.randint(1000, 50000) if acc_type != 'credit' else -random.randint(100, 5000)),
                'currency': 'USD',
                'created_at': user['created_at'],
                'is_active': True
            }
            data_manager.accounts.append(account)

    # Create transaction categories
    categories = [
        {'id': 'cat-1', 'name': 'Food & Dining', 'icon': '🍔', 'color': '#FF6B6B'},
        {'id': 'cat-2', 'name': 'Shopping', 'icon': '🛍️', 'color': '#4ECDC4'},
        {'id': 'cat-3', 'name': 'Transportation', 'icon': '🚗', 'color': '#45B7D1'},
        {'id': 'cat-4', 'name': 'Bills & Utilities', 'icon': '💡', 'color': '#96CEB4'},
        {'id': 'cat-5', 'name': 'Entertainment', 'icon': '🎬', 'color': '#FECA57'},
        {'id': 'cat-6', 'name': 'Healthcare', 'icon': '🏥', 'color': '#FF9F43'},
        {'id': 'cat-7', 'name': 'Education', 'icon': '📚', 'color': '#A29BFE'},
        {'id': 'cat-8', 'name': 'Travel', 'icon': '✈️', 'color': '#6C5CE7'},
        {'id': 'cat-9', 'name': 'Income', 'icon': '💰', 'color': '#00D2D3'},
        {'id': 'cat-10', 'name': 'Transfer', 'icon': '🔄', 'color': '#576574'},
    ]
    data_manager.transaction_categories.extend(categories)

    # Create merchants
    merchants = [
        {'name': 'Starbucks', 'category': 'cat-1'},
        {'name': 'Amazon', 'category': 'cat-2'},
        {'name': 'Uber', 'category': 'cat-3'},
        {'name': 'Electric Company', 'category': 'cat-4'},
        {'name': 'Netflix', 'category': 'cat-5'},
        {'name': 'CVS Pharmacy', 'category': 'cat-6'},
        {'name': 'Coursera', 'category': 'cat-7'},
        {'name': 'Delta Airlines', 'category': 'cat-8'},
        {'name': 'Salary Deposit', 'category': 'cat-9'},
        {'name': 'Target', 'category': 'cat-2'},
        {'name': 'Whole Foods', 'category': 'cat-1'},
        {'name': 'Shell Gas Station', 'category': 'cat-3'},
    ]

    # Generate transactions for the past 90 days
    for user in users[:2]:
        user_accounts = [acc for acc in data_manager.accounts if acc['user_id'] == user['id']]

        for day_offset in range(90):
            date = datetime.now(UTC) - timedelta(days=day_offset)

            # Generate 0-5 transactions per day
            num_transactions = random.randint(0, 5)

            for _ in range(num_transactions):
                merchant = random.choice(merchants)
                account = random.choice([acc for acc in user_accounts if acc['account_type'] != 'savings'])

                # Determine transaction type and amount
                if merchant['category'] == 'cat-9':  # Income
                    trans_type = 'credit'
                    amount = float(random.randint(2000, 5000))
                else:
                    trans_type = 'debit'
                    amount = float(random.randint(10, 500))

                transaction = {
                    'id': str(uuid.uuid4()),
                    'account_id': account['id'],
                    'user_id': user['id'],
                    'amount': amount,
                    'transaction_type': trans_type,
                    'description': merchant['name'],
                    'category_id': merchant['category'],
                    'date': date.isoformat(),
                    'status': 'completed',
                    'created_at': date.isoformat()
                }
                data_manager.transactions.append(transaction)

    # Create cards
    for user in users[:2]:
        user_accounts = [acc for acc in data_manager.accounts if acc['user_id'] == user['id']]

        # Debit card for checking account
        checking_acc = next((acc for acc in user_accounts if acc['account_type'] == 'checking'), None)
        if checking_acc:
            card = {
                'id': f"{user['id']}-card-1",
                'user_id': user['id'],
                'account_id': checking_acc['id'],
                'card_number': f"****{random.randint(1000, 9999)}",
                'card_type': 'debit',
                'card_status': 'active',
                'expiry_date': (datetime.now(UTC) + timedelta(days=1095)).strftime('%m/%y'),
                'created_at': checking_acc['created_at']
            }
            data_manager.cards.append(card)

        # Credit card
        credit_acc = next((acc for acc in user_accounts if acc['account_type'] == 'credit'), None)
        if credit_acc:
            card = {
                'id': f"{user['id']}-card-2",
                'user_id': user['id'],
                'account_id': credit_acc['id'],
                'card_number': f"****{random.randint(1000, 9999)}",
                'card_type': 'credit',
                'card_status': 'active',
                'credit_limit': 10000.00,
                'expiry_date': (datetime.now(UTC) + timedelta(days=1095)).strftime('%m/%y'),
                'created_at': credit_acc['created_at']
            }
            data_manager.cards.append(card)

    # Create credit scores
    for user in users[:2]:
        score = {
            'id': f"{user['id']}-score",
            'user_id': user['id'],
            'score': random.randint(650, 850),
            'provider': 'Equifax',
            'date': datetime.now(UTC).isoformat(),
            'factors': [
                'Payment History: Excellent',
                'Credit Utilization: Low',
                'Credit History Length: Good'
            ]
        }
        data_manager.credit_scores.append(score)

    # Create budgets
    for user in users[:2]:
        for category in categories[:8]:  # Exclude income and transfer
            budget = {
                'id': f"{user['id']}-budget-{category['id']}",
                'user_id': user['id'],
                'category_id': category['id'],
                'amount': float(random.randint(200, 1000)),
                'period': 'monthly',
                'start_date': datetime.now(UTC).replace(day=1).isoformat(),
                'is_active': True,
                'created_at': (datetime.now(UTC) - timedelta(days=30)).isoformat()
            }
            data_manager.budgets.append(budget)

    # Create goals
    goal_templates = [
        {'name': 'Emergency Fund', 'target': 10000, 'category': 'savings'},
        {'name': 'Vacation to Europe', 'target': 5000, 'category': 'travel'},
        {'name': 'New Car Down Payment', 'target': 8000, 'category': 'auto'},
        {'name': 'Home Renovation', 'target': 15000, 'category': 'home'},
    ]

    for user in users[:2]:
        for i, template in enumerate(goal_templates[:2]):
            goal = {
                'id': f"{user['id']}-goal-{i+1}",
                'user_id': user['id'],
                'name': template['name'],
                'target_amount': float(template['target']),
                'current_amount': float(random.randint(0, template['target'])),
                'target_date': (datetime.now(UTC) + timedelta(days=random.randint(180, 730))).isoformat(),
                'category': template['category'],
                'is_active': True,
                'created_at': (datetime.now(UTC) - timedelta(days=60)).isoformat()
            }
            data_manager.goals.append(goal)

    # Create bills
    bill_templates = [
        {'name': 'Electricity', 'amount': 150, 'day': 15},
        {'name': 'Internet', 'amount': 80, 'day': 1},
        {'name': 'Phone', 'amount': 50, 'day': 10},
        {'name': 'Rent', 'amount': 2000, 'day': 1},
    ]

    for user in users[:2]:
        for template in bill_templates:
            bill = {
                'id': f"{user['id']}-bill-{template['name'].lower()}",
                'user_id': user['id'],
                'name': template['name'],
                'amount': float(template['amount']),
                'due_day': template['day'],
                'frequency': 'monthly',
                'category_id': 'cat-4',  # Bills & Utilities
                'is_active': True,
                'auto_pay': random.choice([True, False]),
                'created_at': (datetime.now(UTC) - timedelta(days=90)).isoformat()
            }
            data_manager.bills.append(bill)

    # Create subscriptions
    subscription_templates = [
        {'name': 'Netflix', 'amount': 15.99, 'category': 'cat-5'},
        {'name': 'Spotify', 'amount': 9.99, 'category': 'cat-5'},
        {'name': 'Amazon Prime', 'amount': 14.99, 'category': 'cat-2'},
        {'name': 'Gym Membership', 'amount': 49.99, 'category': 'cat-6'},
    ]

    for user in users[:2]:
        user_cards = [card for card in data_manager.cards if card['user_id'] == user['id'] and card['card_type'] == 'credit']
        if user_cards:
            card = user_cards[0]

            for template in subscription_templates[:3]:
                sub = {
                    'id': f"{user['id']}-sub-{template['name'].lower().replace(' ', '-')}",
                    'user_id': user['id'],
                    'card_id': card['id'],
                    'name': template['name'],
                    'amount': template['amount'],
                    'frequency': 'monthly',
                    'category_id': template['category'],
                    'next_billing_date': (datetime.now(UTC) + timedelta(days=random.randint(1, 30))).isoformat(),
                    'is_active': True,
                    'created_at': (datetime.now(UTC) - timedelta(days=random.randint(30, 365))).isoformat()
                }
                data_manager.subscriptions.append(sub)

    # Create social connections
    if len(users) >= 2:
        # John and Jane are connected
        connection = {
            'id': 'conn-1',
            'user_id': users[0]['id'],
            'connected_user_id': users[1]['id'],
            'connection_type': 'friend',
            'created_at': (datetime.now(UTC) - timedelta(days=100)).isoformat()
        }
        data_manager.social_connections.append(connection)

        # Reverse connection
        connection_reverse = {
            'id': 'conn-2',
            'user_id': users[1]['id'],
            'connected_user_id': users[0]['id'],
            'connection_type': 'friend',
            'created_at': (datetime.now(UTC) - timedelta(days=100)).isoformat()
        }
        data_manager.social_connections.append(connection_reverse)

    # Create messages
    message_templates = [
        "Hey! Want to split lunch tomorrow?",
        "Thanks for covering dinner last night!",
        "Can you send me your share for the Uber?",
        "Got the payment, thanks!",
    ]

    for i, template in enumerate(message_templates):
        message = {
            'id': f'msg-{i+1}',
            'sender_id': users[i % 2]['id'],
            'recipient_id': users[(i + 1) % 2]['id'],
            'message': template,
            'is_read': i < 2,  # First two are read
            'created_at': (datetime.now(UTC) - timedelta(hours=i * 24)).isoformat()
        }
        data_manager.messages.append(message)

    # Create some P2P transactions
    p2p_transactions = [
        {
            'id': 'p2p-1',
            'sender_id': users[0]['id'],
            'recipient_id': users[1]['id'],
            'amount': 25.00,
            'description': 'Lunch split',
            'status': 'completed',
            'created_at': (datetime.now(UTC) - timedelta(days=2)).isoformat()
        },
        {
            'id': 'p2p-2',
            'sender_id': users[1]['id'],
            'recipient_id': users[0]['id'],
            'amount': 50.00,
            'description': 'Concert tickets',
            'status': 'completed',
            'created_at': (datetime.now(UTC) - timedelta(days=5)).isoformat()
        }
    ]
    data_manager.p2p_transactions.extend(p2p_transactions)

    # Create notifications
    for user in users[:2]:
        notifications = [
            {
                'id': f"{user['id']}-notif-1",
                'user_id': user['id'],
                'type': 'transaction',
                'title': 'Large Transaction Alert',
                'message': 'A transaction of $500+ was made on your account',
                'is_read': False,
                'created_at': (datetime.now(UTC) - timedelta(hours=2)).isoformat()
            },
            {
                'id': f"{user['id']}-notif-2",
                'user_id': user['id'],
                'type': 'budget',
                'title': 'Budget Alert',
                'message': "You've used 80% of your Food & Dining budget",
                'is_read': True,
                'created_at': (datetime.now(UTC) - timedelta(days=1)).isoformat()
            }
        ]
        data_manager.notifications.extend(notifications)

    # Create alerts
    alerts = [
        {
            'id': 'alert-1',
            'type': 'security',
            'severity': 'high',
            'title': 'New Login Detected',
            'message': 'A new login was detected from Chrome on Windows',
            'is_active': True,
            'created_at': (datetime.now(UTC) - timedelta(hours=1)).isoformat()
        }
    ]
    data_manager.alerts.extend(alerts)

    # Create investment accounts
    for user in users[:2]:
        inv_account = {
            'id': f"{user['id']}-inv-1",
            'user_id': user['id'],
            'account_name': 'Personal Investment',
            'account_type': 'brokerage',
            'total_value': float(random.randint(10000, 100000)),
            'cash_balance': float(random.randint(1000, 5000)),
            'created_at': (datetime.now(UTC) - timedelta(days=180)).isoformat()
        }
        data_manager.investment_accounts.append(inv_account)

        # Create some holdings
        stocks = [
            {'symbol': 'AAPL', 'name': 'Apple Inc.', 'price': 175.50},
            {'symbol': 'GOOGL', 'name': 'Alphabet Inc.', 'price': 140.25},
            {'symbol': 'MSFT', 'name': 'Microsoft Corp.', 'price': 380.75},
            {'symbol': 'AMZN', 'name': 'Amazon.com Inc.', 'price': 170.50},
        ]

        for stock in stocks[:3]:
            holding = {
                'id': f"{inv_account['id']}-holding-{stock['symbol']}",
                'account_id': inv_account['id'],
                'user_id': user['id'],
                'symbol': stock['symbol'],
                'name': stock['name'],
                'quantity': random.randint(10, 100),
                'purchase_price': stock['price'] * random.uniform(0.8, 1.0),
                'current_price': stock['price'],
                'created_at': (datetime.now(UTC) - timedelta(days=random.randint(30, 150))).isoformat()
            }
            data_manager.holdings.append(holding)

        # Add to watchlist
        watchlist_item = {
            'id': f"{user['id']}-watch-1",
            'user_id': user['id'],
            'symbol': stocks[3]['symbol'],
            'name': stocks[3]['name'],
            'added_at': (datetime.now(UTC) - timedelta(days=10)).isoformat()
        }
        data_manager.watchlist.append(watchlist_item)


def _hash_password(password: str) -> str:
    """Hash a password using SHA256."""
    import hashlib
    return hashlib.sha256(password.encode()).hexdigest()
