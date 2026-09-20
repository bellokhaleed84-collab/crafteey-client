// src/models/CourierRequest.ts
import { Schema, model, models } from "mongoose";
import { COURIER_STATUS } from "@/lib/constants";

const CourierRequestSchema = new Schema(
  {
    clientUid: { type: String, required: true, index: true },
    clientName: { type: String, required: true },
    clientPhone: { type: String, required: true },

    pickup: { type: String, required: true },
    dropoff: { type: String, required: true },
    pickupLat: { type: Number, default: null },
    pickupLng: { type: Number, default: null },
    dropoffLat: { type: Number, default: null },
    dropoffLng: { type: Number, default: null },
    note: { type: String, default: "" },

    // Pickup contact — optional, defaults to the booking client's own
    // name/phone (see POST /api/courier-requests) if left blank.
    pickupContactName: { type: String, default: "" },
    pickupContactPhone: { type: String, default: "" },

    // Receiver — who the courier actually calls at drop-off. Required.
    receiverName: { type: String, required: true },
    receiverPhone: { type: String, required: true },

    // Which vehicle the sender requested.
    vehicleType: {
      type: String,
      enum: ["bicycle", "motorcycle", "cargo"],
      required: true,
    },

    status: {
      type: String,
      enum: Object.values(COURIER_STATUS),
      default: COURIER_STATUS.PENDING,
    },

    courierUid: { type: String, default: null },
    courierName: { type: String, default: null },
    courierPhone: { type: String, default: null },
    courierLocation: {
      type: new Schema({ lat: Number, lng: Number }, { _id: false }),
      default: null,
    },

    acceptedAt: { type: Date, default: null },
    deliveredAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export default models.CourierRequest || model("CourierRequest", CourierRequestSchema);