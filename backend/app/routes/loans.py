"""
Loan management API routes.
"""

from fastapi import APIRouter, Depends, HTTPException, Query

from app.models.entities.loan_models import (
    CryptoLoanCreate,
    LoanAmortizationRequest,
    LoanApplicationCreate,
    LoanApplicationResponse,
    LoanOfferResponse,
    LoanPaymentCreate,
    LoanPaymentResponse,
    LoanPaymentScheduleResponse,
    LoanRefinanceAnalysis,
    LoanResponse,
    LoanStatus,
    LoanSummaryStats,
    LoanType,
)
from app.repositories.data_manager import data_manager
from app.repositories.loan_manager import LoanManager
from app.utils.auth import get_current_user

router = APIRouter(tags=["loans"])

# Initialize loan manager
loan_manager = LoanManager(data_manager)

# Application endpoints
@router.post("/applications", response_model=LoanApplicationResponse)
async def create_loan_application(
    application: LoanApplicationCreate,
    current_user = Depends(get_current_user)
) -> LoanApplicationResponse:
    """Create a new loan application."""
    try:
        return loan_manager.create_application(current_user["user_id"], application)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e)) from e

@router.get("/applications", response_model=list[LoanApplicationResponse])
async def get_loan_applications(
    current_user = Depends(get_current_user)
) -> list[LoanApplicationResponse]:
    """Get all loan applications for the current user."""
    return loan_manager.get_user_applications(current_user["user_id"])

@router.get("/applications/{application_id}", response_model=LoanApplicationResponse)
async def get_loan_application(
    application_id: int,
    current_user = Depends(get_current_user)
) -> LoanApplicationResponse:
    """Get a specific loan application."""
    applications = loan_manager.get_user_applications(current_user["user_id"])
    app = next((a for a in applications if a.id == application_id), None)
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    return app

@router.post("/applications/{application_id}/process", response_model=list[LoanOfferResponse])
async def process_loan_application(
    application_id: int,
    current_user = Depends(get_current_user)
) -> list[LoanOfferResponse]:
    """Process a loan application and generate offers."""
    # Verify ownership
    applications = loan_manager.get_user_applications(current_user["user_id"])
    app = next((a for a in applications if a.id == application_id), None)
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    try:
        return loan_manager.process_application(application_id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e)) from e

# Offer endpoints
@router.get("/offers", response_model=list[LoanOfferResponse])
async def get_loan_offers(
    application_id: int | None = Query(None, description="Filter by application ID"),
    current_user = Depends(get_current_user)
) -> list[LoanOfferResponse]:
    """Get all loan offers for the current user."""
    if application_id:
        # Get offers for specific application
        applications = loan_manager.get_user_applications(current_user["user_id"])
        app = next((a for a in applications if a.id == application_id), None)
        if not app:
            raise HTTPException(status_code=404, detail="Application not found")

        # Get offers from data manager
        offers = data_manager.loan_offers
        return [LoanOfferResponse(**o) for o in offers if o['application_id'] == application_id]
    # Get all offers for user's applications
    applications = loan_manager.get_user_applications(current_user["user_id"])
    app_ids = {app.id for app in applications}
    offers = data_manager.loan_offers
    return [LoanOfferResponse(**o) for o in offers if o['application_id'] in app_ids]

@router.get("/offers/{offer_id}", response_model=LoanOfferResponse)
async def get_loan_offer(
    offer_id: int,
    current_user = Depends(get_current_user)
) -> LoanOfferResponse:
    """Get a specific loan offer."""
    # Verify user owns the application
    applications = loan_manager.get_user_applications(current_user["user_id"])
    app_ids = {app.id for app in applications}

    offers = data_manager.loan_offers
    offer = next((o for o in offers if o['id'] == offer_id and o['application_id'] in app_ids), None)
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")
    return LoanOfferResponse(**offer)

@router.post("/offers/{offer_id}/accept", response_model=LoanResponse)
async def accept_loan_offer(
    offer_id: int,
    current_user = Depends(get_current_user)
) -> LoanResponse:
    """Accept a loan offer and create an active loan."""
    try:
        return loan_manager.accept_offer(offer_id, current_user["user_id"])
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from None
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e

# Loan endpoints
@router.get("", response_model=list[LoanResponse])
async def get_loans(
    status: LoanStatus | None = Query(None, description="Filter by loan status"),
    current_user = Depends(get_current_user)
) -> list[LoanResponse]:
    """Get all loans for the current user."""
    return loan_manager.get_user_loans(current_user["user_id"], status)

