import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AddressCard from "../components/AddressCard";
import CartItemRow from "../components/CartItemRow";
import InputField from "../components/InputField";
import { useCart } from "../context/CartContext";
import { cityOptions } from "../data/cities";
import { createOrder } from "../lib/api";
import {
  hasAddressErrors,
  sanitizeDigits,
  sanitizeName,
  validateAddressForm,
  validateField,
} from "../utils/addressValidation";
import { validateCheckoutFile } from "../utils/orderValidation";

const orderCurrency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const formatMoney = (value) => orderCurrency.format(value || 0);

const emptyAddressForm = {
  fullName: "",
  phoneNumber: "",
  email: "",
  address: "",
  landmark: "",
  city: "",
  state: "",
  postalCode: "",
};

const initialSavedAddresses = [
  {
    id: "addr-1",
    fullName: "Aarav Sharma",
    phoneNumber: "9876543210",
    email: "aarav.sharma@example.com",
    address: "221 Business Street, Andheri East",
    landmark: "Near Metro Station Gate 2",
    city: "Mumbai",
    state: "Maharashtra",
    postalCode: "400001",
    isDefault: true,
  },
  {
    id: "addr-2",
    fullName: "Riya Mehta",
    phoneNumber: "9123456780",
    email: "riya.mehta@example.com",
    address: "18 Lake View Residency, Koramangala",
    landmark: "Opposite Forum Mall",
    city: "Bangalore",
    state: "Karnataka",
    postalCode: "560034",
    isDefault: false,
  },
];

const ADDRESS_STORAGE_KEY = "elite-empressions-saved-addresses";
const SELECTED_ADDRESS_STORAGE_KEY = "elite-empressions-selected-address-id";

const loadSavedAddresses = () => {
  if (typeof window === "undefined") {
    return initialSavedAddresses;
  }

  try {
    const rawValue = window.localStorage.getItem(ADDRESS_STORAGE_KEY);
    if (!rawValue) {
      return initialSavedAddresses;
    }

    const parsedValue = JSON.parse(rawValue);
    if (!Array.isArray(parsedValue)) {
      return initialSavedAddresses;
    }

    return parsedValue.length > 0 ? parsedValue : [];
  } catch {
    return initialSavedAddresses;
  }
};

const loadSelectedAddressId = (addresses) => {
  if (typeof window === "undefined") {
    return addresses[0]?.id ?? "";
  }

  try {
    const storedId = window.localStorage.getItem(SELECTED_ADDRESS_STORAGE_KEY);
    if (storedId && addresses.some((address) => address.id === storedId)) {
      return storedId;
    }
  } catch {
    return addresses[0]?.id ?? "";
  }

  return addresses[0]?.id ?? "";
};

