---
id: 13
title: User Onboard Flow — Replace Invite with Direct Create + Token Onboard
status: planning
depends_on: [4]
---

## Goal

Replace the current invite flow (admin clicks "Invite User" → email links to `/reset-password?email=xxx` → user sends OTP → enters password → signs in) with a clean direct-create + onboard flow:

1. Admin clicks "Create User"
2. Admin fills email, name, role, tenant, branch
3. Backend creates user via `auth.api.createUser()` (with placeholder password) + generates unique onboard token
4. Email sends with direct link: `/onboard?token=xxx`
5. User clicks link, sees a clean form: "Set your password" (email pre-filled)
6. User submits → backend validates token + calls `auth.api.setUserPassword()` to update password
7. User logs in

No OTP, no forgot-password page, no invite terminology.

## Constraints

- Must use Better Auth's admin API (`auth.api.createUser()`, `auth.api.setUserPassword()`) — no raw DB inserts
- Must prevent users from logging in before onboarding (no password set yet)
- Tokens must be single-use and expire
- Superadmin can create any role; tenant-admin can only create staff
- Must work within existing Better Auth + admin app architecture

## Questions

### Q1 — Token storage

Where to store the onboard token?

**A)** New `onboard_tokens` table: `id, userId, token, expiresAt, usedAt`
- Clean, explicit, no side effects
- Requires migration + new table

**B)** Reuse Better Auth's `verification` table
- Already stores OTPs with expiry
- But designed for OTPs, not tokens — would need to work within its schema

**C)** Add `onboardToken` + `onboardTokenExpiresAt` columns to `user` table
- No new table, but clutters the user model

Which do you prefer?

### Q2 — Onboard page: standalone or repurpose?

**A)** New standalone `/onboard` page (separate module, no overlap with reset-password)
- Clean separation of concerns
- No confusion between "set password" and "reset password"

**B)** Modify existing `/reset-password?email=xxx&token=xxx` to detect token param and show onboard form
- Fewer routes to maintain
- Risk of confusing "reset password" with "set password" again

### Q3 — What does the onboard form include?

**A)** Just new password field
- Name already collected by admin during create

**B)** New password + name (pre-filled, editable)
- Lets user confirm/correct their name

**C)** New password + name + email (pre-filled, read-only)

### Q4 — Token expiry

How long should the onboard token be valid?

**A)** 24 hours (tight, like invite links)
**B)** 48 hours
**C)** 7 days (forgivable for business users)
**D)** No expiry (bad practice)

### Q5 — User state before onboarding

What happens if a user tries to log in before onboarding?

**A)** Block login entirely (check onboard token status in middleware or Better Auth hook)
- More secure
- Requires custom auth logic

**B)** Let them attempt login but it fails (no password = no credential match)
- Works automatically — `createUser` with random password means existing password is unknown
- User just can't sign in until they onboard

### Q6 — What email to use?

**A)** Custom email from our system (Resend) with our template — like current invite email but link goes to `/onboard?token=xxx`
**B)** Use Better Auth's built-in email mechanisms somehow

### Q7 — Placeholder password strategy

`auth.api.createUser()` requires a password. What should we use?

**A)** `crypto.randomUUID()` — discarded after creation, user will set real one via `setUserPassword`
**B)** A known temporary password (bad practice)
