import AddressContactFields from "./AddressContactFields";
import AddressLocationFields from "./AddressLocationFields";

/**
 * Delivery-address form. Presentational only — parent owns the state.
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
        <AddressContactFields
          formState={formState}
          errors={errors}
          touched={touched}
          onFieldChange={onFieldChange}
          onFieldBlur={onFieldBlur}
        />
        <AddressLocationFields
          formState={formState}
          errors={errors}
          touched={touched}
          onFieldChange={onFieldChange}
          onFieldBlur={onFieldBlur}
          onCityChange={onCityChange}
        />
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
