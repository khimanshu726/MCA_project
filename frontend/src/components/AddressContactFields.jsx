import InputField from "./InputField";

/**
 * Contact-related fields inside the address form (name, phone, email, state).
 */
function AddressContactFields({ formState, errors, touched, onFieldChange, onFieldBlur }) {
  return (
    <>
      <InputField
        label="Full Name"
        htmlFor="full-name"
        error={touched.fullName ? errors.fullName : ""}
      >
        <input
          id="full-name"
          type="text"
          value={formState.fullName}
          onChange={(event) => onFieldChange("fullName", event.target.value)}
          onBlur={() => onFieldBlur("fullName")}
        />
      </InputField>

      <InputField
        label="Phone Number"
        htmlFor="phone-number"
        error={touched.phoneNumber ? errors.phoneNumber : ""}
      >
        <input
          id="phone-number"
          type="tel"
          inputMode="numeric"
          value={formState.phoneNumber}
          onChange={(event) => onFieldChange("phoneNumber", event.target.value)}
          onBlur={() => onFieldBlur("phoneNumber")}
        />
      </InputField>

      <InputField
        label="Email"
        htmlFor="email"
        error={touched.email ? errors.email : ""}
      >
        <input
          id="email"
          type="email"
          value={formState.email}
          onChange={(event) => onFieldChange("email", event.target.value)}
          onBlur={() => onFieldBlur("email")}
        />
      </InputField>

      <InputField
        label="State"
        htmlFor="state"
        error={touched.state ? errors.state : ""}
      >
        <input
          id="state"
          type="text"
          value={formState.state}
          onChange={(event) => onFieldChange("state", event.target.value)}
          onBlur={() => onFieldBlur("state")}
        />
      </InputField>
    </>
  );
}

export default AddressContactFields;
