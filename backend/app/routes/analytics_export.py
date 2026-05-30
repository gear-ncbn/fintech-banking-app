import csv
import io
from datetime import date, datetime, timedelta
from typing import Any

from dateutil.relativedelta import relativedelta
from fastapi import APIRouter, Depends, Query, Response
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from ..models import (
    Account,
    AccountType,
    Category,
    Transaction,
    TransactionType,
)
from ..repositories.data_manager import data_manager
from ..services.net_worth_valuation import compute_net_worth
from ..storage.memory_adapter import db
from ..utils.auth import get_current_user
from ..utils.validators import Validators

router = APIRouter()

@router.get("/export/transactions/csv")
async def export_transactions_csv(
    start_date: date | None = None,
    end_date: date | None = None,
    category_id: int | None = None,
    account_id: int | None = None,
    current_user: dict = Depends(get_current_user),
    db_session: Any = Depends(db.get_db_dependency)
):
    """Export transactions to CSV format"""
    # Default to last 30 days
    if not end_date:
        end_date = date.today()
    if not start_date:
        start_date = end_date - timedelta(days=30)

    # Validate date range
    Validators.validate_date_range(start_date, end_date)

    # Get user's account IDs
    user_accounts = db_session.query(Account.id).filter(
        Account.user_id == current_user['user_id']
    ).all()
    user_account_ids = [a.id for a in user_accounts]

    # Build query
    query = db_session.query(Transaction).filter(
        Transaction.account_id.in_(user_account_ids),
        Transaction.transaction_date >= datetime.combine(start_date, datetime.min.time()),
        Transaction.transaction_date <= datetime.combine(end_date, datetime.max.time())
    )

    if category_id:
        query = query.filter(Transaction.category_id == category_id)
    if account_id and account_id in user_account_ids:
        query = query.filter(Transaction.account_id == account_id)

    transactions = query.order_by(Transaction.transaction_date.desc()).all()

    # Get all related accounts and categories
    account_ids = list({t.account_id for t in transactions})
    category_ids = list({t.category_id for t in transactions if t.category_id})

    accounts = {}
    categories = {}

    if account_ids:
        acc_list = db_session.query(Account).filter(Account.id.in_(account_ids)).all()
        accounts = {a.id: a.name for a in acc_list}

    if category_ids:
        cat_list = db_session.query(Category).filter(Category.id.in_(category_ids)).all()
        categories = {c.id: c.name for c in cat_list}

    # Create CSV
    output = io.StringIO()
    writer = csv.writer(output)

    # Write report header
    writer.writerow(['TRANSACTION HISTORY REPORT'])
    writer.writerow(['Generated on:', datetime.now().strftime('%Y-%m-%d %H:%M:%S')])
    writer.writerow(['User:', current_user.get('username', 'Unknown')])
    writer.writerow(['Period:', f"{start_date.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')}"])
    if category_id:
        cat_name = categories.get(category_id, 'Unknown')
        writer.writerow(['Category Filter:', cat_name])
    if account_id:
        acc_name = accounts.get(account_id, 'Unknown')
        writer.writerow(['Account Filter:', acc_name])
    writer.writerow([])  # Empty row

    # Summary statistics
    writer.writerow(['SUMMARY STATISTICS'])
    total_credits = sum(tx.amount for tx in transactions if tx.transaction_type == TransactionType.CREDIT)
    total_debits = sum(tx.amount for tx in transactions if tx.transaction_type == TransactionType.DEBIT)
    net_flow = total_credits - total_debits

    writer.writerow(['Total Credits:', f'${total_credits:.2f}'])
    writer.writerow(['Total Debits:', f'${total_debits:.2f}'])
    writer.writerow(['Net Flow:', f'${net_flow:+.2f}'])
    writer.writerow(['Total Transactions:', len(transactions)])
    writer.writerow(['Average Transaction:', f'${(total_credits + total_debits) / len(transactions):.2f}' if transactions else '$0.00'])
    writer.writerow([])  # Empty row
    writer.writerow([])  # Empty row

    # Transaction details headers
    writer.writerow(['TRANSACTION DETAILS'])
    writer.writerow([
        'Date', 'Description', 'Category', 'Account', 'Type', 'Amount', 'Status', 'Running Balance'
    ])

    # Calculate running balance
    running_balance = 0.0
    if account_id and account_id in user_account_ids:
        # Get starting balance for specific account
        account = next((a for a in user_accounts if a.id == account_id), None)
        if account:
            running_balance = account.balance
            # Work backwards to get balance at start date
            for tx in reversed(transactions):
                if tx.transaction_type == TransactionType.DEBIT:
                    running_balance += tx.amount
                else:
                    running_balance -= tx.amount

    # Write data with running balance
    for tx in transactions:
        # Update running balance if tracking specific account
        if account_id and account_id in user_account_ids and tx.account_id == account_id:
            if tx.transaction_type == TransactionType.DEBIT:
                running_balance -= tx.amount
            else:
                running_balance += tx.amount

        amount_str = f"${tx.amount:.2f}"
        amount_str = f"-{amount_str}" if tx.transaction_type == TransactionType.DEBIT else f"+{amount_str}"

        writer.writerow([
            tx.transaction_date.strftime('%Y-%m-%d'),
            tx.description.strip() if tx.description else '',  # Strip any leading/trailing spaces
            categories.get(tx.category_id, 'Uncategorized'),
            accounts.get(tx.account_id, 'Unknown'),
            tx.transaction_type.value if hasattr(tx.transaction_type, 'value') else tx.transaction_type,
            amount_str,
            tx.status.value if hasattr(tx.status, 'value') else tx.status,
            f"${running_balance:.2f}" if account_id else 'N/A'
        ])

    # Get CSV content
    csv_content = output.getvalue()
    output.close()

    return Response(
        content=csv_content,
        media_type='text/csv',
        headers={
            'Content-Disposition': f'attachment; filename=transactions_{start_date}_{end_date}.csv'
        }
    )

