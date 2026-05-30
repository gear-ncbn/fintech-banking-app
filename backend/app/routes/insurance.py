from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status

from app.repositories.insurance_manager_memory import InsuranceManager

from ..models.entities.insurance_models import (
    ClaimStatus,
    ClaimTimelineEvent,
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
)

from ..repositories.data_manager import data_manager
from ..storage.memory_adapter import db
from ..utils.auth import get_current_user

router = APIRouter(tags=["insurance"])

@router.get("/summary", response_model=InsuranceSummaryResponse)
async def get_insurance_summary(
    current_user: dict = Depends(get_current_user),
    db_session = Depends(db.get_db_dependency)
):
    """Get comprehensive insurance summary for the current user."""
    manager = InsuranceManager(data_manager)
    return manager.get_insurance_summary(current_user["user_id"])

@router.get("/policies", response_model=list[InsurancePolicyResponse])
async def get_insurance_policies(
    insurance_type: InsuranceType | None = None,
    status: PolicyStatus | None = None,
    current_user: dict = Depends(get_current_user),
    db_session = Depends(db.get_db_dependency)
):
    """Get all insurance policies for the current user."""
    manager = InsuranceManager(data_manager)
    return manager.get_user_policies(
        user_id=current_user["user_id"],
        insurance_type=insurance_type,
        status=status
    )

@router.get("/policies/{policy_id}", response_model=InsurancePolicyResponse)
async def get_insurance_policy(
    policy_id: int,
    current_user: dict = Depends(get_current_user),
    db_session = Depends(db.get_db_dependency)
):
    """Get specific insurance policy details."""
    manager = InsuranceManager(data_manager)
    policy = manager.get_policy(policy_id, current_user["user_id"])
    if not policy:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Policy not found"
        )
    return policy

@router.post("/policies", response_model=InsurancePolicyResponse)
async def create_insurance_policy(
    policy: InsurancePolicyCreate,
    current_user: dict = Depends(get_current_user),
    db_session = Depends(db.get_db_dependency)
):
    """Create a new insurance policy."""
    manager = InsuranceManager(data_manager)
    return manager.create_policy(current_user["user_id"], policy)

@router.put("/policies/{policy_id}", response_model=InsurancePolicyResponse)
async def update_insurance_policy(
    policy_id: int,
    policy: InsurancePolicyCreate,
    current_user: dict = Depends(get_current_user),
    db_session = Depends(db.get_db_dependency)
):
    """Update an existing insurance policy."""
    manager = InsuranceManager(data_manager)
    updated_policy = manager.update_policy(policy_id, current_user["user_id"], policy)
    if not updated_policy:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Policy not found"
        )
    return updated_policy

@router.delete("/policies/{policy_id}")
async def delete_insurance_policy(
    policy_id: int,
    current_user: dict = Depends(get_current_user),
    db_session = Depends(db.get_db_dependency)
):
    """Delete an insurance policy."""
    manager = InsuranceManager(data_manager)
    if not manager.delete_policy(policy_id, current_user["user_id"]):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Policy not found"
        )
    return {"message": "Policy deleted successfully"}

@router.get("/claims", response_model=list[InsuranceClaimResponse])
async def get_insurance_claims(
    policy_id: int | None = None,
    status: ClaimStatus | None = None,
    current_user: dict = Depends(get_current_user),
    db_session = Depends(db.get_db_dependency)
):
    """Get all insurance claims for the current user."""
    manager = InsuranceManager(data_manager)
    return manager.get_user_claims(
        user_id=current_user["user_id"],
        policy_id=policy_id,
        status=status
    )

@router.get("/claims/{claim_id}", response_model=InsuranceClaimResponse)
async def get_insurance_claim(
    claim_id: int,
    current_user: dict = Depends(get_current_user),
    db_session = Depends(db.get_db_dependency)
):
    """Get specific insurance claim details."""
    manager = InsuranceManager(data_manager)
    claim = manager.get_claim(claim_id, current_user["user_id"])
    if not claim:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Claim not found"
        )
    return claim

