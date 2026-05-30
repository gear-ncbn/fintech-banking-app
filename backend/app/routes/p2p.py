import base64
import io
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Any

import qrcode
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel, Field

from ..models import Transaction, TransactionStatus, TransactionType
from ..storage.memory_adapter import db
from ..utils.auth import get_current_user
from ..utils.validators import Validators

router = APIRouter()

# P2P Models
class P2PContact(BaseModel):
    id: str
    name: str
    username: str
    email: str
    phone: str
    avatar: str | None = None
    is_favorite: bool = False
    last_transaction: dict[str, Any] | None = None

class P2PTransferRequest(BaseModel):
    recipient_id: str
    amount: Decimal = Field(gt=0, decimal_places=2)
    description: str | None = None
    method: str = Field(default="instant", pattern="^(instant|standard)$")
    source_account_id: str

class P2PSplitPaymentRequest(BaseModel):
    total_amount: Decimal = Field(gt=0, decimal_places=2)
    participants: list[str]  # List of user IDs
    split_type: str = Field(default="equal", pattern="^(equal|percentage|amount)$")
    split_details: dict[str, Decimal] | None = None  # For percentage or amount splits
    description: str
    source_account_id: str

class P2PPaymentRequestModel(BaseModel):
    requester_id: str
    amount: Decimal = Field(gt=0, decimal_places=2)
    description: str
    due_date: datetime | None = None

class P2PQRCodeResponse(BaseModel):
    qr_code: str  # Base64 encoded QR code image
    payment_link: str
    expires_at: datetime

@router.get("/contacts", response_model=list[P2PContact])
async def get_p2p_contacts(
    request: Request,
    current_user: dict = Depends(get_current_user),
    db_session: Any = Depends(db.get_db_dependency)
):
    """Get user's P2P contacts"""
    # In a real implementation, this would fetch from a contacts table
    # For now, return mock data. Dates are relative to today so they don't look stale.
    def days_ago(n: int) -> str:
        return (datetime.now() - timedelta(days=n)).strftime("%Y-%m-%d")
    return [
        P2PContact(
            id="1",
            name="Sarah Johnson",
            username="@sarahj",
            email="sarah@example.com",
            phone="+1 555-0123",
            is_favorite=True,
            last_transaction={
                "date": days_ago(2),
                "amount": 50.00,
                "type": "sent"
            }
        ),
        P2PContact(
            id="2",
            name="Mike Chen",
            username="@mikechen",
            email="mike@example.com",
            phone="+1 555-0124",
            is_favorite=True,
            last_transaction={
                "date": days_ago(4),
                "amount": 125.00,
                "type": "received"
            }
        )
    ]


@router.post("/transfer")
async def create_p2p_transfer(
    request: Request,
    transfer_data: P2PTransferRequest,
    current_user: dict = Depends(get_current_user),
    db_session: Any = Depends(db.get_db_dependency)
):
    """Create a P2P transfer"""

    # Validate source account
    try:
        account_id = int(transfer_data.source_account_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid account ID"
        )

    source_account = Validators.validate_account_ownership(
        db_session, account_id, current_user['user_id']
    )

    # Convert balance to Decimal for comparison
    account_balance = Decimal(str(source_account.balance))

    # Check sufficient balance
    if account_balance < transfer_data.amount:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Insufficient balance"
        )

    # Calculate fee for instant transfers
    fee = Decimal('0')
    if transfer_data.method == "instant":
        fee = transfer_data.amount * Decimal('0.01')  # 1% fee

    total_amount = transfer_data.amount + fee

    if account_balance < total_amount:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Insufficient balance including fees")

    # Create transaction
    transaction = Transaction(
        user_id=current_user['user_id'],
        account_id=account_id,
        amount=-total_amount,
        transaction_type=TransactionType.P2P_TRANSFER,
        status=TransactionStatus.COMPLETED if transfer_data.method == "instant" else TransactionStatus.PENDING,
        description=transfer_data.description or f"P2P transfer to {transfer_data.recipient_id}",
        metadata={
            "recipient_id": transfer_data.recipient_id,
            "method": transfer_data.method,
            "fee": str(fee)
        }
    )

    # Update account balance (convert to float for SQLAlchemy)
    source_account.balance = float(account_balance - total_amount)

    db_session.add(transaction)
    db_session.commit()

    return {
        "transaction_id": transaction.id,
        "amount": transfer_data.amount,
        "fee": fee,
        "total": total_amount,
        "status": transaction.status,
        "method": transfer_data.method
    }

