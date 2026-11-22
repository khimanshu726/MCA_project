import { useState } from "react";
import InputField from "./InputField";
import { createHsnCode } from "../lib/adminApi";
import { GST_RATES } from "../../../src/utils/gst";

const CODE_PATTERN = /^\d{4,8}$/;

/**
 * Adds an HSN/SAC code to the shared HSN table without leaving the product
 * form. The new row is a normal product code: it appears in every product's
 * dropdown from then on and on the HSN & GST page.
 *
 * Confirmed by default — the owner is typing the rate themselves — but they
 * can leave it unconfirmed, in which case no GST is charged on it until it's
 * confirmed on the HSN & GST page.
 *
 * `existingCodes` lets a duplicate resolve to the row that's already there
 * instead of blocking the owner with "That code already exists".
 */
function NewHsnCodePanel({ token, existingCodes = [], onCreated, onCancel }) {
  const [draft, setDraft] = useState({ code: "", kind: "HSN", description: "", rate: "18", confirmed: true });
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  const setField = (key) => (event) => {
    const value = event.target.type === "checkbox" ? event.target.checked : event.target.value;
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const handleSave = async () => {
    const code = draft.code.trim();
    const description = draft.description.trim();
    const nextErrors = {};
    if (!CODE_PATTERN.test(code)) nextErrors.code = "Code must be 4 to 8 digits.";
    if (!description) nextErrors.description = "Say what this code covers.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const existing = existingCodes.find((row) => row.code === code);
    if (existing) {
      if (existing.appliesTo === "product") {
        onCreated(existing);
      } else {
        setErrors({ code: `${code} is already used for the ${existing.appliesTo === "shipping" ? "shipping" : "platform"} fee.` });
      }
      return;
    }

    setIsSaving(true);
    try {
      const data = await createHsnCode(
        {
          code,
          kind: draft.kind,
          description,
          rate: Number(draft.rate),
          appliesTo: "product",
          confirmed: draft.confirmed,
        },
        token,
      );
      onCreated(data.hsnCode);
    } catch (error) {
      setErrors({ ...(error.payload?.errors || {}), form: error.payload?.errors ? "" : error.message });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    // Not a <form>: it sits inside the product form, and nested forms are
    // invalid HTML (Enter would submit the product instead).
    <div className="delivery-form-card new-hsn-panel" role="group" aria-label="Add a new HSN or SAC code">
      <p className="eyebrow">New HSN / SAC code</p>
      <div className="admin-filters-grid">
        <InputField label="Code" htmlFor="new-hsn-code" error={errors.code} helperText="4 to 8 digits">
          <input id="new-hsn-code" type="text" inputMode="numeric" value={draft.code} onChange={setField("code")} />
        </InputField>
        <InputField label="Type" htmlFor="new-hsn-kind">
          <select id="new-hsn-kind" value={draft.kind} onChange={setField("kind")}>
            <option value="HSN">HSN (goods)</option>
            <option value="SAC">SAC (service)</option>
          </select>
        </InputField>
      </div>
      <InputField label="Description" htmlFor="new-hsn-description" error={errors.description}>
        <input
          id="new-hsn-description"
          type="text"
          value={draft.description}
          onChange={setField("description")}
          placeholder="e.g. Envelopes and letter cards"
        />
      </InputField>
      <InputField label="GST rate" htmlFor="new-hsn-rate" error={errors.rate}>
        <select id="new-hsn-rate" value={draft.rate} onChange={setField("rate")}>
          {GST_RATES.map((rate) => (
            <option key={rate} value={String(rate)}>
              {rate}%
            </option>
          ))}
        </select>
      </InputField>
      <label className="checkbox-row">
        <input type="checkbox" checked={draft.confirmed} onChange={setField("confirmed")} />
        I&rsquo;ve checked this rate &mdash; confirm it
      </label>
      {!draft.confirmed ? (
        <p className="availability-note availability-warn">No GST is charged on this code until it&rsquo;s confirmed.</p>
      ) : null}
      {errors.form ? (
        <p className="field-error" role="alert">
          {errors.form}
        </p>
      ) : null}
      <div className="action-row">
        <button type="button" className="primary-button" onClick={handleSave} disabled={isSaving}>
          {isSaving ? "Saving…" : "Save code"}
        </button>
        <button type="button" className="secondary-button" onClick={onCancel} disabled={isSaving}>
          Cancel
        </button>
      </div>
    </div>
  );
}

export default NewHsnCodePanel;
