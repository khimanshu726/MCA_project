import { Writable, Readable } from "node:stream";
import { describe, expect, it, vi, beforeEach } from "vitest";

// The engine talks to Cloudinary only through these two SDK calls.
const { uploadStreamMock, destroyMock } = vi.hoisted(() => ({
  uploadStreamMock: vi.fn(),
  destroyMock: vi.fn(),
}));

vi.mock("../config/cloudinary.js", () => ({
  default: { uploader: { upload_stream: uploadStreamMock, destroy: destroyMock } },
}));

import { createCloudinaryStorage } from "../config/uploadStorage.js";

// A sink that records what was piped into it, then reports `result` (or `error`)
// to the SDK callback once the stream ends — like the real upload_stream.
const fakeUploadStream = ({ result, error } = {}) => {
  const received = [];
  uploadStreamMock.mockImplementation((params, callback) => {
    const sink = new Writable({
      write(chunk, _encoding, next) {
        received.push(chunk);
        next();
      },
    });
    sink.on("finish", () => callback(error || null, error ? undefined : result));
    sink.params = params;
    return sink;
  });
  return received;
};

const handleFile = (storage, file) =>
  new Promise((resolve, reject) => {
    storage._handleFile({}, file, (error, info) => (error ? reject(error) : resolve(info)));
  });

describe("createCloudinaryStorage", () => {
  beforeEach(() => {
    uploadStreamMock.mockReset();
    destroyMock.mockReset();
  });

  it("streams the file to Cloudinary and reports the URL and public id the server reads", async () => {
    const received = fakeUploadStream({
      result: {
        secure_url: "https://res.cloudinary.com/demo/image/upload/v1/elite-empressions/products/1_logo.png",
        public_id: "elite-empressions/products/1_logo",
        bytes: 4,
      },
    });
    const storage = createCloudinaryStorage(() => ({ folder: "elite-empressions/products", public_id: "1_logo" }));

    const info = await handleFile(storage, { originalname: "logo.png", stream: Readable.from([Buffer.from("data")]) });

    expect(info).toEqual({
      path: "https://res.cloudinary.com/demo/image/upload/v1/elite-empressions/products/1_logo.png",
      filename: "elite-empressions/products/1_logo",
      size: 4,
    });
    expect(Buffer.concat(received).toString()).toBe("data");
    expect(uploadStreamMock.mock.calls[0][0]).toEqual({ folder: "elite-empressions/products", public_id: "1_logo" });
  });

  it("passes a Cloudinary error back to multer", async () => {
    fakeUploadStream({ error: new Error("Invalid signature") });
    const storage = createCloudinaryStorage(() => ({}));

    await expect(
      handleFile(storage, { originalname: "a.png", stream: Readable.from([Buffer.from("x")]) }),
    ).rejects.toThrow("Invalid signature");
  });

  it("passes a params failure back to multer without uploading", async () => {
    const storage = createCloudinaryStorage(() => {
      throw new Error("bad params");
    });

    await expect(handleFile(storage, { originalname: "a.png", stream: Readable.from([]) })).rejects.toThrow("bad params");
    expect(uploadStreamMock).not.toHaveBeenCalled();
  });

  it("deletes the uploaded asset when multer removes the file", async () => {
    destroyMock.mockResolvedValue({ result: "ok" });
    const storage = createCloudinaryStorage(() => ({}));

    await new Promise((resolve, reject) =>
      storage._removeFile({}, { filename: "elite-empressions/products/1_logo" }, (error) => (error ? reject(error) : resolve())),
    );

    expect(destroyMock).toHaveBeenCalledWith("elite-empressions/products/1_logo");
  });
});
