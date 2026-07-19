import { useState } from "react";
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
}) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <InputField label={label} htmlFor={id} error={error} helperText={helperText}>
      <div className="auth-password-shell">
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
      </div>
    </InputField>
  );
}

export default PasswordField;