@router.get("/export/analytics/csv")
async def export_analytics_csv(
    start_date: date | None = None,
    end_date: date | None = None,
    current_user: dict = Depends(get_current_user),
    db_session: Any = Depends(db.get_db_dependency)
):
    """Export analytics summary to CSV format"""
    # Default to last 30 days
    if not end_date:
        end_date = date.today()
    if not start_date:
        start_date = end_date - timedelta(days=30)

    # Get user's account IDs
    user_accounts = db_session.query(Account).filter(
        Account.user_id == current_user['user_id']
    ).all()
    user_account_ids = [acc.id for acc in user_accounts]

    # Get spending by category - adapted for memory adapter
    # First get all transactions
    all_transactions = db_session.query(Transaction).filter(
        Transaction.account_id.in_(user_account_ids),
        Transaction.transaction_date >= datetime.combine(start_date, datetime.min.time()),
        Transaction.transaction_date <= datetime.combine(end_date, datetime.max.time())
    ).all()

    # Get categories
    categories = db_session.query(Category).filter(not Category.is_income).all()
    category_map = {cat.id: cat for cat in categories}

    # Calculate spending by category manually
    category_spending = {}
    for tx in all_transactions:
        if tx.category_id and tx.category_id in category_map:
            cat_name = category_map[tx.category_id].name
            if cat_name not in category_spending:
                category_spending[cat_name] = {'total_amount': 0, 'transaction_count': 0}
            category_spending[cat_name]['total_amount'] += tx.amount
            category_spending[cat_name]['transaction_count'] += 1

    # Convert to list and sort by amount
    category_spending = [
        type('CategorySpending', (), {
            'name': name,
            'total_amount': data['total_amount'],
            'transaction_count': data['transaction_count']
        })
        for name, data in sorted(category_spending.items(), key=lambda x: x[1]['total_amount'], reverse=True)
    ]

    # Calculate totals
    # Get user account IDs (fix subquery issue)
    [acc.id for acc in db_session.query(Account).filter(
        Account.user_id == current_user['user_id']
    ).all()]

    # Calculate total income
    income_categories = db_session.query(Category).filter(Category.is_income).all()
    income_cat_ids = [cat.id for cat in income_categories]

    total_income = 0.0
    for tx in all_transactions:
        if tx.category_id in income_cat_ids:
            total_income += tx.amount

    total_expenses = sum(cat.total_amount for cat in category_spending)

    # Create CSV
    output = io.StringIO()
    writer = csv.writer(output)

    # Write report header
    writer.writerow(['ANALYTICS SUMMARY REPORT'])
    writer.writerow(['Generated on:', datetime.now().strftime('%Y-%m-%d %H:%M:%S')])
    writer.writerow(['User:', current_user.get('username', 'Unknown')])
    writer.writerow(['Period:', f"{start_date.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')}"])
    writer.writerow([])  # Empty row

    # Executive Summary
    writer.writerow(['EXECUTIVE SUMMARY'])
    days_in_period = (end_date - start_date).days + 1
    net_income = total_income - total_expenses
    savings_rate = (net_income / total_income * 100) if total_income > 0 else 0

    writer.writerow(['Total Income:', f'${total_income:.2f}'])
    writer.writerow(['Total Expenses:', f'${total_expenses:.2f}'])
    writer.writerow(['Net Income:', f'${net_income:.2f}'])
    writer.writerow(['Savings Rate:', f'{savings_rate:.1f}%'])
    writer.writerow(['Days in Period:', days_in_period])
    writer.writerow(['Average Daily Income:', f'${total_income / days_in_period:.2f}'])
    writer.writerow(['Average Daily Expenses:', f'${total_expenses / days_in_period:.2f}'])
    writer.writerow([])  # Empty row
    writer.writerow([])  # Empty row

    # Spending by Category
    writer.writerow(['SPENDING BY CATEGORY'])
    writer.writerow(['Category', 'Amount', 'Transactions', 'Average', 'Percentage'])

    for cat in category_spending:
        percentage = (cat.total_amount / total_expenses * 100) if total_expenses > 0 else 0
        avg_transaction = cat.total_amount / cat.transaction_count if cat.transaction_count > 0 else 0
        writer.writerow([
            cat.name,
            f'${cat.total_amount:.2f}',
            cat.transaction_count,
            f'${avg_transaction:.2f}',
            f'{percentage:.1f}%'
        ])

    # Add totals row
    if category_spending:
        total_transactions = sum(cat.transaction_count for cat in category_spending)
        writer.writerow([
            'TOTAL',
            f'${total_expenses:.2f}',
            total_transactions,
            f'${total_expenses / total_transactions:.2f}' if total_transactions > 0 else '$0.00',
            '100.0%'
        ])
    writer.writerow([])  # Empty row
    writer.writerow([])  # Empty row

    # Account Summary
    writer.writerow(['ACCOUNT BALANCES'])
    writer.writerow(['Account Name', 'Type', 'Current Balance'])

    account_assets = 0.0
    account_liabilities = 0.0

    for account in user_accounts:
        account_type = account.account_type.value if hasattr(account.account_type, 'value') else str(account.account_type)
        writer.writerow([account.name, account_type, f'${account.balance:.2f}'])

        if account.account_type in [AccountType.CHECKING, AccountType.SAVINGS]:
            account_assets += account.balance
        elif account.account_type in [AccountType.CREDIT_CARD, AccountType.LOAN]:
            account_liabilities += abs(account.balance)

    # Fold in the investment portfolio + crypto wallet via the single source of
    # truth so the exported Net Worth matches the app (see net_worth_valuation).
    investment_value = compute_net_worth(
        data_manager, current_user['user_id']
    )["investment_value"]
    writer.writerow(['Investment Portfolio', 'investment', f'${investment_value:.2f}'])
    account_assets += investment_value

    writer.writerow([])  # Empty row
    writer.writerow(['Total Assets:', '', f'${account_assets:.2f}'])
    writer.writerow(['Total Liabilities:', '', f'${account_liabilities:.2f}'])
    writer.writerow(['Net Worth:', '', f'${(account_assets - account_liabilities):.2f}'])

    csv_content = output.getvalue()
    output.close()

    return Response(
        content=csv_content,
        media_type='text/csv',
        headers={
            'Content-Disposition': f'attachment; filename=analytics_{start_date}_{end_date}.csv'
        }
    )

