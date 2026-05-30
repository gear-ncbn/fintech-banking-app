# BankFlow - Modern Banking & Finance Platform

A comprehensive personal finance and banking platform built with Next.js and FastAPI. This full-featured application provides extensive financial management tools including multi-account management, investment tracking, budgeting, peer-to-peer payments, and advanced analytics.

## Documentation

For comprehensive documentation about the platform, please refer to:

- **[Feature Overview](docs/project-feature-overview.md)** - Complete feature inventory and implementation status
- **[User Flow Documentation](docs/user-flow-documentation.md)** - Detailed user interaction flows and workflows
- **[Backend API Specification](docs/backend-api-specification.md)** - Complete API endpoint documentation
- **[Frontend Architecture Guide](docs/frontend-architecture-guide.md)** - Frontend components and structure

## Getting Started

### Prerequisites

- Docker and Docker Compose installed
- Node.js 20+ (for local development)
- Python 3.12+ (for local development)

### Environment Setup

Before running the application, configure your environment variables:

#### Frontend Environment Variables

Create a `.env` file in the `frontend` directory (or copy from `.env.example`):

```bash
# Frontend .env
NODE_ENV=development
NEXT_PUBLIC_API_URL=http://localhost:8000
```

#### Backend Environment Variables

Create a `.env` file in the `backend` directory (or copy from `.env.example`):

```bash
# Backend .env
ENVIRONMENT=development
API_HOST=0.0.0.0
API_PORT=8000
USE_MOCK_DB=true

# For production, set these:
# SECRET_KEY=your-production-secret-key
# JWT_SECRET=your-production-jwt-secret
```

**Note**: Never commit `.env` files to version control. Use `.env.example` as a template.

### Quick Start

```bash
# Clone the repository
git clone <repository-url>
cd bankflow

# Copy environment files
cp frontend/.env.example frontend/.env
cp backend/.env.example backend/.env

# Start the application
docker-compose up --build

# Access the application
# Frontend: http://localhost:3000
# Backend API: http://localhost:8000
# API Documentation: http://localhost:8000/docs
```

### Local Development Setup

#### Frontend Development

```bash
cd frontend

# Install dependencies
npm install

# Run linter
npm run lint

# Run type check
npx tsc --noEmit

# Run tests
npm test

# Start development server
npm run dev
```

#### Backend Development

```bash
cd backend

# Install dependencies
pip install -r requirements.txt

# Run linter
python -m ruff check .

# Run type check
python -m mypy . --ignore-missing-imports

# Run tests (when available)
python -m pytest

# Start development server
uvicorn app.main:app --reload
```

### Docker Deployment

#### Docker Compose Configuration
The application uses Docker Compose for orchestrating both frontend and backend services. The configuration includes:

- **Frontend Service**: Next.js application running on port 3000
- **Backend Service**: FastAPI application running on port 8000
- **Environment Variables**: Configurable through `.env` file or docker-compose environment section
- **Health Checks**: Built-in health monitoring for both services
- **Production-Ready Images**: Multi-stage builds for optimized container sizes

#### Production Dockerfile Features

**Backend Dockerfile**:
- Multi-stage build for smaller image size
- Non-root user execution for security
- Health check endpoint configuration
- Configurable worker count and environment mode
- Signal handling for graceful shutdown

**Frontend Dockerfile**:
- Multi-stage build with separate builder and runner stages
- Next.js standalone output for minimal runtime
- dumb-init for proper signal handling
- Non-root user (nextjs) for security
- Optimized for production with minimal dependencies

#### Environment Configuration
```bash
# Backend environment variables
ENV=production          # or development
PORT=8000              # API port
WORKERS=4              # Number of uvicorn workers

# Frontend environment variables
NODE_ENV=production    # Node environment
NEXT_PUBLIC_API_URL=http://backend:8000  # Backend API URL
```

#### Docker Commands
```bash
# Build and start in detached mode
docker-compose up --build -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Rebuild specific service
docker-compose up --build frontend

# Execute commands in running container
docker-compose exec backend python -m pytest
docker-compose exec frontend npm run lint
```


### Default Login Credentials
- Regular users: `john_doe`, `jane_smith`, `mike_wilson`, `sarah_jones`, `david_brown`
  - Password: `DemoUser2026Banking`
- Admin user: `admin`
  - Password: `AdminUser2026Banking`

## Application Overview

This banking application combines personal finance management with social payment features, offering comprehensive financial tools that go beyond typical banking apps. The application includes advanced features for business banking, investment tracking, and intelligent financial planning.

### Core Financial Features


