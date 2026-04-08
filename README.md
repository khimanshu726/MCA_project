# Elite Empressions

React + Vite storefront for a print shop with:

- product listing and detail pages
- image gallery and customization preview
- persistent cart with shared cart state
- cart + checkout flow
- saved delivery addresses with validation and city autocomplete
- Express order API with uploads and order management
- Admin authentication with email/password, mobile OTP, and Google OAuth

## Tech Stack

- React
- Vite
- React Router
- Context API + `useReducer`
- localStorage persistence

## Getting Started

```bash
npm install
npm run dev:full
```

Open the local URLs:

- `http://localhost:5173`
- `http://localhost:4000/api/health`

## Authentication Setup

1. Copy `.env.example` to `.env`
2. Update the admin defaults and JWT secret
3. Optional: set Google OAuth credentials

Local defaults created automatically on first server start:

- email: `admin@elite-empressions.local`
- mobile: `9876543210`
- password: `EliteAdmin@123`

For mobile OTP login in local development, the mock OTP is returned in the API response and shown in the login helper text.

Google OAuth requires:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_CALLBACK_URL`
- `AUTH_SUCCESS_REDIRECT`
- `AUTH_FAILURE_REDIRECT`

## Production Build

```bash
npm run build
```

## Production Preview

```bash
npm run preview:prod
```

## Project Structure

```text
src/
  assets/
  components/
  context/
  data/
  lib/
  pages/
  utils/

server/
  auth/
  controllers/
  data/
  middleware/
  routes/
  services/
  utils/
```

## Notes

- `public/images` contains product images
- `src/assets/images` contains static UI images
- `uploads/` is reserved as a backend-facing upload reference folder

## Deploy on Render

This project can be deployed as a single full-stack service on Render with a free `onrender.com` URL.

1. Push this repository to GitHub
2. In Render, create a new `Blueprint` or `Web Service` from the repository
3. Render will use:
   - build command: `npm install && npm run build`
   - start command: `npm start`
4. Set these environment variables in Render:
   - `NODE_ENV=production`
   - `JWT_SECRET=<strong-random-secret>`
   - `CLIENT_ORIGIN=https://<your-render-app>.onrender.com`
   - `AUTH_SUCCESS_REDIRECT=https://<your-render-app>.onrender.com/admin/auth/callback`
   - `AUTH_FAILURE_REDIRECT=https://<your-render-app>.onrender.com/admin/login`

Optional for Google login:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_CALLBACK_URL=https://<your-render-app>.onrender.com/api/auth/google/callback`

In production, the Express server serves the built Vite app and the API from the same domain.