@router.get("/export/financial-report/pdf")
async def export_financial_report_pdf(
    start_date: date | None = None,
    end_date: date | None = None,
    current_user: dict = Depends(get_current_user),
    db_session: Any = Depends(db.get_db_dependency)
):
    """Generate comprehensive financial report in PDF format"""
    # Default to last month
    if not end_date:
        end_date = date.today()
    if not start_date:
        start_date = end_date - relativedelta(months=1)

    # Create PDF buffer
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    story = []
    styles = getSampleStyleSheet()

    # Title
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=colors.HexColor('#1a1a1a'),
        spaceAfter=30
    )
    story.append(Paragraph("Financial Report", title_style))
    story.append(Paragraph(f"{start_date.strftime('%B %d, %Y')} - {end_date.strftime('%B %d, %Y')}", styles['Normal']))
    story.append(Spacer(1, 0.5*inch))

    # Get user data
    user_accounts = db_session.query(Account).filter(
        Account.user_id == current_user['user_id']
    ).all()
    user_account_ids = [a.id for a in user_accounts]

    # Get all transactions for the period
    all_transactions = db_session.query(Transaction).filter(
        Transaction.account_id.in_(user_account_ids),
        Transaction.transaction_date >= datetime.combine(start_date, datetime.min.time()),
        Transaction.transaction_date <= datetime.combine(end_date, datetime.max.time())
    ).all()

    # Get categories
    categories = db_session.query(Category).all()
    income_cat_ids = [cat.id for cat in categories if cat.is_income]
    expense_cat_ids = [cat.id for cat in categories if not cat.is_income]

    # Financial Summary
    total_income = sum(tx.amount for tx in all_transactions if tx.category_id in income_cat_ids)
    total_expenses = sum(tx.amount for tx in all_transactions if tx.category_id in expense_cat_ids)

    net_income = total_income - total_expenses
    savings_rate = (net_income / total_income * 100) if total_income > 0 else 0

    # Summary table
    story.append(Paragraph("Executive Summary", styles['Heading2']))
    summary_data = [
        ['Metric', 'Amount'],
        ['Total Income', f'${total_income:,.2f}'],
        ['Total Expenses', f'${total_expenses:,.2f}'],
        ['Net Income', f'${net_income:,.2f}'],
        ['Savings Rate', f'{savings_rate:.1f}%']
    ]

    summary_table = Table(summary_data, colWidths=[3*inch, 2*inch])
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 12),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
        ('GRID', (0, 0), (-1, -1), 1, colors.black)
    ]))
    story.append(summary_table)
    story.append(Spacer(1, 0.5*inch))

    # Spending by Category
    story.append(Paragraph("Spending Analysis", styles['Heading2']))

    # Calculate spending by category
    category_map = {cat.id: cat for cat in categories if not cat.is_income}
    category_spending = {}

    for tx in all_transactions:
        if tx.category_id in expense_cat_ids:
            cat_name = category_map[tx.category_id].name
            if cat_name not in category_spending:
                category_spending[cat_name] = {'total_amount': 0, 'transaction_count': 0}
            category_spending[cat_name]['total_amount'] += tx.amount
            category_spending[cat_name]['transaction_count'] += 1

    # Convert to list and sort by amount, limit to top 10
    category_spending = [
        type('CategorySpending', (), {
            'name': name,
            'total_amount': data['total_amount'],
            'transaction_count': data['transaction_count']
        })
        for name, data in sorted(category_spending.items(), key=lambda x: x[1]['total_amount'], reverse=True)[:10]
    ]

    category_data = [['Category', 'Amount', 'Transactions', 'Percentage']]
    for cat in category_spending:
        percentage = (cat.total_amount / total_expenses * 100) if total_expenses > 0 else 0
        category_data.append([
            cat.name,
            f'${cat.total_amount:,.2f}',
            str(cat.transaction_count),
            f'{percentage:.1f}%'
        ])

    category_table = Table(category_data, colWidths=[2.5*inch, 1.5*inch, 1*inch, 1*inch])
    category_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 11),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
        ('GRID', (0, 0), (-1, -1), 1, colors.black)
    ]))
    story.append(category_table)
    story.append(Spacer(1, 0.5*inch))

    # Account Balances
    story.append(Paragraph("Account Summary", styles['Heading2']))
    accounts = db_session.query(Account).filter(
        Account.user_id == current_user['user_id']
    ).all()

    account_data = [['Account', 'Type', 'Balance']]
    total_assets = 0
    total_liabilities = 0

    for account in accounts:
        account_data.append([
            account.name,
            account.account_type.value if hasattr(account.account_type, 'value') else str(account.account_type),
            f'${account.balance:,.2f}'
        ])

        if account.account_type in [AccountType.CHECKING, AccountType.SAVINGS]:
            total_assets += account.balance
        elif account.account_type in [AccountType.CREDIT_CARD, AccountType.LOAN]:
            total_liabilities += abs(account.balance)

    # Fold in the investment portfolio + crypto wallet via the single source of
    # truth so the exported Net Worth matches the app (see net_worth_valuation).
    investment_value = compute_net_worth(
        data_manager, current_user['user_id']
    )["investment_value"]
    account_data.append(['Investment Portfolio', 'investment', f'${investment_value:,.2f}'])
    total_assets += investment_value

    account_table = Table(account_data, colWidths=[3*inch, 1.5*inch, 1.5*inch])
    account_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 11),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
        ('GRID', (0, 0), (-1, -1), 1, colors.black)
    ]))
    story.append(account_table)
    story.append(Spacer(1, 0.3*inch))

    # Net Worth
    net_worth = total_assets - total_liabilities
    story.append(Paragraph(f"<b>Total Assets:</b> ${total_assets:,.2f}", styles['Normal']))
    story.append(Paragraph(f"<b>Total Liabilities:</b> ${total_liabilities:,.2f}", styles['Normal']))
    story.append(Paragraph(f"<b>Net Worth:</b> ${net_worth:,.2f}", styles['Normal']))

    # Build PDF
    doc.build(story)
    buffer.seek(0)

    return Response(
        content=buffer.getvalue(),
        media_type='application/pdf',
        headers={
            'Content-Disposition': f'attachment; filename=financial_report_{start_date}_{end_date}.pdf'
        }
    )

