import { useEffect, useState } from "react";
import InputField from "./InputField";
import Button from "./ui/Button";
import { usePincodeLookup } from "../hooks/usePincodeLookup";

const ADDRESS_TYPES = [
  { value: "home", label: "Home" },
  { value: "office", label: "Office" },
  { value: "other", label: "Other" },
];

const fieldClassName =
  "w-full rounded-xl border border-ink-200 bg-white px-3.5 py-2.5 text-sm text-ink-900 transition placeholder:text-ink-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20";

/**
 * Shared create/edit address form. Auth mode (showTypeAndDefault) adds the
 * address-type segmented control and default toggle; guest mode is a
 * single-use form with an email field instead (no account to source it from).
 */
function AddressForm({
  formState,
  errors,
  touched,
  editingAddressId,
  requireEmail,
  showTypeAndDefault,
  isSaving,
  onFieldChange,
  onFieldBlur,
  onSetFieldsSilently,
  onSubmit,
  onCancel,
}) {
  const [manualOverride, setManualOverride] = useState(false);
  const pincodeLookup = usePincodeLookup(formState.pincode);

  useEffect(() => {
    if (!pincodeLookup.result) return;
    onSetFieldsSilently({
      city: pincodeLookup.result.district || pincodeLookup.result.area,
      district: pincodeLookup.result.district,
      state: pincodeLookup.result.state,
    });
    setManualOverride(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pincodeLookup.result]);

  useEffect(() => {
    setManualOverride(false);
  }, [formState.pincode]);

  const showManualLocationFields = manualOverride || Boolean(pincodeLookup.error);

  return (
    <form className="flex flex-col gap-4 rounded-2xl border border-ink-100 bg-white p-4 sm:p-5" onSubmit={onSubmit} noValidate>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <InputField label="Full Name" htmlFor="full-name" error={touched.fullName ? errors.fullName : ""}>
          <input
            id="full-name"
            type="text"
            className={fieldClassName}
            value={formState.fullName}
            onChange={(event) => onFieldChange("fullName", event.target.value)}
            onBlur={() => onFieldBlur("fullName")}
          />
        </InputField>

        <InputField label="Phone Number" htmlFor="phone-number" error={touched.phoneNumber ? errors.phoneNumber : ""}>
          <input
            id="phone-number"
            type="tel"
            inputMode="numeric"
            className={fieldClassName}
            value={formState.phoneNumber}
            onChange={(event) => onFieldChange("phoneNumber", event.target.value)}
            onBlur={() => onFieldBlur("phoneNumber")}
          />
        </InputField>

        {requireEmail ? (
          <div className="sm:col-span-2">
            <InputField label="Email" htmlFor="address-email" error={touched.email ? errors.email : ""}>
              <input
                id="address-email"
                type="email"
                className={fieldClassName}
                value={formState.email}
                onChange={(event) => onFieldChange("email", event.target.value)}
                onBlur={() => onFieldBlur("email")}
              />
            </InputField>
          </div>
        ) : null}

        <div className="sm:col-span-2">
          <InputField
            label="Pincode"
            htmlFor="pincode"
            error={touched.pincode ? errors.pincode : ""}
            helperText={
              touched.pincode && errors.pincode
                ? ""
                : pincodeLookup.isLoading
                  ? "Detecting city and state..."
                  : "Enter a 6-digit pincode to auto-detect city and state."
            }
          >
            <input
              id="pincode"
              type="text"
              inputMode="numeric"
              className={fieldClassName}
              value={formState.pincode}
              onChange={(event) => onFieldChange("pincode", event.target.value)}
              onBlur={() => onFieldBlur("pincode")}
            />
          </InputField>

          {!showManualLocationFields && pincodeLookup.result ? (
            <p className="mt-2 rounded-lg bg-success-100/40 px-3 py-2 text-xs text-success-600">
              Detected: {pincodeLookup.result.area}, {pincodeLookup.result.district}, {pincodeLookup.result.state}.{" "}
              <button type="button" className="font-semibold underline" onClick={() => setManualOverride(true)}>
                Enter manually
              </button>
            </p>
          ) : null}

          {pincodeLookup.error ? <p className="mt-2 text-xs text-danger-600">{pincodeLookup.error}</p> : null}
        </div>

        <div className="sm:col-span-2">
          <InputField label="Address Line 1" htmlFor="address-line-1" error={touched.addressLine1 ? errors.addressLine1 : ""}>
            <input
              id="address-line-1"
              type="text"
              className={fieldClassName}
              value={formState.addressLine1}
              onChange={(event) => onFieldChange("addressLine1", event.target.value)}
              onBlur={() => onFieldBlur("addressLine1")}
            />
          </InputField>
        </div>

        <div className="sm:col-span-2">
          <InputField label="Address Line 2 (optional)" htmlFor="address-line-2">
            <input
              id="address-line-2"
              type="text"
              className={fieldClassName}
              value={formState.addressLine2}
              onChange={(event) => onFieldChange("addressLine2", event.target.value)}
              onBlur={() => onFieldBlur("addressLine2")}
            />
          </InputField>
        </div>

        <div className="sm:col-span-2">
          <InputField label="Landmark (optional)" htmlFor="landmark">
            <input
              id="landmark"
              type="text"
              className={fieldClassName}
              value={formState.landmark}
              onChange={(event) => onFieldChange("landmark", event.target.value)}
              onBlur={() => onFieldBlur("landmark")}
            />
          </InputField>
        </div>

        {showManualLocationFields ? (
          <>
            <InputField label="City" htmlFor="city" error={touched.city ? errors.city : ""}>
              <input
                id="city"
                type="text"
                className={fieldClassName}
                value={formState.city}
                onChange={(event) => onFieldChange("city", event.target.value)}
                onBlur={() => onFieldBlur("city")}
              />
            </InputField>

            <InputField label="State" htmlFor="state" error={touched.state ? errors.state : ""}>
              <input
                id="state"
                type="text"
                className={fieldClassName}
                value={formState.state}
                onChange={(event) => onFieldChange("state", event.target.value)}
                onBlur={() => onFieldBlur("state")}
              />
            </InputField>
          </>
        ) : null}

        {showTypeAndDefault ? (
          <div className="sm:col-span-2">
            <span className="mb-1.5 block text-sm font-medium text-ink-700">Address Type</span>
            <div className="inline-flex rounded-xl border border-ink-200 bg-ink-50 p-1">
              {ADDRESS_TYPES.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  className={`rounded-lg px-4 py-1.5 text-sm font-medium transition ${
                    formState.addressType === type.value ? "bg-white text-brand-600 shadow-sm" : "text-ink-500 hover:text-ink-700"
                  }`}
                  onClick={() => onFieldChange("addressType", type.value)}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {showTypeAndDefault ? (
          <div className="sm:col-span-2">
            <label className="flex items-center gap-2 text-sm text-ink-700">
              <input
                type="checkbox"
                className="size-4 rounded border-ink-300 text-brand-500 focus:ring-brand-500"
                checked={Boolean(formState.isDefault)}
                onChange={(event) => onFieldChange("isDefault", event.target.checked)}
              />
              Set as default address
            </label>
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-3">
        <Button type="submit" loading={isSaving}>
          {editingAddressId ? "Update Address" : "Save Address"}
        </Button>
        {onCancel ? (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
      </div>
    </form>
  );
}

export default AddressForm;
