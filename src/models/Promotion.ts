import mongoose, { Schema, type Model, type Types } from "mongoose";

// Shared "promotions" collection. The vendor app writes it, the client app reads it.
// Keep this file the same in both apps. Money is in kobo.
export const PROMO_TYPES = ["percent", "amount", "buy_get"] as const;
export type PromoType = (typeof PROMO_TYPES)[number];

export interface IPromotion {
  _id: Types.ObjectId;
  vendorId: Types.ObjectId;
  type: PromoType;
  /** percent: 1 to 90 */
  percent?: number;
  /** amount: naira off ONE plate, in kobo */
  amountOffKobo?: number;
  /** buy_get: buy this many... */
  buyQty?: number;
  /** ...and get this many free */
  freeQty?: number;
  scope: "all" | "products";
  productIds: Types.ObjectId[];
  startsAt: Date;
  /** empty = runs until the vendor stops it */
  endsAt?: Date | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PromotionSchema = new Schema<IPromotion>(
  {
    vendorId: { type: Schema.Types.ObjectId, ref: "HubVendor", required: true, index: true },
    type: { type: String, enum: PROMO_TYPES, required: true },
    percent: { type: Number, min: 1, max: 90 },
    amountOffKobo: { type: Number, min: 1 },
    buyQty: { type: Number, min: 1, max: 20 },
    freeQty: { type: Number, min: 1, max: 10 },
    scope: { type: String, enum: ["all", "products"], default: "products" },
    productIds: { type: [Schema.Types.ObjectId], default: [] },
    startsAt: { type: Date, required: true, default: () => new Date() },
    endsAt: { type: Date, default: null },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

const Promotion: Model<IPromotion> =
  (mongoose.models.Promotion as Model<IPromotion>) ||
  mongoose.model<IPromotion>("Promotion", PromotionSchema);

export default Promotion;