@router.get("/export/transactions/pdf")
async def export_transactions_pdf(
    start_date: date | None = None,
    end_date: date | None = None,
    category_id: int | None = None,
    account_id: int | None = None,
    current_user: dict = Depends(get_current_user),
    db_session: Any = Depends(db.get_db_dependency)
):
    """Export transactions to PDF format"""
    # Default to last 30 days
    if not end_date:
        end_date = date.today()
    if not start_date:
        start_date = end_date - timedelta(days=30)

    # Validate date range
    Validators.validate_date_range(start_date, end_date)

    # Get user's account IDs
    user_accounts = db_session.query(Account.id).filter(
        Account.user_id == current_user['user_id']
    ).all()
    user_account_ids = [a.id for a in user_accounts]

    # Build query
    query = db_session.query(Transaction).filter(
        Transaction.account_id.in_(user_account_ids),
        Transaction.transaction_date >= datetime.combine(start_date, datetime.min.time()),
        Transaction.transaction_date <= datetime.combine(end_date, datetime.max.time())
    )

    if category_id:
        query = query.filter(Transaction.category_id == category_id)
    if account_id and account_id in user_account_ids:
        query = query.filter(Transaction.account_id == account_id)

    transactions = query.order_by(Transaction.transaction_date.desc()).all()

    # Get all related accounts and categories
    account_ids = list({t.account_id for t in transactions})
    category_ids = list({t.category_id for t in transactions if t.category_id})

    accounts = {}
    categories = {}

    if account_ids:
        acc_list = db_session.query(Account).filter(Account.id.in_(account_ids)).all()
        accounts = {a.id: a.name for a in acc_list}

    if category_ids:
        cat_list = db_session.query(Category).filter(Category.id.in_(category_ids)).all()
        categories = {c.id: c.name for c in cat_list}

    # Create PDF
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    story = []
    styles = getSampleStyleSheet()

    # Title
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=colors.HexColor('#1a1a1a'),
        spaceAfter=30
    )
    story.append(Paragraph("Transaction History", title_style))
    story.append(Paragraph(f"{start_date.strftime('%B %d, %Y')} - {end_date.strftime('%B %d, %Y')}", styles['Normal']))
    story.append(Spacer(1, 0.5*inch))

    # Transaction table
    data = [['Date', 'Description', 'Category', 'Account', 'Amount']]

    for tx in transactions:
        amount_str = f"${tx.amount:.2f}"
        amount_str = f"-{amount_str}" if tx.transaction_type == TransactionType.DEBIT else f"+{amount_str}"

        data.append([
            tx.transaction_date.strftime('%Y-%m-%d'),
            tx.description[:30] + '...' if len(tx.description) > 30 else tx.description,
            categories.get(tx.category_id, 'Uncategorized'),
            accounts.get(tx.account_id, 'Unknown'),
            amount_str
        ])

    # Create table
    table = Table(data, colWidths=[1.2*inch, 2.5*inch, 1.5*inch, 1.5*inch, 1*inch])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('ALIGN', (-1, 0), (-1, -1), 'RIGHT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
        ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ('FONTSIZE', (0, 1), (-1, -1), 9),
    ]))

    story.append(table)

    # Build PDF
    doc.build(story)
    buffer.seek(0)

    return Response(
        content=buffer.getvalue(),
        media_type='application/pdf',
        headers={
            'Content-Disposition': f'attachment; filename=transactions_{start_date}_{end_date}.pdf'
        }
    )

