"""
Memory-based adapter to replace SQLAlchemy operations.
This module provides compatibility layer for existing routes to use memory-based storage.
"""
from contextlib import contextmanager
from datetime import UTC, date, datetime
from typing import Any

from app.repositories.data_manager import data_manager


class ORClause:
    """Represents an OR condition in SQLAlchemy style."""
    def __init__(self, *clauses):
        self.clauses = clauses
        # Don't modify class name - it breaks isinstance checks


class ANDClause:
    """Represents an AND condition in SQLAlchemy style."""
    def __init__(self, *clauses):
        self.clauses = clauses
        # Don't modify class name - it breaks isinstance checks


class MemoryQuery:
    """Mock query object that simulates SQLAlchemy query interface."""

    def __init__(self, model_class: type, data_store: list[dict[str, Any]], session=None, aggregation=None):
        self.model_class = model_class
        self.data_store = data_store
        self.filters = []
        self.order_by_field = None
        self.order_desc = False
        self.limit_value = None
        self.offset_value = None
        self.session = session
        self.aggregation = aggregation  # For func.sum(), func.count(), etc.

    @staticmethod
    def normalize_datetime_for_comparison(dt):
        """Normalize datetime to be timezone-naive for comparison."""
        if isinstance(dt, datetime) and dt.tzinfo is not None:
            return dt.replace(tzinfo=None)
        return dt

    def filter(self, *args):
        """Add filter conditions."""
        # Import ModelAttribute to check types
        from app.models.memory_models import Account, ModelAttribute

        # If model_class is a ModelAttribute (from query(Account.id)), we need to infer the actual model
        if isinstance(self.model_class, ModelAttribute) and not self.data_store:
            # Look at the first filter to determine the model
            for arg in args:
                if hasattr(arg, 'left') and hasattr(arg.left, '__class__'):
                    # Check if this is Account.user_id or similar
                    # For now, we'll assume it's Account if we see user_id filter
                    field_name = arg.left.key if hasattr(arg.left, 'key') else str(arg.left)
                    if field_name == 'user_id':
                        # This is likely an Account query
                        self.model_class = Account
                        self.data_store = self.session._get_store_for_model(Account)
                        break

        # Parse SQLAlchemy-style filters
        for arg in args:
            if hasattr(arg, 'left') and hasattr(arg, 'right'):
                # Handle comparison operations and InClause
                field_name = arg.left.key if hasattr(arg.left, 'key') else str(arg.left)
                value = arg.right
                # Get operator - check for 'op' attribute first (ComparisonClause/InClause), then fall back to class name
                op = arg.op if hasattr(arg, 'op') else arg.__class__.__name__
                # Handle in_ clause
                self.filters.append((field_name, op, value))
            elif hasattr(arg, '__class__') and arg.__class__.__name__ == 'BooleanClauseList':
                # Handle OR conditions from | operator
                or_filters = []
                for clause in arg.clauses:
                    if hasattr(clause, 'left') and hasattr(clause, 'right'):
                        field_name = clause.left.key if hasattr(clause.left, 'key') else str(clause.left)
                        value = clause.right
                        or_filters.append((field_name, '__eq__', value))
                if or_filters:
                    self.filters.append(('__or__', or_filters))
            elif isinstance(arg, ORClause):
                # Handle or_() function
                self.filters.append(arg)
            elif isinstance(arg, ANDClause):
                # Handle and_() function
                self.filters.append(arg)
            else:
                # Handle boolean expressions
                self.filters.append(arg)
        return self

    def filter_by(self, **kwargs):
        """Filter by exact field values."""
        for field, value in kwargs.items():
            self.filters.append((field, 'eq', value))
        return self

    def first(self):
        """Get first matching result."""
        results = self._apply_filters()
        if results:
            # Convert dictionary to model instance
            return self._dict_to_model(results[0])
        return None

    def all(self):
        """Get all matching results."""
        results = self._apply_filters()

        # Handle ordering
        if hasattr(self, 'order_by_fields') and self.order_by_fields:
            # Multiple order by fields
            def sort_key(x):
                key_values = []
                for field_info in self.order_by_fields:
                    value = x.get(field_info['field'], '')
                    # Handle None values - put them last
                    if value is None:
                        value = '' if not field_info['desc'] else 'zzzzz'
                    # For desc, negate numbers or reverse strings
                    if field_info['desc']:
                        if isinstance(value, (int, float)):
                            value = -value
                        elif isinstance(value, bool):
                            value = not value
                    key_values.append(value)
                return tuple(key_values)
            results = sorted(results, key=sort_key)
        elif self.order_by_field:
            # Single order by field (backward compatibility)
            def sort_key_fn(x):
                value = x.get(self.order_by_field, '')
                # Normalize datetime/date for comparison
                if isinstance(value, date) and not isinstance(value, datetime):
                    # Convert date to datetime for consistent comparison
                    value = datetime.combine(value, datetime.min.time())
                elif isinstance(value, datetime):
                    # Normalize datetime to be timezone-naive
                    value = self.normalize_datetime_for_comparison(value)
                # Handle None values - put them last
                if value is None or value == '':
                    return ('~' if not self.order_desc else '', value)  # '~' sorts after letters
                return ('' if not self.order_desc else '~', value)

            results = sorted(results, key=sort_key_fn, reverse=self.order_desc)

        if self.offset_value:
            results = results[self.offset_value:]
        if self.limit_value:
            results = results[:self.limit_value]
        # Convert dictionaries to model instances
        return [self._dict_to_model(r) for r in results]

    def count(self):
        """Count matching results."""
        return len(self._apply_filters())

    def order_by(self, *fields):
        """Order by field(s)."""
        if not fields:
            return self

        # For backward compatibility, handle single field
        if len(fields) == 1:
            field = fields[0]
            if hasattr(field, 'element'):
                # Handle asc() or desc()
                self.order_by_field = field.element.key
                self.order_desc = hasattr(field, 'modifier') and field.modifier == 'desc'
            else:
                self.order_by_field = field.key if hasattr(field, 'key') else str(field)
                self.order_desc = False
        else:
            # Handle multiple fields - store them for later sorting
            self.order_by_fields = []
            for field in fields:
                if hasattr(field, 'element'):
                    # Handle asc() or desc()
                    self.order_by_fields.append({
                        'field': field.element.key,
                        'desc': hasattr(field, 'modifier') and field.modifier == 'desc'
                    })
                else:
                    self.order_by_fields.append({
                        'field': field.key if hasattr(field, 'key') else str(field),
                        'desc': False
                    })
        return self

    def limit(self, value):
        """Limit results."""
        self.limit_value = value
        return self

    def offset(self, value):
        """Offset results."""
        self.offset_value = value
        return self

    def join(self, model_class):
        """Simulate join operation.

        Since we're using in-memory storage, we don't actually perform SQL joins.
        Instead, we'll handle the filtering logic in the filter methods.
        This method is here for SQLAlchemy API compatibility.
        """
        # Store the joined model for reference if needed
        if not hasattr(self, 'joined_models'):
            self.joined_models = []
        self.joined_models.append(model_class)
        return self

    def options(self, *args):
        """Simulate options for eager loading.

        In SQLAlchemy, this is used for eager loading relationships.
        Since we're using in-memory storage, we ignore this but provide
        the method for API compatibility.
        """
        # Store options for potential future use
        if not hasattr(self, 'load_options'):
            self.load_options = []
        self.load_options.extend(args)
        return self

    def delete(self):
        """Delete matching records."""
        to_delete = self._apply_filters()
        for item in to_delete:
            if item in self.data_store:
                self.data_store.remove(item)
        return len(to_delete)

    def update(self, values, synchronize_session=False):
        """Update matching records."""
        to_update = self._apply_filters()
        count = 0
        for item in to_update:
            # Find the actual item in the data store and update it
            for i, store_item in enumerate(self.data_store):
                if store_item.get('id') == item.get('id'):
                    # Update the fields
                    for key, value in values.items():
                        # Handle model attribute updates
                        if hasattr(value, 'key'):
                            self.data_store[i][value.key] = value
                        else:
                            self.data_store[i][key] = value
                    count += 1
                    break
        return count

    def get(self, id_value):
        """Get a single record by ID (SQLAlchemy compatibility)."""
        for item in self.data_store:
            if item.get('id') == id_value:
                return self._dict_to_model(item)
        return None

    def subquery(self):
        """Return filtered IDs as a subquery (simplified for memory adapter)."""
        # For memory adapter, we'll return the query itself to be used with in_()
        # The in_() method will extract the IDs when needed
        return self

    def scalar(self):
        """Get a single scalar value (SQLAlchemy compatibility)."""
        results = self._apply_filters()

        # Handle aggregation functions
        if self.aggregation:
            func_name, field = self.aggregation

            if func_name == 'sum':
                total = 0
                for item in results:
                    value = item.get(field.key, 0) if hasattr(field, 'key') else item.get(str(field), 0)
                    total += value if value else 0
                return total

            if func_name == 'count':
                return len(results)

            if func_name == 'avg':
                if not results:
                    return 0
                total = 0
                for item in results:
                    value = item.get(field.key, 0) if hasattr(field, 'key') else item.get(str(field), 0)
                    total += value if value else 0
                return total / len(results)

            if func_name == 'max':
                values = []
                for item in results:
                    value = item.get(field.key) if hasattr(field, 'key') else item.get(str(field))
                    if value is not None:
                        values.append(value)
                return max(values) if values else None

            if func_name == 'min':
                values = []
                for item in results:
                    value = item.get(field.key) if hasattr(field, 'key') else item.get(str(field))
                    if value is not None:
                        values.append(value)
                return min(values) if values else None

        # Regular scalar - return first result
        if results and results[0]:
            first_result = results[0]
            if isinstance(first_result, dict) and len(first_result) > 0:
                return next(iter(first_result.values()))
            return first_result
        return None

    def _apply_filters(self):
        """Apply all filters to data store."""
        results = self.data_store.copy()

        # Apply filters for Transaction queries

        for filter_item in self.filters:
            if isinstance(filter_item, tuple) and len(filter_item) == 3:
                field, op, value = filter_item
                if op in {'eq', '__eq__'}:
                    # Special handling for boolean fields that might be None
                    if value is False and field in ['deleted_by_sender', 'deleted_by_recipient', 'is_read', 'is_draft']:
                        results = [r for r in results if r.get(field) in [False, None]]
                    else:
                        results = [r for r in results if r.get(field) == value]
                elif op == '__ne__':
                    results = [r for r in results if r.get(field) != value]
                elif op == '__lt__':
                    # Handle potential datetime comparison issues
                    filtered_results = []
                    for r in results:
                        item_val = r.get(field)
                        if item_val is not None:
                            # Normalize datetimes for comparison
                            if isinstance(item_val, datetime) and isinstance(value, datetime):
                                item_val = MemoryQuery.normalize_datetime_for_comparison(item_val)
                                compare_val = MemoryQuery.normalize_datetime_for_comparison(value)
                            else:
                                compare_val = value
                            if item_val < compare_val:
                                filtered_results.append(r)
                    results = filtered_results
                elif op == '__le__':
                    # Special handling for date comparisons
                    if field == 'transaction_date' and hasattr(self.model_class, '__name__') and self.model_class.__name__ == 'Transaction':
                        # Count before and after
                        len(results)

                        # For date comparisons, ensure we're comparing dates correctly
                        filtered_results = []
                        for r in results:
                            item_value = r.get(field)
                            if item_value is not None:
                                # Convert both to datetime for comparison if needed
                                if isinstance(item_value, date) and not isinstance(item_value, datetime):
                                    # Convert date to datetime at end of day for <= comparison
                                    item_datetime = datetime.combine(item_value, datetime.max.time())
                                else:
                                    item_datetime = item_value

                                if isinstance(value, date) and not isinstance(value, datetime):
                                    # Convert date to datetime at end of day for <= comparison
                                    compare_datetime = datetime.combine(value, datetime.max.time())
                                else:
                                    compare_datetime = value

                                # Handle timezone-aware vs naive datetime comparison
                                if isinstance(item_datetime, datetime) and isinstance(compare_datetime, datetime):
                                    # If one is timezone-aware and the other isn't, make both naive
                                    if item_datetime.tzinfo is not None and compare_datetime.tzinfo is None:
                                        item_datetime = item_datetime.replace(tzinfo=None)
                                    elif item_datetime.tzinfo is None and compare_datetime.tzinfo is not None:
                                        compare_datetime = compare_datetime.replace(tzinfo=None)

                                if item_datetime <= compare_datetime:
                                    filtered_results.append(r)

                        results = filtered_results
                        len(results)
                    else:
                        # Handle potential datetime comparison issues
                        filtered_results = []
                        for r in results:
                            item_val = r.get(field)
                            if item_val is not None:
                                # Normalize datetimes for comparison
                                if isinstance(item_val, datetime) and isinstance(value, datetime):
                                    item_val = MemoryQuery.normalize_datetime_for_comparison(item_val)
                                    compare_val = MemoryQuery.normalize_datetime_for_comparison(value)
                                else:
                                    compare_val = value
                                if item_val <= compare_val:
                                    filtered_results.append(r)
                        results = filtered_results
                elif op == '__gt__':
                    # Handle potential datetime comparison issues
                    filtered_results = []
                    for r in results:
                        item_val = r.get(field)
                        if item_val is not None:
                            # Normalize datetimes for comparison
                            if isinstance(item_val, datetime) and isinstance(value, datetime):
                                item_val = MemoryQuery.normalize_datetime_for_comparison(item_val)
                                compare_val = MemoryQuery.normalize_datetime_for_comparison(value)
                            else:
                                compare_val = value
                            if item_val > compare_val:
                                filtered_results.append(r)
                    results = filtered_results
                elif op == '__ge__':
                    # Special handling for date comparisons
                    if field == 'transaction_date' and hasattr(self.model_class, '__name__') and self.model_class.__name__ == 'Transaction':
                        # Count before and after
                        len(results)

                        # For date comparisons, ensure we're comparing dates correctly
                        filtered_results = []
                        for r in results:
                            item_value = r.get(field)
                            if item_value is not None:
                                # Convert both to datetime for comparison if needed
                                if isinstance(item_value, date) and not isinstance(item_value, datetime):
                                    # Convert date to datetime at start of day for >= comparison
                                    item_datetime = datetime.combine(item_value, datetime.min.time())
                                else:
                                    item_datetime = item_value

                                if isinstance(value, date) and not isinstance(value, datetime):
                                    # Convert date to datetime at start of day for >= comparison
                                    compare_datetime = datetime.combine(value, datetime.min.time())
                                else:
                                    compare_datetime = value

                                # Handle timezone-aware vs naive datetime comparison
                                if isinstance(item_datetime, datetime) and isinstance(compare_datetime, datetime):
                                    # If one is timezone-aware and the other isn't, make both naive
                                    if item_datetime.tzinfo is not None and compare_datetime.tzinfo is None:
                                        item_datetime = item_datetime.replace(tzinfo=None)
                                    elif item_datetime.tzinfo is None and compare_datetime.tzinfo is not None:
                                        compare_datetime = compare_datetime.replace(tzinfo=None)

                                if item_datetime >= compare_datetime:
                                    filtered_results.append(r)

                        results = filtered_results
                        len(results)
                    else:
                        # Handle potential datetime comparison issues
                        filtered_results = []
                        for r in results:
                            item_val = r.get(field)
                            if item_val is not None:
                                # Normalize datetimes for comparison
                                if isinstance(item_val, datetime) and isinstance(value, datetime):
                                    item_val = MemoryQuery.normalize_datetime_for_comparison(item_val)
                                    compare_val = MemoryQuery.normalize_datetime_for_comparison(value)
                                else:
                                    compare_val = value
                                if item_val >= compare_val:
                                    filtered_results.append(r)
                        results = filtered_results
                elif op == 'in_':
                    # Handle subquery case - if value is a MemoryQuery, execute it to get IDs
                    if isinstance(value, MemoryQuery):
                        # Execute the subquery to get the list of IDs
                        subquery_results = value._apply_filters()
                        id_list = [r.get('id') for r in subquery_results]
                        results = [r for r in results if r.get(field) in id_list]
                    else:
                        # Regular in_ with a list
                        results = [r for r in results if r.get(field) in value]
                elif op == 'contains':
                    results = [r for r in results if value in r.get(field, '')]
                elif op in {'like', 'ilike'}:
                    # Case-insensitive like
                    pattern = value.replace('%', '').lower()
                    results = [r for r in results if pattern in str(r.get(field, '')).lower()]
            elif isinstance(filter_item, tuple) and filter_item[0] == '__or__':
                # Handle OR conditions from | operator
                or_results = []
                for or_filter in filter_item[1]:
                    field, op, value = or_filter
                    if op == '__eq__':
                        or_results.extend([r for r in self.data_store if r.get(field) == value and r not in or_results])
                results = [r for r in results if r in or_results]
            elif isinstance(filter_item, ORClause):
                # Handle or_() conditions
                or_results = []
                for clause in filter_item.clauses:
                    # Handle different types of clauses within OR
                    if hasattr(clause, 'left') and hasattr(clause, 'right') and hasattr(clause, 'op'):
                        # Simple comparison clause
                        field_name = clause.left.key if hasattr(clause.left, 'key') else str(clause.left)
                        value = clause.right
                        op = clause.op
                        if op == '__eq__':
                            # Special handling for boolean fields that might be None
                            if value is False and field_name in ['deleted_by_sender', 'deleted_by_recipient', 'is_read', 'is_draft']:
                                or_results.extend([r for r in results if r.get(field_name) in [False, None] and r not in or_results])
                            else:
                                or_results.extend([r for r in results if r.get(field_name) == value and r not in or_results])
                    else:
                        # Complex clause (AND, etc.) - use recursive query on current results
                        temp_query = MemoryQuery(self.model_class, results, self.session, self.aggregation)
                        temp_query.filter(clause)
                        clause_results = temp_query._apply_filters()
                        or_results.extend([r for r in clause_results if r not in or_results])
                # Keep only items that matched at least one OR clause
                results = or_results
            elif isinstance(filter_item, ANDClause):
                # Handle and_() conditions
                for clause in filter_item.clauses:
                    # Apply each clause in sequence
                    temp_query = MemoryQuery(self.model_class, results, self.session, self.aggregation)
                    temp_query.filter(clause)
                    results = temp_query._apply_filters()
            else:
                # Handle other boolean expressions
                pass

        return results

    def _dict_to_model(self, data: dict[str, Any]):
        """Convert dictionary to model instance."""
        # Import memory models
        from app.models.memory_models import (
            Account,
            AccountLockout,
            AuditLog,
            Budget,
            Card,
            Category,
            Contact,
            DirectMessage,
            Goal,
            Log,
            LoginAttempt,
            Merchant,
            Notification,
            SecurityIncident,
            Transaction,
            TransactionAnomaly,
            TrustedDevice,
            TwoFactorAuth,
            User,
        )

        # Map model names to classes
        model_map = {
            'User': User,
            'Account': Account,
            'Transaction': Transaction,
            'Category': Category,
            'Budget': Budget,
            'Goal': Goal,
            'Notification': Notification,
            'Contact': Contact,
            'DirectMessage': DirectMessage,
            'Log': Log,
            'Merchant': Merchant,
            'Card': Card,
            'AuditLog': AuditLog,
            'LoginAttempt': LoginAttempt,
            'TransactionAnomaly': TransactionAnomaly,
            'SecurityIncident': SecurityIncident,
            'AccountLockout': AccountLockout,
            'TrustedDevice': TrustedDevice,
            'TwoFactorAuth': TwoFactorAuth,
        }

        model_name = self.model_class.__name__ if hasattr(self.model_class, '__name__') else str(self.model_class)
        model_cls = model_map.get(model_name)

        if model_cls:
            instance = model_cls.from_dict(data)
        else:
            # Return a generic memory model
            from app.models.memory_models import BaseMemoryModel
            instance = BaseMemoryModel(**data)

        # Track this instance in the session for updates
        if self.session and hasattr(instance, '_data'):
            # Store reference to session
            instance._session = self.session
            # Store original data for comparison during commit
            instance._original_data = data.copy()
            # Add to pending updates list so commit will check it
            if instance not in self.session.pending_updates:
                self.session.pending_updates.append(instance)

        return instance


