import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    username: { type: String },
    email: { type: String },
    mobile: { type: String, default: "" },
    password: { type: String },
    firebaseUid: { type: String, default: "", index: true },
    authProvider: { type: String, default: "local" },
    provider: { type: String },
    profileImage: { type: String },
    role: { type: String, default: "user" },
  },
  { timestamps: true }
);

export const User = mongoose.model("User", userSchema);