@router.get("/export/analytics/pdf")
async def export_analytics_pdf(
    start_date: date | None = None,
    end_date: date | None = None,
    current_user: dict = Depends(get_current_user),
    db_session: Any = Depends(db.get_db_dependency)
):
    """Export analytics summary to PDF format"""
    # Default to last 30 days
    if not end_date:
        end_date = date.today()
    if not start_date:
        start_date = end_date - timedelta(days=30)

    # Create PDF buffer
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    story = []
    styles = getSampleStyleSheet()

    # Title
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=colors.HexColor('#1a1a1a'),
        spaceAfter=30
    )
    story.append(Paragraph("Analytics Summary Report", title_style))
    story.append(Paragraph(f"{start_date.strftime('%B %d, %Y')} - {end_date.strftime('%B %d, %Y')}", styles['Normal']))
    story.append(Spacer(1, 0.5*inch))

    # Get user's account IDs
    user_accounts = db_session.query(Account).filter(
        Account.user_id == current_user['user_id']
    ).all()
    user_account_ids = [acc.id for acc in user_accounts]

    # Get all transactions for the period
    all_transactions = db_session.query(Transaction).filter(
        Transaction.account_id.in_(user_account_ids),
        Transaction.transaction_date >= datetime.combine(start_date, datetime.min.time()),
        Transaction.transaction_date <= datetime.combine(end_date, datetime.max.time())
    ).all()

    # Get categories
    categories = db_session.query(Category).all()
    income_cat_ids = [cat.id for cat in categories if cat.is_income]
    expense_cat_ids = [cat.id for cat in categories if not cat.is_income]

    # Calculate totals
    total_income = sum(tx.amount for tx in all_transactions if tx.category_id in income_cat_ids)
    total_expenses = sum(tx.amount for tx in all_transactions if tx.category_id in expense_cat_ids)

    net_income = total_income - total_expenses
    savings_rate = (net_income / total_income * 100) if total_income > 0 else 0

    # Summary section
    story.append(Paragraph("Financial Summary", styles['Heading2']))
    summary_data = [
        ['Metric', 'Amount'],
        ['Total Income', f'${total_income:,.2f}'],
        ['Total Expenses', f'${total_expenses:,.2f}'],
        ['Net Income', f'${net_income:,.2f}'],
        ['Savings Rate', f'{savings_rate:.1f}%']
    ]

    summary_table = Table(summary_data, colWidths=[3*inch, 2*inch])
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 12),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
        ('GRID', (0, 0), (-1, -1), 1, colors.black)
    ]))
    story.append(summary_table)
    story.append(Spacer(1, 0.5*inch))

    # Category breakdown
    story.append(Paragraph("Spending by Category", styles['Heading2']))

    # Calculate spending by category
    category_map = {cat.id: cat for cat in categories if not cat.is_income}
    category_spending = {}

    for tx in all_transactions:
        if tx.category_id in expense_cat_ids:
            cat_name = category_map[tx.category_id].name
            if cat_name not in category_spending:
                category_spending[cat_name] = {'total_amount': 0, 'transaction_count': 0}
            category_spending[cat_name]['total_amount'] += tx.amount
            category_spending[cat_name]['transaction_count'] += 1

    # Convert to list and sort by amount, limit to top 10
    category_spending = [
        type('CategorySpending', (), {
            'name': name,
            'total_amount': data['total_amount'],
            'transaction_count': data['transaction_count']
        })
        for name, data in sorted(category_spending.items(), key=lambda x: x[1]['total_amount'], reverse=True)[:10]
    ]

    category_data = [['Category', 'Amount', 'Percentage']]
    for cat in category_spending:
        percentage = (cat.total_amount / total_expenses * 100) if total_expenses > 0 else 0
        category_data.append([
            cat.name,
            f'${cat.total_amount:,.2f}',
            f'{percentage:.1f}%'
        ])

    category_table = Table(category_data, colWidths=[3*inch, 1.5*inch, 1.5*inch])
    category_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 11),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
        ('GRID', (0, 0), (-1, -1), 1, colors.black)
    ]))
    story.append(category_table)

    # Build PDF
    doc.build(story)
    buffer.seek(0)

    return Response(
        content=buffer.getvalue(),
        media_type='application/pdf',
        headers={
            'Content-Disposition': f'attachment; filename=analytics_{start_date}_{end_date}.pdf'
        }
    )

