import { useState } from "react";
import { ArrowRight } from "lucide-react";
import InputField from "./InputField";

function PasswordField({
  id,
  label,
  value,
  onChange,
  onBlur,
  onKeyDown,
  error,
  helperText,
  autoComplete = "current-password",
  placeholder = "Enter password",
  disabled = false,
  // Optional inline submit affordance. The login form removed its full-width
  // "Login with Password" button, but a form with two inputs and no submit
  // control won't implicitly submit on Enter — this small type="submit" button
  // restores that (and gives a click target). Off by default, so the register
  // and reset password fields are unaffected.
  showSubmit = false,
  isSubmitting = false,
  submitDisabled = false,
}) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <InputField label={label} htmlFor={id} error={error} helperText={helperText}>
      <div className={`auth-password-shell${showSubmit ? " has-submit" : ""}`}>
        <input
          id={id}
          type={isVisible ? "text" : "password"}
          autoComplete={autoComplete}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          onKeyDown={onKeyDown}
          disabled={disabled}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : helperText ? `${id}-helper` : undefined}
        />
        <button
          type="button"
          className="auth-password-toggle"
          onClick={() => setIsVisible((currentValue) => !currentValue)}
          // The toggle also disables during submit, so it can't reveal the
          // password of a request already in flight, and keeps the field
          // uniformly inert while signing in.
          disabled={disabled}
          aria-label={`${isVisible ? "Hide" : "Show"} ${label.toLowerCase()}`}
        >
          {isVisible ? "Hide" : "Show"}
        </button>
        {showSubmit ? (
          <button
            type="submit"
            className="auth-password-submit"
            disabled={submitDisabled || isSubmitting}
            aria-label="Sign in"
          >
            {isSubmitting ? (
              <span className="auth-spinner" aria-hidden="true" />
            ) : (
              <ArrowRight size={16} strokeWidth={2.2} aria-hidden="true" />
            )}
          </button>
        ) : null}
      </div>
    </InputField>
  );
}

export default PasswordField;
