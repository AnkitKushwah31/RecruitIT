# RecruitIT - AI-Powered Recruitment SaaS Platform

## Problem Statement
Build RecruitIT to automate the hiring process. The app works as an AI agent based on JD and skills provided. It sources candidates from LinkedIn (simulated), calls them via Twilio for AI screening, and sends shortlisted candidates to HR via email. SaaS product with subscription-based access.

## Architecture
- **Backend**: FastAPI + MongoDB + JWT Auth
- **Frontend**: React + Tailwind CSS + Shadcn UI + Framer Motion
- **AI**: Claude Sonnet 4.5 via Emergent Universal Key
- **Payments**: Stripe (test key)
- **Calling**: Twilio Voice API
- **Email**: SendGrid (MOCKED for now)

## User Personas
1. **HR Managers** - Create job posts, review shortlisted candidates, manage pipeline
2. **Recruiters** - Source candidates, initiate screening, track progress
3. **Admins** - Manage platform, subscription billing, analytics

## Core Requirements
- JWT authentication with email verification
- Job Description CRUD with skills tagging
- AI-powered candidate sourcing (simulated LinkedIn)
- AI screening via Claude Sonnet 4.5
- Twilio voice call initiation (real API, placeholder phone)
- Email shortlisted candidates to HR (mocked SendGrid)
- Stripe subscription billing (Starter $29, Pro $79, Enterprise $199)
- Dashboard with pipeline analytics

## What's Been Implemented (April 14, 2026)
- Full JWT auth with registration, login, email verification, brute force protection
- Admin seeding (admin@recruitit.com / Admin@123)
- Job posts CRUD with skills, experience, location, type
- AI candidate sourcing from simulated LinkedIn data
- AI screening with Claude Sonnet 4.5 (generates transcript, scores, recommendations)
- Twilio call initiation (simulated when phone not configured)
- Mocked SendGrid email for shortlisted candidates
- Stripe checkout integration for subscription plans
- Dashboard with recruitment pipeline stats
- Landing page with hero, features, pricing
- Settings page with profile and billing tabs
- Full responsive design with Framer Motion animations

## MongoDB Collections
- users, jobs, candidates, email_verification_tokens, login_attempts, payment_transactions

## Prioritized Backlog
### P0 (Critical)
- [x] Auth system
- [x] Job CRUD
- [x] Candidate sourcing
- [x] AI screening
- [x] Dashboard

### P1 (Important)
- [ ] Real SendGrid integration (user needs API key)
- [ ] Twilio phone number configuration for real calls
- [ ] Real LinkedIn API integration when available
- [ ] Password reset flow
- [ ] Edit profile functionality

### P2 (Nice to Have)
- [ ] Analytics charts (screening trends, time-to-hire)
- [ ] Candidate notes and collaboration
- [ ] Bulk actions (screen all, shortlist multiple)
- [ ] Email templates customization
- [ ] Webhook for real-time notifications
- [ ] Role-based access control

## Next Tasks
1. Add SendGrid API key for real email delivery
2. Configure Twilio phone number for actual calls
3. Build LinkedIn API integration when API access is available
4. Add analytics dashboard with charts
5. Implement password reset flow
