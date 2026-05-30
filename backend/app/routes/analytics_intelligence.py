"""
Enhanced analytics and data intelligence API endpoints.
Provides comprehensive financial insights and real-time metrics.
"""
import logging
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, Query

from ..repositories.data_manager import data_manager
from ..services.analytics_engine import AnalyticsEngine
from ..services.event_schemas import EventType
from ..services.event_streaming import event_streaming_service
from ..services.spending_aggregator import current_month_window
from ..utils.auth import get_current_user

router = APIRouter()
logger = logging.getLogger(__name__)

# Initialize analytics engine
analytics_engine = AnalyticsEngine(data_manager)


@router.get("/intelligence/transaction-velocity")
async def get_transaction_velocity(
    days: int = Query(30, ge=1, le=365),
    current_user: dict = Depends(get_current_user)
):
    """Get transaction velocity and patterns."""
    return analytics_engine.calculate_transaction_velocity(
        user_id=current_user['user_id'],
        days=days
    )


@router.get("/intelligence/cash-flow")
async def get_cash_flow_intelligence(
    period_days: int = Query(30, ge=1, le=365),
    current_user: dict = Depends(get_current_user)
):
    """Get cash flow analysis with categorization and trends."""
    return analytics_engine.calculate_cash_flow(
        user_id=current_user['user_id'],
        period_days=period_days
    )


@router.get("/intelligence/investment-performance")
async def get_investment_performance(
    current_user: dict = Depends(get_current_user)
):
    """Get comprehensive investment portfolio performance metrics."""
    return analytics_engine.calculate_investment_performance(
        user_id=current_user['user_id']
    )


@router.get("/intelligence/anomalies")
async def detect_financial_anomalies(
    lookback_days: int = Query(90, ge=30, le=365),
    current_user: dict = Depends(get_current_user)
):
    """Detect unusual financial activities and anomalies."""
    anomalies = analytics_engine.detect_anomalies(
        user_id=current_user['user_id'],
        lookback_days=lookback_days
    )
    return {
        "anomalies": anomalies,
        "count": len(anomalies),
        "lookback_days": lookback_days
    }


@router.get("/intelligence/subscription-insights")
async def get_subscription_insights(
    current_user: dict = Depends(get_current_user)
):
    """Get subscription cost optimization and recommendations."""
    return analytics_engine.calculate_subscription_insights(
        user_id=current_user['user_id']
    )


@router.get("/intelligence/loan-risk")
async def get_loan_risk_score(
    current_user: dict = Depends(get_current_user)
):
    """Get loan payment analysis and delinquency risk scoring."""
    return analytics_engine.calculate_loan_risk_score(
        user_id=current_user['user_id']
    )


@router.get("/intelligence/budget-adherence")
async def get_budget_adherence(
    current_user: dict = Depends(get_current_user)
):
    """Get budget adherence tracking with predictive alerts."""
    return analytics_engine.calculate_budget_adherence(
        user_id=current_user['user_id']
    )


@router.get("/intelligence/spending-trends")
async def get_spending_trends(
    months: int = Query(6, ge=1, le=24),
    current_user: dict = Depends(get_current_user)
):
    """Get category-wise spending trends with seasonal adjustments."""
    return analytics_engine.calculate_spending_trends(
        user_id=current_user['user_id'],
        months=months
    )


@router.get("/intelligence/financial-health")
async def get_financial_health_score(
    current_user: dict = Depends(get_current_user)
):
    """Get comprehensive financial health score (0-100)."""
    return analytics_engine.calculate_financial_health_score(
        user_id=current_user['user_id']
    )