@router.post("/claims", response_model=InsuranceClaimResponse)
async def create_insurance_claim(
    claim: InsuranceClaimCreate,
    current_user: dict = Depends(get_current_user),
    db_session = Depends(db.get_db_dependency)
):
    """Submit a new insurance claim."""
    manager = InsuranceManager(data_manager)
    # Verify policy belongs to user
    policy = manager.get_policy(claim.policy_id, current_user["user_id"])
    if not policy:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Policy not found"
        )
    return manager.file_claim(current_user["user_id"], claim)

@router.put("/claims/{claim_id}/status")
async def update_claim_status(
    claim_id: int,
    status: ClaimStatus,
    notes: str | None = None,
    current_user: dict = Depends(get_current_user),
    db_session = Depends(db.get_db_dependency)
):
    """Update claim status."""
    manager = InsuranceManager(data_manager)
    claim = manager.update_claim_status(claim_id, current_user["user_id"], status, notes)
    if not claim:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Claim not found"
        )
    return claim

@router.get("/claims/{claim_id}/timeline", response_model=list[ClaimTimelineEvent])
async def get_claim_timeline(
    claim_id: int,
    current_user: dict = Depends(get_current_user),
    db_session = Depends(db.get_db_dependency)
):
    """Get timeline of events for a claim."""
    manager = InsuranceManager(data_manager)
    timeline = manager.get_claim_timeline(claim_id, current_user["user_id"])
    if timeline is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Claim not found"
        )
    return timeline

@router.post("/claims/{claim_id}/documents")
async def upload_claim_document(
    claim_id: int,
    document_url: str,
    document_type: str,
    current_user: dict = Depends(get_current_user),
    db_session = Depends(db.get_db_dependency)
):
    """Upload a document for a claim."""
    manager = InsuranceManager(data_manager)
    if not manager.add_claim_document(claim_id, current_user["user_id"], document_url, document_type):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Claim not found"
        )
    return {"message": "Document uploaded successfully"}

@router.get("/providers", response_model=list[InsuranceProviderResponse])
async def get_insurance_providers(
    insurance_type: InsuranceType | None = None,
    min_rating: float | None = None,
    db_session = Depends(db.get_db_dependency)
):
    """Get list of insurance providers."""
    manager = InsuranceManager(data_manager)
    return manager.get_providers(insurance_type, min_rating)

@router.post("/quotes", response_model=list[InsuranceQuoteResponse])
async def get_insurance_quotes(
    quote_request: InsuranceQuoteRequest,
    current_user: dict = Depends(get_current_user),
    db_session = Depends(db.get_db_dependency)
):
    """Get insurance quotes from multiple providers."""
    manager = InsuranceManager(data_manager)
    return manager.get_quotes(current_user["user_id"], quote_request)

@router.get("/coverage-gaps")
async def analyze_coverage_gaps(
    current_user: dict = Depends(get_current_user),
    db_session = Depends(db.get_db_dependency)
):
    """Analyze user's insurance coverage and identify gaps."""
    manager = InsuranceManager(data_manager)
    return manager.analyze_coverage_gaps(current_user["user_id"])

@router.get("/policies/{policy_id}/renewal-options")
async def get_renewal_options(
    policy_id: int,
    current_user: dict = Depends(get_current_user),
    db_session = Depends(db.get_db_dependency)
):
    """Get renewal options for an expiring policy."""
    manager = InsuranceManager(data_manager)
    policy = manager.get_policy(policy_id, current_user["user_id"])
    if not policy:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Policy not found"
        )
    return manager.get_renewal_options(policy_id)

@router.post("/policies/{policy_id}/cancel")
async def cancel_insurance_policy(
    policy_id: int,
    cancellation_date: date,
    reason: str,
    current_user: dict = Depends(get_current_user),
    db_session = Depends(db.get_db_dependency)
):
    """Cancel an insurance policy."""
    manager = InsuranceManager(data_manager)
    if not manager.cancel_policy(policy_id, current_user["user_id"], cancellation_date, reason):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Policy not found"
        )
    return {"message": "Policy cancellation scheduled"}

@router.get("/claims/analytics")
async def get_claims_analytics(
    start_date: date | None = None,
    end_date: date | None = None,
    current_user: dict = Depends(get_current_user),
    db_session = Depends(db.get_db_dependency)
):
    """Get analytics on user's insurance claims."""
    manager = InsuranceManager(data_manager)
    return manager.get_claims_analytics(current_user["user_id"], start_date, end_date)