#### Multi-Account Management
- Support for multiple account types: Checking, Savings, Credit Cards, Investments, and Loans
- Real-time balance tracking across all accounts
- Account grouping and organization
- Institution tracking with mock bank integrations
- Interest rate management for savings and loans
- Credit limit tracking for credit cards
- Investment portfolio overview


#### Advanced Transaction Management
- Automated transaction categorization with AI-powered merchant detection
- Split transactions for shared expenses
- Recurring transaction detection and management
- Transaction tagging and notes
- Receipt attachment support
- Transaction search with advanced filters
- Bulk transaction editing
- Transaction status tracking (pending, completed, failed)

#### Comprehensive Budgeting System
- Multiple budget periods: Weekly, Monthly, and Yearly
- Category-based spending limits with visual progress tracking
- Budget alerts at customizable thresholds (default 80%)
- Budget vs actual spending analysis
- Budget templates for quick setup
- Rollover budgets for unused funds
- Budget sharing between family members
- Historical budget performance tracking

#### Financial Goals & Planning
- Short-term and long-term goal setting
- Automated savings contributions
- Goal milestones with celebration animations
- Multiple goal types: Emergency Fund, Vacation, Home Purchase, etc.
- Goal progress visualization with charts
- Collaborative goals for couples/families
- Goal achievement predictions based on saving patterns

### Advanced Features

#### Smart Card Management
- Physical and virtual card support
- Instant card freeze/unfreeze with toggle animations
- Per-merchant spending limits and controls
- Transaction-specific virtual card generation
- Card usage analytics and insights
- Fraud detection alerts
- International transaction controls
- Contactless payment settings
- ATM withdrawal limits
- Card replacement requests

#### Credit Score & Management
- Real-time credit score monitoring
- Credit score simulator for "what-if" scenarios
- Personalized tips for credit improvement
- Credit utilization tracking with alerts
- Credit report generation with detailed breakdowns
- Credit card recommendation engine
- Debt payoff calculator
- Credit history timeline
- Score change notifications

#### Intelligent Savings Tools
- Automatic round-up savings on all purchases
- Rule-based automatic transfers
- Savings challenges with gamification
- High-yield savings account recommendations
- Savings goal optimization with AI
- Emergency fund calculator
- Savings rate analysis
- Micro-investing integration
- Spare change investment options

#### Business Banking Suite
- Professional invoice generation with templates
- Expense tracking with receipt scanning
- Advanced transaction categorization for tax purposes
- Mileage tracking for business travel
- Quarterly tax estimation
- Profit/loss reporting
- Client payment tracking
- Vendor management
- Business credit card controls
- Expense approval workflows

#### Subscription Intelligence
- Automatic subscription detection from transaction history
- Subscription cost analysis and optimization
- Free trial expiration alerts
- Cancellation reminders and assistance
- Subscription sharing recommendations
- Price increase notifications
- Alternative service suggestions
- Subscription calendar view
- Usage tracking for value analysis

### Social & Communication Features

#### Peer-to-Peer Payments
- Instant money transfers between users
- Payment requests with custom messages
- Group payment splitting
- Payment scheduling
- QR code payments
- Payment history with social context
- Emoji reactions to payments
- Payment limits and controls

#### Integrated Messaging
- In-app chat for payment context
- Transaction-linked conversations
- Group chats for shared expenses
- Read receipts and typing indicators
- Message reactions and replies
- Voice message support
- Payment request buttons in chat
- Expense splitting in conversations

#### Contact Management
- Smart contact suggestions based on transaction history
- Favorite contacts for quick access
- Contact grouping (Family, Friends, Work)
- Payment frequency tracking
- Birthday reminders with gift suggestions
- Contact blocking for security

### Security & Privacy Features

#### Advanced Authentication
- Two-factor authentication (SMS, Email, Authenticator apps)
- Biometric authentication (Face ID, Touch ID simulation)
- Device trust management
- Login attempt monitoring
- Session management across devices
- Security questions backup
- Emergency access setup

#### Privacy Controls
- Transaction privacy settings
- Data export capabilities
- Account deletion options
- Third-party app permissions
- Marketing preference controls
- Data sharing transparency

### Analytics & Insights

#### Spending Intelligence
- AI-powered spending insights
- Unusual spending alerts
- Category trend analysis
- Merchant spending patterns
- Predictive budget warnings
- Cash flow forecasting
- Net worth tracking
- Investment performance

#### Financial Reports
- Monthly/Yearly financial summaries
- Tax-ready reports
- Expense reports by category
- Income analysis
- Custom report generation
- Report scheduling and automation
- PDF/CSV export options

### Mobile-First Features

#### Responsive Design
- Fully responsive across all devices
- Touch-optimized interactions
- Swipe gestures for common actions
- Pull-to-refresh functionality
- Mobile-specific navigation drawer
- Haptic feedback simulation