@router.post("/split-payment")
async def create_split_payment(
    request: Request,
    split_data: P2PSplitPaymentRequest,
    current_user: dict = Depends(get_current_user),
    db_session: Any = Depends(db.get_db_dependency)
):
    """Create a split payment request"""

    # Validate source account
    try:
        account_id = int(split_data.source_account_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid account ID"
        )

    Validators.validate_account_ownership(
        db_session, account_id, current_user['user_id']
    )

    # Calculate individual amounts
    participant_amounts = {}

    if split_data.split_type == "equal":
        # Equal split among all participants (including initiator)
        total_participants = len(split_data.participants) + 1
        individual_amount = split_data.total_amount / total_participants

        for participant_id in split_data.participants:
            participant_amounts[participant_id] = individual_amount

    elif split_data.split_type == "percentage":
        # Percentage-based split
        if not split_data.split_details:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Split details required for percentage split"
            )

        total_percentage = sum(split_data.split_details.values())
        if total_percentage > 100:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Total percentage cannot exceed 100%"
            )

        for participant_id, percentage in split_data.split_details.items():
            participant_amounts[participant_id] = (split_data.total_amount * percentage) / 100

    elif split_data.split_type == "amount":
        # Fixed amount split
        if not split_data.split_details:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Split details required for amount split"
            )

        total_assigned = sum(split_data.split_details.values())
        if total_assigned > split_data.total_amount:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Total assigned amount exceeds bill amount"
            )

        participant_amounts = split_data.split_details

    # Create payment requests for each participant
    payment_requests = []
    for participant_id, amount in participant_amounts.items():
        # In a real implementation, this would create payment request records
        payment_request = {
            "id": f"pr_{participant_id}_{datetime.now().timestamp()}",
            "requester_id": current_user['user_id'],
            "payer_id": participant_id,
            "amount": amount,
            "description": split_data.description,
            "status": "pending",
            "created_at": datetime.now()
        }
        payment_requests.append(payment_request)

    return {
        "split_id": f"split_{datetime.now().timestamp()}",
        "total_amount": split_data.total_amount,
        "participant_amounts": participant_amounts,
        "payment_requests": payment_requests,
        "status": "pending"
    }

@router.post("/payment-request")
async def create_payment_request(
    request: Request,
    payment_request: P2PPaymentRequestModel,
    current_user: dict = Depends(get_current_user),
    db_session: Any = Depends(db.get_db_dependency)
):
    """Create a payment request"""

    # Create payment request record
    return {
        "id": f"req_{datetime.now().timestamp()}",
        "requester_id": current_user['user_id'],
        "payer_id": payment_request.requester_id,
        "amount": payment_request.amount,
        "description": payment_request.description,
        "due_date": payment_request.due_date,
        "status": "pending",
        "created_at": datetime.now()
    }


@router.get("/qr-code")
async def generate_qr_code(
    request: Request,
    amount: Decimal | None = Query(None, gt=0),
    description: str | None = Query(None),
    current_user: dict = Depends(get_current_user)
):
    """Generate QR code for receiving payment"""

    # Create payment link data
    {
        "recipient_id": current_user['user_id'],
        "recipient_name": current_user.get('name', 'User'),
        "amount": str(amount) if amount else None,
        "description": description,
        "timestamp": datetime.now().isoformat()
    }

    # Generate QR code
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )

    # In a real app, this would be a deep link to the app
    payment_link = f"bankflow://p2p/pay?recipient={current_user['user_id']}"
    if amount:
        payment_link += f"&amount={amount}"
    if description:
        payment_link += f"&description={description}"

    qr.add_data(payment_link)
    qr.make(fit=True)

    # Create QR code image
    img = qr.make_image(fill_color="black", back_color="white")

    # Convert to base64
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    qr_base64 = base64.b64encode(buffer.getvalue()).decode()

    return P2PQRCodeResponse(
        qr_code=f"data:image/png;base64,{qr_base64}",
        payment_link=payment_link,
        expires_at=datetime.now().replace(hour=23, minute=59, second=59)
    )

@router.post("/scan-qr")
async def scan_qr_code(
    request: Request,
    qr_data: dict[str, Any],
    current_user: dict = Depends(get_current_user)
):
    """Process scanned QR code data"""
    # Parse QR code data and return payment details
    # In a real implementation, this would validate and parse the QR data

    return {
        "recipient_id": qr_data.get("recipient_id"),
        "amount": qr_data.get("amount"),
        "description": qr_data.get("description"),
        "valid": True
    }
