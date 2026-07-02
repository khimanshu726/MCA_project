import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { appConfig } from "../config.js";
import { createUserRecord, findUserByEmail, updateUserRecord } from "../services/userStore.js";

export const isGoogleAuthConfigured = () =>
  Boolean(appConfig.googleClientId && appConfig.googleClientSecret && appConfig.googleCallbackUrl);

export const configurePassport = () => {
  if (!isGoogleAuthConfigured()) {
    return passport;
  }

  if (passport._strategies?.google) {
    return passport;
  }

  passport.use(
    new GoogleStrategy(
      {
        clientID: appConfig.googleClientId,
        clientSecret: appConfig.googleClientSecret,
        callbackURL: appConfig.googleCallbackUrl,
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value?.toLowerCase() || "";
          const profileImage = profile.photos?.[0]?.value || "";

          if (!email) {
            done(new Error("Google account does not include an email address."));
            return;
          }

          const existingUser = await findUserByEmail(email);

          if (existingUser) {
            if (existingUser.role !== "admin") {
              done(new Error("This Google account is not authorized for admin access."));
              return;
            }

            const updatedUser = await updateUserRecord(existingUser.id, (currentUser) => ({
              ...currentUser,
              provider: currentUser.provider === "email" ? currentUser.provider : "google",
              profileImage: profileImage || currentUser.profileImage || "",
            }));

            done(null, updatedUser);
            return;
          }

          done(new Error("No admin account is provisioned for this Google email."));
        } catch (error) {
          done(error);
        }
      },
    ),
  );

  return passport;
};

export default passport;