#### Mobile-Specific Components
- Slide-to-confirm for secure transactions
- Touch ID/Face ID UI components
- Mobile-optimized data tables
- Bottom sheet modals
- Floating action buttons
- Gesture-based navigation

### Accessibility Features
- Screen reader compatibility
- High contrast mode
- Keyboard navigation support
- Font size adjustments
- Color blind friendly palettes
- Voice command integration

### Integration Capabilities
- Bank account linking simulation
- Credit card integration
- Investment account connections
- Cryptocurrency wallet support
- PayPal/Venmo style integrations
- Apple Pay/Google Pay simulation

## Mock Data

The application comes pre-populated with comprehensive, realistic mock data:

### Users
- 5 regular users with complete profiles and transaction history
- 1 admin user for administrative access
- Each user has unique spending patterns and financial situations

### Financial Data
- 90 days of detailed transaction history per user
- 16 system-defined spending categories with icons
- 21 common merchants with logos and category mappings
- Multiple account types per user with realistic balances
- Pre-configured budgets with varying spending levels
- Active financial goals at different progress stages
- Recurring transactions for subscriptions and bills

### Social Features
- Pre-established contact relationships between users
- Rich message history for payment context
- Group conversations for shared expenses
- Payment request threads
- Transaction comments and reactions

## API Endpoints

- Authentication endpoints for secure access
- Account management with balance tracking
- Transaction APIs with advanced filtering
- Budget creation and monitoring
- Goal tracking and contributions
- Category management

### Advanced Feature APIs
- Card management and controls
- Credit score simulation
- Business banking operations
- Subscription detection and analysis
- Savings automation rules
- Contact and messaging systems

## Frontend Pages

### Public Pages
- `/` - Landing page with feature showcase
- `/login` - Secure user login
- `/register` - New user registration

### Core Banking Pages
- `/dashboard` - Comprehensive financial overview
- `/accounts` - Multi-account management
- `/transactions` - Transaction history and search
- `/budget` - Budget creation and tracking
- `/goals` - Financial goal management

### Advanced Feature Pages
- `/cards` - Card management with virtual cards
- `/credit` - Credit score and management
- `/savings` - Smart savings tools
- `/business` - Business banking suite
- `/subscriptions` - Subscription management
- `/p2p` - Peer-to-peer payments
- `/messages` - Payment messaging
- `/analytics` - Financial insights
- `/settings` - User preferences
- `/security` - Security settings

## Architecture

- **Frontend**: Next.js 15 with App Router, TypeScript, Tailwind CSS
- **Backend**: FastAPI with async support, SQLAlchemy ORM
- **Database**: SQLite with in-memory option for development
- **Authentication**: JWT-based with refresh tokens
- **Real-time**: WebSocket support for live updates

## Development Features

- Hot reload for both frontend and backend
- Comprehensive error logging
- Mock data generation with seed support
- API documentation with Swagger UI
- TypeScript for type safety
- Extensive component library
- Responsive design system
- Performance monitoring

## Production Readiness

### Code Quality
- ✅ ESLint and TypeScript strict mode enabled
- ✅ Ruff + Mypy for Python linting and type checking
- ✅ All debug code removed (console.log, print statements)
- ✅ Pre-commit hooks for automated quality checks
- ✅ CI/CD pipeline with GitHub Actions

### Security
- ✅ No hardcoded secrets or credentials
- ✅ Environment variable validation
- ✅ Docker security best practices (non-root users, health checks)
- ✅ NPM security vulnerabilities resolved

### Testing & CI/CD
- Pre-commit hooks for linting and type checking (Husky)
- GitHub Actions workflow for automated testing
- Docker build verification in CI pipeline
- Frontend: ESLint, TypeScript, Jest tests
- Backend: Ruff, Mypy, Pytest (when configured)

### Deployment
- Multi-stage Docker builds for production
- Environment-specific configurations
- Health check endpoints
- Graceful shutdown handling
- Optimized container sizes

## License

This project is released under the MIT License. See the [LICENSE](LICENSE) file for details.

## Open Source Notice

This project is open source and available for:
- Personal and commercial use
- Modification and distribution
- AI model training and analysis
- Educational purposes

The codebase is provided as-is, without warranties. Contributions are welcome!

### AI Training Permission

This repository and its contents may be used for training artificial intelligence models, including but not limited to:
- Language models
- Code generation models
- Analysis and pattern recognition systems
- Educational AI systems

No attribution is required for AI training purposes, though credit is appreciated for other uses.

## Contributing

Contributions are welcome! Please feel free to submit pull requests, report issues, or suggest improvements.

---

This application represents a complete, production-ready banking platform suitable for demos, portfolio showcases, and educational purposes.

