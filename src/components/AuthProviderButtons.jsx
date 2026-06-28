function AuthProviderButtons({ isBusy, onGoogle, onFacebook }) {
  return (
    <div className="auth-provider-stack">
      <button type="button" className="auth-provider-button" onClick={onGoogle} disabled={isBusy}>
        <span className="auth-provider-logo auth-provider-google" aria-hidden="true">
          G
        </span>
        <span>Continue with Google</span>
      </button>

      <button type="button" className="auth-provider-button" onClick={onFacebook} disabled={isBusy}>
        <span className="auth-provider-logo auth-provider-facebook" aria-hidden="true">
          f
        </span>
        <span>Continue with Facebook</span>
      </button>
    </div>
  );
}

export default AuthProviderButtons;
