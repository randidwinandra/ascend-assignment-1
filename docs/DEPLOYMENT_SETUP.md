# GitHub Actions Deployment Setup

This guide will help you configure automatic deployment of your Supabase project using GitHub Actions.

## Required GitHub Secrets

You need to set up the following secrets in your GitHub repository:

### 1. Go to Repository Settings
- Navigate to your GitHub repository
- Go to **Settings** → **Secrets and variables** → **Actions**
- Click **New repository secret**

### 2. Add Required Secrets
#### **Required for Deployment**
- `SUPABASE_PROJECT_REF`
- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_DB_PASSWORD`

#### **Required for Testing**
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`


## How the Workflow Works

The workflow has three main jobs:

### **Test Job** (Quality Assurance)
- **Triggered by**: Push or pull requests to main/develop branch
- **Purpose**: Ensures code quality and functionality before deployment
- **Process**:
  1. **Code Quality Checks**:
     - TypeScript type checking (`npm run type-check`)
     - ESLint code linting (`npm run lint`)
     - Unit tests execution (`npm test`)
     - Code coverage analysis (`npm run test:coverage`)
  2. **Edge Function Testing**:
     - Tests Edge Functions logic (`npm run test:functions`)
     - Uses live Supabase and Redis connections
     - Validates API endpoints and business logic
     - Tests rate limiting and caching functionality

### **Validation Job** (Pull Requests)
- **Triggered by**: Pull requests to main/master branch
- **Purpose**: Validates migrations and functions without deploying
- **Checks**: 
  - Migration files exist and are valid
  - Function directories are present
  - Basic project structure is intact

### **Deploy Job** (Production)
- **Triggered by**: Push to main/master branch or manual trigger
- **Purpose**: Deploys to production Supabase project
- **Process**:
  1. **Environment Setup** - Installs Node.js and Supabase CLI
  2. **Project Linking** - Connects to your Supabase project
  3. **Migration Status** - Checks current migration state
  4. **Database Migrations** - Applies any new schema changes
  5. **Edge Functions** - Deploys all serverless functions
  6. **Verification** - Confirms deployment success
  7. **Summary** - Provides deployment summary in GitHub

  
## What the Workflow Does

### For Pull Requests (Validation Only)
- Validates project structure
- Checks migration and function files
- Ensures deployability without actually deploying

### For Production Deployments
- Applies database migrations with status checking
- Deploys all Edge Functions with verification
- Provides detailed deployment logs and summaries
- Posts deployment status to GitHub summary

## Security Notes

- All secrets are encrypted and only accessible to your GitHub Actions
- The workflow uses the `production` environment for additional security
- Database operations are performed with proper authentication
- Functions are deployed without JWT verification for the deployment process

## Troubleshooting

### Common Issues:

1. **"Project not found"** - Check your `SUPABASE_PROJECT_REF` secret
2. **"Authentication failed"** - Verify your `SUPABASE_ACCESS_TOKEN` is valid
3. **"Database connection failed"** - Confirm your `SUPABASE_DB_PASSWORD` is correct
4. **"Functions deployment failed"** - Check your Edge Function syntax

### Manual Deployment:

If you need to deploy manually:
```bash
# Link your project
supabase link --project-ref YOUR_PROJECT_REF

# Run migrations
supabase db push

# Deploy functions
supabase functions deploy --no-verify-jwt
```

## Current Project Structure

```
supabase/
├── migrations/
│   ├── 20250704160000_initial_schema.sql
│   ├── 20250704175726_fix_existing_users_migration.sql
│   └── 20250704181314_simple_trigger_fix.sql
└── functions/
    ├── create-survey/
    ├── get-survey-analytics/
    ├── get-survey-by-token/
    ├── get-surveys/
    └── submit-response/
```