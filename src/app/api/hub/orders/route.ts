import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import { verifyToken } from "@/middleware/auth";
import HubOrder from "@/models/HubOrder";
import HubProduct from "@/models/HubProduct";
import HubVendor from "@/models/HubVendor";
import { getClientByUid } from "@/lib/hub/getClient";
import { newReference, newOrderNumber } from "@/lib/hub/orders";
import { initializeTransaction } from "@/lib/paystack";
import { calculateVendorPayout } from "@/lib/pricing/vendorCommission";
import { calculateDeliveryFee } from "@/lib/pricing/calculateDeliveryFee";
import { haversineKm, estimateMinutes } from "@/lib/pricing/distance";
import { fail, handleError } from "@/lib/hub/http";
import { priceSelection, type OptionGroup, type PickedOption, type Selection } from "@/lib/hub/options";

export const dynamic = "force-dynamic";

// Same limit as the cart's MAX_QTY.
const MAX_QTY = 50;
const MAX_LINES = 50;
const MAX_SELECTIONS = 40;

type RequestedLine = { productId: string; quantity: number; selections: Selection[] };

function groupsOf(p: { optionGroups?: unknown }): OptionGroup[] {
  return JSON.parse(JSON.stringify(p.optionGroups ?? [])) as OptionGroup[];
}

