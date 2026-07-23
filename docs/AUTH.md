# Authentication — architecture & operations

Elite Impressions' **customer** authentication runs on **Firebase
Authentication**. Firebase — not this codebase — owns password hashing, the
verification- and reset-token machinery, brute-force protection, and the
session tokens. This document explains the parts we build on top, and the
one-time **Firebase Console** configuration the hosted app needs.

> Admin login is a separate system (email/password + OTP with bcrypt in
> `server/controllers/authController.js`) and is not covered here.

## Architecture at a glance

| Concern | Owner | Where |
|---|---|---|
| Sign-up / sign-in (email, Google, Facebook, phone-OTP) | Firebase client SDK | `src/services/customerAuthService.js` |
| Identity in React | `UserAuthProvider` | `src/context/UserAuthContext.jsx` |
| On-demand sign-in modal | `AuthModalProvider` | `src/context/AuthModalContext.jsx`, `src/components/auth/AuthModal.jsx` |
| Route + action gating | `ProtectedRoute`, trigger call-sites | `src/components/ProtectedRoute.jsx` |
| Email-verification gate | client `requiresEmailVerification` + server `requireVerifiedEmail` | `src/utils/emailVerification.js`, `server/middleware/requireVerifiedEmail.js` |
| Session lifetime policy | shared, client + server | `src/auth/sessionPolicy.js` |
| Server token verification | `firebase-admin` | `server/middleware/authenticateCustomer.js` |
| Branded action-link landing | `/auth/action` | `src/pages/AuthActionPage.jsx` |

## Session model

Persistence + a capped max-age, enforced on both sides (see
`src/auth/sessionPolicy.js`):

- **Remember me on** → local persistence, survives browser restart, capped at
  **30 days** from `auth_time`.
- **Remember me off** → session persistence (credential never written to disk),
  capped at **12 hours**, plus a **2-hour idle** timeout.
- The server enforces the max-age against the signed `auth_time` claim, so a
  tampered client can only ever *shorten* a session, never extend it.
- Sign-out revokes Firebase refresh tokens for **every** device.

## Email-verification gate

Applies to **one** case: an email/password account whose address isn't verified
yet. Google/Facebook arrive pre-verified; phone-OTP accounts have no email — all
are exempt.

- Unverified customers may browse, search, customize, and build a cart.
- They must verify before **checkout** or **account management**.
- Client: `ProtectedRoute` shows `EmailVerificationGate` (self-service resend +
  re-check) instead of the protected content.
- Server: `requireVerifiedEmail` rejects order creation with `403
  EMAIL_NOT_VERIFIED`. This is the real control — the client gate alone is only
  a suggestion.

---

# Firebase Console configuration (one-time, required in production)

The code is complete, but three things live in the **Firebase Console** for the
`eliteimpressions.co.in` deployment. **This is almost certainly why the
password-reset / verification emails "sent successfully" but never arrived** —
the code calls Firebase correctly; the Console just wasn't pointed at the live
domain.

### 1. Authorized domains

**Authentication → Settings → Authorized domains → Add domain**

Add:
- `eliteimpressions.co.in`
- `www.eliteimpressions.co.in`
- (keep `localhost` for local dev)

Without this, Google sign-in and the action links fail with
`auth/unauthorized-domain`.

### 2. Custom action URL (branded verification & reset links)

**Authentication → Templates → (edit any template) → Customize action URL**

Set it to:

```
https://eliteimpressions.co.in/auth/action
```

Firebase then appends `?mode=…&oobCode=…` and the link lands on our branded
`/auth/action` page (`src/pages/AuthActionPage.jsx`) instead of Google's default
screen. The page already handles `verifyEmail`, `resetPassword`, and
`recoverEmail`, including expired/used-code errors.

### 3. Branded email templates

**Authentication → Templates** — edit "Email address verification" and "Password
reset". Set the **sender name** to `Elite Impressions` and use copy along these
lines (Firebase substitutes `%LINK%`, `%EMAIL%`, `%APP_NAME%`):

**Verification — subject:** `Verify your email for Elite Impressions`

```
Hi,

Confirm this is your email address to finish setting up your Elite
Impressions account and start ordering.

Verify my email: %LINK%

This link expires soon and can be used once. If you didn't create an
account, you can ignore this message.

— Elite Impressions
```

**Password reset — subject:** `Reset your Elite Impressions password`

```
Hi,

We received a request to reset the password for %EMAIL%. Choose a new
password using the link below.

Reset my password: %LINK%

This link expires in about an hour and can be used once. If you didn't
request it, no action is needed — your password stays the same.

— Elite Impressions
```

> Fully custom HTML (logo, colours) beyond Firebase's template editor requires
> either Firebase's newer templating or generating the links with the Admin SDK
> (`generatePasswordResetLink`) and sending them through Resend. That's a larger
> change; the sender-name + copy above is the supported, no-code path and is
> enough to make the emails clearly ours.

### 4. Provider enablement (verify)

**Authentication → Sign-in method** — confirm **Email/Password**, **Google**,
and **Phone** are enabled. (Email link / passwordless is not used.)

---

## Note on forgot-password (defect #7)

The client flow in `src/components/CustomerLoginCard.jsx` is already correct and
**enumeration-safe**: it always shows "If an account exists for X, a reset link
is on its way", never revealing whether the address is registered, and it
rate-limits resends. No code change was needed — the missing emails are the
Console configuration above (§1–§3).
