const checklistItems = [
  { key: "minLength", label: "At least 8 characters" },
  { key: "uppercase", label: "One uppercase letter" },
  { key: "lowercase", label: "One lowercase letter" },
  { key: "number", label: "One number" },
  { key: "special", label: "One special character" },
];

function PasswordChecklist({ checks }) {
  return (
    <ul className="auth-password-checklist" aria-label="Password requirements">
      {checklistItems.map((item) => {
        const isValid = Boolean(checks[item.key]);

        return (
          <li
            key={item.key}
            className={`auth-password-check ${isValid ? "is-valid" : "is-pending"}`}
          >
            <span className="auth-password-check-icon" aria-hidden="true">
              {isValid ? "OK" : "--"}
            </span>
            <span>{item.label}</span>
          </li>
        );
      })}
    </ul>
  );
}

export default PasswordChecklist;
