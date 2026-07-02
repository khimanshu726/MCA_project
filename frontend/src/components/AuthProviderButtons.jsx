function AuthProviderButtons({
  isBusy,
  onGoogle,
  onFacebook,
  googleLabel = "Continue with Google",
  facebookLabel = "Continue with Facebook",
  showFacebook = true,
}) {
  return (
    <div className="auth-provider-stack">
      <button type="button" className="auth-provider-button" onClick={onGoogle} disabled={isBusy}>
        <span className="auth-provider-logo auth-provider-google" aria-hidden="true">
          G
        </span>
        <span>{googleLabel}</span>
      </button>

      {showFacebook ? (
        <button type="button" className="auth-provider-button" onClick={onFacebook} disabled={isBusy}>
          <span className="auth-provider-logo auth-provider-facebook" aria-hidden="true">
            f
          </span>
          <span>{facebookLabel}</span>
        </button>
      ) : null}
    </div>
  );
}

export default AuthProviderButtons;
