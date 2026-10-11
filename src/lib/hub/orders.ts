import crypto from "crypto";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import HubOrder, { type IHubOrder } from "@/models/HubOrder";
import HubProduct from "@/models/HubProduct";
import HubVendor from "@/models/HubVendor";
import CourierRequest from "@/models/CourierRequest";
import { verifyTransaction } from "@/lib/paystack";
import { notifyRidersOfRequest } from "@/lib/notifyRiders";

export function newReference(orderId: string): string {
  return `hub-${orderId}-${crypto.randomBytes(4).toString("hex")}`;
}

export function newOrderNumber(): string {
  const random = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `CRF-${random}`;
}

function generatePickupCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// 4 digits the customer gives the receiver; the rider types it to finish.
function generateDeliveryCode(): string {
  return String(crypto.randomInt(0, 10000)).padStart(4, "0");
}

/**
 * Why an unpaid order can't be paid right now (store closed, item gone or
 * unavailable, not enough stock), or null if it's fine. Used before taking payment.
 */
export async function orderBlocker(order: IHubOrder): Promise<string | null> {
  const vendor = await HubVendor.findOne({ _id: order.vendorId, isActive: true }).select("isOpen").lean();
  if (!vendor) return "This vendor is no longer available";
  if (!vendor.isOpen) return "This vendor is currently closed";

  const products = await HubProduct.find({
    _id: { $in: order.items.map((i) => i.productId) },
    isActive: true,
  })
    .select("name isAvailable stock")
    .lean();
  const byId = new Map(products.map((p) => [String(p._id), p]));

  // Stock is checked against the total for each product across all its lines.
  const totals = new Map<string, number>();
  for (const it of order.items) {
    totals.set(String(it.productId), (totals.get(String(it.productId)) ?? 0) + it.quantity);
  }

  for (const it of order.items) {
    const p = byId.get(String(it.productId));
    if (!p) return `${it.name} is no longer available`;
    if (!p.isAvailable) return `${p.name} is currently unavailable`;
    const total = totals.get(String(it.productId)) ?? it.quantity;
    if (typeof p.stock === "number" && p.stock < total) return `Only ${p.stock} left of ${p.name}`;
  }
  return null;
}

// Takes the ordered quantities off tracked stock (once per product), marks an item
// sold out when it reaches zero, and remembers what was taken so a reject can give it back.
async function deductStock(order: IHubOrder) {
  const totals = new Map<string, number>();
  for (const it of order.items) {
    const key = String(it.productId);
    totals.set(key, (totals.get(key) ?? 0) + it.quantity);
  }

  const deducted: { productId: mongoose.Types.ObjectId; quantity: number }[] = [];
  for (const [productId, qty] of totals) {
    const res = await HubProduct.updateOne({ _id: productId, stock: { $gte: qty } }, [
      {
        $set: {
          stock: { $subtract: ["$stock", qty] },
          isAvailable: { $cond: [{ $lte: [{ $subtract: ["$stock", qty] }, 0] }, false, "$isAvailable"] },
        },
      },
    ]);
    if (res.modifiedCount > 0) deducted.push({ productId: new mongoose.Types.ObjectId(productId), quantity: qty });
  }

  if (deducted.length > 0) {
    await HubOrder.updateOne({ _id: order._id }, { $set: { stockDeducted: deducted } });
  }
}

export async function onOrderPaid(order: IHubOrder) {
  try {
    try {
      await deductStock(order);
    } catch (e) {
      // A stock problem must never stop the rider dispatch below.
      console.error("[hub] stock deduction failed", e);
    }

    const vendor = await HubVendor.findById(order.vendorId).select("name address lat lng").lean();
    if (!vendor) {
      console.error("[hub] onOrderPaid: vendor not found, skipping courier request", order.vendorId);
      return;
    }

    const pickupCode = generatePickupCode();

    const created = await CourierRequest.create({
      clientUid: order.firebaseUid,
      clientName: order.vendorName,
      // CourierRequest.clientPhone is required and non-empty - an empty
      // string fails Mongoose's required check the same as null/undefined,
      // which was silently killing courier-request creation for every Hub
      // order. Fall back to the delivery phone, which always exists.
      clientPhone: order.delivery.phone || "N/A",

      pickup: vendor.address || order.vendorName,
      dropoff: order.delivery.address,
      pickupLat: vendor.lat ?? null,
      pickupLng: vendor.lng ?? null,
      dropoffLat: order.deliveryLat,
      dropoffLng: order.deliveryLng,

      receiverName: "",
      receiverPhone: order.delivery.phone || "",
      pickupContactName: vendor.name,
      pickupContactPhone: "",

      vehicleType: order.vehicleType,
      note: order.delivery.note || "",
      riderEarningKobo: order.riderEarningKobo,

      source: "hub",
      hubOrderId: String(order._id),
      orderNumber: order.orderNumber,
      vendorName: vendor.name,
      pickupCode,

      // Hub orders always need the delivery code.
      deliveryCodeRequired: true,
      deliveryCode: generateDeliveryCode(),
    });

    // Push-notify matching online riders (never blocks or fails the order).
    await notifyRidersOfRequest(String(created._id));
  } catch (e) {
    console.error("[hub] onOrderPaid failed", e);
  }
}

export async function settleOrderFromPaystack(reference: string) {
  await connectToDatabase();

  const order = await HubOrder.findOne({ "payment.reference": reference });
  if (!order) return { ok: false as const, reason: "order_not_found" };
  if (order.payment.status === "success") return { ok: true as const };

  const tx = await verifyTransaction(reference);

  if (tx.status === "success") {
    if (tx.amount !== order.totalKobo || tx.currency !== "NGN") {
      console.error("[hub] amount mismatch", { reference, paid: tx.amount, expected: order.totalKobo });
      return { ok: false as const, reason: "amount_mismatch" };
    }

    const updated = await HubOrder.findOneAndUpdate(
      { _id: order._id, "payment.status": { $ne: "success" } },
      {
        $set: {
          "payment.status": "success",
          "payment.paidAt": tx.paid_at ? new Date(tx.paid_at) : new Date(),
          "payment.channel": tx.channel,
          status: "paid",
        },
      },
      { new: true }
    );
    if (updated) await onOrderPaid(updated);
    return { ok: true as const };
  }

  if (tx.status === "failed") {
    await HubOrder.updateOne({ _id: order._id, "payment.status": "pending" }, { $set: { "payment.status": "failed" } });
  }
  return { ok: false as const, reason: tx.status };
}