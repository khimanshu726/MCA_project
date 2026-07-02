import InputField from "./InputField";
import CityAutocomplete from "./CityAutocomplete";

/**
 * Standalone delivery-address form used inside AddressManager.
 * All state is owned by the parent (via the useAddressManager hook).
 */
function AddressForm({
  formState,
  errors,
  touched,
  editingAddressId,
  onFieldChange,
  onFieldBlur,
  onCityChange,
  onSubmit,
  onCancel,
}) {
  return (
    <form className="delivery-form-card" onSubmit={onSubmit} noValidate>
      <div className="delivery-form-grid">
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

        <div className="full-span">
          <InputField
            label="Street Address"
            htmlFor="shipping-address"
            error={touched.address ? errors.address : ""}
          >
            <textarea
              id="shipping-address"
              rows="4"
              value={formState.address}
              onChange={(event) => onFieldChange("address", event.target.value)}
              onBlur={() => onFieldBlur("address")}
            />
          </InputField>
        </div>

        <div className="full-span">
          <InputField
            label="Nearest Landmark"
            htmlFor="landmark"
            error={touched.landmark ? errors.landmark : ""}
          >
            <input
              id="landmark"
              type="text"
              value={formState.landmark}
              onChange={(event) => onFieldChange("landmark", event.target.value)}
              onBlur={() => onFieldBlur("landmark")}
            />
          </InputField>
        </div>

        <CityAutocomplete
          value={formState.city}
          onChange={onCityChange}
          onBlur={() => onFieldBlur("city")}
          error={errors.city}
          touched={touched.city}
        />

        <InputField
          label="Pincode"
          htmlFor="postal-code"
          error={touched.postalCode ? errors.postalCode : ""}
        >
          <input
            id="postal-code"
            type="text"
            inputMode="numeric"
            value={formState.postalCode}
            onChange={(event) => onFieldChange("postalCode", event.target.value)}
            onBlur={() => onFieldBlur("postalCode")}
          />
        </InputField>
      </div>

      <div className="action-row">
        <button type="submit" className="primary-button">
          {editingAddressId ? "Update Address" : "Save Address"}
        </button>
        <button type="button" className="secondary-button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}

export default AddressForm;
