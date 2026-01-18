# Authentication Setup Guide

This guide explains how to set up and use the authentication system in the Rent Management application.

## Overview

The application now includes a complete authentication system with:
- **Two user roles**: Admin and Operator
- **Session-based authentication** with JWT tokens
- **90-day session duration** (perfect for PWA)
- **Secure password hashing** using bcrypt
- **Protected routes** - all pages require login

## Prerequisites

1. Node.js and npm installed
2. Database credentials configured in `.env.local`
3. bcryptjs and jose packages installed (already done)

## Setup Steps

### 1. Add Username Field to Users Table

Run the migration to add the `username` field to the existing users table:

```bash
node scripts/add-username-field.js
```

This will:
- Add a `username` column to the users table
- Create an index on the username field for faster lookups

### 2. Seed Initial Users

Run the seed script to create admin and operator users:

```bash
node scripts/setup-auth.js
```

This will create two users:
- **Admin**: username=`admin`, password=`admin123`
- **Operator**: username=`operator`, password=`operator123`

⚠️ **IMPORTANT**: Change these passwords after first login!

### 3. Environment Configuration

Ensure your `.env.local` file has the JWT_SECRET configured:

```env
JWT_SECRET=dev-secret-key-change-in-production-abcdef123456
```

For production, generate a secure random secret:
```bash
openssl rand -base64 32
```

## Usage

### Logging In

1. Start the application: `npm run dev`
2. Navigate to `/login`
3. Enter username and password
4. You'll be redirected to the dashboard (or the page you tried to access)

### Logging Out

1. Click the user icon in the top-right corner of the header
2. Select "Logout" from the dropdown menu
3. You'll be redirected to the login page

## Authentication Flow

1. **Login**: User submits credentials → API validates → Creates JWT token → Sets session cookie
2. **Protected Routes**: Middleware checks session cookie → Verifies JWT → Allows/denies access
3. **Logout**: Clears session cookie → Redirects to login

## Session Details

- **Duration**: 90 days (configurable in `src/lib/auth.ts`)
- **Storage**: HTTP-only cookie named `session`
- **Security**:
  - HTTP-only cookies (not accessible via JavaScript)
  - Secure flag in production (HTTPS only)
  - SameSite: Lax (CSRF protection)

## Files Created/Modified

### New Files
- `src/lib/auth.ts` - Authentication utilities (JWT, password hashing)
- `src/app/api/auth/login/route.ts` - Login API endpoint
- `src/app/api/auth/logout/route.ts` - Logout API endpoint
- `src/app/login/page.tsx` - Login page UI
- `src/middleware.ts` - Route protection middleware
- `scripts/add-username-field.js` - Migration to add username field
- `scripts/setup-auth.js` - Seed script for initial users

### Modified Files
- `src/components/layout/header.tsx` - Added logout button
- `.env.local` - Added JWT_SECRET
- `.env.example` - Added JWT_SECRET template

## Troubleshooting

### "Invalid username or password"
- Double-check the username and password
- Ensure you've run `setup-auth.js` to create the users
- Default credentials: `admin`/`admin123` or `operator`/`operator123`

### "User account is inactive"
- The user's `is_active` flag is set to 0
- Update the database to set `is_active = 1`

### Redirected to login on every page
- Check if JWT_SECRET is set in `.env.local`
- Clear browser cookies and try logging in again
- Check browser console for errors

### Migration fails with network error
- Ensure you have internet connectivity to reach Turso database
- Verify TURSO_DATABASE_URL and TURSO_AUTH_TOKEN in `.env.local`

## Security Notes

1. **Change default passwords** immediately after first login
2. **Use a strong JWT_SECRET** in production (not the default)
3. **Enable HTTPS** in production for secure cookies
4. **Regularly review** user access and permissions

## Next Steps

1. Add password change functionality
2. Add user management page (admin only)
3. Implement role-based access control for specific features
4. Add "forgot password" functionality (if email is configured)
