# Phase 13: User Onboard Flow

## Design Decisions

| Question | Decision |
|----------|----------|
| Token storage | New `onboard_tokens` table |
| Onboard page | New standalone `/onboard` route |
| Onboard form | Password + name (editable) |
| Token expiry | 7 days |
| Pre-onboard login | Block via Better Auth hook |
| Placeholder password | `crypto.randomUUID()` |

## Flow

```
Admin → "Create User" modal → POST /api/users/create
                                    │
                                    ▼
                              auth.api.createUser()
                              (random UUID password)
                                    │
                                    ▼
                              Generate onboard token
                              INSERT onboard_tokens
                                    │
                                    ▼
                              Email: "Your account is ready"
                              Link: /onboard?token=xxx
                                    │
                                    ▼
User clicks link → GET /onboard?token=xxx
                        │
                        ▼
                  Validate token (GET /api/onboard/validate?token=xxx)
                  Returns: { email, name }
                        │
                        ▼
                  Form: Set password + confirm name
                  Submit → POST /api/onboard/complete
                        │
                        ▼
                  Validate token + auth.api.setUserPassword()
                  + update user name + mark token used
                  + set emailVerified = true
                        │
                        ▼
                  Redirect to /login with success
```

## Tasks

### Task 1: Database — onboard_tokens table

- Migration `0007`:
  ```sql
  CREATE TABLE onboard_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );
  CREATE INDEX idx_onboard_tokens_token ON onboard_tokens(token);
  ```
- Add to schema.ts

### Task 2: Backend routes — /api/onboard

**GET /api/onboard/validate?token=xxx**
- Look up token, check expiry + unused
- Return `{ email, name }` for the user
- 404 for invalid/expired/used

**POST /api/onboard/complete**
- Body: `{ token, password, name? }`
- Validate token + expiry + unused
- Call `auth.api.setUserPassword({ userId, newPassword })` — no session headers needed on server-side
- Update user name if provided
- Mark `emailVerified = true` on user
- Mark token `used_at = now()`
- Return 200

### Task 3: Backend route — POST /api/users/create

Replace `POST /invite` with `POST /create`:

- Remove invite terminology from route path, variable names, email content
- After `auth.api.createUser()`:
  - Generate token: `crypto.randomUUID()`
  - Insert into `onboard_tokens`
  - Send email with link to `/onboard?token=xxx`
  - Email content: *"Your Gajan Traders account has been created. Click here to set your password."*
- Keep existing permission logic: superadmin → any role, tenant-admin → staff only

### Task 4: Better Auth hook — block pre-onboard login

Add to `auth.ts`:

```ts
databaseHooks: {
  user: {
    create: { after: async (user) => { /* noop */ } }
  }
}
```

Better approach: Use `user` hook on sign-in to check if user has an unused onboard token and block login:

Actually, Better Auth has `hooks` that can be attached to endpoints. Let me use the `before` hook on sign-in:

```ts
hooks: {
  before: {
    signIn: {
      handler: async (ctx) => {
        const user = ctx.user;
        // Check if user has an unused, non-expired onboard token
        const token = await db.query.onboardTokens.findFirst({
          where: and(
            eq(onboardTokens.userId, user.id),
            isNull(onboardTokens.usedAt),
            gt(onboardTokens.expiresAt, new Date())
          )
        });
        if (token) {
          throw new APIError("FORBIDDEN", {
            message: "Please set your password first. Check your email for the activation link."
          });
        }
      }
    }
  }
}
```

Wait, I need to understand Better Auth's hook system better. Let me think about the right approach.

Actually, Better Auth has `databaseHooks` and general `hooks` (on API endpoints). The sign-in hook would be:

```ts
hooks: {
  before: {
    signIn: {
      handler: async (ctx) => {
        // ctx.user exists for credential sign-in
        if (ctx.user) {
          // Check onboard token
        }
      }
    }
  }
}
```

But Better Auth might not expose `hooks` in the config at the top level. Let me look at what's available.

Actually, looking at the Better Auth docs, there are:
1. `databaseHooks` - hooks on CRUD operations
2. Plugin-specific hooks

For blocking sign-in, the best approach is probably to use the `emailVerification` feature: if `requireEmailVerification` is true, unverified users can't sign in. We set `emailVerified = false` initially, and only set it to `true` when onboarding completes.

Actually wait - during onboard completion we set `emailVerified = true`. But Better Auth's `requireEmailVerification` requires the verification email flow. That's different from just setting the flag.

Let me use a different approach. The `signIn` endpoint in Better Auth has a hook:

```ts
hooks: {
  before: {
    signIn: {
      handler: async (ctx) => {
        const { user } = ctx;
        if (user) {
          // Check onboard token
        }
      }
    }
  }
}
```

Actually, looking at the Better Auth docs more carefully, there's `emailAndPassword.sendResetPassword` and other specific hooks. But for sign-in, we might need a different approach.

Simplest approach: Don't use Better Auth hooks at all. Instead, use our own middleware or a custom sign-in check. But that's complex.

Actually, the simplest and most reliable approach: since we created the user with `crypto.randomUUID()` as the password, the user simply can't log in with those credentials. There's no account record with a known password. The `auth.api.createUser()` creates an account record with the hashed random password. Since nobody knows it, nobody can log in.

Wait, does `createUser` create an account record? Let me check. Yes, `createUser` creates:
1. A `user` record
2. An `account` record with the providerId "credential" and the hashed password

So the user CAN'T sign in because nobody knows the random password. The onboard flow calls `auth.api.setUserPassword()` which:
1. Creates/updates the credential account record with the new password hash

So after onboarding, the user CAN sign in.

