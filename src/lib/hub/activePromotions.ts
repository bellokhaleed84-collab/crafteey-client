import mongoose, { type Types } from "mongoose";
import Promotion, { type IPromotion } from "@/models/Promotion";
import { promoLabel, type PromoLite } from "@/lib/pricing/promotions";

/** Promotions that are running right now for one shop. */
export async function loadActivePromotions(vendorId: Types.ObjectId | string): Promise<PromoLite[]> {
  if (!mongoose.isValidObjectId(vendorId)) return [];
  const now = new Date();

  const docs = await Promotion.find({
    vendorId: new mongoose.Types.ObjectId(String(vendorId)),
    isActive: true,
    startsAt: { $lte: now },
    $or: [{ endsAt: null }, { endsAt: { $exists: false } }, { endsAt: { $gt: now } }],
  }).lean<IPromotion[]>();

  return docs.map((d) => ({
    _id: String(d._id),
    type: d.type,
    percent: d.percent,
    amountOffKobo: d.amountOffKobo,
    buyQty: d.buyQty,
    freeQty: d.freeQty,
    scope: d.scope,
    productIds: (d.productIds ?? []).map(String),
    label: promoLabel(d),
  }));
}