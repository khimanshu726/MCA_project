# Firebase Authentication Setup

## 1. Create Firebase project

1. Open [Firebase Console](https://console.firebase.google.com/).
2. Create or select your project.
3. Add a Web app for the storefront.

## 2. Enable Authentication providers

Open `Build -> Authentication -> Sign-in method` and enable:

1. `Google`
2. `Facebook`
3. `Phone`

## 3. Configure authorized domains

Add these domains in `Authentication -> Settings -> Authorized domains`:

1. `localhost`
2. `127.0.0.1`

Add your production storefront domain later as well.

## 4. Google provider

1. Enable Google in Firebase Authentication.
2. Add your project support email.
3. Save the provider.

## 5. Facebook provider

1. Create a Facebook app in [Meta for Developers](https://developers.facebook.com/).
2. Enable Facebook Login.
3. Copy the `App ID` and `App Secret`.
4. Paste them into the Firebase Facebook provider configuration.
5. In the Meta app, add this OAuth redirect URI from Firebase:
   `https://<your-firebase-auth-domain>/__/auth/handler`

## 6. Phone provider

1. Enable Phone authentication in Firebase.
2. For production, complete the required billing and anti-abuse checks if Firebase prompts for them.
3. During development, make sure your app runs from an authorized domain and that reCAPTCHA can load normally.

## 7. Frontend environment variables

Set these in `.env` for Vite:

```env
VITE_FIREBASE_API_KEY=your_web_api_key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_APP_ID=your_web_app_id
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
```

## 8. Backend Firebase Admin variables

Create a Firebase service account from:

`Firebase Console -> Project settings -> Service accounts -> Generate new private key`

Then map the values into `.env`:

```env
FIREBASE_ADMIN_PROJECT_ID=your-project-id
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

Keep the private key quoted and preserve `\n` line breaks.

## 9. Local development API origins

Use these values so both `localhost` and `127.0.0.1` work during development:

```env
CLIENT_ORIGIN=http://localhost:5173
ADMIN_APP_ORIGIN=http://localhost:5174
CLIENT_ORIGINS=http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174
```

## 10. Start the app

```bash
npm run server:dev
npm run dev -- --host localhost --port 5173
```

Open:

`http://localhost:5173/login`
