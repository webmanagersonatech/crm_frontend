# CRM Next.js (TS + Tailwind)

A clean starter for a CRM-style admin built with **Next.js 14 (App Router)**, **TypeScript**, and **Tailwind CSS**.  
Includes login, change password page, responsive sidebar, header, footer, and placeholder pages for the main modules.

## Quick Start

```bash
# 1) Install deps
npm i

# 2) Run dev server
npm run dev

# 3) Open http://localhost:3000
```

**Login:** `admin@example.com` / `admin123`

## Structure

- `app/page.tsx` – Login (index)
- `app/(protected)/layout.tsx` – Shell with Sidebar + Header + Footer
- `app/(protected)/*/page.tsx` – Module pages
- `components/*` – UI pieces
- `context/AuthContext.tsx` – Simple client-side auth

## Modules scaffolded
Dashboard, Institution, Users, Roles, Permissions, Applications, Leads, Communications, Reports, Login History, Events, Others, Settings, Application Settings, Change Password.
