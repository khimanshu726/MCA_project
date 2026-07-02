import { useEffect, useMemo, useState } from "react";
import AddressCard from "./AddressCard";
import InputField from "./InputField";
import { cityOptions } from "../data/cities";
import {
  hasAddressErrors,
  sanitizeDigits,
  sanitizeName,
  validateAddressForm,
  validateField,
} from "../utils/addressValidation";
import {
  createPrefilledAddressForm,
  emptyAddressForm,
  loadSavedAddresses,
  loadSelectedAddressId,
  persistSavedAddresses,
  persistSelectedAddressId,
} from "../utils/addressStorage";

function AddressManager({ user, isAuthenticated, onAddressChange, onOrderMessage }) {
  const [savedAddresses, setSavedAddresses] = useState(() => loadSavedAddresses());
  const [selectedAddressId, setSelectedAddressId] = useState(() =>
    loadSelectedAddressId(loadSavedAddresses()),
  );
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState("");
  const [formState, setFormState] = useState(emptyAddressForm);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [cityQuery, setCityQuery] = useState("");
  const [showCitySuggestions, setShowCitySuggestions] = useState(false);

  const filteredCities = useMemo(() => {
    const query = cityQuery.trim().toLowerCase();
    if (!query) return [];
    return cityOptions.filter((city) => city.toLowerCase().includes(query)).slice(0, 8);
  }, [cityQuery]);

  const selectedAddress = useMemo(
    () => savedAddresses.find((address) => address.id === selectedAddressId) ?? null,
    [savedAddresses, selectedAddressId],
  );

  const effectiveAddress = useMemo(() => {
    if (!selectedAddress && isFormVisible) return formState;
    return selectedAddress;
  }, [formState, isFormVisible, selectedAddress]);

  const selectedAddressErrors = useMemo(() => {
    if (!effectiveAddress) return {};
    return validateAddressForm({
      fullName: effectiveAddress.fullName || "",
      phoneNumber: effectiveAddress.phoneNumber || "",
      email: effectiveAddress.email || "",
      address: effectiveAddress.address || "",
      landmark: effectiveAddress.landmark || "",
      city: effectiveAddress.city || "",
      state: effectiveAddress.state || "",
      postalCode: effectiveAddress.postalCode || "",
    });
  }, [effectiveAddress]);

  // Notify parent when the effective delivery address / errors change.
  useEffect(() => {
    onAddressChange({
      selectedAddress,
      effectiveAddress,
      selectedAddressErrors,
      hasErrors: hasAddressErrors(selectedAddressErrors),
      openForm: () => {
        setIsFormVisible(true);
      },
    });
  }, [effectiveAddress, onAddressChange, selectedAddress, selectedAddressErrors]);

  useEffect(() => {
    persistSavedAddresses(savedAddresses);
  }, [savedAddresses]);

  useEffect(() => {
    if (selectedAddressId && savedAddresses.some((address) => address.id === selectedAddressId)) {
      persistSelectedAddressId(selectedAddressId);
      return;
    }

    if (savedAddresses.length === 0) {
      persistSelectedAddressId("");
      if (selectedAddressId !== "") setSelectedAddressId("");
      return;
    }

    const fallbackId = savedAddresses[0].id;
    if (selectedAddressId !== fallbackId) setSelectedAddressId(fallbackId);
    persistSelectedAddressId(fallbackId);
  }, [savedAddresses, selectedAddressId]);

  const resetAddressForm = () => {
    setIsFormVisible(false);
    setEditingAddressId("");
    setFormState(createPrefilledAddressForm(user));
    setErrors({});
    setTouched({});
    setCityQuery("");
    setShowCitySuggestions(false);
  };

  const openNewAddressForm = () => {
    onOrderMessage("");
    setIsFormVisible(true);
    setEditingAddressId("");
    setFormState(createPrefilledAddressForm(user));
    setErrors({});
    setTouched({});
    setCityQuery("");
    setShowCitySuggestions(false);
  };

  const handleEditAddress = (address) => {
    onOrderMessage("");
    setIsFormVisible(true);
    setEditingAddressId(address.id);
    setFormState({
      fullName: address.fullName,
      phoneNumber: address.phoneNumber,
      email: address.email,
      address: address.address,
      landmark: address.landmark ?? "",
      city: address.city,
      state: address.state,
      postalCode: address.postalCode,
    });
    setCityQuery(address.city);
    setErrors({});
    setTouched({});
    setShowCitySuggestions(false);
  };

  const handleDeleteAddress = (addressId) => {
    setSavedAddresses((currentAddresses) => {
      const nextAddresses = currentAddresses.filter((address) => address.id !== addressId);
      if (selectedAddressId === addressId) {
        setSelectedAddressId(nextAddresses[0]?.id ?? "");
      }
      return nextAddresses.map((address, index) => ({ ...address, isDefault: index === 0 }));
    });

    if (editingAddressId === addressId) {
      resetAddressForm();
    }
  };

  const handleInputChange = (field, rawValue) => {
    let nextValue = rawValue;

    if (field === "fullName") nextValue = sanitizeName(rawValue);
    if (field === "phoneNumber") nextValue = sanitizeDigits(rawValue, 10);
    if (field === "postalCode") nextValue = sanitizeDigits(rawValue, 6);

    setFormState((currentState) => ({ ...currentState, [field]: nextValue }));
    onOrderMessage("");

    if (field === "city") {
      setCityQuery(nextValue);
      setShowCitySuggestions(true);
    }

    if (touched[field]) {
      setErrors((currentErrors) => ({
        ...currentErrors,
        [field]: validateField(field, nextValue),
      }));
    }
  };

  const handleFieldBlur = (field) => {
    setTouched((currentTouched) => ({ ...currentTouched, [field]: true }));
    setErrors((currentErrors) => ({
      ...currentErrors,
      [field]: validateField(field, formState[field]),
    }));
    if (field === "city") {
      window.setTimeout(() => setShowCitySuggestions(false), 120);
    }
  };

  const handleCitySelect = (city) => {
    setFormState((currentState) => ({ ...currentState, city }));
    setCityQuery(city);
    setTouched((currentTouched) => ({ ...currentTouched, city: true }));
    setErrors((currentErrors) => ({ ...currentErrors, city: "" }));
    setShowCitySuggestions(false);
  };

  const handleSaveAddress = (event) => {
    event.preventDefault();

    const nextErrors = validateAddressForm(formState);
    const nextTouched = Object.keys(formState).reduce((accumulator, key) => {
      accumulator[key] = true;
      return accumulator;
    }, {});

    setErrors(nextErrors);
    setTouched(nextTouched);

    if (hasAddressErrors(nextErrors)) {
      onOrderMessage("Please correct the highlighted address fields before saving.");
      return;
    }

    const preparedAddress = {
      id: editingAddressId || `addr-${Date.now()}`,
      ...formState,
      fullName: formState.fullName.trim(),
      email: formState.email.trim(),
      address: formState.address.trim(),
      landmark: formState.landmark.trim(),
      city: formState.city.trim(),
      state: formState.state.trim(),
      isDefault: savedAddresses.length === 0 || !selectedAddressId,
    };

    setSavedAddresses((currentAddresses) => {
      if (editingAddressId) {
        return currentAddresses.map((address) =>
          address.id === editingAddressId
            ? { ...address, ...preparedAddress, isDefault: address.isDefault }
            : address,
        );
      }
      return [
        ...currentAddresses.map((address) => ({ ...address, isDefault: false })),
        preparedAddress,
      ];
    });

    setSelectedAddressId(preparedAddress.id);
    onOrderMessage("Address saved successfully.");
    resetAddressForm();
  };

  return (
    <div className="summary-card">
      <div className="delivery-header">
        <div>
          <p className="eyebrow">Delivery details</p>
          <h3 className="section-subtitle">
            Save multiple addresses and reuse them during checkout.
          </h3>
          {isAuthenticated ? (
            <p className="field-helper">
              Signed in as {user?.email || user?.mobile}. New addresses start with your saved
              contact info.
            </p>
          ) : null}
        </div>
        <button
          type="button"
          className="secondary-button compact-button address-add-button"
          onClick={openNewAddressForm}
        >
          Add new address
        </button>
      </div>

      <div className="saved-addresses-stack">
        {savedAddresses.length > 0 ? (
          savedAddresses.map((address) => (
            <AddressCard
              key={address.id}
              address={address}
              isSelected={address.id === selectedAddressId}
              onSelect={setSelectedAddressId}
              onEdit={handleEditAddress}
              onDelete={handleDeleteAddress}
            />
          ))
        ) : (
          <div className="empty-state-card">
            <p className="section-copy">
              No saved addresses yet. Add your first delivery address below.
            </p>
          </div>
        )}
      </div>

      {isFormVisible ? (
        <form className="delivery-form-card" onSubmit={handleSaveAddress} noValidate>
          <div className="delivery-form-grid">
            <InputField label="Full Name" htmlFor="full-name" error={touched.fullName ? errors.fullName : ""}>
              <input
                id="full-name"
                type="text"
                value={formState.fullName}
                onChange={(event) => handleInputChange("fullName", event.target.value)}
                onBlur={() => handleFieldBlur("fullName")}
              />
            </InputField>

            <InputField label="Phone Number" htmlFor="phone-number" error={touched.phoneNumber ? errors.phoneNumber : ""}>
              <input
                id="phone-number"
                type="tel"
                inputMode="numeric"
                value={formState.phoneNumber}
                onChange={(event) => handleInputChange("phoneNumber", event.target.value)}
                onBlur={() => handleFieldBlur("phoneNumber")}
              />
            </InputField>

            <InputField label="Email" htmlFor="email" error={touched.email ? errors.email : ""}>
              <input
                id="email"
                type="email"
                value={formState.email}
                onChange={(event) => handleInputChange("email", event.target.value)}
                onBlur={() => handleFieldBlur("email")}
              />
            </InputField>

            <InputField label="State" htmlFor="state" error={touched.state ? errors.state : ""}>
              <input
                id="state"
                type="text"
                value={formState.state}
                onChange={(event) => handleInputChange("state", event.target.value)}
                onBlur={() => handleFieldBlur("state")}
              />
            </InputField>

            <div className="full-span">
              <InputField label="Street Address" htmlFor="shipping-address" error={touched.address ? errors.address : ""}>
                <textarea
                  id="shipping-address"
                  rows="4"
                  value={formState.address}
                  onChange={(event) => handleInputChange("address", event.target.value)}
                  onBlur={() => handleFieldBlur("address")}
                />
              </InputField>
            </div>

            <div className="full-span">
              <InputField label="Nearest Landmark" htmlFor="landmark" error={touched.landmark ? errors.landmark : ""}>
                <input
                  id="landmark"
                  type="text"
                  value={formState.landmark}
                  onChange={(event) => handleInputChange("landmark", event.target.value)}
                  onBlur={() => handleFieldBlur("landmark")}
                />
              </InputField>
            </div>

            <InputField label="City" htmlFor="city" error={touched.city ? errors.city : ""}>
              <div className="autocomplete-box">
                <input
                  id="city"
                  type="text"
                  autoComplete="off"
                  value={formState.city}
                  onChange={(event) => handleInputChange("city", event.target.value)}
                  onBlur={() => handleFieldBlur("city")}
                  onFocus={() => setShowCitySuggestions(true)}
                />

                {showCitySuggestions ? (
                  <div className="suggestions-dropdown">
                    {cityQuery.trim() === "" ? (
                      <div className="suggestion-state">Start typing a city name.</div>
                    ) : filteredCities.length > 0 ? (
                      filteredCities.map((city) => (
                        <button
                          key={city}
                          type="button"
                          className="suggestion-item"
                          onMouseDown={() => handleCitySelect(city)}
                        >
                          {city}
                        </button>
                      ))
                    ) : (
                      <div className="suggestion-state">No cities found.</div>
                    )}
                  </div>
                ) : null}
              </div>
            </InputField>

            <InputField label="Pincode" htmlFor="postal-code" error={touched.postalCode ? errors.postalCode : ""}>
              <input
                id="postal-code"
                type="text"
                inputMode="numeric"
                value={formState.postalCode}
                onChange={(event) => handleInputChange("postalCode", event.target.value)}
                onBlur={() => handleFieldBlur("postalCode")}
              />
            </InputField>
          </div>

          <div className="action-row">
            <button type="submit" className="primary-button">
              {editingAddressId ? "Update Address" : "Save Address"}
            </button>
            <button type="button" className="secondary-button" onClick={resetAddressForm}>
              Cancel
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}

export default AddressManager;
