# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/adbed708-71a6-44db-9750-2e7ae0aefbf8

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/adbed708-71a6-44db-9750-2e7ae0aefbf8) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/adbed708-71a6-44db-9750-2e7ae0aefbf8) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)

# EduPlatform - Complete Documentation

## Overview
EduPlatform is a comprehensive educational SaaS application built with React, TypeScript, Tailwind CSS, and Supabase. It supports multi-tenancy, allowing multiple organizations to use the platform independently.

## Current Functionalities

### 🔐 Authentication & User Management
- User Registration: Email/password signup with grade selection
- User Login: Secure authentication with session persistence
- Multi-tenant Support: Users belong to specific organizations (tenants)
- Role-based Access Control: Super Admin, Admin, Tutor, Student, Parent roles
- Profile Management: Users can update personal information, avatar, grade
- User Suspension: Admins can suspend/unsuspend users

### 👥 User Roles & Permissions
- Super Admin: Global access across all tenants, platform management
- Admin: Tenant-specific management, user oversight
- Tutor: Content creation and student guidance
- Student: Learning portal access, progress tracking
- Parent: Monitoring child's progress (role exists but limited functionality)

### 🏢 Multi-Tenant Architecture
- Tenant Isolation: Complete data separation between organizations
- Default Tenant: "Default Organization" for new registrations
- Tenant Management: Super admins can view all tenants and their statistics

### 📚 Learning Management System
- Subjects: Organized course categories with class times and Teams links
- Topics: Subject subdivisions for content organization
- Lessons: Content delivery with multiple types:
  - Reading materials with rich text content
  - Video lessons with embedded players
  - Quiz assessments with multiple choice questions
- Lesson Ordering: Sequential content delivery
- Due Dates: Assignment deadlines and scheduling

### 📊 Progress Tracking
- Lesson Completion: Automatic progress tracking
- Subject Progress: Percentage completion per subject
- Quiz Attempts: Score tracking and pass/fail status
- Activity Logging: Recent user activities and achievements

### 🧠 AI-Powered Features
- AI Tutor: Conversational AI assistant for learning support
  - Gemini API integration for natural language responses
  - Context-aware educational guidance
  - Conversation history and note saving
- Study Plan Generator: AI-generated personalized study plans
  - Goal-based planning with timeframes
  - Subject-specific recommendations
  - Save and view past plans

### 📖 Resource Library
- File Management: Upload and organize educational resources
- Subject Categorization: Resources linked to specific subjects
- Grade-level Filtering: Age-appropriate content organization
- Search and Discovery: Easy resource finding

### 📅 Scheduling & Deadlines
- Class Schedules: Meeting times and links management
- Deadline Tracking: Upcoming assignments and due dates
- Calendar Integration: Organized timeline view

### 🎯 Assessment System
- Quiz Creation: Multiple choice questions with explanations
- Automatic Grading: Instant feedback and scoring
- Pass/Fail Thresholds: Configurable success criteria
- Time Limits: Timed assessments
- Attempt Tracking: Multiple tries with best score recording

### 🗂️ Administrative Tools
- User Management: Create, edit, suspend users
- Content Management: CRUD operations for subjects, topics, lessons
- Role Assignment: Change user permissions
- Analytics Dashboard: Platform statistics and insights
- Activity Monitoring: User engagement tracking

### 🎨 User Experience
- Responsive Design: Mobile-friendly interface
- Interactive Tours: Guided onboarding for new users
- Toast Notifications: Real-time feedback system
- Loading States: Smooth user experience with skeleton screens
- Error Handling: Graceful error recovery and user messaging

### 🔍 Search & Navigation
- Subject Browse: Easy course discovery
- Progress Visualization: Clear completion indicators
- Breadcrumb Navigation: Context-aware navigation
- Quick Access: Dashboard shortcuts to important features

## Technical Architecture

### Frontend Stack
- React 18: Modern React with hooks and functional components
- TypeScript: Type-safe development
- Tailwind CSS: Utility-first styling
- Shadcn/UI: Consistent design system components
- React Router: Client-side routing
- TanStack Query: Server state management
- React Hook Form: Form handling with validation
- Zod: Schema validation

### Backend Services
- Supabase: Backend-as-a-Service platform
- PostgreSQL: Relational database with RLS (Row Level Security)
- Supabase Auth: User authentication and authorization
- Edge Functions: Serverless functions for AI integration
- Real-time Subscriptions: Live data updates

### AI Integrations
- Google Gemini: AI tutor conversational interface
- Study Plan Generation: Automated learning path creation

### Database Schema
- Tenants: Organization management
- Profiles: User information and preferences
- User Roles: Permission management
- Subjects/Topics/Lessons: Content hierarchy
- Quiz System: Questions, options, attempts
- Progress Tracking: Completions and statistics
- Resources: File and content management

## Pending Functionalities

### 📱 Mobile Application
- React Native App: Native mobile experience
- Offline Content: Download lessons for offline viewing
- Push Notifications: Assignment reminders and updates
- Mobile-optimized UI: Touch-friendly interface

### 🎥 Enhanced Content Types
- Interactive Simulations: Science and math experiments
- Virtual Labs: Hands-on learning experiences
- Document Viewer: PDF and document annotation
- Audio Lessons: Podcast-style content
- Live Streaming: Real-time classes and webinars

