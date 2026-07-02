/**
 * Session storage helpers for delivery addresses.
 *
 * Security note: Address data (PII) is stored in sessionStorage rather than
 * localStorage so it clears when the tab closes. The authoritative source of
 * truth for a signed-in user's addresses is the backend; this cache is only a
 * UX aid during a single browsing session. If persistence across sessions is
 * required, addresses should be fetched from the authenticated `/api` endpoint.
 */

import { devWarn } from "./logger";

const ADDRESS_STORAGE_KEY = "elite-empressions-saved-addresses";
const SELECTED_ADDRESS_STORAGE_KEY = "elite-empressions-selected-address-id";

const logStorageWarning = (context, error) => {
  devWarn(`[addressStorage] ${context}`, error?.message || error);
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

const safeSessionStorage = () => {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage;
  } catch (error) {
    logStorageWarning("sessionStorage inaccessible", error);
    return null;
  }
};

export function loadSavedAddresses() {
  const store = safeSessionStorage();
  if (!store) return initialSavedAddresses;

  try {
    const rawValue = store.getItem(ADDRESS_STORAGE_KEY);
    if (!rawValue) return initialSavedAddresses;

    const parsedValue = JSON.parse(rawValue);
    if (!Array.isArray(parsedValue)) return initialSavedAddresses;
    return parsedValue.length > 0 ? parsedValue : [];
  } catch (error) {
    logStorageWarning("Failed to parse saved addresses", error);
    return initialSavedAddresses;
  }
}

export function persistSavedAddresses(addresses) {
  const store = safeSessionStorage();
  if (!store) return;
  try {
    store.setItem(ADDRESS_STORAGE_KEY, JSON.stringify(addresses));
  } catch (error) {
    // Storage may be full or blocked; the UI still works from memory.
    logStorageWarning("Failed to persist saved addresses", error);
  }
}

export function loadSelectedAddressId(addresses) {
  const store = safeSessionStorage();
  const fallback = addresses[0]?.id ?? "";
  if (!store) return fallback;

  try {
    const storedId = store.getItem(SELECTED_ADDRESS_STORAGE_KEY);
    if (storedId && addresses.some((address) => address.id === storedId)) {
      return storedId;
    }
    return fallback;
  } catch (error) {
    logStorageWarning("Failed to read selected address id", error);
    return fallback;
  }
}

export function persistSelectedAddressId(id) {
  const store = safeSessionStorage();
  if (!store) return;
  try {
    if (id) {
      store.setItem(SELECTED_ADDRESS_STORAGE_KEY, id);
    } else {
      store.removeItem(SELECTED_ADDRESS_STORAGE_KEY);
    }
  } catch (error) {
    logStorageWarning("Failed to persist selected address id", error);
  }
}

export const emptyAddressForm = {
  fullName: "",
  phoneNumber: "",
  email: "",
  address: "",
  landmark: "",
  city: "",
  state: "",
  postalCode: "",
};

export const createPrefilledAddressForm = (user) => ({
  ...emptyAddressForm,
  email: user?.email || "",
  phoneNumber: user?.mobile || "",
});
