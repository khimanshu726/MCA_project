/**
 * Whether this signed-in customer still needs to prove they own their email
 * before they can take a sensitive action (check out, manage their account).
 *
 * The gate applies to ONE case only: an account created with an email +
 * password whose address is not yet verified. Google and Facebook hand us an
 * already-verified address, and phone-OTP accounts have no email to verify —
 * gating either would be asking people to verify something that is already
 * proven, or that does not exist.
 *
 * This is the single source of truth for that question on the client, mirrored
 * on the server by requireVerifiedEmail (which reads the same two facts —
 * sign-in provider and email_verified — straight off the signed Firebase
 * token, where they cannot be forged).
 */
export const isPasswordProvider = (authUser) =>
  Boolean(authUser?.providerData?.some((provider) => provider.providerId === "password"));

export const requiresEmailVerification = (authUser) =>
  Boolean(authUser?.email) && isPasswordProvider(authUser) && !authUser?.emailVerified;
