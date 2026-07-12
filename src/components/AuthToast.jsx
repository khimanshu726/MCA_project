function AuthToast({ toast, onDismiss }) {
  if (!toast) {
    return null;
  }

  return (
    <div className={`auth-toast auth-toast-${toast.type || "info"}`} role="status" aria-live="polite">
      <div className="auth-toast-copy">
        {toast.title ? <strong>{toast.title}</strong> : null}
        {toast.message ? <span>{toast.message}</span> : null}
      </div>
      <button type="button" className="auth-toast-dismiss" onClick={onDismiss} aria-label="Dismiss notification">
        Close
      </button>
    </div>
  );
}

export default AuthToast;
