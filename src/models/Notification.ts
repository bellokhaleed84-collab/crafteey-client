import { Schema, models, model } from "mongoose";

const NotificationSchema = new Schema(
  {
    clientUid: { type: String, required: true, index: true },
    title: { type: String, required: true },
    body: { type: String, default: "" },
    // e.g. "delivery", "hub_order", "job", "wallet", "general"
    type: { type: String, default: "general" },
    // Where tapping it should go, e.g. /dashboard/deliveries/abc123
    link: { type: String, default: "" },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

NotificationSchema.index({ clientUid: 1, read: 1, createdAt: -1 });

export default models.Notification || model("Notification", NotificationSchema);