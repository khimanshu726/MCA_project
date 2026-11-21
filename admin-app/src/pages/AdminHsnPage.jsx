import { useCallback, useEffect, useState } from "react";
import { useAdminAuth } from "../context/AdminAuthContext";
import InputField from "../components/InputField";
import { createHsnCode, deleteHsnCode, fetchHsnCodes, updateHsnCode } from "../lib/adminApi";
import { GST_RATES } from "../../../src/utils/gst";

const EMPTY_FORM = {
  code: "",
  kind: "HSN",
  description: "",
  rate: "18",
  priceThreshold: "",
  rateAboveThreshold: "",
  appliesTo: "product",
  notes: "",
};

const toForm = (row) => ({
  code: row.code,
  kind: row.kind,
  description: row.description,
  rate: String(row.rate),
  priceThreshold: row.priceThreshold == null ? "" : String(row.priceThreshold),
  rateAboveThreshold: row.rateAboveThreshold == null ? "" : String(row.rateAboveThreshold),
  appliesTo: row.appliesTo,
  notes: row.notes || "",
});

const toPayload = (form) => ({
  code: form.code.trim(),
  kind: form.kind,
  description: form.description.trim(),
  rate: Number(form.rate),
  priceThreshold: form.priceThreshold === "" ? null : Number(form.priceThreshold),
  rateAboveThreshold: form.rateAboveThreshold === "" ? null : Number(form.rateAboveThreshold),
  appliesTo: form.appliesTo,
  notes: form.notes.trim(),
});

const APPLIES_TO_LABELS = { product: "Products", shipping: "Shipping fee", platformFee: "Platform fee" };

const rateLabel = (row) =>
  row.priceThreshold != null
    ? `${row.rate}% up to ₹${row.priceThreshold}, ${row.rateAboveThreshold}% above`
    : `${row.rate}%`;

/**
 * HSN/SAC codes and their GST rates. Every product points at one row; the GST
 * rate always comes from here. A row must be confirmed (by the owner or their
 * accountant) before GST is charged on it, and changing a rate un-confirms it.
 */
