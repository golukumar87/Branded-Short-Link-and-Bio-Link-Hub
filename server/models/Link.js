import mongoose from "mongoose";

const linkSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    destinationUrl: { type: String, required: true, trim: true },
    shortCode: { type: String, required: true, unique: true, trim: true, index: true },
    title: { type: String, trim: true, default: "" },
    tag: { type: String, trim: true, default: "General" },
    archived: { type: Boolean, default: false }
  },
  { timestamps: true }
);

linkSchema.index({ owner: 1, createdAt: -1 });
linkSchema.index({ shortCode: 1, archived: 1 });
linkSchema.index({ owner: 1, archived: 1, createdAt: -1 });

export default mongoose.model("Link", linkSchema);
