# Flash Survey Tool - StoryStream Studios

## Architecture Overview

### System Diagram
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│                 │    │                 │    │                 │
│   React App     │◄──►│   Supabase      │◄──►│   Redis Cache   │
│                 │    │                 │    │                 │
│ - Admin Panel   │    │ - PostgreSQL    │    │ - Rate Limiting │
│ - Survey Form   │    │ - Edge Functions│    │ - Session Cache │
│ - Dashboard     │    │ - Realtime      │    │ - Response Cache│
│                 │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│                 │    │                 │    │                 │
│  Google OAuth   │    │  Edge Functions │    │  Upstash Redis  │
│                 │    │                 │    │                 │
│ - Authentication│    │ - Vote Counting │    │ - Global Cache  │
│ - User Profile  │    │ - Rate Limiting │    │ - Fast Lookups  │
│                 │    │ - Analytics     │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Key Architectural Decisions

1. **React + Supabase + Redis Stack**
   - React for responsive UI with real-time updates
   - Supabase for managed PostgreSQL + Edge Functions
   - Redis for caching and rate limiting

2. **Google OAuth Integration**
   - Secure admin authentication
   - No manual user management required

3. **Rate Limiting & Security**
   - Redis-based rate limiting (100 votes max per survey)
   - IP-based duplicate prevention
   - Survey expiration (3 days)

4. **Real-time Dashboard**
   - Supabase real-time subscriptions
   - Live vote counting and analytics

## Quick Start (< 5 minutes)

### Prerequisites
- Node.js 18+
- Git
- Google OAuth credentials
- Supabase account
- Upstash Redis account

### Setup Steps

1. **Clone and Install**
   ```bash
   git clone <repo-url>
   cd ascend-asignment-1
   npm install
   ```

2. **Environment Setup**
   ```bash
   cp .env.example .env.local
   # Fill in your credentials (see .env.example for details)
   ```

3. **Database Setup**
   ```bash
   # Supabase migrations will auto-apply
   npm run db:setup
   ```

4. **Start Development**
   ```bash
   npm run dev
   ```

5. **Access Application**
   - Admin: `http://localhost:3000/admin`
   - Survey: Public links generated after creation

## Performance Budgets & Measurement

### Performance Targets
- **P95 Page Load:** ≤ 2s (Singapore POP)
- **P99 Edge Function:** ≤ 750ms
- **Survey Response Time:** ≤ 500ms
- **Dashboard Update:** Real-time (< 100ms)

### Measurement Methods
1. **Core Web Vitals**
   - LCP (Largest Contentful Paint) < 2.5s
   - CLS (Cumulative Layout Shift) < 0.1
   - FID (First Input Delay) < 100ms

2. **Edge Function Monitoring**
   - Built-in Supabase analytics
   - Custom performance logging
   - Redis response time tracking

3. **Load Testing**
   ```bash
   npm run test:load
   ```

### Performance Optimizations
- React code splitting and lazy loading
- Supabase connection pooling
- Redis caching for frequently accessed data
- Optimized database queries with indexes
- Image optimization and CDN usage

## Cost Structure

### Marginal Costs (per 1000 surveys)
- **Supabase Rows:** ~500 rows × $0.00013 = $0.065
- **Upstash Operations:** ~2000 ops × $0.0002 = $0.40
- **Edge Function Invocations:** ~3000 calls × $0.0000002 = $0.0006
- **Total per 1000 surveys:** ~$0.466

### Cost Optimization
- Survey data retention: 30 days
- Redis TTL: 7 days for survey responses
- Automatic cleanup of expired surveys
- Efficient database indexing

## Technology Stack

### Frontend
- **React 18** with hooks and context
- **Next.js 14** for SSR and routing
- **Tailwind CSS** for styling
- **Radix UI** for components
- **React Query** for data fetching

### Backend
- **Supabase PostgreSQL** for data storage
- **Supabase Edge Functions** (Deno) for API logic
- **Supabase Realtime** for live updates
- **Upstash Redis** for caching and rate limiting

### Authentication
- **Google OAuth2** via Supabase Auth
- **Row Level Security** for data protection

### Deployment
- **Vercel** for frontend hosting
- **Supabase** for backend services
- **GitHub Actions** for CI/CD

## API Endpoints

### Admin Endpoints
- `POST /api/surveys` - Create new survey
- `GET /api/surveys` - List admin surveys
- `GET /api/surveys/:id` - Get survey details
- `GET /api/surveys/:id/results` - Get survey results

### Public Endpoints
- `GET /api/survey/:token` - Get public survey
- `POST /api/survey/:token/vote` - Submit vote
- `GET /api/survey/:token/status` - Check survey status

## Security Features

1. **Rate Limiting**
   - 100 votes per survey maximum
   - IP-based duplicate prevention
   - Redis-backed rate limiting

2. **Data Protection**
   - Row Level Security (RLS)
   - Anonymous voting
   - Automatic data expiration

3. **Authentication**
   - Google OAuth2 only
   - Admin-only survey creation
   - Secure session management

## Monitoring & Observability

### Health Checks
- Database connectivity
- Redis availability
- Edge function responsiveness
- OAuth service status

### Logging
- Structured logging in Edge Functions
- Performance metrics collection
- Error tracking and alerting

### Metrics Dashboard
- Survey creation rate
- Vote submission rate
- Response time distribution
- Error rate monitoring

## Development Scripts

```bash
# Development
npm run dev              # Start development server
npm run build           # Build for production
npm run start           # Start production server

# Database
npm run db:setup        # Setup database schema
npm run db:seed         # Seed test data
npm run db:reset        # Reset database

# Testing
npm run test            # Run unit tests
npm run test:e2e        # Run e2e tests
npm run test:load       # Run load tests

# Deployment
npm run deploy          # Deploy to production
npm run deploy:staging  # Deploy to staging
```

## Support

For technical support or questions about the Flash Survey tool, please refer to the development team or create an issue in the repository. 