import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    username: { type: String },
    email: { type: String },
    mobile: { type: String, required: true },
    password: { type: String },
    authProvider: { type: String, default: "local" },
    provider: { type: String },
    profileImage: { type: String },
    role: { type: String, default: "user" },
  },
  { timestamps: true }
);

export const User = mongoose.model("User", userSchema);
