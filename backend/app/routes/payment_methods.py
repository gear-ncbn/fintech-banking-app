import re
from datetime import UTC, datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request, status

from ..models import (
    PaymentMethod,
    PaymentMethodBankCreate,
    PaymentMethodCardCreate,
    PaymentMethodResponse,
    PaymentMethodStatus,
    PaymentMethodType,
    PaymentMethodUpdate,
    PaymentMethodWalletCreate,
    SecurityEventType,
)
from ..storage.memory_adapter import db
from ..utils.auth import get_current_user
from ..utils.security_logger import log_security_event
from ..utils.validators import ValidationError

router = APIRouter()

def mask_card_number(card_number: str) -> str:
    """Mask card number keeping only last 4 digits"""
    return card_number[-4:] if len(card_number) >= 4 else card_number

def mask_account_number(account_number: str) -> str:
    """Mask account number keeping only last 4 digits"""
    return account_number[-4:] if len(account_number) >= 4 else account_number

def get_card_brand(card_number: str) -> str:
    """Detect card brand from card number"""
    # Remove spaces and dashes
    card_number = re.sub(r'[\s-]', '', card_number)

    if card_number.startswith('4'):
        return "Visa"
    if card_number.startswith(('51', '52', '53', '54', '55')):
        return "Mastercard"
    if card_number.startswith(('34', '37')):
        return "American Express"
    if card_number.startswith(('6011', '65')):
        return "Discover"
    return "Other"

def validate_card_number(card_number: str) -> bool:
    """Validate card number using Luhn algorithm"""
    # Remove spaces and dashes
    card_number = re.sub(r'[\s-]', '', card_number)

    if not card_number.isdigit():
        return False

    # Luhn algorithm
    total = 0
    for i, digit in enumerate(reversed(card_number)):
        n = int(digit)
        if i % 2 == 1:
            n *= 2
            if n > 9:
                n -= 9
        total += n

    return total % 10 == 0

@router.post("/card", response_model=PaymentMethodResponse, status_code=status.HTTP_201_CREATED)
async def add_card(
    request: Request,
    card_data: PaymentMethodCardCreate,
    current_user: dict = Depends(get_current_user),
    db_session: Any = Depends(db.get_db_dependency)
):
    """Add a new credit/debit card"""

    # Validate card number
    if not validate_card_number(card_data.card_number):
        raise ValidationError("Invalid card number")

    # Check if card already exists
    card_last_four = mask_card_number(card_data.card_number)
    existing = db_session.query(PaymentMethod).filter(
        PaymentMethod.user_id == current_user['user_id'],
        PaymentMethod.card_last_four == card_last_four,
        PaymentMethod.type.in_([PaymentMethodType.CREDIT_CARD, PaymentMethodType.DEBIT_CARD])
    ).first()

    if existing:
        raise ValidationError("This card is already added")

    # Create payment method
    payment_method = PaymentMethod(
        user_id=current_user['user_id'],
        type=card_data.type,
        nickname=card_data.nickname,
        is_default=card_data.is_default,
        card_last_four=card_last_four,
        card_brand=get_card_brand(card_data.card_number),
        expiry_month=card_data.expiry_month,
        expiry_year=card_data.expiry_year,
        billing_zip=card_data.billing_zip,
        status=PaymentMethodStatus.ACTIVE
    )

    # If setting as default, unset other defaults
    if card_data.is_default:
        db_session.query(PaymentMethod).filter(
            PaymentMethod.user_id == current_user['user_id'],
            PaymentMethod.is_default
        ).update({"is_default": False})

    db_session.add(payment_method)
    db_session.commit()
    db_session.refresh(payment_method)

    # Log security event
    log_security_event(
        db_session,
        current_user['user_id'],
        SecurityEventType.PAYMENT_METHOD_ADDED,
        request,
        metadata={
            "payment_method_type": "card",
            "card_brand": payment_method.card_brand,
            "last_four": card_last_four
        }
    )

    return PaymentMethodResponse.model_validate(payment_method)

