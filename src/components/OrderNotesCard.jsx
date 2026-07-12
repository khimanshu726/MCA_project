import InputField from "./InputField";

function OrderNotesCard({
  customInstructions,
  onInstructionsChange,
  designFile,
  fileError,
  onFileChange,
}) {
  return (
    <div className="summary-card">
      <p className="eyebrow">Order notes</p>

      <InputField
        label="Custom Instructions"
        htmlFor="custom-instructions"
        helperText="Mention print finish, colors, sizing, or dispatch notes."
      >
        <textarea
          id="custom-instructions"
          rows="5"
          value={customInstructions}
          onChange={(event) => onInstructionsChange(event.target.value)}
        />
      </InputField>

      <InputField
        label="Design File"
        htmlFor="design-file"
        error={fileError}
        helperText="Upload PDF, PNG, or JPG up to 10 MB."
      >
        <input
          id="design-file"
          type="file"
          accept=".pdf,image/png,image/jpeg"
          onChange={onFileChange}
        />
      </InputField>

      {designFile ? <p className="field-helper">Selected file: {designFile.name}</p> : null}
    </div>
  );
}

export default OrderNotesCard;
