import mongoose, { Schema, type Model, type Types } from "mongoose";
import { HUB_CATEGORIES, type HubCategory } from "../lib/hub/config";

export interface IHubProduct {
  vendorId: Types.ObjectId;
  category: HubCategory;
  name: string;
  description?: string;
  imageUrl?: string;
  /** shown when there is no image */
  emoji?: string;
  priceKobo: number;
  unit?: string;
  /** null/undefined = unlimited */
  stock?: number | null;
  isAvailable: boolean;
  isActive: boolean;
  isSeed?: boolean;
}

const HubProductSchema = new Schema<IHubProduct>(
  {
    vendorId: { type: Schema.Types.ObjectId, ref: "HubVendor", required: true, index: true },
    category: { type: String, enum: HUB_CATEGORIES, required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: String,
    imageUrl: String,
    emoji: String,
    priceKobo: { type: Number, required: true, min: 0 },
    unit: String,
    stock: { type: Number, default: null },
    isAvailable: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true },
    isSeed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const HubProduct: Model<IHubProduct> =
  (mongoose.models.HubProduct as Model<IHubProduct>) ||
  mongoose.model<IHubProduct>("HubProduct", HubProductSchema);

export default HubProduct;
