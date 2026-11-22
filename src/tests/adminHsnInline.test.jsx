import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

vi.mock("../../admin-app/src/lib/adminApi", () => ({
  createHsnCode: vi.fn(),
}));

import { createHsnCode } from "../../admin-app/src/lib/adminApi";
import NewHsnCodePanel from "../../admin-app/src/components/NewHsnCodePanel";

const EXISTING = [
  { code: "4909", kind: "HSN", description: "Printed cards", rate: 18, appliesTo: "product", confirmed: false },
  { code: "996812", kind: "SAC", description: "Courier", rate: 18, appliesTo: "shipping", confirmed: false },
];

const renderPanel = (props = {}) => {
  const onCreated = vi.fn();
  const onCancel = vi.fn();
  render(
    <NewHsnCodePanel token="tok" existingCodes={EXISTING} onCreated={onCreated} onCancel={onCancel} {...props} />,
  );
  return { onCreated, onCancel };
};

const fill = (code, description) => {
  fireEvent.change(screen.getByLabelText("Code"), { target: { value: code } });
  fireEvent.change(screen.getByLabelText("Description"), { target: { value: description } });
};

describe("adding an HSN code from the product form", () => {
  beforeEach(() => {
    createHsnCode.mockReset();
  });

  it("saves a new product code, confirmed by default, and hands it back to be selected", async () => {
    const saved = { code: "4817", kind: "HSN", description: "Envelopes", rate: 12, appliesTo: "product", confirmed: true };
    createHsnCode.mockResolvedValue({ hsnCode: saved });
    const { onCreated } = renderPanel();

    fill("4817", "Envelopes");
    fireEvent.change(screen.getByLabelText("GST rate"), { target: { value: "12" } });
    fireEvent.click(screen.getByRole("button", { name: "Save code" }));

    await waitFor(() => expect(onCreated).toHaveBeenCalledWith(saved));
    expect(createHsnCode).toHaveBeenCalledWith(
      { code: "4817", kind: "HSN", description: "Envelopes", rate: 12, appliesTo: "product", confirmed: true },
      "tok",
    );
  });

  it("leaves the code unconfirmed when the box is unticked, and says GST won't be charged", async () => {
    createHsnCode.mockResolvedValue({ hsnCode: { code: "4817" } });
    renderPanel();

    fill("4817", "Envelopes");
    fireEvent.click(screen.getByRole("checkbox"));
    expect(screen.getByText(/No GST is charged on this code/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Save code" }));

    await waitFor(() => expect(createHsnCode).toHaveBeenCalled());
    expect(createHsnCode.mock.calls[0][0].confirmed).toBe(false);
  });

  it("checks the code and description before sending anything", () => {
    const { onCreated } = renderPanel();

    fill("12", "");
    fireEvent.click(screen.getByRole("button", { name: "Save code" }));

    expect(screen.getByText("Code must be 4 to 8 digits.")).toBeInTheDocument();
    expect(screen.getByText("Say what this code covers.")).toBeInTheDocument();
    expect(createHsnCode).not.toHaveBeenCalled();
    expect(onCreated).not.toHaveBeenCalled();
  });

  it("picks the existing row instead of failing when the code is already in the list", () => {
    const { onCreated } = renderPanel();

    fill("4909", "Wedding cards");
    fireEvent.click(screen.getByRole("button", { name: "Save code" }));

    expect(onCreated).toHaveBeenCalledWith(EXISTING[0]);
    expect(createHsnCode).not.toHaveBeenCalled();
  });

  it("refuses a code that's already the shipping fee's", () => {
    const { onCreated } = renderPanel();

    fill("996812", "Courier");
    fireEvent.click(screen.getByRole("button", { name: "Save code" }));

    expect(screen.getByText("996812 is already used for the shipping fee.")).toBeInTheDocument();
    expect(onCreated).not.toHaveBeenCalled();
  });

  it("shows the server's field error inline", async () => {
    const error = new Error("Please correct the fields.");
    error.payload = { errors: { code: "That code already exists." } };
    createHsnCode.mockRejectedValue(error);
    const { onCreated } = renderPanel({ existingCodes: [] });

    fill("4817", "Envelopes");
    fireEvent.click(screen.getByRole("button", { name: "Save code" }));

    expect(await screen.findByText("That code already exists.")).toBeInTheDocument();
    expect(onCreated).not.toHaveBeenCalled();
  });

  it("cancels without saving", () => {
    const { onCancel } = renderPanel();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalled();
    expect(createHsnCode).not.toHaveBeenCalled();
  });
});
