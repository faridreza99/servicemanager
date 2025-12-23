# IT Service Management Platform

## Overview

This is a full-stack IT Service Management System built for managing service bookings, customer interactions, and staff task assignments. The platform enables customers to browse and book IT services, communicate with administrators through real-time chat, receive quotations, and track their service requests. Administrators can manage users, services, bookings, and assign tasks to staff members, while staff can view and complete assigned tasks.

The platform includes comprehensive workforce management features:
- **Attendance Tracking**: Staff can clock in/out with GPS location capture (latitude/longitude coordinates stored using doublePrecision type). Admins can view all attendance records with date filters and location links.
- **Leave Management**: Staff can submit leave requests (annual, sick, personal, unpaid) with date ranges and reasons. Admins can approve/reject requests with notes.

The application follows a role-based access control model with three distinct user roles: Customer, Admin, and Staff. All new users require admin approval before they can access the platform. Real-time communication is facilitated through WebSocket connections for instant messaging and notifications.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Build System**
- React 18 with TypeScript for type-safe component development
- Vite as the build tool and development server with hot module replacement
- Wouter for lightweight client-side routing instead of React Router
- Single-page application architecture with route-based code organization

**UI Component System**
- shadcn/ui component library built on Radix UI primitives
- Tailwind CSS for utility-first styling with custom design tokens
- Design system inspired by Linear and Vercel with focus on information density
- Inter font family for consistency across all text elements
- Responsive layouts using Tailwind's breakpoint system (mobile-first approach)

**State Management**
- TanStack Query (React Query) for server state management and caching
- Local React state (useState, useContext) for UI state
- Custom AuthContext for authentication state management
- Custom ThemeContext for light/dark mode preference

**Form Handling**
- React Hook Form for form state management and validation
- Zod schemas for runtime validation and type inference
- @hookform/resolvers for integrating Zod with React Hook Form

**Real-time Communication**
- Socket.IO client for WebSocket connections
- Event-based messaging system for chat and notifications
- Automatic reconnection handling for dropped connections

### Backend Architecture

**Server Framework**
- Express.js for HTTP server and REST API endpoints
- Node.js HTTP server wrapped with Socket.IO for WebSocket support
- TypeScript for type safety across the entire backend
- ESBuild for production bundling with selective dependency bundling

**Authentication & Authorization**
- Pure JWT (JSON Web Token) authentication without external libraries
- bcrypt for password hashing with configurable salt rounds
- Custom middleware for token verification and role-based access control
- Session secret stored in environment variables
- Approval workflow requiring admin authorization for new users

**Database Layer**
- PostgreSQL as the relational database
- Drizzle ORM for type-safe database queries and migrations
- node-postgres (pg) driver for database connections
- Connection pooling for efficient database resource management
- Schema-first approach with TypeScript types generated from Drizzle schemas

**API Design**
- RESTful API architecture for CRUD operations
- Resource-based endpoints (/api/users, /api/services, /api/bookings, etc.)
- JSON request/response format
- Consistent error handling with appropriate HTTP status codes
- Authorization middleware applied per-endpoint based on role requirements

**Real-time Features**
- Socket.IO server for bidirectional event-based communication
- Room-based chat system (one room per booking)
- Private messaging capability (customer-to-admin only)
- Real-time notification delivery
- Quotation system integrated into chat messages
- Internal chat system for staff-to-staff and staff-to-admin communication

**Code Organization**
- Shared types and schemas in `/shared` directory for type consistency
- Separation of concerns: routes, authentication, storage, database
- Storage layer abstraction (IStorage interface) for potential ORM swapping
- Middleware pattern for cross-cutting concerns (auth, logging)

### Data Storage Solutions

**Database Schema Design**
- Users table with role-based access (customer, admin, staff) and approval status
- Services table for IT service catalog with active/inactive status
- Bookings table linking customers to services with status tracking
- Chats table for one-to-one booking conversations with open/closed status
- Messages table for chat history with sender information and privacy flags
- Tasks table for staff assignments linked to bookings
- Notifications table for user-specific alerts with read/unread status
- Internal chats tables (internal_chats, internal_chat_participants, internal_messages) for staff/admin communication