class MemorySession:
    """Mock session object that simulates SQLAlchemy session interface."""

    def __init__(self):
        self.pending_adds = []
        self.pending_updates = []
        self.pending_deletes = []
        self._is_active = True

    def add(self, obj):
        """Add object to session."""
        # Keep the original object to preserve type information
        self.pending_adds.append(obj)

    def delete(self, obj):
        """Delete object from session."""
        self.pending_deletes.append(obj)

    def query(self, model_or_aggregation):
        """Create query for model class or aggregation function."""
        # Import ModelAttribute to check instance type
        from app.models.memory_models import ModelAttribute

        # Check if this is a ModelAttribute (like Account.id)
        if isinstance(model_or_aggregation, ModelAttribute):
            # For queries like query(Account.id), we need to determine the model class
            # In SQLAlchemy, Account.id would have a parent reference to Account
            # Since we don't have that, we'll need to find the model class another way
            # For now, we'll store the attribute and handle it specially
            # The actual model will be determined when we filter by a field from that model
            return MemoryQuery(model_or_aggregation, [], session=self)

        # Check if this is an aggregation function
        if isinstance(model_or_aggregation, tuple) and len(model_or_aggregation) == 2:
            # This is a func.sum(field) or similar
            func_name, field = model_or_aggregation
            # Extract the model class from the field
            if hasattr(field, 'parent') and hasattr(field.parent, 'class_'):
                model_class = field.parent.class_
            else:
                # Try to determine from field name or use Transaction as default
                from app.models.memory_models import Transaction
                model_class = Transaction
            return MemoryQuery(model_class, self._get_store_for_model(model_class), session=self, aggregation=(func_name, field))

        # Regular model query
        model_class = model_or_aggregation
        return MemoryQuery(model_class, self._get_store_for_model(model_class), session=self)

    def _get_store_for_model(self, model_class):
        """Get the data store for a model class."""
        # Map model class to data store
        store_map = {
            'User': data_manager.users,
            'Account': data_manager.accounts,
            'Transaction': data_manager.transactions,
            'Category': data_manager.categories,
            'Budget': data_manager.budgets,
            'Goal': data_manager.goals,
            'GoalContribution': data_manager.goal_contributions,
            'Notification': data_manager.notifications,
            'Contact': data_manager.contacts,
            'Conversation': data_manager.conversations,
            'ConversationParticipant': data_manager.conversation_participants,
            'Message': data_manager.messages,
            'MessageReadReceipt': data_manager.message_read_receipts,
            'RecurringRule': data_manager.recurring_rules,
            'Merchant': data_manager.merchants,
            'Note': data_manager.notes,
            'Card': data_manager.cards,
            'VirtualCard': data_manager.cards,  # VirtualCard is an alias for Card
            'Subscription': data_manager.subscriptions,
            'SecurityEvent': data_manager.security_events,
            'PaymentMethod': data_manager.payment_methods,
            'Log': data_manager.logs,
            'Bill': data_manager.bills,
            'CreditScore': data_manager.credit_scores,
            'SocialConnection': data_manager.social_connections,
            'P2PTransaction': data_manager.p2p_transactions,
            'InvestmentAccount': data_manager.investment_accounts,
            'Holding': data_manager.holdings,
            'Alert': data_manager.alerts,
            'AnalyticsEvent': data_manager.analytics_events,
            'BankLink': data_manager.bank_links,
            'PlaidAccount': data_manager.plaid_accounts,
            'TransactionsSyncStatus': data_manager.transactions_sync_status,
            'LinkedAccount': data_manager.linked_accounts,
            'CreditSimulation': data_manager.credit_simulations,
            'TwoFactorAuth': data_manager.two_factor_auth,
            'UserDevice': data_manager.user_devices,
            'SecurityAuditLog': data_manager.security_audit_logs,
            'SpendingLimit': data_manager.spending_limits,
            'CardSpendingLimit': data_manager.spending_limits,
            'RoundUpConfig': data_manager.round_up_configs,
            'RoundUpTransaction': data_manager.round_up_transactions,
            'SavingsRule': data_manager.savings_rules,
            'SavingsChallenge': data_manager.savings_challenges,
            'ChallengeParticipant': data_manager.challenge_participants,
            'Invoice': data_manager.invoices,
            'ExpenseReport': data_manager.expense_reports,
            'Receipt': data_manager.receipts,
            'CancellationReminder': data_manager.cancellation_reminders,
            'DirectMessage': data_manager.direct_messages,
            'MessageAttachment': data_manager.message_attachments,
            'MessageFolder': data_manager.message_folders,
            'BlockedUser': data_manager.blocked_users,
            'MessageSettings': data_manager.message_settings,
            # Security module models
            'AuditLog': data_manager.audit_logs,
            'LoginAttempt': data_manager.login_attempts,
            'TransactionAnomaly': data_manager.transaction_anomalies,
            'SecurityIncident': data_manager.security_incidents,
            'AccountLockout': data_manager.account_lockouts,
            'TrustedDevice': data_manager.trusted_devices,
            # Crypto module models
            'CryptoWallet': data_manager.crypto_wallets,
            'CryptoAsset': data_manager.crypto_assets,
            'CryptoTransaction': data_manager.crypto_transactions,
            'NFTAsset': data_manager.nft_assets,
            'DeFiPosition': data_manager.defi_positions,
            'AssetBridge': data_manager.asset_bridges,
            # Credit module models
            'CollateralPosition': data_manager.collateral_positions,
            'CreditAlert': data_manager.credit_alerts,
            'CreditBuilderAccount': data_manager.credit_builder_accounts,
            'CreditDispute': data_manager.credit_disputes,
            # Add more mappings as needed
        }

        model_name = model_class.__name__ if hasattr(model_class, '__name__') else str(model_class)

        # VirtualCard is an alias for Card, so use Card's store
        if model_name == 'VirtualCard':
            model_name = 'Card'

        return store_map.get(model_name, [])


    def commit(self):
        """Commit pending changes."""
        # Process additions
        for obj in self.pending_adds:
            obj_dict = self._model_to_dict(obj)

            # Always generate a new ID based on the store to avoid conflicts with existing data
            # Get the appropriate store to find max ID
            store = self._get_store_for_model(obj.__class__)
            max_id = max([item.get('id', 0) for item in store if isinstance(item.get('id'), int)], default=0)
            obj_dict['id'] = max_id + 1

            if 'created_at' not in obj_dict:
                obj_dict['created_at'] = datetime.now(UTC)

            # Update the original object if it has _data attribute
            if hasattr(obj, '_data'):
                obj._data['id'] = obj_dict['id']
                obj._data['created_at'] = obj_dict['created_at']

            # Add to appropriate store, passing both the original object and dict
            self._add_to_store(obj_dict, obj)

        # Process updates - find and update objects that were modified
        for obj in self.pending_updates:
            if hasattr(obj, '_data') and hasattr(obj, '_original_data'):
                obj_id = obj._data.get('id')
                if obj_id:
                    # Find the correct store for this model type
                    store = self._get_store_for_model(obj.__class__)

                    # Find and update the object in the store
                    for i, item in enumerate(store):
                        if item.get('id') == obj_id:
                            # Update the store with new data
                            updated_data = obj._data.copy()
                            # Ensure updated_at is set
                            if 'updated_at' not in updated_data or updated_data['updated_at'] == obj._original_data.get('updated_at'):
                                updated_data['updated_at'] = datetime.now(UTC)
                            store[i] = updated_data
                            break

        # Process deletions
        for obj in self.pending_deletes:
            self._remove_from_store(obj)

        # Clear pending operations
        self.pending_adds.clear()
        self.pending_updates.clear()
        self.pending_deletes.clear()

    def rollback(self):
        """Rollback pending changes."""
        self.pending_adds.clear()
        self.pending_updates.clear()
        self.pending_deletes.clear()

    def close(self):
        """Close session."""
        self._is_active = False

    def flush(self):
        """Flush pending changes without committing."""
        # Process additions to assign IDs but keep in pending
        for obj in self.pending_adds:
            obj_dict = self._model_to_dict(obj)

            # Ensure object has an ID
            if 'id' not in obj_dict or obj_dict['id'] is None:
                # Get the appropriate store to find max ID
                store = self._get_store_for_model(obj.__class__)
                max_id = max([item.get('id', 0) for item in store if isinstance(item.get('id'), int)], default=0)
                obj_dict['id'] = max_id + 1

                # Update the original object's _data with the new ID
                if hasattr(obj, '_data'):
                    obj._data['id'] = obj_dict['id']

    def refresh(self, obj):
        """Refresh object from database."""
        # In memory system, convert the object back to dictionary form if needed
        if hasattr(obj, '_data'):
            # Find the object in the store and update its data
            obj_id = obj._data.get('id')
            if obj_id and hasattr(obj, '__tablename__'):
                # Get the specific store for this model type
                store = self._get_store_for_model(obj.__class__)

                # Find the object in the correct store
                for item in store:
                    if item.get('id') == obj_id:
                        # Update all attributes from the stored data
                        # Check if _data is already pointing to the store item
                        if obj._data is not item:
                            obj._data.clear()
                            obj._data.update(item)
                        # If _data IS the store item, no need to do anything
                        return
                # If not found in stores, the object might have just been added
                # In this case, do nothing as the object already has its data

    def _get_all_stores(self):
        """Get all data stores."""
        return {
            'users': data_manager.users,
            'accounts': data_manager.accounts,
            'transactions': data_manager.transactions,
            'categories': data_manager.categories,
            'budgets': data_manager.budgets,
            'goals': data_manager.goals,
            'goal_contributions': data_manager.goal_contributions,
            'notifications': data_manager.notifications,
            'contacts': data_manager.contacts,
            'conversations': data_manager.conversations,
            'conversation_participants': data_manager.conversation_participants,
            'messages': data_manager.messages,
            'message_read_receipts': data_manager.message_read_receipts,
            'recurring_rules': data_manager.recurring_rules,
            'merchants': data_manager.merchants,
            'notes': data_manager.notes,
            'cards': data_manager.cards,
            'subscriptions': data_manager.subscriptions,
            'security_events': data_manager.security_events,
            'payment_methods': data_manager.payment_methods,
            'bills': data_manager.bills,
            'credit_scores': data_manager.credit_scores,
            'social_connections': data_manager.social_connections,
            'p2p_transactions': data_manager.p2p_transactions,
            'investment_accounts': data_manager.investment_accounts,
            'holdings': data_manager.holdings,
            'alerts': data_manager.alerts,
            'analytics_events': data_manager.analytics_events,
            'bank_links': data_manager.bank_links,
            'plaid_accounts': data_manager.plaid_accounts,
            'transactions_sync_status': data_manager.transactions_sync_status,
            'linked_accounts': data_manager.linked_accounts,
            'credit_simulations': data_manager.credit_simulations,
            'two_factor_auth': data_manager.two_factor_auth,
            'user_devices': data_manager.user_devices,
            'security_audit_logs': data_manager.security_audit_logs,
            'spending_limits': data_manager.spending_limits,
            'round_up_configs': data_manager.round_up_configs,
            'round_up_transactions': data_manager.round_up_transactions,
            'savings_rules': data_manager.savings_rules,
            'savings_challenges': data_manager.savings_challenges,
            'challenge_participants': data_manager.challenge_participants,
            'invoices': data_manager.invoices,
            'expense_reports': data_manager.expense_reports,
            'receipts': data_manager.receipts,
            'cancellation_reminders': data_manager.cancellation_reminders,
            'direct_messages': data_manager.direct_messages,
            'message_attachments': data_manager.message_attachments,
            'message_folders': data_manager.message_folders,
            'blocked_users': data_manager.blocked_users,
            'message_settings': data_manager.message_settings,
            'logs': data_manager.logs,
            # Security module stores
            'audit_logs': data_manager.audit_logs,
            'login_attempts': data_manager.login_attempts,
            'transaction_anomalies': data_manager.transaction_anomalies,
            'security_incidents': data_manager.security_incidents,
            'account_lockouts': data_manager.account_lockouts,
            'trusted_devices': data_manager.trusted_devices,
        }

    def _model_to_dict(self, obj):
        """Convert SQLAlchemy model instance to dictionary."""
        # If already a dict, return it
        if isinstance(obj, dict):
            return obj

        # If it's a memory model with to_dict method
        if hasattr(obj, 'to_dict'):
            return obj.to_dict()

        # Handle Log model specifically
        if hasattr(obj, '__tablename__') and obj.__tablename__ == 'logs':
            result = {
                'id': getattr(obj, 'id', None),
                'timestamp': getattr(obj, 'timestamp', datetime.now(UTC)),
                'session_id': getattr(obj, 'session_id', None),
                'action_type': getattr(obj, 'action_type', None),
                'payload': getattr(obj, 'payload', {})
            }
            if hasattr(result['action_type'], 'value'):
                result['action_type'] = result['action_type'].value
            return result

        # Otherwise extract attributes
        result = {}

        # Get all attributes
        for attr in dir(obj):
            if not attr.startswith('_') and not callable(getattr(obj, attr)):
                value = getattr(obj, attr)
                # Skip relationship attributes
                if not hasattr(value, '__iter__') or isinstance(value, str):
                    result[attr] = value
                elif hasattr(value, 'value'):
                    result[attr] = value.value
                elif isinstance(value, (dict, datetime)):
                    result[attr] = value

        return result

    def _add_to_store(self, obj_dict, original_obj=None):
        """Add object to appropriate data store."""
        # Determine store based on original object's type if available
        if original_obj and hasattr(original_obj, '__tablename__'):
            # Use the tablename attribute to find the right store
            tablename = original_obj.__tablename__
            store_map = {
                'users': data_manager.users,
                'accounts': data_manager.accounts,
                'transactions': data_manager.transactions,
                'categories': data_manager.categories,
                'budgets': data_manager.budgets,
                'goals': data_manager.goals,
                'goal_contributions': data_manager.goal_contributions,
                'notifications': data_manager.notifications,
                'contacts': data_manager.contacts,
                'conversations': data_manager.conversations,
                'conversation_participants': data_manager.conversation_participants,
                'messages': data_manager.messages,
                'message_read_receipts': data_manager.message_read_receipts,
                'recurring_rules': data_manager.recurring_rules,
                'merchants': data_manager.merchants,
                'notes': data_manager.notes,
                'cards': data_manager.cards,
                'virtualcards': data_manager.cards,  # VirtualCard uses same store as Card
                'subscriptions': data_manager.subscriptions,
                'security_events': data_manager.security_events,
                'payment_methods': data_manager.payment_methods,
                'bills': data_manager.bills,
                'credit_scores': data_manager.credit_scores,
                'social_connections': data_manager.social_connections,
                'p2p_transactions': data_manager.p2p_transactions,
                'investment_accounts': data_manager.investment_accounts,
                'holdings': data_manager.holdings,
                'alerts': data_manager.alerts,
                'analytics_events': data_manager.analytics_events,
                'bank_links': data_manager.bank_links,
                'plaid_accounts': data_manager.plaid_accounts,
                'transactions_sync_status': data_manager.transactions_sync_status,
                'linked_accounts': data_manager.linked_accounts,
                'credit_simulations': data_manager.credit_simulations,
                'two_factor_auth': data_manager.two_factor_auth,
                'user_devices': data_manager.user_devices,
                'security_audit_logs': data_manager.security_audit_logs,
                'spending_limits': data_manager.spending_limits,
                'card_spending_limits': data_manager.spending_limits,
                'round_up_configs': data_manager.round_up_configs,
                'round_up_transactions': data_manager.round_up_transactions,
                'savings_rules': data_manager.savings_rules,
                'savings_challenges': data_manager.savings_challenges,
                'challenge_participants': data_manager.challenge_participants,
                'invoices': data_manager.invoices,
                'expense_reports': data_manager.expense_reports,
                'receipts': data_manager.receipts,
                'cancellation_reminders': data_manager.cancellation_reminders,
                'direct_messages': data_manager.direct_messages,
                'message_attachments': data_manager.message_attachments,
                'message_folders': data_manager.message_folders,
                'blocked_users': data_manager.blocked_users,
                'message_settings': data_manager.message_settings,
                'logs': data_manager.logs,
                # Security module tables
                'audit_logs': data_manager.audit_logs,
                'login_attempts': data_manager.login_attempts,
                'transaction_anomalies': data_manager.transaction_anomalies,
                'security_incidents': data_manager.security_incidents,
                'account_lockouts': data_manager.account_lockouts,
                'trusted_devices': data_manager.trusted_devices,
                # Crypto module tables
                'crypto_wallets': data_manager.crypto_wallets,
                'crypto_assets': data_manager.crypto_assets,
                'crypto_transactions': data_manager.crypto_transactions,
                'nft_assets': data_manager.nft_assets,
                'defi_positions': data_manager.defi_positions,
                'asset_bridges': data_manager.asset_bridges,
                # Credit module tables
                'collateral_positions': data_manager.collateral_positions,
                'credit_alerts': data_manager.credit_alerts,
                'credit_builder_accounts': data_manager.credit_builder_accounts,
                'credit_disputes': data_manager.credit_disputes,
            }
            if tablename in store_map:
                store_map[tablename].append(obj_dict)
                return

        # Fall back to attribute-based detection on the dictionary
        if 'username' in obj_dict and 'email' in obj_dict:
            data_manager.users.append(obj_dict)
        elif 'account_type' in obj_dict and 'balance' in obj_dict:
            data_manager.accounts.append(obj_dict)
        elif 'amount' in obj_dict and 'transaction_type' in obj_dict:
            data_manager.transactions.append(obj_dict)
        elif 'category_id' in obj_dict and 'amount' in obj_dict and 'period' in obj_dict:
            data_manager.budgets.append(obj_dict)
        elif 'target_amount' in obj_dict and 'current_amount' in obj_dict:
            data_manager.goals.append(obj_dict)
        elif 'type' in obj_dict and 'title' in obj_dict and 'message' in obj_dict:
            data_manager.notifications.append(obj_dict)
        elif 'session_id' in obj_dict and 'action_type' in obj_dict and 'payload' in obj_dict:
            data_manager.logs.append(obj_dict)
        # Add more mappings as needed

    def _remove_from_store(self, obj):
        """Remove object from appropriate data store."""
        obj_id = obj.get('id') if isinstance(obj, dict) else getattr(obj, 'id', None)
        if not obj_id:
            return

        # Determine the correct store for this model type
        model_class = obj.__class__ if not isinstance(obj, dict) else None

        if model_class:
            # Get the specific store for this model
            store = self._get_store_for_model(model_class)
            if store:
                # Remove only from the appropriate store
                store[:] = [item for item in store if item.get('id') != obj_id]
        else:
            # For dict objects, we can't determine the model type reliably
            # In this case, try to remove from all stores but this is less ideal
            all_stores = [
                data_manager.users, data_manager.accounts, data_manager.transactions,
                data_manager.categories, data_manager.budgets, data_manager.goals,
                data_manager.goal_contributions, data_manager.notifications,
                data_manager.contacts, data_manager.conversations,
                data_manager.conversation_participants, data_manager.messages,
                data_manager.message_read_receipts, data_manager.recurring_rules,
                data_manager.merchants, data_manager.notes, data_manager.cards,
                data_manager.subscriptions, data_manager.security_events,
                data_manager.payment_methods, data_manager.bills,
                data_manager.credit_scores, data_manager.social_connections,
                data_manager.p2p_transactions, data_manager.investment_accounts,
                data_manager.holdings, data_manager.alerts, data_manager.analytics_events,
                data_manager.bank_links, data_manager.plaid_accounts,
                data_manager.transactions_sync_status, data_manager.linked_accounts,
                data_manager.credit_simulations, data_manager.two_factor_auth,
                data_manager.user_devices, data_manager.security_audit_logs,
                data_manager.spending_limits, data_manager.round_up_configs,
                data_manager.round_up_transactions, data_manager.savings_rules,
                data_manager.savings_challenges, data_manager.challenge_participants,
                data_manager.invoices, data_manager.expense_reports, data_manager.receipts,
                data_manager.cancellation_reminders, data_manager.direct_messages,
                data_manager.message_attachments, data_manager.message_folders,
                data_manager.blocked_users, data_manager.message_settings,
                data_manager.logs,
                # Security module stores
                data_manager.audit_logs, data_manager.login_attempts,
                data_manager.transaction_anomalies, data_manager.security_incidents,
                data_manager.account_lockouts, data_manager.trusted_devices,
            ]

            for store in all_stores:
                if store:  # Check if store exists
                    store[:] = [item for item in store if item.get('id') != obj_id]