We don't need a hook to block pre-onboard login — it's automatically blocked because the placeholder password is unknown. The user simply can't authenticate.

But wait — what about other sign-in methods? Google OAuth? If Google OAuth is enabled, a user could potentially sign in with Google before onboarding. We need to block that.

Let me check the user's auth config. They have Google OAuth enabled. If a user exists (created by admin) and tries to sign in with Google, Better Auth would link the account and let them in. We need to prevent this.

Better Auth's `accountLinking` option might handle this. Or we could use the `hooks.before.signIn` approach.

Actually, looking at Better Auth's hook system, the best approach for this case is to use `databaseHooks` on the `user` table... but that's about user CRUD, not sign-in.

Let me use a simpler approach: after creating the user via `createUser`, immediately mark the user as `banned: true` with a ban reason "awaiting_onboarding". Then when the user completes onboarding, unban them.

Wait, that's hacky. Let me use a different Better Auth feature.

Better Auth has:
- `account` table with `providerId` column
- For credentials, `providerId = "credential"` 
- For OAuth, `providerId = "google"` etc.

When a user signs in with Google, Better Auth looks for an existing account with that email. If found, it links. If not found with provider "google", it might create a new one or link the existing credential account.

Actually, I think the cleanest approach is to use a custom field on the user to track onboarding status, and then use a middleware or hook to check it.

Better Auth has `additionalFields` where we could add `onboarded` as a boolean field defaulting to `false`. Then we could set it to `true` after onboard completion.

For blocking sign-in, Better Auth has the `requireEmailVerification` option AND the `emailVerification.sendOnSignUp` option. But these only work with the email verification flow.

Actually, I just realized: we can use Better Auth's `hooks.before` API for endpoints. Let me re-read the hooks docs.

Searching my knowledge: Better Auth hooks are structured as:

```ts
hooks: {
  before: {
    signIn: {
      handler: async (ctx) => {
        // ...
      }
    }
  }
}
```

Wait, I'm not sure if this is the exact API. Let me think about alternatives.

Alternative: Use a custom middleware in the Hono API that wraps the auth handler. Before calling `auth.handler()`, check if the sign-in request is for a user who hasn't onboarded yet.

Actually, Better Auth processes the request internally. We can't easily intercept it.

Another approach: Just use the user's `banned` flag. When we create the user, set `banned: true`. When they complete onboarding, set `banned: false`. Better Auth's admin plugin has `banUser` / `unbanUser`. We can call `auth.api.banUser()` after creation, and `auth.api.unbanUser()` after onboard.

Actually wait - the `createUser` method already accepts `data` which can include `banned: true`. Let me verify:

Looking at the admin plugin createUser:
```ts
type createUser = {
  email: string
  password: string
  name: string
  role?: string | string[]
  data?: Record<string, any>
}
```

The `data` field passes through to custom additional fields. The `banned`, `banReason`, `banExpires` are added by the admin plugin to the `user` table as standard fields (not custom fields). So they might be directly settable.

Actually, checking the schema again:
- The admin plugin adds `role`, `banned`, `banReason`, `banExpires` to the `user` table
- `createUser` accepts `data` for custom fields
- But `banned` is a standard admin plugin field

I think we can pass `banned: true` in the `data` field of createUser and it would work since it's a column on the user table. Let me assume it works for the plan.

Actually, a simpler approach: just don't worry about blocking. The user can't sign in anyway because they don't know the password (random UUID). Google OAuth is an edge case we can handle separately.

OK, let me simplify the plan. For the "block before login" requirement, I'll note:
- Credential login is automatically blocked (random password)
- For Google OAuth, we'll add a check in the flow or use banned flag
- Simplest: set `banned: true` during createUser, `unbanUser()` after onboard

Let me finalize the plan.

### Task 4: Better Auth — block pre-onboard login

Approach: Set `banned: true` when creating user via `auth.api.createUser()`. After onboard completion, call `auth.api.unbanUser()` internally.

But wait - does `createUser` allow setting `banned`? Let me think... The admin plugin docs show `createUser` takes an optional `data` field for custom fields. But `banned` is a built-in admin plugin field on the `user` table, not a "custom additional field". So it might not be settable via `data`.

Alternative: After `createUser`, call `auth.api.banUser()` separately. This is an admin API call that needs session headers. But we're on the server side, so we can pass headers.

Actually, looking at the admin plugin docs:
- `banUser` requires `{ userId, banReason?, banExpiresIn? }`
- It can be called server-side with headers

But on the server side (from our route handler), we can call it directly since we have the auth instance:

```ts
await auth.api.banUser({
  body: { userId: newUser.id, banReason: "Pending onboarding" },
  headers: await headers() // from the current request (admin's session)
})
```

The admin making the create request is already authenticated - we can forward their headers.

This is getting complex. Let me simplify the plan and note the approach as a task detail.

Actually, the best approach might be to just use an `additionalField` on the user like `onboardedAt: Timestamp?`. Then check this in the CASL middleware (which already runs before any API call). But for sign-in, we'd need to intercept the Better Auth handler.

You know what, let me just keep it simple in the plan: We'll add a custom field for tracking onboarding status, use a database hook or sign-in hook to block, and if Better Auth hooks don't support this directly, we'll set `banned: true` as a simple mechanism. We can refine during implementation.

Let me finalize and write the plan.<｜end▁of▁thinking｜>

<｜｜DSML｜｜tool_calls>
<｜｜DSML｜｜invoke name="edit">
<｜｜DSML｜｜parameter name="filePath" string="true">C:\websites\gt\.planning\phases\13-user-onboard-flow\PLAN.md