@router.get("/intelligence/dashboard-summary")
async def get_dashboard_summary(
    current_user: dict = Depends(get_current_user)
):
    """
    Get comprehensive dashboard summary with all key metrics.
    This is the main endpoint for the analytics dashboard.
    """
    user_id = current_user['user_id']

    # Capture feature usage event
    event_streaming_service.capture_event(
        event_type=EventType.FEATURE_ACCESSED,
        user_id=user_id,
        event_data={
            'feature_name': 'analytics_dashboard',
            'feature_category': 'analytics',
            'action': 'viewed'
        }
    )

    # Calculate all key metrics
    try:
        # Use the canonical current-calendar-month window so the Analytics
        # "Money Out" matches the Dashboard "Monthly Spending" and the Budget
        # page "Total Spent" for the same period.
        month_start, month_end = current_month_window()
        cash_flow = analytics_engine.calculate_cash_flow(
            user_id, start_date=month_start, end_date=month_end
        )
        investment_perf = analytics_engine.calculate_investment_performance(user_id)
        budget_adh = analytics_engine.calculate_budget_adherence(user_id)
        financial_health = analytics_engine.calculate_financial_health_score(user_id)
        anomalies = analytics_engine.detect_anomalies(user_id, 90)

        # Get accounts for net worth
        accounts = [acc for acc in data_manager.accounts if acc.get('user_id') == user_id]
        total_assets = sum([
            acc.get('balance', 0) for acc in accounts
            if acc.get('account_type') in ['checking', 'savings', 'investment'] and acc.get('is_active', True)
        ])
        total_liabilities = sum([
            abs(acc.get('balance', 0)) for acc in accounts
            if acc.get('account_type') in ['credit_card', 'loan'] and acc.get('is_active', True)
        ])
        net_worth = total_assets - total_liabilities

        return {
            "summary": {
                "net_worth": round(net_worth, 2),
                "total_assets": round(total_assets, 2),
                "total_liabilities": round(total_liabilities, 2),
                "monthly_cash_flow": round(cash_flow['net_flow'], 2),
                "savings_rate": round(cash_flow['savings_rate'], 2),
                "financial_health_score": financial_health['overall_score'],
                "financial_health_rating": financial_health['rating']
            },
            "cash_flow": cash_flow,
            "investment_performance": investment_perf,
            "budget_adherence": {
                "total_budgets": budget_adh['total_budgets'],
                "on_track_count": budget_adh['on_track_count'],
                "over_budget_count": budget_adh['over_budget_count'],
                "at_risk_count": budget_adh['at_risk_count']
            },
            "anomalies": {
                "count": len(anomalies),
                "recent": anomalies[:5]
            },
            "timestamp": datetime.now(UTC).isoformat()
        }

    except Exception as e:
        logger.error(f"Error calculating dashboard summary: {e}", exc_info=True)
        return {
            "error": "Failed to calculate some metrics",
            "message": str(e)
        }


@router.get("/events/recent")
async def get_recent_events(
    limit: int = Query(50, ge=1, le=500),
    event_type: str | None = None,
    current_user: dict = Depends(get_current_user)
):
    """Get recent events for the current user."""
    event_types = [EventType(event_type)] if event_type else None

    events = event_streaming_service.get_events(
        user_id=current_user['user_id'],
        event_types=event_types,
        limit=limit
    )

    return {
        "events": events,
        "count": len(events)
    }


@router.get("/events/stats")
async def get_event_statistics(
    days: int = Query(30, ge=1, le=365),
    current_user: dict = Depends(get_current_user)
):
    """Get event statistics for the user."""
    from collections import Counter
    from datetime import timedelta

    start_date = datetime.now(UTC) - timedelta(days=days)

    events = event_streaming_service.get_events(
        user_id=current_user['user_id'],
        start_date=start_date,
        limit=10000
    )

    # Count by event type
    event_counts = Counter([e['event_type'] for e in events])

    # Count by day
    daily_counts = Counter([
        datetime.fromisoformat(e['timestamp'].replace('Z', '+00:00')).date().isoformat()
        for e in events
    ])

    return {
        "total_events": len(events),
        "period_days": days,
        "by_type": dict(event_counts),
        "by_day": dict(sorted(daily_counts.items())),
        "unique_event_types": len(event_counts)
    }