### 📊 Advanced Analytics
- Learning Analytics: Detailed progress insights
- Predictive Modeling: At-risk student identification
- Performance Benchmarking: Comparative analysis
- Custom Reports: Exportable analytics dashboards
- Parent Dashboards: Child progress monitoring

### 🤝 Collaboration Features
- Discussion Forums: Subject-specific conversations
- Group Projects: Collaborative assignments
- Peer Review: Student feedback systems
- Study Groups: Virtual study sessions
- Messaging System: Direct communication between users

### 🎮 Gamification
- Achievement Badges: Progress recognition
- Leaderboards: Friendly competition
- Point Systems: Reward mechanisms
- Streaks: Consistency tracking
- Challenges: Monthly learning goals

### 🔧 Administrative Enhancements
- Bulk Operations: Mass user and content management
- Content Templates: Reusable lesson structures
- Automated Grading: AI-powered assessment
- Custom Workflows: Approval processes
- Integration APIs: Third-party system connections

### 🌐 Platform Integrations
- LTI Compliance: Learning Tools Interoperability
- SSO Integration: Single Sign-On with popular providers
- Calendar Sync: Google Calendar, Outlook integration
- Video Conferencing: Zoom, Teams embedding
- Learning Standards: SCORM package support

### 🛡️ Security & Compliance
- FERPA Compliance: Educational privacy regulations
- GDPR Support: European data protection
- Audit Logging: Comprehensive activity tracking
- Data Encryption: Enhanced security measures
- Backup Systems: Automated data protection

### 🎨 Customization
- White Labeling: Custom branding for tenants
- Theme Customization: Organization-specific styling
- Custom Domains: Branded URLs
- Email Templates: Personalized communications
- Layout Preferences: User interface customization

### 📈 Scalability Features
- Performance Optimization: Faster load times
- CDN Integration: Global content delivery
- Database Sharding: Enhanced multi-tenancy
- Caching Layers: Improved response times
- Load Balancing: High availability architecture

## Super Admin Functionality Guide

### Currently Implemented Features

#### How to Access Super Admin Features
1. **Initial Setup**
   - First user can become super admin through the initial setup page
   - Or existing users can be granted super admin role by another super admin

2. **Access Super Admin Panel**
   - Navigate to `/super-admin` route after logging in as a super admin
   - The panel will automatically show the super admin dashboard if you have the correct permissions

3. **Main Features Access Points**
   - **Tenant Management**: Available in the super admin panel under "Existing Tenants" card
   - **User Management**: Access through the admin panel, with extended capabilities for super admins
   - **Analytics Dashboard**: Automatically shown when logging in as super admin
   - **Platform Statistics**: Available in the super admin dashboard
   - **Role Management**: Available in the user management section

### Backlog Items (Planned Functionalities)

#### Tenant Management Enhancements
- [ ] Tenant Activation Controls
  - Enable/disable tenant access
  - Manage tenant subscription status
  - Set tenant usage limits

- [ ] Tenant Configuration
  - Custom domain management
  - White-labeling options
  - Tenant-specific feature toggles
  - Branding customization

- [ ] Data Management
  - Cross-tenant data migration tools
  - Tenant data backup/restore
  - Data sharing between tenants
  - Tenant data export/import

#### Advanced Analytics
- [ ] Enhanced Reporting
  - Custom report builder
  - Scheduled reports
  - Export capabilities
  - Advanced data visualization

- [ ] Performance Monitoring
  - Resource usage tracking
  - Performance metrics
  - System health monitoring
  - Automated alerts

#### Billing and Subscriptions
- [ ] Billing Management
  - Subscription plan management
  - Usage-based billing
  - Payment processing
  - Invoice generation

- [ ] Tenant Billing
  - Per-tenant billing
  - Usage tracking
  - Payment history
  - Subscription management

#### Security Enhancements
- [ ] Advanced Security Controls
  - IP whitelisting
  - Two-factor authentication management
  - Security policy management
  - Audit log retention policies

#### Content Management
- [ ] Global Content Controls
  - Cross-tenant content sharing
  - Global content templates
  - Content approval workflows
  - Bulk content operations

#### Integration Management
- [ ] Third-party Integrations
  - Integration marketplace
  - API key management
  - Webhook configuration
  - Integration analytics

#### System Configuration
- [ ] Platform Settings
  - Global system settings
  - Feature flag management
  - Default tenant settings
  - System-wide announcements

#### Support Tools
- [ ] Support Management
  - Tenant support dashboard
  - Issue tracking
  - Support ticket management
  - Knowledge base management

## Getting Started

### Prerequisites
- Node.js 18+
- Supabase account
- Gemini API key for AI features

### Installation
1. Clone the repository
2. Install dependencies: `npm install`
3. Configure environment variables
4. Run database migrations
5. Start development server: `npm run dev`

### Configuration
1. Set up Supabase project
2. Configure authentication providers
3. Add required secrets (Gemini API key)
4. Set up row-level security policies

This documentation provides a comprehensive overview of the current EduPlatform capabilities and the roadmap for future development. The platform is designed to be scalable, secure, and user-friendly for educational institutions of all sizes.