@router.post("/bank", response_model=PaymentMethodResponse, status_code=status.HTTP_201_CREATED)
async def add_bank_account(
    request: Request,
    bank_data: PaymentMethodBankCreate,
    current_user: dict = Depends(get_current_user),
    db_session: Any = Depends(db.get_db_dependency)
):
    """Add a new bank account"""

    # Validate routing number (basic check)
    if not re.match(r'^\d{9}$', bank_data.routing_number):
        raise ValidationError("Invalid routing number")

    # Create payment method
    payment_method = PaymentMethod(
        user_id=current_user['user_id'],
        type=PaymentMethodType.BANK_ACCOUNT,
        nickname=bank_data.nickname,
        is_default=bank_data.is_default,
        account_last_four=mask_account_number(bank_data.account_number),
        routing_number=bank_data.routing_number,
        bank_name=bank_data.bank_name,
        status=PaymentMethodStatus.PENDING_VERIFICATION
    )

    # If setting as default, unset other defaults
    if bank_data.is_default:
        db_session.query(PaymentMethod).filter(
            PaymentMethod.user_id == current_user['user_id'],
            PaymentMethod.is_default
        ).update({"is_default": False})

    db_session.add(payment_method)
    db_session.commit()
    db_session.refresh(payment_method)

    # Log security event
    log_security_event(
        db_session,
        current_user['user_id'],
        SecurityEventType.PAYMENT_METHOD_ADDED,
        request,
        metadata={
            "payment_method_type": "bank_account",
            "bank_name": bank_data.bank_name
        }
    )

    return PaymentMethodResponse.model_validate(payment_method)

@router.post("/wallet", response_model=PaymentMethodResponse, status_code=status.HTTP_201_CREATED)
async def add_digital_wallet(
    request: Request,
    wallet_data: PaymentMethodWalletCreate,
    current_user: dict = Depends(get_current_user),
    db_session: Any = Depends(db.get_db_dependency)
):
    """Add a digital wallet (Apple Pay, Google Pay, etc.)"""

    # Validate wallet provider
    valid_providers = ["Apple Pay", "Google Pay", "Samsung Pay", "PayPal", "Venmo"]
    if wallet_data.wallet_provider not in valid_providers:
        raise ValidationError(f"Invalid wallet provider. Must be one of: {', '.join(valid_providers)}")

    # Check if wallet already exists
    existing = db_session.query(PaymentMethod).filter(
        PaymentMethod.user_id == current_user['user_id'],
        PaymentMethod.wallet_provider == wallet_data.wallet_provider,
        PaymentMethod.wallet_id == wallet_data.wallet_id
    ).first()

    if existing:
        raise ValidationError("This wallet is already added")

    # Create payment method
    payment_method = PaymentMethod(
        user_id=current_user['user_id'],
        type=PaymentMethodType.DIGITAL_WALLET,
        nickname=wallet_data.nickname or wallet_data.wallet_provider,
        is_default=wallet_data.is_default,
        wallet_provider=wallet_data.wallet_provider,
        wallet_id=wallet_data.wallet_id,
        status=PaymentMethodStatus.ACTIVE
    )

    # If setting as default, unset other defaults
    if wallet_data.is_default:
        db_session.query(PaymentMethod).filter(
            PaymentMethod.user_id == current_user['user_id'],
            PaymentMethod.is_default
        ).update({"is_default": False})

    db_session.add(payment_method)
    db_session.commit()
    db_session.refresh(payment_method)

    return PaymentMethodResponse.model_validate(payment_method)

@router.get("", response_model=list[PaymentMethodResponse])
async def get_payment_methods(
    include_expired: bool = False,
    current_user: dict = Depends(get_current_user),
    db_session: Any = Depends(db.get_db_dependency)
):
    """Get all payment methods for the current user"""
    query = db_session.query(PaymentMethod).filter(
        PaymentMethod.user_id == current_user['user_id']
    )

    if not include_expired:
        query = query.filter(PaymentMethod.status != PaymentMethodStatus.EXPIRED)

    payment_methods = query.order_by(
        PaymentMethod.is_default.desc(),
        PaymentMethod.created_at.desc()
    ).all()

    return [PaymentMethodResponse.model_validate(pm) for pm in payment_methods]

