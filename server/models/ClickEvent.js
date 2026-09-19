import mongoose from "mongoose";

const clickEventSchema = new mongoose.Schema(
  {
    link: { type: mongoose.Schema.Types.ObjectId, ref: "Link", required: true, index: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    referrer: { type: String, default: "Direct" },
    deviceType: { type: String, enum: ["Mobile", "Desktop", "Tablet", "Other"], default: "Other" },
    ipHash: { type: String, required: true }
  },
  { timestamps: true }
);

clickEventSchema.index({ link: 1, createdAt: -1 });
clickEventSchema.index({ owner: 1, createdAt: -1 });

export default mongoose.model("ClickEvent", clickEventSchema);