**Enums for Status Management**
- User roles: customer, admin, staff
- Booking statuses: pending, confirmed, in_progress, completed, cancelled
- Task statuses: pending, in_progress, completed
- Notification types: booking, message, task, approval

**Relationships**
- One-to-many: User to Bookings (customer relationship)
- One-to-many: Service to Bookings
- One-to-one: Booking to Chat
- One-to-many: Chat to Messages
- One-to-many: User to Messages (sender relationship)
- One-to-many: Booking to Tasks
- Optional one-to-many: User to Bookings (assigned staff relationship)

**Data Access Patterns**
- Repository pattern through storage layer abstraction
- Drizzle ORM query builder for type-safe queries
- Join queries for denormalized read models (BookingWithDetails, MessageWithSender, TaskWithDetails)
- Eager loading of related entities where needed for performance

### Authentication and Authorization

**Authentication Flow**
1. User registration creates account in "unapproved" state
2. Admin must explicitly approve user before login is allowed
3. Login endpoint validates credentials and approval status
4. JWT token generated with user ID, email, and role
5. Token stored in localStorage on client side
6. Token sent via Authorization header on subsequent requests
7. 7-day token expiration with no automatic refresh

**Authorization Strategy**
- Role-based access control (RBAC) with three distinct roles
- Custom middleware functions: authMiddleware, requireRole, createApprovalMiddleware
- Frontend route protection with ProtectedRoute component
- Backend endpoint protection with middleware chains
- Approval check middleware for ensuring user account is approved

**Permission Matrix**
- Customers: view active services, create bookings, send messages in own chats
- Staff: view assigned tasks, update task status, participate in assigned chats
- Admin: full CRUD on services, approve users, assign bookings to staff, send quotations, close chats, view all data

### External Dependencies

**Core Dependencies**
- Express.js (web framework)
- Socket.IO (WebSocket server and client)
- PostgreSQL (via DATABASE_URL environment variable)
- Drizzle ORM with drizzle-kit for migrations
- bcrypt for password hashing
- jsonwebtoken for JWT token operations

**Frontend UI Libraries**
- Radix UI primitives (@radix-ui/*) for accessible component foundations
- Tailwind CSS for styling with PostCSS processing
- Lucide React for icon components
- date-fns for date formatting and manipulation
- class-variance-authority for component variant management
- clsx and tailwind-merge for className utilities

**Development Tools**
- TypeScript compiler for type checking
- Vite for development server and build process
- ESBuild for production server bundling
- tsx for running TypeScript files in development
- Replit-specific plugins (vite-plugin-runtime-error-modal, vite-plugin-cartographer, vite-plugin-dev-banner)

**Notification Services**
- Email notifications via Nodemailer (server/email.ts)
- WhatsApp notifications via WhatsApp Business Cloud API (server/whatsapp.ts)
- Both services are optional and gracefully degrade when not configured
- Notifications sent for: booking confirmations, status updates, staff assignments, task alerts, user approvals, quotations

**Environment Variables Required**
- DATABASE_URL: PostgreSQL connection string (required)
- SESSION_SECRET: JWT signing secret (defaults to hardcoded value if not set)
- NODE_ENV: development or production
- REPL_ID: Replit-specific identifier (optional)

**Email Service (Optional)**
- SMTP_HOST: SMTP server host
- SMTP_PORT: SMTP server port
- SMTP_USER: SMTP username
- SMTP_PASS: SMTP password
- SMTP_FROM: Sender email address

**WhatsApp Service (Optional)**
- WHATSAPP_PHONE_NUMBER_ID: WhatsApp Business Phone Number ID from Meta
- WHATSAPP_ACCESS_TOKEN: WhatsApp Cloud API access token from Meta
- WHATSAPP_API_VERSION: API version (defaults to v18.0)