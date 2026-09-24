import mongoose, { Schema, type Model } from "mongoose";
import { HUB_CATEGORIES, type HubCategory } from "../lib/hub/config";
import { type VendorTier } from "../lib/pricing/vendorCommission";

export interface IHubVendor {
  name: string;
  categories: HubCategory[];
  description?: string;
  logoUrl?: string;
  address?: string;
  emoji?: string;
  tagline?: string;
  filterTags?: string[];
  rating?: number;
  reviewCount?: number;
  etaMin?: number;
  etaMax?: number;
  isOpen: boolean;
  isActive: boolean;
  isSeed?: boolean;
  tier: VendorTier;
}

const HubVendorSchema = new Schema<IHubVendor>(
  {
    name: { type: String, required: true, trim: true },
    categories: { type: [{ type: String, enum: HUB_CATEGORIES }], default: [], index: true },
    description: String,
    logoUrl: String,
    address: String,
    emoji: String,
    tagline: String,
    filterTags: { type: [String], default: [] },
    rating: { type: Number, min: 0, max: 5 },
    reviewCount: { type: Number, min: 0 },
    etaMin: Number,
    etaMax: Number,
    isOpen: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true },
    isSeed: { type: Boolean, default: false },
    tier: { type: String, enum: ["basic", "regular", "premium"], default: "regular", index: true },
  },
  { timestamps: true }
);

const HubVendor: Model<IHubVendor> =
  (mongoose.models.HubVendor as Model<IHubVendor>) ||
  mongoose.model<IHubVendor>("HubVendor", HubVendorSchema);

export default HubVendor;