function CartPage() {
  const { cartItems, clearCart, removeFromCart, updateQuantity } = useCart();
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [savedAddresses, setSavedAddresses] = useState(() => loadSavedAddresses());
  const [selectedAddressId, setSelectedAddressId] = useState(() => loadSelectedAddressId(loadSavedAddresses()));
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState("");
  const [formState, setFormState] = useState(emptyAddressForm);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [cityQuery, setCityQuery] = useState("");
  const [showCitySuggestions, setShowCitySuggestions] = useState(false);
  const [customInstructions, setCustomInstructions] = useState("");
  const [designFile, setDesignFile] = useState(null);
  const [fileError, setFileError] = useState("");
  const [orderMessage, setOrderMessage] = useState("");
  const [orderReceipt, setOrderReceipt] = useState(null);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);

  const subtotal = useMemo(
    () => cartItems.reduce((total, item) => total + item.price * item.quantity, 0),
    [cartItems],
  );
  const shipping = cartItems.length > 0 ? 120 : 0;
  const total = subtotal + shipping;

  const filteredCities = useMemo(() => {
    const query = cityQuery.trim().toLowerCase();
    if (!query) {
      return [];
    }

    return cityOptions.filter((city) => city.toLowerCase().includes(query)).slice(0, 8);
  }, [cityQuery]);

  const selectedAddress = useMemo(
    () => savedAddresses.find((address) => address.id === selectedAddressId) ?? null,
    [savedAddresses, selectedAddressId],
  );

  useEffect(() => {
    window.localStorage.setItem(ADDRESS_STORAGE_KEY, JSON.stringify(savedAddresses));
  }, [savedAddresses]);

  useEffect(() => {
    if (selectedAddressId && savedAddresses.some((address) => address.id === selectedAddressId)) {
      window.localStorage.setItem(SELECTED_ADDRESS_STORAGE_KEY, selectedAddressId);
      return;
    }

    if (savedAddresses.length === 0) {
      window.localStorage.removeItem(SELECTED_ADDRESS_STORAGE_KEY);
      if (selectedAddressId !== "") {
        setSelectedAddressId("");
      }
      return;
    }

    const fallbackId = savedAddresses[0].id;
    if (selectedAddressId !== fallbackId) {
      setSelectedAddressId(fallbackId);
    }
    window.localStorage.setItem(SELECTED_ADDRESS_STORAGE_KEY, fallbackId);
  }, [savedAddresses, selectedAddressId]);

  const resetAddressForm = () => {
    setIsFormVisible(false);
    setEditingAddressId("");
    setFormState(emptyAddressForm);
    setErrors({});
    setTouched({});
    setCityQuery("");
    setShowCitySuggestions(false);
  };

  const openNewAddressForm = () => {
    setOrderMessage("");
    setOrderReceipt(null);
    setIsFormVisible(true);
    setEditingAddressId("");
    setFormState(emptyAddressForm);
    setErrors({});
    setTouched({});
    setCityQuery("");
    setShowCitySuggestions(false);
  };

  const handleEditAddress = (address) => {
    setOrderMessage("");
    setOrderReceipt(null);
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
      return nextAddresses.map((address, index) => ({
        ...address,
        isDefault: index === 0,
      }));
    });

    if (editingAddressId === addressId) {
      resetAddressForm();
    }
  };

  const handleInputChange = (field, rawValue) => {
    let nextValue = rawValue;

    if (field === "fullName") {
      nextValue = sanitizeName(rawValue);
    }

    if (field === "phoneNumber") {
      nextValue = sanitizeDigits(rawValue, 10);
    }

    if (field === "postalCode") {
      nextValue = sanitizeDigits(rawValue, 6);
    }

    setFormState((currentState) => ({
      ...currentState,
      [field]: nextValue,
    }));
    setOrderMessage("");
    setOrderReceipt(null);

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
    setTouched((currentTouched) => ({
      ...currentTouched,
      [field]: true,
    }));

    setErrors((currentErrors) => ({
      ...currentErrors,
      [field]: validateField(field, formState[field]),
    }));

    if (field === "city") {
      window.setTimeout(() => setShowCitySuggestions(false), 120);
    }
  };

  const handleCitySelect = (city) => {
    setFormState((currentState) => ({
      ...currentState,
      city,
    }));
    setCityQuery(city);
    setTouched((currentTouched) => ({
      ...currentTouched,
      city: true,
    }));
    setErrors((currentErrors) => ({
      ...currentErrors,
      city: "",
    }));
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
      setOrderMessage("Please correct the highlighted address fields before saving.");
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
          address.id === editingAddressId ? { ...address, ...preparedAddress, isDefault: address.isDefault } : address,
        );
      }

      return [...currentAddresses.map((address) => ({ ...address, isDefault: false })), preparedAddress];
    });

    setSelectedAddressId(preparedAddress.id);
    setOrderMessage("Address saved successfully.");
    resetAddressForm();
  };

  const handleFileChange = (event) => {
    const nextFile = event.target.files?.[0] ?? null;
    const nextError = validateCheckoutFile(nextFile);

    setDesignFile(nextFile);
    setFileError(nextError);
    setOrderMessage("");
    setOrderReceipt(null);
  };

  const handlePlaceOrder = async () => {
    if (!selectedAddress) {
      setOrderMessage("Select or add a delivery address before placing the order.");
      setIsFormVisible(true);
      return;
    }

    if (cartItems.length === 0) {
      setOrderMessage("Add at least one product before placing an order.");
      return;
    }

    const nextFileError = validateCheckoutFile(designFile);
    if (nextFileError) {
      setFileError(nextFileError);
      setOrderMessage("Please correct the design file before placing the order.");
      return;
    }

    setIsPlacingOrder(true);
    setOrderMessage("");
    setOrderReceipt(null);

    try {
      const formData = new FormData();
      formData.append("customerName", selectedAddress.fullName);
      formData.append("phone", selectedAddress.phoneNumber);
      formData.append("email", selectedAddress.email);
      formData.append("streetAddress", selectedAddress.address);
      formData.append("landmark", selectedAddress.landmark || "");
      formData.append("city", selectedAddress.city);
      formData.append("state", selectedAddress.state);
      formData.append("pincode", selectedAddress.postalCode);
      formData.append("paymentMethod", paymentMethod);
      formData.append("shippingCharge", String(shipping));
      formData.append("customInstructions", customInstructions);
      formData.append(
        "lineItems",
        JSON.stringify(
          cartItems.map((item) => ({
            productId: item.id,
            name: item.name,
            quantity: item.quantity,
            unitPrice: item.price,
            customizationText: customInstructions,
          })),
        ),
      );

      if (designFile) {
        formData.append("designFile", designFile);
      }

      const response = await createOrder(formData);
      setOrderReceipt(response.order);
      setOrderMessage(`Order ${response.order.orderId} was placed successfully.`);
      setCustomInstructions("");
      setDesignFile(null);
      setFileError("");
      clearCart();
    } catch (submitError) {
      setOrderMessage(submitError.payload?.message || submitError.message || "Unable to place the order.");
    } finally {
      setIsPlacingOrder(false);
    }
  };

  return (
    <main className="page-stack">
      <section className="section-panel">
        <div className="section-heading">
          <p className="eyebrow">Cart + Checkout</p>
          <h2>Place print orders with delivery, payment, and production files in one flow.</h2>
          <p className="section-copy">
            Customers can review products, attach design files, and send complete order details directly to the admin dashboard.
          </p>
        </div>

        <div className="cart-layout">
          <div className="cart-column">
            {cartItems.length > 0 ? (
              cartItems.map((item) => (
                <CartItemRow
                  key={item.id}
                  item={item}
                  onQuantityChange={updateQuantity}
                  onRemove={removeFromCart}
                  priceLabel={formatMoney(item.price * item.quantity)}
                />
              ))
            ) : (
              <div className="summary-card">
                <p className="eyebrow">Cart empty</p>
                <p className="section-copy">Your cart has no products right now. Browse the catalog to add items.</p>
                <div className="action-row">
                  <Link className="primary-button" to="/products">
                    Browse Products
                  </Link>
                </div>
              </div>
            )}

            <div className="summary-card">
              <p className="eyebrow">Order notes</p>
              <InputField label="Custom Instructions" htmlFor="custom-instructions" helperText="Mention print finish, colors, sizing, or dispatch notes.">
                <textarea
                  id="custom-instructions"
                  rows="5"
                  value={customInstructions}
                  onChange={(event) => setCustomInstructions(event.target.value)}
                />
              </InputField>

              <InputField
                label="Design File"
                htmlFor="design-file"
                error={fileError}
                helperText="Upload PDF, PNG, or JPG up to 10 MB."
              >
                <input id="design-file" type="file" accept=".pdf,image/png,image/jpeg" onChange={handleFileChange} />
              </InputField>

              {designFile ? <p className="field-helper">Selected file: {designFile.name}</p> : null}
            </div>
          </div>

          <aside className="checkout-column">
            <div className="summary-card">
              <div className="delivery-header">
                <div>
                  <p className="eyebrow">Delivery details</p>
                  <h3 className="section-subtitle">Save multiple addresses and reuse them during checkout.</h3>
                </div>
                <button type="button" className="secondary-button compact-button address-add-button" onClick={openNewAddressForm}>
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
                    <p className="section-copy">No saved addresses yet. Add your first delivery address below.</p>
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

            <div className="summary-card">
              <p className="eyebrow">Payment</p>
              <div className="payment-options">
                <label className={`payment-option ${paymentMethod === "cod" ? "active" : ""}`}>
                  <input
                    type="radio"
                    name="payment"
                    value="cod"
                    checked={paymentMethod === "cod"}
                    onChange={(event) => setPaymentMethod(event.target.value)}
                  />
                  Cash on Delivery
                </label>
                <label className={`payment-option ${paymentMethod === "upi" ? "active" : ""}`}>
                  <input
                    type="radio"
                    name="payment"
                    value="upi"
                    checked={paymentMethod === "upi"}
                    onChange={(event) => setPaymentMethod(event.target.value)}
                  />
                  UPI
                </label>
                <label className={`payment-option ${paymentMethod === "card" ? "active" : ""}`}>
                  <input
                    type="radio"
                    name="payment"
                    value="card"
                    checked={paymentMethod === "card"}
                    onChange={(event) => setPaymentMethod(event.target.value)}
                  />
                  Card
                </label>
              </div>
              {paymentMethod !== "cod" ? (
                <p className="field-helper">Mock payment is enabled and will mark the order as paid.</p>
              ) : null}
            </div>

            <div className="summary-card">
              <p className="eyebrow">Order summary</p>
              {selectedAddress ? (
                <div className="selected-address-inline">
                  <strong>Deliver to:</strong>
                  <span>{selectedAddress.fullName}</span>
                  <span>{selectedAddress.email}</span>
                  <span>{selectedAddress.phoneNumber}</span>
                  <span>
                    {selectedAddress.address}
                    {selectedAddress.landmark ? `, ${selectedAddress.landmark}` : ""}
                  </span>
                  <span>
                    {selectedAddress.city}, {selectedAddress.state} - {selectedAddress.postalCode}
                  </span>
                </div>
              ) : null}
              <div className="summary-line">
                <span>Subtotal</span>
                <strong>{formatMoney(subtotal)}</strong>
              </div>
              <div className="summary-line">
                <span>Shipping</span>
                <strong>{formatMoney(shipping)}</strong>
              </div>
              <div className="summary-line total-line">
                <span>Total</span>
                <strong>{formatMoney(total)}</strong>
              </div>
              {orderMessage ? <p className="submit-message">{orderMessage}</p> : null}
              {orderReceipt ? (
                <div className="order-success-card">
                  <strong>{orderReceipt.orderId}</strong>
                  <span>Status: {orderReceipt.orderStatus}</span>
                  <span>Payment: {orderReceipt.paymentStatus}</span>
                </div>
              ) : null}
              <div className="action-row">
                <button
                  type="button"
                  className="primary-button full-width-button"
                  onClick={handlePlaceOrder}
                  disabled={cartItems.length === 0 || !selectedAddress || isPlacingOrder}
                >
                  {isPlacingOrder ? "Placing Order..." : "Place Order"}
                </button>
                <Link className="secondary-button full-width-button" to="/customize">
                  Edit Designs
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}

export default CartPage;