class MemoryDatabase:
    """Mock database object that provides SQLAlchemy-compatible interface."""

    def __init__(self):
        """Initialize with a default session for direct operations."""
        self._default_session = None

    def _get_session(self):
        """Get or create the default session."""
        if self._default_session is None:
            self._default_session = MemorySession()
        return self._default_session

    def add(self, obj):
        """Add object to session (delegates to default session)."""
        return self._get_session().add(obj)

    def query(self, model_or_aggregation):
        """Create query (delegates to default session)."""
        return self._get_session().query(model_or_aggregation)

    def commit(self):
        """Commit pending changes (delegates to default session)."""
        return self._get_session().commit()

    def rollback(self):
        """Rollback pending changes (delegates to default session)."""
        return self._get_session().rollback()

    def flush(self):
        """Flush pending changes (delegates to default session)."""
        return self._get_session().flush()

    def delete(self, obj):
        """Delete object (delegates to default session)."""
        return self._get_session().delete(obj)

    def refresh(self, obj):
        """Refresh object (delegates to default session)."""
        return self._get_session().refresh(obj)

    @contextmanager
    def get_db(self):
        """Get database session."""
        session = MemorySession()
        try:
            yield session
        finally:
            session.close()

    def get_db_dependency(self):
        """Get database session for FastAPI dependency injection."""
        session = MemorySession()
        try:
            yield session
        finally:
            session.close()

    def create_database(self):
        """Initialize database (no-op for memory system)."""

    def populate_database(self, seed=None):
        """Populate database with initial data."""
        data_manager.reset(seed=int(seed) if seed else 42)


