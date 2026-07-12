function InputField({ label, htmlFor, error, helperText, children }) {
  return (
    <div className={`input-field ${error ? "has-error" : ""}`.trim()}>
      <label className="field-label strong-label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {error ? (
        <p className="field-error" id={`${htmlFor}-error`}>
          {error}
        </p>
      ) : helperText ? (
        <p className="field-helper" id={`${htmlFor}-helper`}>
          {helperText}
        </p>
      ) : null}
    </div>
  );
}

export default InputField;