function AdminHsnPage() {
  const { token } = useAdminAuth();
  const [rows, setRows] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setLoadError("");
    try {
      const data = await fetchHsnCodes(token);
      setRows(data.hsnCodes || []);
    } catch (error) {
      setLoadError(error.message);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const startEdit = (row) => {
    setEditingId(row._id);
    setForm(toForm(row));
    setFieldErrors({});
    setMessage("");
  };

  const startNew = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFieldErrors({});
    setMessage("");
  };

  const setField = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));

  const save = async (confirm) => {
    setIsSaving(true);
    setFieldErrors({});
    setMessage("");
    try {
      const payload = { ...toPayload(form), ...(confirm ? { confirmed: true } : {}) };
      const data = editingId ? await updateHsnCode(editingId, payload, token) : await createHsnCode(payload, token);
      setEditingId(data.hsnCode._id);
      setForm(toForm(data.hsnCode));
      setMessage(data.hsnCode.confirmed ? "Saved and confirmed." : "Saved. Not confirmed yet: GST won't be charged on this code.");
      await load();
    } catch (error) {
      setFieldErrors(error.payload?.errors || {});
      setMessage(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const remove = async () => {
    if (!editingId) return;
    setIsSaving(true);
    setMessage("");
    try {
      await deleteHsnCode(editingId, token);
      startNew();
      await load();
      setMessage("Code deleted.");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const unconfirmedCount = rows.filter((row) => !row.confirmed).length;
  const editingRow = rows.find((row) => row._id === editingId);

  return (
    <main className="page-stack">
      <section className="section-panel">
        <div className="section-heading">
          <p className="eyebrow">GST</p>
          <h2>HSN &amp; GST rates</h2>
          <p className="section-copy">
            Each product uses one of these codes, and its GST rate always comes from here. The starting rows are
            suggestions: check each code and rate (with your accountant where unsure), then confirm it. GST is only
            charged on confirmed codes, and changing a rate un-confirms it.
          </p>
          {unconfirmedCount > 0 ? (
            <p className="availability-note availability-warn" role="status">
              {unconfirmedCount} code{unconfirmedCount === 1 ? "" : "s"} still need confirming.
            </p>
          ) : null}
        </div>
      </section>

      <section className="section-panel admin-dashboard-layout">
        <div>
          {loadError ? <p className="field-error">{loadError}</p> : null}
          {isLoading ? (
            <p className="section-copy">Loading…</p>
          ) : (
            <table className="orders-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Description</th>
                  <th>GST</th>
                  <th>Used for</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row._id}
                    onClick={() => startEdit(row)}
                    className={row._id === editingId ? "selected-row" : ""}
                    style={{ cursor: "pointer" }}
                  >
                    <td>
                      {row.kind} {row.code}
                    </td>
                    <td>{row.description}</td>
                    <td>{rateLabel(row)}</td>
                    <td>
                      {row.appliesTo === "product"
                        ? `${row.productCount} product${row.productCount === 1 ? "" : "s"}`
                        : APPLIES_TO_LABELS[row.appliesTo]}
                    </td>
                    <td>{row.confirmed ? "Confirmed" : "Needs confirming"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div className="action-row" style={{ marginTop: "0.75rem" }}>
            <button type="button" className="secondary-button" onClick={startNew}>
              + Add code
            </button>
          </div>
        </div>

        <form
          className="delivery-form-card"
          onSubmit={(event) => {
            event.preventDefault();
            save(false);
          }}
        >
          <h3>{editingId ? `Edit ${form.kind} ${form.code}` : "New code"}</h3>
          {editingRow?.notes ? <p className="availability-note availability-warn">{editingRow.notes}</p> : null}

          <div className="admin-filters-grid">
            <InputField label="Code" htmlFor="h-code" error={fieldErrors.code} helperText="4 to 8 digits">
              <input id="h-code" type="text" inputMode="numeric" value={form.code} onChange={setField("code")} />
            </InputField>
            <InputField label="Type" htmlFor="h-kind">
              <select id="h-kind" value={form.kind} onChange={setField("kind")}>
                <option value="HSN">HSN (goods)</option>
                <option value="SAC">SAC (services)</option>
              </select>
            </InputField>
          </div>

          <InputField label="Description" htmlFor="h-description" error={fieldErrors.description}>
            <input id="h-description" type="text" value={form.description} onChange={setField("description")} />
          </InputField>

          <div className="admin-filters-grid">
            <InputField label="GST rate" htmlFor="h-rate" error={fieldErrors.rate}>
              <select id="h-rate" value={form.rate} onChange={setField("rate")}>
                {GST_RATES.map((rate) => (
                  <option key={rate} value={String(rate)}>
                    {rate}%
                  </option>
                ))}
              </select>
            </InputField>
            <InputField label="Used for" htmlFor="h-applies" error={fieldErrors.appliesTo}>
              <select id="h-applies" value={form.appliesTo} onChange={setField("appliesTo")}>
                {Object.entries(APPLIES_TO_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </InputField>
          </div>

          <div className="admin-filters-grid">
            <InputField
              label="Price limit per piece (₹)"
              htmlFor="h-threshold"
              error={fieldErrors.priceThreshold}
              helperText="Only for value-based rates, e.g. garments. Blank = flat rate."
            >
              <input id="h-threshold" type="number" min="0" value={form.priceThreshold} onChange={setField("priceThreshold")} />
            </InputField>
            <InputField label="Rate above the limit" htmlFor="h-above" error={fieldErrors.rateAboveThreshold}>
              <select id="h-above" value={form.rateAboveThreshold} onChange={setField("rateAboveThreshold")}>
                <option value="">—</option>
                {GST_RATES.map((rate) => (
                  <option key={rate} value={String(rate)}>
                    {rate}%
                  </option>
                ))}
              </select>
            </InputField>
          </div>

          <InputField label="Notes" htmlFor="h-notes">
            <input id="h-notes" type="text" value={form.notes} onChange={setField("notes")} />
          </InputField>

          {message ? (
            <p className="section-copy" role="status">
              {message}
            </p>
          ) : null}

          <div className="action-row">
            <button type="submit" className="secondary-button" disabled={isSaving}>
              Save
            </button>
            <button type="button" className="primary-button" disabled={isSaving} onClick={() => save(true)}>
              Save &amp; confirm rate
            </button>
            {editingId ? (
              <button type="button" className="secondary-button danger-button" disabled={isSaving} onClick={remove}>
                Delete
              </button>
            ) : null}
          </div>
        </form>
      </section>
    </main>
  );
}

export default AdminHsnPage;
