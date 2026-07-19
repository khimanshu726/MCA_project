import { useEffect } from "react";
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
  const pincodeLookup = usePincodeLookup(formState.pincode);

  useEffect(() => {
    if (!pincodeLookup.result) return;
    onSetFieldsSilently({
      city: pincodeLookup.result.city,
      district: pincodeLookup.result.district,
      state: pincodeLookup.result.state,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pincodeLookup.result]);

  // A pincode the service doesn't recognise leaves stale city/state behind
  // from a previous lookup, which would be submitted alongside the new
  // pincode — an address that is internally inconsistent and undeliverable.
  useEffect(() => {
    if (!pincodeLookup.notFound) return;
    onSetFieldsSilently({ city: "", district: "", state: "" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pincodeLookup.notFound]);

  // City and state are locked only while they hold an answer we fetched. Any
  // other state — nothing entered yet, an unrecognised pincode, or a service
  // we couldn't reach — leaves them editable, so the form is never a dead end.
  const isAutoFilled = Boolean(pincodeLookup.result);
  const lockedFieldClassName = `${fieldClassName} cursor-default bg-ink-50 text-ink-700`;

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
            // An unrecognised pincode is a validation failure on this field,
            // so it reads as one rather than as a separate notice elsewhere.
            error={
              touched.pincode && errors.pincode
                ? errors.pincode
                : pincodeLookup.notFound
                  ? "Invalid PIN code"
                  : ""
            }
            helperText={
              (touched.pincode && errors.pincode) || pincodeLookup.notFound
                ? ""
                : pincodeLookup.isLoading
                  ? "Looking up city and state…"
                  : pincodeLookup.unavailable
                    ? "Couldn't reach the lookup service — enter city and state below."
                    : "Enter a 6-digit pincode and we'll fill in city and state."
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

          {/* The "Detected: …, …, … / Enter manually" banner used to sit here.
              It made the customer read back a result and then decide something,
              in the middle of a form whose whole point was to save them typing.
              The answer now simply appears in the City and State fields. */}
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

        {/* Always present, never conditionally mounted. These used to appear
            only when the lookup failed, so the form grew two fields at the
            moment something went wrong — the layout shifting under the
            customer as they typed. Now the shape of the form is constant and
            only the contents change. */}
        <InputField label="City" htmlFor="city" error={touched.city ? errors.city : ""}>
          <input
            id="city"
            type="text"
            className={isAutoFilled ? lockedFieldClassName : fieldClassName}
            value={formState.city}
            onChange={(event) => onFieldChange("city", event.target.value)}
            onBlur={() => onFieldBlur("city")}
            // readOnly rather than disabled: a disabled input is skipped by
            // keyboard navigation and is not read out, so the customer could
            // tab past their own city without ever knowing it was filled in.
            readOnly={isAutoFilled}
            aria-readonly={isAutoFilled || undefined}
          />
        </InputField>

        <InputField label="State" htmlFor="state" error={touched.state ? errors.state : ""}>
          <input
            id="state"
            type="text"
            className={isAutoFilled ? lockedFieldClassName : fieldClassName}
            value={formState.state}
            onChange={(event) => onFieldChange("state", event.target.value)}
            onBlur={() => onFieldBlur("state")}
            readOnly={isAutoFilled}
            aria-readonly={isAutoFilled || undefined}
          />
        </InputField>

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
