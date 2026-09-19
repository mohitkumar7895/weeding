# WedWithMe - Production Deployment Guide

This document outlines the standard operating procedure for deploying the WedWithMe Next.js application to a production environment.

## 1. Prerequisites
- **Node.js**: v18.x or higher.
- **MySQL Database**: v8.0 or higher.
- **Process Manager**: PM2 or a container orchestration tool like Docker/Kubernetes.
- **Reverse Proxy**: Nginx or AWS Application Load Balancer (ALB) for SSL termination and load balancing.

## 2. Server Provisioning & Database Setup
1. Provision a MySQL database instance.
2. Initialize the database schema and seed essential administrative roles. If you are starting fresh, use the migration scripts located in the codebase or initialize it manually.
3. Secure the database. Do **not** allow public access to port 3306. Access should be restricted to the application server's IP address.

## 3. Environment Variables
Configuration is injected strictly through environment variables. 
1. Copy `.env.example` to a new `.env.production` file on your production server.
2. Fill in all the values, ensuring that:
   - `NODE_ENV` is explicitly set to `production`.
   - `JWT_SECRET` and `COOKIE_SECRET` are long, randomly generated strings.
   - Database credentials are correct and secure.
   - Optional provider keys (WhatsApp, Payment gateway, AI) are filled if those features are enabled for the release.

## 4. Build and Deployment Process

### Step 1: Clone and Install Dependencies
```bash
git clone https://github.com/your-org/wedwithme.git
cd wedwithme
npm ci --production=false
```
*(Note: We install devDependencies to build the Next.js application, but they are not used at runtime).*

### Step 2: Build the Application
```bash
npm run build
```
This command compiles the React components, optimizes images, and builds the API routes for maximum performance. Ensure it exits with a successful `0` status code.

### Step 3: Start the Application
Do not use `npm run dev` in production. Start the compiled application using the custom Express server:
```bash
npm start
```
For process management to ensure the app restarts if it crashes and to handle graceful shutdowns, use PM2:
```bash
pm2 start server.js --name "wedwithme-prod"
```

## 5. Post-Deployment Verification
Once the server is running, perform the following checks:
1. **Health Check**: Issue a GET request to `https://your-domain.com/api/health`. It must return `HTTP 200 OK`. If it returns `503`, the database connection is failing.
2. **Security Headers**: Inspect the HTTP headers on any response to verify `X-Frame-Options` and `X-Content-Type-Options` are present.
3. **Authentication Flow**: Attempt to log into the `/admin` portal or a customer dashboard to ensure cookies are being set correctly in your production domain. (Ensure HTTPS is active; Secure cookies will fail over HTTP).

## 6. Rollback Strategy
If a deployment introduces a critical regression:
1. Stop the current Node process (`pm2 stop wedwithme-prod`).
2. Revert the git repository to the previous stable commit (`git reset --hard <stable_commit_hash>`).
3. Re-run `npm ci` and `npm run build`.
4. Restart the process (`pm2 restart wedwithme-prod`).
*(Note: If a breaking database migration was applied, you must restore the database from the `backups/` directory using the documented restore script before restarting).*

## 7. Operational Backups
Refer to `ops-documentation.md` for scheduling automated database backups to prevent data loss.
