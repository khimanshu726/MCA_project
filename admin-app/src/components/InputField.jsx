function InputField({ label, htmlFor, error, helperText, children }) {
  return (
    <div className="input-field">
      <label className="field-label strong-label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {error ? <p className="field-error">{error}</p> : helperText ? <p className="field-helper">{helperText}</p> : null}
    </div>
  );
}

export default InputField;