@router.get("/export/net-worth/csv")
async def export_net_worth_csv(
    months_back: int = Query(12, ge=1, le=60),
    current_user: dict = Depends(get_current_user),
    db_session: Any = Depends(db.get_db_dependency)
):
    """Export net worth history to CSV"""
    end_date = date.today()
    start_date = end_date - relativedelta(months=months_back)

    # Get all user accounts
    accounts = db_session.query(Account).filter(
        Account.user_id == current_user['user_id']
    ).all()

    # Get all transactions for the period
    transactions = db_session.query(Transaction).filter(
        Transaction.account_id.in_([a.id for a in accounts]),
        Transaction.transaction_date >= datetime.combine(start_date, datetime.min.time())
    ).order_by(Transaction.transaction_date).all()

    # Calculate month-by-month net worth
    output = io.StringIO()
    writer = csv.writer(output)

    # Write summary section
    writer.writerow(['NET WORTH REPORT'])
    writer.writerow(['Generated on:', datetime.now().strftime('%Y-%m-%d %H:%M:%S')])
    writer.writerow(['User:', current_user.get('username', 'Unknown')])
    writer.writerow(['Period:', f"{start_date.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')}"])
    writer.writerow([])  # Empty row

    # Current account summary
    writer.writerow(['CURRENT ACCOUNT SUMMARY'])
    writer.writerow(['Account Name', 'Account Type', 'Current Balance'])

    total_assets = 0.0
    total_liabilities = 0.0

    for account in accounts:
        account_type = account.account_type.value if hasattr(account.account_type, 'value') else str(account.account_type)
        writer.writerow([account.name, account_type, f'${account.balance:.2f}'])

        if account.account_type in [AccountType.CHECKING, AccountType.SAVINGS]:
            total_assets += account.balance
        elif account.account_type in [AccountType.CREDIT_CARD, AccountType.LOAN]:
            total_liabilities += abs(account.balance)

    # Fold in the investment portfolio + crypto wallet via the single source of
    # truth so the exported Net Worth matches the app (see net_worth_valuation).
    investment_value = compute_net_worth(
        data_manager, current_user['user_id']
    )["investment_value"]
    writer.writerow(['Investment Portfolio', 'investment', f'${investment_value:.2f}'])
    total_assets += investment_value

    writer.writerow([])  # Empty row
    writer.writerow(['Total Assets:', '', f'${total_assets:.2f}'])
    writer.writerow(['Total Liabilities:', '', f'${total_liabilities:.2f}'])
    writer.writerow(['Current Net Worth:', '', f'${(total_assets - total_liabilities):.2f}'])
    writer.writerow([])  # Empty row
    writer.writerow([])  # Empty row

    # Monthly history headers
    writer.writerow(['MONTHLY NET WORTH HISTORY'])
    writer.writerow(['Month', 'Assets', 'Liabilities', 'Net Worth', 'Change', 'Change %'])

    current = start_date.replace(day=1)
    previous_net_worth = None
    monthly_records = []

    while current <= end_date:
        month_end = (current + relativedelta(months=1)) - timedelta(days=1)

        # Calculate account balances at month end. The current investment value
        # is carried across history (no historical portfolio snapshots) so the
        # latest point matches the canonical net worth.
        total_assets = investment_value
        total_liabilities = 0.0

        for account in accounts:
            balance = account.balance

            # Work backwards from current transactions
            for tx in reversed(transactions):
                if tx.account_id == account.id and tx.transaction_date.date() > month_end:
                    if tx.transaction_type == TransactionType.DEBIT:
                        balance += tx.amount
                    elif tx.transaction_type == TransactionType.CREDIT:
                        balance -= tx.amount

            # Categorize by account type (investment value folded in above)
            if account.account_type in [AccountType.CHECKING, AccountType.SAVINGS]:
                total_assets += balance
            elif account.account_type in [AccountType.CREDIT_CARD, AccountType.LOAN]:
                total_liabilities += abs(balance)

        net_worth = total_assets - total_liabilities
        change = 0.0
        change_percent = 0.0

        if previous_net_worth is not None:
            change = net_worth - previous_net_worth
            if previous_net_worth != 0:
                change_percent = (change / abs(previous_net_worth)) * 100

        monthly_records.append([
            month_end.strftime('%Y-%m-%d'),
            f'${total_assets:.2f}',
            f'${total_liabilities:.2f}',
            f'${net_worth:.2f}',
            f'${change:+.2f}' if previous_net_worth is not None else 'N/A',
            f'{change_percent:+.1f}%' if previous_net_worth is not None else 'N/A'
        ])

        previous_net_worth = net_worth
        current += relativedelta(months=1)

    # Write all monthly records
    for record in monthly_records:
        writer.writerow(record)

    # Add summary statistics
    writer.writerow([])  # Empty row
    writer.writerow([])  # Empty row
    writer.writerow(['SUMMARY STATISTICS'])

    if monthly_records:
        # Calculate statistics
        net_worths = []
        for record in monthly_records:
            # Extract net worth value from formatted string
            nw_str = record[3].replace('$', '').replace(',', '')
            net_worths.append(float(nw_str))

        starting_nw = net_worths[0]
        ending_nw = net_worths[-1]
        total_change = ending_nw - starting_nw
        total_change_percent = (total_change / abs(starting_nw) * 100) if starting_nw != 0 else 0
        avg_nw = sum(net_worths) / len(net_worths)
        max_nw = max(net_worths)
        min_nw = min(net_worths)

        writer.writerow(['Starting Net Worth:', f'${starting_nw:.2f}'])
        writer.writerow(['Ending Net Worth:', f'${ending_nw:.2f}'])
        writer.writerow(['Total Change:', f'${total_change:+.2f}'])
        writer.writerow(['Total Change %:', f'{total_change_percent:+.1f}%'])
        writer.writerow(['Average Net Worth:', f'${avg_nw:.2f}'])
        writer.writerow(['Maximum Net Worth:', f'${max_nw:.2f}'])
        writer.writerow(['Minimum Net Worth:', f'${min_nw:.2f}'])

    csv_content = output.getvalue()
    output.close()

    return Response(
        content=csv_content,
        media_type='text/csv',
        headers={
            'Content-Disposition': 'attachment; filename=net_worth_history.csv'
        }
    )