@router.get("/{payment_method_id}", response_model=PaymentMethodResponse)
async def get_payment_method(
    payment_method_id: int,
    current_user: dict = Depends(get_current_user),
    db_session: Any = Depends(db.get_db_dependency)
):
    """Get a specific payment method"""
    payment_method = db_session.query(PaymentMethod).filter(
        PaymentMethod.id == payment_method_id,
        PaymentMethod.user_id == current_user['user_id']
    ).first()

    if not payment_method:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment method not found"
        )

    return PaymentMethodResponse.model_validate(payment_method)

@router.put("/{payment_method_id}", response_model=PaymentMethodResponse)
async def update_payment_method(
    request: Request,
    payment_method_id: int,
    update_data: PaymentMethodUpdate,
    current_user: dict = Depends(get_current_user),
    db_session: Any = Depends(db.get_db_dependency)
):
    """Update payment method details"""

    payment_method = db_session.query(PaymentMethod).filter(
        PaymentMethod.id == payment_method_id,
        PaymentMethod.user_id == current_user['user_id']
    ).first()

    if not payment_method:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment method not found"
        )

    # Update fields
    if update_data.nickname is not None:
        payment_method.nickname = update_data.nickname

    if update_data.billing_zip is not None:
        payment_method.billing_zip = update_data.billing_zip

    if update_data.is_default is not None:
        if update_data.is_default:
            # Unset other defaults
            db_session.query(PaymentMethod).filter(
                PaymentMethod.user_id == current_user['user_id'],
                PaymentMethod.id != payment_method_id,
                PaymentMethod.is_default
            ).update({"is_default": False})
        payment_method.is_default = update_data.is_default

    payment_method.updated_at = datetime.now(UTC)
    db_session.commit()
    db_session.refresh(payment_method)

    return PaymentMethodResponse.model_validate(payment_method)

@router.delete("/{payment_method_id}")
async def delete_payment_method(
    request: Request,
    payment_method_id: int,
    current_user: dict = Depends(get_current_user),
    db_session: Any = Depends(db.get_db_dependency)
):
    """Delete a payment method"""

    payment_method = db_session.query(PaymentMethod).filter(
        PaymentMethod.id == payment_method_id,
        PaymentMethod.user_id == current_user['user_id']
    ).first()

    if not payment_method:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment method not found"
        )

    # Check if it's the default and there are other methods
    if payment_method.is_default:
        other_methods = db_session.query(PaymentMethod).filter(
            PaymentMethod.user_id == current_user['user_id'],
            PaymentMethod.id != payment_method_id
        ).count()

        if other_methods > 0:
            raise ValidationError("Cannot delete default payment method. Set another as default first.")

    # Log before deletion
    pm_info = {
        "type": payment_method.type.value,
        "nickname": payment_method.nickname
    }

    db_session.delete(payment_method)
    db_session.commit()

    # Log security event
    log_security_event(
        db_session,
        current_user['user_id'],
        SecurityEventType.PAYMENT_METHOD_REMOVED,
        request,
        metadata=pm_info
    )

    return {"message": "Payment method deleted successfully"}

@router.post("/{payment_method_id}/verify")
async def verify_payment_method(
    request: Request,
    payment_method_id: int,
    current_user: dict = Depends(get_current_user),
    db_session: Any = Depends(db.get_db_dependency)
):
    """Verify a payment method (for bank accounts)"""
    payment_method = db_session.query(PaymentMethod).filter(
        PaymentMethod.id == payment_method_id,
        PaymentMethod.user_id == current_user['user_id']
    ).first()

    if not payment_method:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment method not found"
        )

    if payment_method.type != PaymentMethodType.BANK_ACCOUNT:
        raise ValidationError("Only bank accounts need verification")

    if payment_method.status == PaymentMethodStatus.ACTIVE:
        raise ValidationError("Payment method already verified")

    # In production, this would involve micro-deposits or other verification
    payment_method.status = PaymentMethodStatus.ACTIVE
    payment_method.verified_at = datetime.now(UTC)
    db_session.commit()

    return {"message": "Payment method verified successfully"}
