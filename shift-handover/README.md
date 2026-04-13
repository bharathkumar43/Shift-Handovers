# Shift Handover Application

A web application for managing daily shift handovers across Content, Email, and Messaging projects at CloudFuze.

## Prerequisites

- **Node.js** 18+ installed
- **PostgreSQL** database running (local or remote)

## Setup

### 1. Install dependencies

```bash
cd shift-handover
npm install
```

### 2. Configure the database

Edit the `.env` file with your PostgreSQL connection string:

```
DATABASE_URL="postgresql://username:password@localhost:5432/shift_handover"
NEXTAUTH_SECRET="your-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"
```

### 3. Configure Azure AD (Microsoft Entra ID)

Register an app in Azure Portal:

1. Go to **Azure Portal** > **Microsoft Entra ID** > **App registrations** > **New registration**
2. Set the **Redirect URI** to `http://localhost:3000/api/auth/callback/azure-ad` (type: Web)
3. Copy the **Application (client) ID** and **Directory (tenant) ID**
4. Go to **Certificates & secrets** > **New client secret** and copy the secret value
5. Add these to your `.env` file:

```
AZURE_AD_CLIENT_ID="your-client-id"
AZURE_AD_CLIENT_SECRET="your-client-secret"
AZURE_AD_TENANT_ID="your-tenant-id"
```

When any employee signs in with Microsoft for the first time, their account is automatically created in the app as an ENGINEER. Admins can then change roles from the admin panel.

### 4. Create the database and run migrations

```bash
npx prisma migrate dev --name init
```

### 5. Seed the database

```bash
npm run db:seed
```

This creates:
- 3 projects (Content, Email, Messaging) with their shift timings
- All client names pre-populated from the original Excel templates
- Default admin user: `admin@cloudfuze.com` / `admin123`

### 6. Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Authentication

Two login methods are available:

- **Microsoft (Azure AD)**: Click "Sign in with Microsoft" -- recommended for all employees
- **Email/Password**: For the admin account or manually created users

## Default Login

- **Email:** admin@cloudfuze.com
- **Password:** admin123

## User Roles

| Role | Permissions |
|------|-------------|
| **ADMIN** | Full access: manage users, clients, view reports, tracking, fill handovers |
| **LEAD** | Fill handovers, view dashboard and history |
| **ENGINEER** | Fill handovers, view dashboard and history |

## Application Pages

- **/login** - Sign in (Microsoft SSO or email/password)
- **/dashboard** - Daily shift status overview, metrics, and manager notes
- **/handover** - Select project/date/shift, then fill in the handover form
- **/history** - Browse past handovers with date/project/shift filters
- **/admin/users** - Manage employees (Admin only)
- **/admin/clients** - Manage client lists per project (Admin only)
- **/admin/reports** - Data review by date, employee, or client (Admin only)
- **/admin/tracking** - Compliance tracking: who filled, who didn't, timestamps (Admin only)

## Useful Commands

```bash
npm run dev          # Start development server
npm run build        # Production build
npm run db:seed      # Seed the database
npm run db:studio    # Open Prisma Studio (database GUI)
npm run db:migrate   # Run database migrations
```