@router.get("/summary")
async def get_loan_summary_alias(
    current_user = Depends(get_current_user)
):
    """Get summary statistics for all user loans (alias for frontend compatibility)."""
    try:
        user_loans = [
            loan for loan in loan_manager.data_manager.loans
            if loan.get('user_id') == current_user["user_id"] and loan.get('status') == 'active'
        ]

        if not user_loans:
            return {
                "totalBalance": 0,
                "totalMonthlyPayment": 0,
                "nextPaymentDue": None,
                "totalPaidThisYear": 0,
                "totalInterestPaid": 0,
                "loansByType": []
            }

        loans_by_type = {}
        total_balance = 0
        total_monthly_payment = 0
        total_interest_paid = 0
        next_payment_dates = []

        for loan in user_loans:
            loan_type = loan.get('loan_type', 'unknown')
            current_balance = loan.get('current_balance', 0)
            monthly_payment = loan.get('monthly_payment', 0)
            interest_paid = loan.get('total_interest_paid', 0)

            total_balance += current_balance
            total_monthly_payment += monthly_payment
            total_interest_paid += interest_paid

            if loan_type not in loans_by_type:
                loans_by_type[loan_type] = {"count": 0, "totalBalance": 0}
            loans_by_type[loan_type]["count"] += 1
            loans_by_type[loan_type]["totalBalance"] += current_balance

            if loan.get('next_payment_date'):
                next_payment_dates.append(loan['next_payment_date'])

        loans_by_type_list = [
            {
                "type": loan_type,
                "count": data["count"],
                "totalBalance": data["totalBalance"]
            }
            for loan_type, data in loans_by_type.items()
        ]

        next_payment_due = None
        if next_payment_dates:
            next_payment_due = min(next_payment_dates)
            if hasattr(next_payment_due, 'isoformat'):
                next_payment_due = next_payment_due.isoformat()
            else:
                next_payment_due = str(next_payment_due)

        return {
            "totalBalance": total_balance,
            "totalMonthlyPayment": total_monthly_payment,
            "nextPaymentDue": next_payment_due,
            "totalPaidThisYear": total_interest_paid,
            "totalInterestPaid": total_interest_paid,
            "loansByType": loans_by_type_list
        }

    except Exception:
        import traceback
        traceback.print_exc()
        return {
            "totalBalance": 0,
            "totalMonthlyPayment": 0,
            "nextPaymentDue": None,
            "totalPaidThisYear": 0,
            "totalInterestPaid": 0,
            "loansByType": []
        }

@router.get("/summary/stats", response_model=LoanSummaryStats)
async def get_loan_summary(
    current_user = Depends(get_current_user)
) -> LoanSummaryStats:
    """Get summary statistics for all user loans."""
    return loan_manager.get_loan_summary_stats(current_user["user_id"])

@router.get("/{loan_id}", response_model=LoanResponse)
async def get_loan(
    loan_id: int,
    current_user = Depends(get_current_user)
) -> LoanResponse:
    """Get detailed information about a specific loan."""
    loan = loan_manager.get_loan_details(loan_id, current_user["user_id"])
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")
    return loan

# Payment endpoints
@router.post("/payments", response_model=LoanPaymentResponse)
async def make_loan_payment(
    payment: LoanPaymentCreate,
    current_user = Depends(get_current_user)
) -> LoanPaymentResponse:
    """Make a payment on a loan."""
    try:
        return loan_manager.make_payment(payment, current_user["user_id"])
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from None
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e

@router.get("/{loan_id}/payments", response_model=list[LoanPaymentResponse])
async def get_loan_payments(
    loan_id: int,
    current_user = Depends(get_current_user)
) -> list[LoanPaymentResponse]:
    """Get payment history for a loan."""
    return loan_manager.get_payment_history(loan_id, current_user["user_id"])

@router.get("/{loan_id}/payment-schedule", response_model=list[LoanPaymentScheduleResponse])
async def get_payment_schedule(
    loan_id: int,
    current_user = Depends(get_current_user)
) -> list[LoanPaymentScheduleResponse]:
    """Get the payment schedule for a loan."""
    return loan_manager.get_payment_schedule(loan_id, current_user["user_id"])

@router.get("/{loan_id}/schedule", response_model=list[LoanPaymentScheduleResponse])
async def get_payment_schedule_alias(
    loan_id: int,
    current_user = Depends(get_current_user)
) -> list[LoanPaymentScheduleResponse]:
    """Get the payment schedule for a loan (alias for frontend compatibility)."""
    return loan_manager.get_payment_schedule(loan_id, current_user["user_id"])

