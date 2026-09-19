import mongoose from "mongoose";

const socialLinkSchema = new mongoose.Schema(
  {
    label: { type: String, required: true, trim: true },
    url: { type: String, required: true, trim: true }
  },
  { _id: true }
);

const bioProfileSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    username: { type: String, required: true, unique: true, lowercase: true, trim: true },
    avatar: { type: String, trim: true, default: "" },
    displayName: { type: String, trim: true, default: "" },
    bio: { type: String, trim: true, default: "" },
    theme: {
      type: String,
      enum: ["minimal-light", "dark-slate", "gradient", "cyber-neon"],
      default: "minimal-light"
    },
    socialLinks: [socialLinkSchema]
  },
  { timestamps: true }
);

export default mongoose.model("BioProfile", bioProfileSchema);
