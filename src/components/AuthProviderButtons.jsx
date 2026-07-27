function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="auth-provider-logo" aria-hidden="true">
      <path
        d="M21.805 12.23c0-.79-.071-1.549-.202-2.278H12v4.315h5.487a4.694 4.694 0 0 1-2.033 3.08v2.56h3.29c1.926-1.774 3.061-4.39 3.061-7.677Z"
        fill="#4285F4"
      />
      <path
        d="M12 22c2.76 0 5.077-.915 6.769-2.493l-3.29-2.56c-.915.613-2.083.976-3.48.976-2.676 0-4.943-1.807-5.752-4.238H2.846v2.64A10.21 10.21 0 0 0 12 22Z"
        fill="#34A853"
      />
      <path
        d="M6.248 13.685A6.14 6.14 0 0 1 5.926 12c0-.585.105-1.152.322-1.685V7.675H2.846A10.214 10.214 0 0 0 1.795 12c0 1.645.393 3.203 1.051 4.325l3.402-2.64Z"
        fill="#FBBC05"
      />
      <path
        d="M12 6.077c1.5 0 2.848.516 3.91 1.528l2.934-2.934C17.072 3.026 14.755 2 12 2a10.21 10.21 0 0 0-9.154 5.675l3.402 2.64c.809-2.431 3.076-4.238 5.752-4.238Z"
        fill="#EA4335"
      />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" className="auth-provider-logo" aria-hidden="true">
      <path
        d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073c0 6.019 4.388 11.009 10.125 11.927v-8.438H7.078v-3.49h3.047V9.41c0-3.028 1.793-4.7 4.533-4.7 1.313 0 2.686.236 2.686.236v2.973h-1.514c-1.49 0-1.955.93-1.955 1.884v2.262h3.328l-.532 3.49h-2.796V24C19.612 23.082 24 18.092 24 12.073Z"
        fill="#1877F2"
      />
    </svg>
  );
}

function AuthProviderButtons({
  isBusy,
  onGoogle,
  onFacebook,
  googleLabel = "Continue with Google",
  facebookLabel = "Continue with Facebook",
  showFacebook = true,
  iconOnly = false,
}) {
  return (
    <div className={`auth-provider-stack ${iconOnly ? "icon-only" : ""}`.trim()}>
      <button
        type="button"
        className={`auth-provider-button google-provider ${iconOnly ? "icon-only" : ""}`.trim()}
        onClick={onGoogle}
        disabled={isBusy}
        aria-label={googleLabel}
        title={googleLabel}
      >
        <GoogleIcon />
        {iconOnly ? <span className="sr-only">{googleLabel}</span> : <span>{googleLabel}</span>}
      </button>

      {showFacebook ? (
        <button
          type="button"
          className={`auth-provider-button facebook-provider ${iconOnly ? "icon-only" : ""}`.trim()}
          onClick={onFacebook}
          disabled={isBusy}
          aria-label={facebookLabel}
          title={facebookLabel}
        >
          <FacebookIcon />
          {iconOnly ? <span className="sr-only">{facebookLabel}</span> : <span>{facebookLabel}</span>}
        </button>
      ) : null}
    </div>
  );
}

export default AuthProviderButtons;
