import { useCallback, useEffect, useMemo, useState } from "react";
import {
  loadSavedAddresses,
  loadSelectedAddressId,
  persistSavedAddresses,
  persistSelectedAddressId,
} from "../utils/addressStorage";

/**
 * Manages the list of saved delivery addresses + selected id + persistence.
 * Does NOT know about form state; that lives in useAddressForm.
 */
export function useAddressBook() {
  const [savedAddresses, setSavedAddresses] = useState(loadSavedAddresses);
  const [selectedAddressId, setSelectedAddressId] = useState(() =>
    loadSelectedAddressId(loadSavedAddresses()),
  );

  useEffect(() => {
    persistSavedAddresses(savedAddresses);
  }, [savedAddresses]);

  useEffect(() => {
    const hasSelectedInList =
      selectedAddressId && savedAddresses.some((a) => a.id === selectedAddressId);

    if (hasSelectedInList) {
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

  const selectedAddress = useMemo(
    () => savedAddresses.find((address) => address.id === selectedAddressId) ?? null,
    [savedAddresses, selectedAddressId],
  );

  const upsertAddress = useCallback(
    (preparedAddress, editingId) => {
      setSavedAddresses((current) => {
        if (editingId) {
          return current.map((address) =>
            address.id === editingId
              ? { ...address, ...preparedAddress, isDefault: address.isDefault }
              : address,
          );
        }
        return [
          ...current.map((address) => ({ ...address, isDefault: false })),
          preparedAddress,
        ];
      });
      setSelectedAddressId(preparedAddress.id);
    },
    [],
  );

  const deleteAddress = useCallback(
    (addressId) => {
      setSavedAddresses((current) => {
        const next = current.filter((address) => address.id !== addressId);
        if (selectedAddressId === addressId) {
          setSelectedAddressId(next[0]?.id ?? "");
        }
        return next.map((address, index) => ({
          ...address,
          isDefault: index === 0,
        }));
      });
    },
    [selectedAddressId],
  );

  return {
    savedAddresses,
    selectedAddress,
    selectedAddressId,
    setSelectedAddressId,
    upsertAddress,
    deleteAddress,
  };
}