# Global instance to replace SQLAlchemy db
db = MemoryDatabase()


# SQLAlchemy-style OR function
def or_(*clauses):
    """Create an OR clause for queries."""
    return ORClause(*clauses)


# SQLAlchemy-style AND function
class ANDClause:
    """Represents an AND condition in SQLAlchemy style."""
    def __init__(self, *clauses):
        self.clauses = clauses
        self.__class__.__name__ = 'and_'


def and_(*clauses):
    """Create an AND clause for queries."""
    return ANDClause(*clauses)


# SQLAlchemy-style DESC function
class DESCOrder:
    """Represents descending order in SQLAlchemy style."""
    def __init__(self, field):
        self.field = field
        self.__class__.__name__ = 'desc'


def desc(field):
    """Create a descending order clause."""
    return DESCOrder(field)


# SQLAlchemy-style joinedload (no-op for memory system)
def joinedload(*args):
    """Eager loading hint - ignored in memory system."""
    return


# SQLAlchemy-style func module
class FuncModule:
    """Mock SQLAlchemy func module."""

    @staticmethod
    def sum(field):
        """Sum aggregation function."""
        return ('sum', field)

    @staticmethod
    def count(field=None):
        """Count aggregation function."""
        return ('count', field)

    @staticmethod
    def avg(field):
        """Average aggregation function."""
        return ('avg', field)

    @staticmethod
    def max(field):
        """Max aggregation function."""
        return ('max', field)

    @staticmethod
    def min(field):
        """Min aggregation function."""
        return ('min', field)


func = FuncModule()