export async function POST(req: NextRequest) {
  try {
    const user = await verifyToken(req);
    await connectToDatabase();

    const body = await req.json().catch(() => null);
    const rawItems: unknown[] = Array.isArray(body?.items) ? body.items : [];
    const delivery = body?.delivery ?? {};
    const address = String(delivery.address || "").trim();
    const phone = delivery.phone ? String(delivery.phone).trim() : undefined;
    const note = delivery.note ? String(delivery.note).trim() : undefined;

    const vehicleType = body?.vehicleType;
    const deliveryLat = Number(body?.deliveryLat);
    const deliveryLng = Number(body?.deliveryLng);

    if (rawItems.length === 0) return fail("Your cart is empty");
    if (!address) return fail("Delivery address is required");
    if (vehicleType !== "bicycle" && vehicleType !== "motorcycle") {
      return fail("Please choose a delivery vehicle");
    }
    if (!Number.isFinite(deliveryLat) || !Number.isFinite(deliveryLng)) {
      return fail("Please select a delivery address from the suggestions list");
    }

    // Validate every line. A line is one food with one set of options.
    const lines: RequestedLine[] = [];
    for (const raw of rawItems) {
      const it = raw as { productId?: unknown; quantity?: unknown; selections?: unknown } | null;
      if (!it || typeof it.productId !== "string" || !mongoose.isValidObjectId(it.productId)) {
        return fail("Invalid item in cart");
      }
      if (typeof it.quantity !== "number" || !Number.isInteger(it.quantity) || it.quantity < 1) {
        return fail("Invalid quantity");
      }
      const rawSelections: unknown[] = Array.isArray(it.selections) ? it.selections : [];
      if (rawSelections.length > MAX_SELECTIONS) return fail("Too many options selected");
      const selections: Selection[] = [];
      for (const s of rawSelections) {
        const sel = s as { choiceId?: unknown; quantity?: unknown } | null;
        if (
          !sel ||
          typeof sel.choiceId !== "string" ||
          typeof sel.quantity !== "number" ||
          !Number.isInteger(sel.quantity) ||
          sel.quantity < 1 ||
          sel.quantity > MAX_QTY
        ) {
          return fail("Invalid option");
        }
        selections.push({ choiceId: sel.choiceId, quantity: sel.quantity });
      }
      lines.push({ productId: it.productId, quantity: it.quantity, selections });
    }
    if (lines.length > MAX_LINES || lines.some((l) => l.quantity > MAX_QTY)) {
      return fail(`You can order up to ${MAX_QTY} of each item`);
    }

    // Stock is checked against the real total for each product across all its lines.
    const totals = new Map<string, number>();
    for (const l of lines) totals.set(l.productId, (totals.get(l.productId) ?? 0) + l.quantity);

    const client = await getClientByUid(user.uid);
    if (!client) return fail("Client account not found", 404);

    const productIds = Array.from(totals.keys());
    const products = await HubProduct.find({ _id: { $in: productIds }, isActive: true });

    const byId = new Map(products.map((p) => [String(p._id), p]));
    for (const productId of productIds) {
      const total = totals.get(productId) ?? 0;
      const p = byId.get(productId);
      if (!p) return fail("One of the items in your cart is no longer available");
      if (!p.isAvailable) return fail(`${p.name} is currently unavailable`);
      if (typeof p.stock === "number" && p.stock < total) {
        return fail(`Only ${p.stock} left of ${p.name}`);
      }
    }

    const vendorIds = new Set(products.map((p) => String(p.vendorId)));
    if (vendorIds.size > 1) return fail("Your cart has items from more than one vendor");

    const vendorId = products[0].vendorId;
    const vendor = await HubVendor.findOne({ _id: vendorId, isActive: true });
    if (!vendor) return fail("Vendor not found", 404);
    if (!vendor.isOpen) return fail("This vendor is currently closed");
    if (typeof vendor.lat !== "number" || typeof vendor.lng !== "number") {
      return fail("This vendor's location isn't set up yet \u2014 please try another vendor");
    }

    // The price of each plate is worked out here from the vendor's saved options.
    // Anything the phone says about price is ignored.
    const orderItems: {
      productId: mongoose.Types.ObjectId;
      name: string;
      imageUrl?: string;
      unitPriceKobo: number;
      quantity: number;
      options: PickedOption[];
    }[] = [];
    for (const line of lines) {
      const p = byId.get(line.productId)!;
      const priced = priceSelection(groupsOf(p), line.selections);
      if (!priced.ok) return fail(`${p.name}: ${priced.error}`);
      orderItems.push({
        productId: p._id,
        name: p.name,
        imageUrl: p.imageUrl,
        unitPriceKobo: p.priceKobo + priced.extrasKobo,
        quantity: line.quantity,
        options: priced.picked,
      });
    }

    const subtotalKobo = orderItems.reduce((sum, it) => sum + it.unitPriceKobo * it.quantity, 0);

    const km = haversineKm({ lat: vendor.lat, lng: vendor.lng }, { lat: deliveryLat, lng: deliveryLng });
    const minutes = estimateMinutes(km, vehicleType);

    const feeResult = calculateDeliveryFee({
      vehicleType,
      riderToPickupKm: 0,
      riderToPickupMinutes: 0,
      pickupToDropoffKm: km,
      pickupToDropoffMinutes: minutes,
    });

    const deliveryFeeKobo = Math.round(feeResult.deliveryFee * 100);
    const riderEarningKobo = Math.round(feeResult.riderEarning * 100);
    const platformCommissionKobo = Math.round(feeResult.platformCommission * 100);
    const totalKobo = subtotalKobo + deliveryFeeKobo;

    const { vendorPayout, platformVendorRevenue } = calculateVendorPayout(subtotalKobo, vendor.tier);

    const order = await HubOrder.create({
      clientId: client._id,
      firebaseUid: user.uid,
      vendorId: vendor._id,
      vendorName: vendor.name,
      orderNumber: newOrderNumber(),
      items: orderItems,
      subtotalKobo,
      deliveryFeeKobo,
      totalKobo,
      vendorTier: vendor.tier,
      vendorPayoutKobo: vendorPayout,
      platformVendorRevenueKobo: platformVendorRevenue,
      vehicleType,
      deliveryLat,
      deliveryLng,
      riderEarningKobo,
      platformCommissionKobo,
      status: "pending_payment",
      payment: { status: "pending" },
      delivery: { address, phone, note },
    });

    const reference = newReference(String(order._id));
    order.payment.reference = reference;
    await order.save();

    const init = await initializeTransaction({
      email: client.email || user.email || "",
      amountKobo: totalKobo,
      reference,
      callbackUrl: `${process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin}/dashboard/hub/orders/${order._id}`,
      metadata: { orderId: String(order._id), source: "crafteey-hub" },
    });

    return NextResponse.json({
      orderId: String(order._id),
      orderNumber: order.orderNumber,
      accessCode: init.access_code,
      authorizationUrl: init.authorization_url,
      reference,
    });
  } catch (e) {
    return handleError(e);
  }
}