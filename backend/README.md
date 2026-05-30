# Backend API Documentation


## Getting Started

### Running with Docker
```bash
# From the root directory
docker-compose up backend
```

### Local Development
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main_banking:app --reload --host 0.0.0.0 --port 8000
```

### API Documentation
When running, visit `http://localhost:8000/docs` for interactive Swagger documentation.

## Architecture

- **Framework**: FastAPI with async support
- **Database**: SQLAlchemy ORM with SQLite
- **Authentication**: JWT tokens with Bearer authentication
- **Models**: Comprehensive financial domain models

## Main Components

### Directory Structure
```
backend/
├── app/
│   ├── main_banking.py      # Main application entry point
│   ├── models/              # SQLAlchemy models
│   ├── routes/              # API route handlers
│   ├── services/            # Business logic
│   ├── utils/               # Utilities and helpers
│   └── db/                  # Database configuration
├── tests/                   # Test files
└── requirements.txt         # Python dependencies
```

### Database Models

#### Core Models
- **User**: User accounts with authentication
- **Account**: Financial accounts (checking, savings, credit cards)
- **Transaction**: Financial transactions with categorization
- **Category**: Spending categories with icons
- **Budget**: Monthly/weekly/yearly budgets
- **Goal**: Financial goals with progress tracking

#### Social Models
- **Contact**: User connections for P2P payments
- **Conversation**: Chat conversations
- **Message**: Chat messages with read receipts

#### Business Models
- **Card**: Credit/debit card management
- **Subscription**: Subscription tracking
- **Merchant**: Transaction merchants

### API Routes

#### Authentication (`/auth`)
- User registration with password hashing
- JWT-based login/logout
- Session management

#### Financial Management
- **Accounts**: CRUD operations, balance management
- **Transactions**: Create, list, filter, categorize
- **Budgets**: Track spending against limits
- **Goals**: Progress tracking, contributions

#### Social Features
- **Contacts**: Friend requests, contact management
- **Messages**: Real-time messaging for payment context
- **P2P Transfers**: Send money between users

#### Analytics & Tracking
- **Custom Events**: Track UI interactions
- **Session Management**: Track user sessions

### Mock Data Generation

The backend automatically generates realistic mock data on startup:

- **Users**: 6 pre-configured users (5 regular + 1 admin)
- **Accounts**: Multiple accounts per user with realistic balances
- **Transactions**: 90 days of categorized transaction history
- **Merchants**: 21 common merchants (Amazon, Starbucks, etc.)
- **Categories**: 16 system categories for income/expenses
- **Budgets**: Pre-configured monthly budgets
- **Goals**: Active financial goals with progress

- Page views, clicks, form submissions
- API requests and responses
- User authentication events
- Transaction operations

#### Interactive Component Events
- Slide-to-confirm gestures
- Toggle animations
- Chart interactions
- Drag gestures
- Calendar interactions

#### Event Structure
```json
{
  "session_id": "uuid",
  "action_type": "CLICK",
  "payload": {
    "text": "Human-readable description",
    "element_identifier": "button-id",
    "page_url": "current-page",
    "coordinates": {"x": 100, "y": 200}
  }
}
```

### Security Features

- Password hashing with bcrypt
- JWT token authentication
- Role-based access control (USER/ADMIN)
- Session management
- CORS configuration for frontend integration

### Performance Optimizations

- Async request handling
- Database connection pooling
- Efficient query optimization
- In-memory SQLite for development
- Pagination support for large datasets

## Common Tasks

### Adding a New Endpoint
1. Create route handler in `app/routes/`
2. Define request/response models
3. Implement business logic in services
5. Update API documentation

### Modifying Mock Data
Mock/demo data is generated from a single source of truth: `DataManager.reset()`
in `app/repositories/data_manager.py` (seeded with `random.seed(seed)` for
reproducibility). Edit the `_generate_*` helpers there to customize:
- Number of users
- Transaction patterns
- Account balances
- Category definitions
- Budgets (seeded as one monthly budget per spending category)

All spending figures (Dashboard, Analytics, Transactions, Budget) are computed
from this data through the shared `app/services/spending_aggregator.py` so they
always reconcile.

### Testing
Run tests with pytest:
```bash
pytest tests/
```

## Environment Variables

- `SEED`: Random seed for deterministic data (default: "0000000000000000")
- `DATABASE_URL`: SQLite connection string (default: in-memory)
- `SECRET_KEY`: JWT signing key (auto-generated if not set)
- `ACCESS_TOKEN_EXPIRE_MINUTES`: Token expiration (default: 30)