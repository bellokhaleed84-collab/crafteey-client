import mongoose, { Schema, type Model, type Types } from "mongoose";

export interface IHubReview {
  orderId: Types.ObjectId;
  vendorId: Types.ObjectId;
  firebaseUid: string;
  rating: number; // 1-5
  comment?: string;
  createdAt: Date;
}

// One review per delivered order. The unique orderId stops double ratings.
const HubReviewSchema = new Schema<IHubReview>(
  {
    orderId: { type: Schema.Types.ObjectId, required: true, unique: true },
    vendorId: { type: Schema.Types.ObjectId, required: true, index: true },
    firebaseUid: { type: String, required: true, index: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, maxlength: 300 },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const HubReview: Model<IHubReview> =
  (mongoose.models.HubReview as Model<IHubReview>) ||
  mongoose.model<IHubReview>("HubReview", HubReviewSchema);

export default HubReview;