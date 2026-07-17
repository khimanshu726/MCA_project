import { useEffect, useState } from "react";
import InputField from "./InputField";
import { COURIERS, buildTrackingUrl } from "../../../src/utils/couriers";

/**
 * Where an admin records who has the parcel and where the customer can watch it.
 *
 * The Order model has carried `trackingId` since it was written, and the update
 * API has always accepted it — but nothing ever rendered a field to type it
 * into, so in practice no order could have one. This is that field.
 *
 * The tracking link is shown here, live, before saving. Courier URLs change
 * without notice and this app has no carrier integration to validate against,
 * so the person who can actually check the link is the one pasting the
 * consignment number. Better staff find a dead link than a customer does.
 */
const toDateInput = (value) => (value ? new Date(value).toISOString().slice(0, 10) : "");

function ShipmentPanel({ order, onSave, isSaving }) {
  const [courier, setCourier] = useState(order.courier || "");
  const [trackingId, setTrackingId] = useState(order.trackingId || "");
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState(toDateInput(order.expectedDeliveryDate));

  // Selecting a different order must reload the panel, not leave the previous
  // order's consignment number sitting in the box ready to be saved onto it.
  useEffect(() => {
    setCourier(order.courier || "");
    setTrackingId(order.trackingId || "");
    setExpectedDeliveryDate(toDateInput(order.expectedDeliveryDate));
  }, [order.id, order.courier, order.trackingId, order.expectedDeliveryDate]);

  const trackingUrl = buildTrackingUrl(courier, trackingId);
  const isDirty =
    courier !== (order.courier || "") ||
    trackingId !== (order.trackingId || "") ||
    expectedDeliveryDate !== toDateInput(order.expectedDeliveryDate);

  return (
    <div className="shipment-panel">
      <p className="eyebrow">Shipment</p>

      <InputField label="Courier" htmlFor="ship-courier">
        <select id="ship-courier" value={courier} onChange={(event) => setCourier(event.target.value)}>
          <option value="">Not dispatched yet</option>
          {COURIERS.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </select>
      </InputField>

      <InputField
        label="Tracking number"
        htmlFor="ship-tracking"
        helperText="The consignment / AWB number from the courier."
      >
        <input
          id="ship-tracking"
          type="text"
          value={trackingId}
          onChange={(event) => setTrackingId(event.target.value)}
          placeholder="e.g. 1234567890"
        />
      </InputField>

      <InputField
        label="Expected delivery"
        htmlFor="ship-eta"
        helperText="Shown to the customer. Leave blank if you don't know yet."
      >
        <input
          id="ship-eta"
          type="date"
          value={expectedDeliveryDate}
          onChange={(event) => setExpectedDeliveryDate(event.target.value)}
        />
      </InputField>

      {/* Check the link here, not after a customer complains. */}
      {trackingId ? (
        trackingUrl ? (
          <p className="shipment-link-preview">
            Customer link:{" "}
            <a href={trackingUrl} target="_blank" rel="noreferrer">
              test it
            </a>
          </p>
        ) : (
          <p className="shipment-link-note">
            {courier
              ? "This courier has no linkable tracking page — the customer will see the number as text."
              : "Pick a courier to give the customer a tracking link."}
          </p>
        )
      ) : null}

      <button
        type="button"
        className="secondary-button"
        disabled={!isDirty || isSaving}
        onClick={() => onSave({ courier, trackingId, expectedDeliveryDate: expectedDeliveryDate || null })}
      >
        {isSaving ? "Saving…" : "Save shipment"}
      </button>
    </div>
  );
}

export default ShipmentPanel;
