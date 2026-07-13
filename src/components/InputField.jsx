import { Children, cloneElement, isValidElement } from "react";

function InputField({ label, htmlFor, error, helperText, children }) {
  const describedBy = [
    error ? `${htmlFor}-error` : null,
    !error && helperText ? `${htmlFor}-helper` : null,
  ]
    .filter(Boolean)
    .join(" ");

  const enhancedChild = Children.map(children, (child) => {
    if (!isValidElement(child) || child.props?.id !== htmlFor) {
      return child;
    }

    return cloneElement(child, {
      "aria-invalid": error ? true : child.props["aria-invalid"],
      "aria-describedby": describedBy || child.props["aria-describedby"],
    });
  });

  return (
    <div className={`input-field ${error ? "has-error" : ""}`.trim()}>
      <label className="field-label strong-label" htmlFor={htmlFor}>
        {label}
      </label>
      {enhancedChild}
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
