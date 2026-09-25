import crypto from "crypto";
import { connectToDatabase } from "@/lib/mongodb";
import HubOrder, { type IHubOrder } from "@/models/HubOrder";
import HubProduct from "@/models/HubProduct";
import HubVendor from "@/models/HubVendor";
import CourierRequest from "@/models/CourierRequest";
import { verifyTransaction } from "@/lib/paystack";

export function newReference(orderId: string): string {
  return `hub-${orderId}-${crypto.randomBytes(4).toString("hex")}`;
}

function generatePickupCode(): string {
  // 6-digit numeric code, zero-padded so it's always exactly 6 digits.
  return String(Math.floor(100000 + Math.random() * 900000));
}

/**
 * Runs exactly once per order, right after payment is confirmed.
 * Reduces stock, then creates the CourierRequest so a rider can pick up
 * and deliver this order.
 */
async function onOrderPaid(order: IHubOrder) {
  try {
    await Promise.all(
      order.items.map((it) =>
        HubProduct.updateOne({ _id: it.productId, stock: { $gte: it.quantity } }, { $inc: { stock: -it.quantity } })
      )
    );

    const vendor = await HubVendor.findById(order.vendorId).select("name address lat lng").lean();
    if (!vendor) {
      console.error("[hub] onOrderPaid: vendor not found, skipping courier request", order.vendorId);
      return;
    }

    const pickupCode = generatePickupCode();

    await CourierRequest.create({
      // These fields exist for the direct-booking flow's schema shape;
      // for a Hub order there's no "client" booking a courier directly —
      // the customer is the recipient, not the requester. Filled with the
      // Hub customer's info so the schema's required fields are satisfied.
      clientUid: order.firebaseUid,
      clientName: order.vendorName, // shown to riders as who they're picking up from
      clientPhone: "", // not required for Hub-sourced requests; vendor has no phone on file yet

      pickup: vendor.address || order.vendorName,
      dropoff: order.delivery.address,
      pickupLat: vendor.lat ?? null,
      pickupLng: vendor.lng ?? null,
      dropoffLat: order.deliveryLat,
      dropoffLng: order.deliveryLng,

      receiverName: "", // Hub orders don't collect a separate receiver name today
      receiverPhone: order.delivery.phone || "",
      pickupContactName: vendor.name,
      pickupContactPhone: "",

      vehicleType: order.vehicleType,
      note: order.delivery.note || "",

      source: "hub",
      hubOrderId: String(order._id),
      vendorName: vendor.name,
      pickupCode,
    });
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