# Tools and analytics endpoints
@router.post("/tools/amortization", response_model=list[LoanPaymentScheduleResponse])
async def calculate_amortization(
    request: LoanAmortizationRequest,
    current_user = Depends(get_current_user)
) -> list[LoanPaymentScheduleResponse]:
    """Calculate loan amortization schedule."""
    try:
        return loan_manager.calculate_amortization(request)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e)) from e

@router.get("/{loan_id}/refinance-analysis", response_model=LoanRefinanceAnalysis)
async def analyze_refinance_options(
    loan_id: int,
    current_user = Depends(get_current_user)
) -> LoanRefinanceAnalysis:
    """Analyze refinancing options for a loan."""
    try:
        return loan_manager.analyze_refinance(loan_id, current_user["user_id"])
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e)) from None
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e

# Crypto loan endpoints
@router.post("/crypto/apply", response_model=LoanApplicationResponse)
async def apply_for_crypto_loan(
    crypto_loan: CryptoLoanCreate,
    current_user = Depends(get_current_user)
) -> LoanApplicationResponse:
    """Apply for a crypto-backed loan."""
    # Convert crypto loan request to standard application
    application = LoanApplicationCreate(
        loan_type=LoanType.CRYPTO_BACKED,
        requested_amount=crypto_loan.requested_amount_usd,
        purpose=crypto_loan.purpose,
        term_months=max(1, crypto_loan.term_days // 30),  # Convert days to months
        employment_status="crypto_investor",
        annual_income=100000,  # Default for crypto loans
        monthly_expenses=0,
        collateral_description=f"{crypto_loan.collateral_amount} {crypto_loan.collateral_asset}",
        collateral_value=crypto_loan.requested_amount_usd / crypto_loan.loan_to_value
    )

    try:
        return loan_manager.create_application(current_user["user_id"], application)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e)) from e

# Mock data generation endpoint (for development)
@router.post("/generate-mock-data")
async def generate_mock_loan_data(
    num_loans: int = Query(5, description="Number of loans to generate"),
    current_user = Depends(get_current_user)
) -> dict:
    """Generate mock loan data for testing."""
    if not hasattr(data_manager, "loans"):
        data_manager.loans = []
    if not hasattr(data_manager, "loan_applications"):
        data_manager.loan_applications = []
    if not hasattr(data_manager, "loan_offers"):
        data_manager.loan_offers = []
    if not hasattr(data_manager, "loan_payments"):
        data_manager.loan_payments = []
    if not hasattr(data_manager, "loan_payment_schedules"):
        data_manager.loan_payment_schedules = []

    import random
    from datetime import timedelta

    generated_loans = []

    for _i in range(num_loans):
        # Create a mock application
        loan_types = list(LoanType)
        loan_type = random.choice(loan_types)

        app_data = LoanApplicationCreate(
            loan_type=loan_type,
            requested_amount=random.choice([5000, 10000, 25000, 50000, 100000, 250000]),
            purpose=random.choice([
                "Home improvement", "Debt consolidation", "Medical expenses",
                "Business expansion", "Education", "Vehicle purchase"
            ]),
            term_months=random.choice([12, 24, 36, 48, 60, 120, 180, 360]),
            employment_status=random.choice(["employed", "self_employed", "retired"]),
            annual_income=random.randint(30000, 200000),
            monthly_expenses=random.randint(1000, 5000),
            collateral_description="Property" if loan_type == LoanType.MORTGAGE else None,
            collateral_value=random.randint(100000, 500000) if loan_type == LoanType.MORTGAGE else None
        )

        # Create application
        app = loan_manager.create_application(current_user["user_id"], app_data)

        # Process application to get offers
        offers = loan_manager.process_application(app.id)

        if offers:
            # Accept the first offer
            loan = loan_manager.accept_offer(offers[0].id, current_user["user_id"])

            # Generate some payment history
            num_payments = random.randint(0, min(12, loan.term_months))
            for j in range(num_payments):
                payment_date = loan.originated_date + timedelta(days=30 * (j + 1))
                payment = LoanPaymentCreate(
                    loan_id=loan.id,
                    amount=loan.monthly_payment,
                    payment_type="regular",
                    payment_date=payment_date,
                    note=f"Payment {j+1}"
                )
                try:
                    loan_manager.make_payment(payment, current_user["user_id"])
                except (ValueError, KeyError, Exception):
                    pass  # Skip if loan is already paid off

            generated_loans.append(loan.id)

    return {
        "message": f"Generated {len(generated_loans)} loans with payment history",
        "loan_ids": generated_loans
    }
