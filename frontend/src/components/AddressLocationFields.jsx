import CityAutocomplete from "./CityAutocomplete";
import InputField from "./InputField";

/**
 * Location-related fields inside the address form (street, landmark, city, pincode).
 */
function AddressLocationFields({
  formState,
  errors,
  touched,
  onFieldChange,
  onFieldBlur,
  onCityChange,
}) {
  return (
    <>
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
    </>
  );
}

export default AddressLocationFields;
