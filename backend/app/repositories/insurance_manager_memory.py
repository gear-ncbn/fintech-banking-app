"""
Insurance management repository for handling all insurance-related operations with in-memory storage.
"""
import random
import string
from datetime import UTC, date, datetime, timedelta
from typing import Any

from app.models.entities.insurance_models import (
    ClaimStatus,
    InsuranceClaimCreate,
    InsuranceClaimResponse,
    InsurancePolicyCreate,
    InsurancePolicyResponse,
    InsuranceProviderResponse,
    InsuranceQuoteRequest,
    InsuranceQuoteResponse,
    InsuranceSummaryResponse,
    InsuranceType,
    PolicyStatus,
    PremiumFrequency,
)


class InsuranceManager:
    """Manages insurance-related data and operations."""

    def __init__(self, data_manager):
        self.data_manager = data_manager

    def _generate_policy_number(self) -> str:
        """Generate unique policy number."""
        prefix = "POL"
        random_part = ''.join(random.choices(string.digits, k=8))
        return f"{prefix}-{random_part}"

    def _generate_claim_number(self) -> str:
        """Generate unique claim number."""
        prefix = "CLM"
        timestamp = datetime.now().strftime("%Y%m%d")
        random_part = ''.join(random.choices(string.digits, k=4))
        return f"{prefix}-{timestamp}-{random_part}"

    def create_policy(self, user_id: int, policy_data: InsurancePolicyCreate) -> InsurancePolicyResponse:
        """Create a new insurance policy."""
        # Generate new ID
        new_id = len(self.data_manager.insurance_policies) + 1

        # Calculate next premium date
        today = date.today()
        if policy_data.premium_frequency == PremiumFrequency.MONTHLY:
            next_premium = today + timedelta(days=30)
        elif policy_data.premium_frequency == PremiumFrequency.QUARTERLY:
            next_premium = today + timedelta(days=90)
        elif policy_data.premium_frequency == PremiumFrequency.SEMI_ANNUAL:
            next_premium = today + timedelta(days=180)
        else:  # Annual
            next_premium = today + timedelta(days=365)

        # Create policy record
        policy = {
            'id': new_id,
            'user_id': user_id,
            'insurance_type': policy_data.insurance_type.value,
            'provider_name': policy_data.provider_name,
            'policy_number': policy_data.policy_number or self._generate_policy_number(),
            'status': PolicyStatus.ACTIVE.value,
            'coverage_amount': float(policy_data.coverage_amount),
            'deductible': float(policy_data.deductible),
            'out_of_pocket_max': None,  # Can be set for health insurance
            'premium_amount': float(policy_data.premium_amount),
            'premium_frequency': policy_data.premium_frequency.value,
            'next_premium_date': next_premium,
            'start_date': policy_data.start_date,
            'end_date': policy_data.end_date,
            'renewal_date': policy_data.end_date,  # Default to end date
            'beneficiaries': policy_data.beneficiaries or [],
            'coverage_details': policy_data.coverage_details or {},
            'documents': [],
            'created_at': datetime.now(UTC),
            'updated_at': datetime.now(UTC)
        }

        self.data_manager.insurance_policies.append(policy)

        return self._policy_to_response(policy)

    def get_user_policies(self, user_id: int,
                         insurance_type: InsuranceType | None = None,
                         status: PolicyStatus | None = None) -> list[InsurancePolicyResponse]:
        """Get all insurance policies for a user."""
        policies = [p for p in self.data_manager.insurance_policies
                   if p['user_id'] == user_id]

        # Apply filters
        if insurance_type:
            policies = [p for p in policies if p['insurance_type'] == insurance_type.value]
        if status:
            policies = [p for p in policies if p['status'] == status.value]

        return [self._policy_to_response(p) for p in policies]

    def get_policy(self, policy_id: int, user_id: int) -> InsurancePolicyResponse | None:
        """Get specific insurance policy."""
        policy = next((p for p in self.data_manager.insurance_policies
                      if p['id'] == policy_id and p['user_id'] == user_id), None)

        return self._policy_to_response(policy) if policy else None

    def update_policy(self, policy_id: int, user_id: int,
                     update_data: dict[str, Any]) -> InsurancePolicyResponse | None:
        """Update an existing policy."""
        policy = next((p for p in self.data_manager.insurance_policies
                      if p['id'] == policy_id and p['user_id'] == user_id), None)

        if not policy:
            return None

        # Update allowed fields
        allowed_fields = ['premium_amount', 'coverage_amount', 'deductible',
                         'beneficiaries', 'coverage_details']

        for field, value in update_data.items():
            if field in allowed_fields:
                policy[field] = value

        policy['updated_at'] = datetime.now(UTC)

        return self._policy_to_response(policy)

    def cancel_policy(self, policy_id: int, user_id: int,
                     cancellation_date: date, reason: str) -> bool:
        """Cancel an insurance policy."""
        policy = next((p for p in self.data_manager.insurance_policies
                      if p['id'] == policy_id and p['user_id'] == user_id), None)

        if not policy:
            return False

        policy['status'] = PolicyStatus.CANCELLED.value
        policy['cancellation_date'] = cancellation_date
        policy['cancellation_reason'] = reason
        policy['updated_at'] = datetime.now(UTC)

        return True

    def file_claim(self, user_id: int, claim_data: InsuranceClaimCreate) -> InsuranceClaimResponse:
        """File a new insurance claim."""
        # Verify policy ownership
        policy = next((p for p in self.data_manager.insurance_policies
                      if p['id'] == claim_data.policy_id and p['user_id'] == user_id), None)

        if not policy:
            raise ValueError("Policy not found or unauthorized")

        # Generate new ID and claim number
        new_id = len(self.data_manager.insurance_claims) + 1
        claim_number = self._generate_claim_number()

        # Create claim record
        claim = {
            'id': new_id,
            'policy_id': claim_data.policy_id,
            'claim_number': claim_number,
            'claim_type': claim_data.claim_type,
            'status': ClaimStatus.SUBMITTED.value,
            'incident_date': claim_data.incident_date,
            'filed_date': datetime.now(UTC),
            'amount_claimed': float(claim_data.amount_claimed),
            'amount_approved': None,
            'amount_paid': None,
            'deductible_applied': None,
            'description': claim_data.description,
            'adjuster_name': None,
            'adjuster_notes': None,
            'denial_reason': None,
            'documents': claim_data.supporting_documents or [],
            'status_history': [{
                'status': ClaimStatus.SUBMITTED.value,
                'date': datetime.now(UTC),
                'notes': 'Claim submitted'
            }],
            'payment_date': None,
            'appeal_deadline': None,
            'created_at': datetime.now(UTC),
            'updated_at': datetime.now(UTC)
        }

        self.data_manager.insurance_claims.append(claim)

        return self._claim_to_response(claim)

    def get_user_claims(self, user_id: int,
                       policy_id: int | None = None,
                       status: ClaimStatus | None = None) -> list[InsuranceClaimResponse]:
        """Get all claims for a user."""
        # Get user's policies first
        user_policies = {p['id'] for p in self.data_manager.insurance_policies
                        if p['user_id'] == user_id}

        # Get claims for user's policies
        claims = [c for c in self.data_manager.insurance_claims
                 if c['policy_id'] in user_policies]

        # Apply filters
        if policy_id:
            claims = [c for c in claims if c['policy_id'] == policy_id]
        if status:
            claims = [c for c in claims if c['status'] == status.value]

        return [self._claim_to_response(c) for c in claims]

    def get_claim(self, claim_id: int, user_id: int) -> InsuranceClaimResponse | None:
        """Get specific claim."""
        # Get user's policies first
        user_policies = {p['id'] for p in self.data_manager.insurance_policies
                        if p['user_id'] == user_id}

        claim = next((c for c in self.data_manager.insurance_claims
                     if c['id'] == claim_id and c['policy_id'] in user_policies), None)

        return self._claim_to_response(claim) if claim else None

    def update_claim_status(self, claim_id: int, user_id: int,
                           status: ClaimStatus, notes: str | None = None,
                           approved_amount: float | None = None) -> InsuranceClaimResponse | None:
        """Update claim status."""
        # Get user's policies first
        user_policies = {p['id'] for p in self.data_manager.insurance_policies
                        if p['user_id'] == user_id}

        claim = next((c for c in self.data_manager.insurance_claims
                     if c['id'] == claim_id and c['policy_id'] in user_policies), None)

        if not claim:
            return None

        # Update status
        claim['status'] = status.value

        # Add to status history
        history_entry = {
            'status': status.value,
            'date': datetime.now(UTC),
            'notes': notes or f'Status changed to {status.value}'
        }
        claim['status_history'].append(history_entry)

        # Update specific fields based on status
        if status == ClaimStatus.IN_REVIEW:
            claim['adjuster_name'] = f'Adjuster-{random.randint(100, 999)}'
        elif status == ClaimStatus.APPROVED:
            claim['amount_approved'] = approved_amount or claim['amount_claimed']
            # Apply deductible
            policy = next((p for p in self.data_manager.insurance_policies
                          if p['id'] == claim['policy_id']), None)
            if policy:
                claim['deductible_applied'] = min(policy['deductible'], claim['amount_approved'])
                claim['amount_approved'] -= claim['deductible_applied']
        elif status == ClaimStatus.DENIED:
            claim['denial_reason'] = notes or 'Claim does not meet policy requirements'
            claim['appeal_deadline'] = date.today() + timedelta(days=30)
        elif status == ClaimStatus.PAID:
            claim['payment_date'] = datetime.now(UTC)
            claim['amount_paid'] = claim['amount_approved']

        claim['updated_at'] = datetime.now(UTC)

        return self._claim_to_response(claim)

    def get_providers(self, insurance_type: InsuranceType | None = None,
                      min_rating: float | None = None) -> list[InsuranceProviderResponse]:
        """Get list of insurance providers."""
        providers = []

        for provider in self.data_manager.insurance_providers:
            if insurance_type and insurance_type.value not in provider['types']:
                continue
            if min_rating is not None and provider['rating'] < min_rating:
                continue

            providers.append(InsuranceProviderResponse(
                id=provider['id'],
                name=provider['name'],
                insurance_types=[InsuranceType(t) for t in provider['types'] if t in InsuranceType._value2member_map_],
                rating=provider['rating'],
                customer_service_phone='1-800-' + provider['name'][:3].upper() + '-123',
                customer_service_email=f'support@{provider["name"].lower().replace(" ", "")}.com',
                website=f'https://{provider["name"].lower().replace(" ", "")}.com',
                claim_phone='1-800-CLAIM-' + str(provider['id']),
                network_size=random.randint(10000, 100000) if 'health' in provider['types'] else None,
                financial_strength_rating=random.choice(['A++', 'A+', 'A', 'A-']),
                complaint_ratio=round(random.uniform(0.01, 0.05), 3)
            ))

        return providers

    def get_quotes(self, user_id: int, quote_request: InsuranceQuoteRequest) -> list[InsuranceQuoteResponse]:
        """Get insurance quotes from multiple providers."""
        providers = self.get_providers(quote_request.insurance_type)
        quotes = []

        for provider in providers:
            # Base premium calculation (mock)
            base_premium = quote_request.coverage_amount * 0.002  # 0.2% of coverage

            # Adjust based on insurance type
            type_multipliers = {
                InsuranceType.HEALTH: 2.5,
                InsuranceType.AUTO: 1.5,
                InsuranceType.HOME: 0.8,
                InsuranceType.LIFE: 0.5,
                InsuranceType.DISABILITY: 1.2
            }

            multiplier = type_multipliers.get(quote_request.insurance_type, 1.0)
            base_premium *= multiplier

            # Adjust based on deductible
            deductible_factor = 1 - (quote_request.deductible / quote_request.coverage_amount * 0.5)
            base_premium *= deductible_factor

            # Random variation between providers
            provider_factor = random.uniform(0.8, 1.2)
            monthly_premium = base_premium * provider_factor / 12

            # Apply discounts
            discounts = []
            discount_factor = 1.0

            if quote_request.insurance_type == InsuranceType.AUTO:
                if quote_request.personal_info.get('safe_driver', True):
                    discount_factor *= 0.9
                    discounts.append('Safe driver discount (10%)')
                if quote_request.personal_info.get('multi_policy', False):
                    discount_factor *= 0.95
                    discounts.append('Multi-policy discount (5%)')

            monthly_premium *= discount_factor

            quote_id = f'QUOTE-{provider.name[:3].upper()}-{random.randint(100000, 999999)}'

            quotes.append(InsuranceQuoteResponse(
                provider_name=provider.name,
                monthly_premium=round(monthly_premium, 2),
                annual_premium=round(monthly_premium * 12, 2),
                coverage_amount=quote_request.coverage_amount,
                deductible=quote_request.deductible,
                coverage_details=quote_request.coverage_options or {},
                discounts_applied=discounts,
                quote_id=quote_id,
                valid_until=datetime.now(UTC) + timedelta(days=30)
            ))

        return quotes

    def get_insurance_summary(self, user_id: int) -> InsuranceSummaryResponse:
        """Get comprehensive insurance summary for a user."""
        policies = self.get_user_policies(user_id)
        active_policies = [p for p in policies if p.status == PolicyStatus.ACTIVE]

        # Calculate totals
        total_monthly = 0
        total_annual = 0

        for policy in active_policies:
            if policy.premium_frequency == PremiumFrequency.MONTHLY:
                total_monthly += policy.premium_amount
                total_annual += policy.premium_amount * 12
            elif policy.premium_frequency == PremiumFrequency.QUARTERLY:
                total_monthly += policy.premium_amount / 3
                total_annual += policy.premium_amount * 4
            elif policy.premium_frequency == PremiumFrequency.SEMI_ANNUAL:
                total_monthly += policy.premium_amount / 6
                total_annual += policy.premium_amount * 2
            else:  # Annual
                total_monthly += policy.premium_amount / 12
                total_annual += policy.premium_amount

        # Group by type
        policies_by_type = {}
        for policy in active_policies:
            policy_type = policy.insurance_type.value
            policies_by_type[policy_type] = policies_by_type.get(policy_type, 0) + 1

        # Get upcoming renewals (within 60 days)
        upcoming_renewals = []
        today = date.today()

        for policy in active_policies:
            days_until = (policy.end_date - today).days
            if 0 <= days_until <= 60:
                upcoming_renewals.append({
                    'policy_id': policy.id,
                    'policy_number': policy.policy_number,
                    'insurance_type': policy.insurance_type.value,
                    'end_date': policy.end_date.isoformat(),
                    'days_until_renewal': days_until
                })

        # Get recent claims
        claims = self.get_user_claims(user_id)
        recent_claims = sorted(claims, key=lambda c: c.filed_date, reverse=True)[:5]

        recent_claims_summary = []
        for claim in recent_claims:
            recent_claims_summary.append({
                'claim_id': claim.id,
                'claim_number': claim.claim_number,
                'status': claim.status.value,
                'amount_claimed': claim.amount_claimed,
                'filed_date': claim.filed_date.isoformat()
            })

        # Analyze coverage gaps
        coverage_gaps = self._analyze_coverage_gaps(active_policies)

        total_coverage = sum(p.coverage_amount for p in active_policies)

        return InsuranceSummaryResponse(
            total_policies=len(policies),
            active_policies=len(active_policies),
            total_monthly_premiums=round(total_monthly, 2),
            total_annual_premiums=round(total_annual, 2),
            total_coverage_amount=total_coverage,
            policies_by_type=policies_by_type,
            upcoming_renewals=upcoming_renewals,
            recent_claims=recent_claims_summary,
            coverage_gaps=coverage_gaps
        )

    def _analyze_coverage_gaps(self, policies: list[InsurancePolicyResponse]) -> list[str]:
        """Analyze insurance coverage and identify gaps."""
        gaps = []
        covered_types = {p.insurance_type for p in policies}

        # Essential insurance types
        essential_types = {
            InsuranceType.HEALTH: 'Health insurance',
            InsuranceType.AUTO: 'Auto insurance (if you own a vehicle)',
            InsuranceType.HOME: 'Homeowners/Renters insurance',
            InsuranceType.LIFE: 'Life insurance (if you have dependents)',
            InsuranceType.DISABILITY: 'Disability insurance'
        }

        for ins_type, description in essential_types.items():
            if ins_type not in covered_types:
                gaps.append(f'Missing {description}')

        # Check for adequate coverage amounts
        for policy in policies:
            if policy.insurance_type == InsuranceType.LIFE and policy.coverage_amount < 500000:
                gaps.append('Life insurance coverage may be insufficient')
            elif policy.insurance_type == InsuranceType.DISABILITY:
                # Disability should cover 60-80% of income
                gaps.append('Review disability coverage amount')

        return gaps

    def _resolve_provider_name(self, provider_id: int | None) -> str:
        """Look up provider name from provider_id."""
        if provider_id is None:
            return "Unknown Provider"
        provider = next(
            (p for p in self.data_manager.insurance_providers if p['id'] == provider_id),
            None,
        )
        return provider['name'] if provider else "Unknown Provider"

    def _policy_to_response(self, policy: dict[str, Any]) -> InsurancePolicyResponse:
        """Convert policy dict to response model."""
        # Map policy_type → insurance_type, handling 'renters' → 'home'.
        raw_type = policy.get('insurance_type') or policy.get('policy_type', 'health')
        type_map = {'renters': 'home'}
        insurance_type = InsuranceType(type_map.get(raw_type, raw_type))

        provider_name = policy.get('provider_name') or self._resolve_provider_name(policy.get('provider_id'))

        raw_start = policy.get('start_date') or datetime.now(UTC)
        raw_end = policy.get('end_date') or (datetime.now(UTC) + timedelta(days=365))
        start_date = raw_start.date() if isinstance(raw_start, datetime) else raw_start
        end_date = raw_end.date() if isinstance(raw_end, datetime) else raw_end

        return InsurancePolicyResponse(
            id=policy['id'],
            user_id=policy['user_id'],
            insurance_type=insurance_type,
            provider_name=provider_name,
            policy_number=policy.get('policy_number', ''),
            status=PolicyStatus(policy.get('status', 'active')),
            coverage_amount=policy.get('coverage_amount', 0),
            deductible=policy.get('deductible', 0),
            out_of_pocket_max=policy.get('out_of_pocket_max'),
            premium_amount=policy.get('premium_amount', 0),
            premium_frequency=PremiumFrequency(policy.get('premium_frequency', 'monthly')),
            next_premium_date=start_date + timedelta(days=30) if not policy.get('next_premium_date') else (
                policy['next_premium_date'].date() if isinstance(policy['next_premium_date'], datetime) else policy['next_premium_date']
            ),
            start_date=start_date,
            end_date=end_date,
            renewal_date=(
                policy['renewal_date'].date() if isinstance(policy.get('renewal_date'), datetime) else policy.get('renewal_date')
            ),
            beneficiaries=policy.get('beneficiaries', []),
            coverage_details=policy.get('coverage_details', {}),
            documents=policy.get('documents', []),
            created_at=policy.get('created_at') or datetime.now(UTC),
            updated_at=policy.get('updated_at') or datetime.now(UTC)
        )

    def _claim_to_response(self, claim: dict[str, Any]) -> InsuranceClaimResponse:
        """Convert claim dict to response model."""
        status_map = {'pending': 'submitted', 'rejected': 'denied', 'processing': 'in_review'}
        raw_status = claim.get('status', 'submitted')
        claim_status = ClaimStatus(status_map.get(raw_status, raw_status))

        filed = claim.get('filed_date') or datetime.now(UTC)
        filed_dt = filed if isinstance(filed, datetime) else datetime.fromisoformat(str(filed))
        incident = claim.get('incident_date') or (filed_dt - timedelta(days=1))
        incident_date = incident.date() if isinstance(incident, datetime) else incident

        return InsuranceClaimResponse(
            id=claim['id'],
            policy_id=claim['policy_id'],
            claim_number=claim.get('claim_number', ''),
            claim_type=claim.get('claim_type', 'other'),
            status=claim_status,
            incident_date=incident_date,
            filed_date=filed_dt,
            amount_claimed=claim.get('amount_claimed', 0),
            amount_approved=claim.get('amount_approved'),
            amount_paid=claim.get('amount_paid'),
            deductible_applied=claim.get('deductible_applied'),
            description=claim.get('description', ''),
            adjuster_name=claim.get('adjuster_name'),
            adjuster_notes=claim.get('adjuster_notes'),
            denial_reason=claim.get('denial_reason'),
            documents=claim.get('documents', []),
            status_history=claim.get('status_history', []),
            payment_date=claim.get('payment_date'),
            appeal_deadline=claim.get('appeal_deadline'),
            created_at=claim.get('created_at') or filed_dt,
            updated_at=claim.get('updated_at') or filed_dt
        )