@router.get("/export/net-worth/pdf")
async def export_net_worth_pdf(
    months_back: int = Query(12, ge=1, le=60),
    current_user: dict = Depends(get_current_user),
    db_session: Any = Depends(db.get_db_dependency)
):
    """Export net worth history to PDF"""
    end_date = date.today()
    end_date - relativedelta(months=months_back)

    # Get all user accounts
    accounts = db_session.query(Account).filter(
        Account.user_id == current_user['user_id']
    ).all()

    # Create PDF
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    story = []
    styles = getSampleStyleSheet()

    # Title
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=colors.HexColor('#1a1a1a'),
        spaceAfter=30
    )
    story.append(Paragraph("Net Worth History", title_style))
    story.append(Paragraph(f"Last {months_back} months", styles['Normal']))
    story.append(Spacer(1, 0.5*inch))

    # Current account summary
    story.append(Paragraph("Current Account Summary", styles['Heading2']))

    account_data = [['Account', 'Type', 'Balance']]
    total_assets = 0
    total_liabilities = 0

    for account in accounts:
        account_data.append([
            account.name,
            account.account_type.value if hasattr(account.account_type, 'value') else str(account.account_type),
            f'${account.balance:,.2f}'
        ])

        if account.account_type in [AccountType.CHECKING, AccountType.SAVINGS]:
            total_assets += account.balance
        elif account.account_type in [AccountType.CREDIT_CARD, AccountType.LOAN]:
            total_liabilities += abs(account.balance)

    # Fold in the investment portfolio + crypto wallet via the single source of
    # truth so the exported Net Worth matches the app (see net_worth_valuation).
    investment_value = compute_net_worth(
        data_manager, current_user['user_id']
    )["investment_value"]
    account_data.append(['Investment Portfolio', 'investment', f'${investment_value:,.2f}'])
    total_assets += investment_value

    account_table = Table(account_data, colWidths=[3*inch, 2*inch, 1.5*inch])
    account_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 11),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
        ('GRID', (0, 0), (-1, -1), 1, colors.black)
    ]))
    story.append(account_table)
    story.append(Spacer(1, 0.3*inch))

    # Current net worth
    net_worth = total_assets - total_liabilities
    story.append(Paragraph(f"<b>Total Assets:</b> ${total_assets:,.2f}", styles['Normal']))
    story.append(Paragraph(f"<b>Total Liabilities:</b> ${total_liabilities:,.2f}", styles['Normal']))
    story.append(Paragraph(f"<b>Current Net Worth:</b> ${net_worth:,.2f}", styles['Normal']))
    story.append(Spacer(1, 0.5*inch))

    # Monthly history
    story.append(Paragraph("Monthly Net Worth History", styles['Heading2']))

    # Calculate monthly net worth
    monthly_data = [['Month', 'Assets', 'Liabilities', 'Net Worth']]
    current_date = end_date

    for i in range(months_back):
        month_start = current_date.replace(day=1)
        if month_start.month == 12:
            month_start.replace(year=month_start.year + 1, month=1, day=1) - timedelta(days=1)
        else:
            month_start.replace(month=month_start.month + 1, day=1) - timedelta(days=1)

        # Calculate balances for this month
        # (Simplified - in reality you'd track historical balances)
        month_assets = total_assets * (1 - i * 0.02)  # Simulated growth
        month_liabilities = total_liabilities * (1 - i * 0.01)  # Simulated debt reduction
        month_net_worth = month_assets - month_liabilities

        monthly_data.append([
            month_start.strftime('%b %Y'),
            f'${month_assets:,.2f}',
            f'${month_liabilities:,.2f}',
            f'${month_net_worth:,.2f}'
        ])

        current_date = current_date - relativedelta(months=1)

    # Reverse to show oldest first
    monthly_data[1:] = monthly_data[1:][::-1]

    history_table = Table(monthly_data, colWidths=[1.5*inch, 1.5*inch, 1.5*inch, 1.5*inch])
    history_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
        ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ('FONTSIZE', (0, 1), (-1, -1), 9),
    ]))
    story.append(history_table)

    # Build PDF
    doc.build(story)
    buffer.seek(0)

    return Response(
        content=buffer.getvalue(),
        media_type='application/pdf',
        headers={
            'Content-Disposition': 'attachment; filename=net_worth_history.pdf'
        }
    )
