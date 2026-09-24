/**
 * Crafteey rider delivery-fee calculation.
 *
 * Dual-leg billing: the rider→pickup leg and pickup→dropoff leg are combined
 * into one total distance and total time before the fee formula is applied.
 *
 *   calculatedFee = baseFare + (totalKm * perKmRate) + (totalMinutes * perMinRate)
 *   deliveryFee   = max(calculatedFee, minimumFare)
 *
 * Rider payout split: rider keeps 80% of deliveryFee, platform keeps 20%.
 *
 * Note: base fare == minimum fare for every vehicle type today, so the
 * minimum-fare floor will rarely (if ever) trigger — it's kept as a safety
 * net in case rates diverge later.
 */

export type VehicleType = "bicycle" | "motorcycle" | "cargo";

export interface VehicleRate {
  baseFare: number;
  perKmRate: number;
  perMinRate: number;
  minimumFare: number;
}

export const VEHICLE_RATES: Record<VehicleType, VehicleRate> = {
  bicycle: { baseFare: 600, perKmRate: 150, perMinRate: 8, minimumFare: 600 },
  motorcycle: { baseFare: 800, perKmRate: 250, perMinRate: 10, minimumFare: 800 },
  cargo: { baseFare: 1000, perKmRate: 400, perMinRate: 20, minimumFare: 1000 },
};

export const RIDER_SHARE = 0.8; // rider keeps 80% of deliveryFee
export const PLATFORM_SHARE = 0.2; // Crafteey keeps 20% of deliveryFee

export interface DeliveryFeeInput {
  vehicleType: VehicleType;
  riderToPickupKm: number;
  riderToPickupMinutes: number;
  pickupToDropoffKm: number;
  pickupToDropoffMinutes: number;
}

export interface DeliveryFeeResult {
  deliveryFee: number;
  riderEarning: number;
  platformCommission: number;
  // useful for debugging / display, not required by callers
  totalKm: number;
  totalMinutes: number;
  calculatedFee: number;
}

function round2(n: number): number {
  // avoid floating-point artifacts (e.g. 771.1999999999999) while keeping kobo precision
  return Math.round(n * 100) / 100;
}

export function calculateDeliveryFee({
  vehicleType,
  riderToPickupKm,
  riderToPickupMinutes,
  pickupToDropoffKm,
  pickupToDropoffMinutes,
}: DeliveryFeeInput): DeliveryFeeResult {
  const rate = VEHICLE_RATES[vehicleType];
  if (!rate) {
    throw new Error(`Unknown vehicleType: ${vehicleType}`);
  }

  const distances = [riderToPickupKm, pickupToDropoffKm, riderToPickupMinutes, pickupToDropoffMinutes];
  if (distances.some((v) => typeof v !== "number" || Number.isNaN(v) || v < 0)) {
    throw new Error("All distance/time inputs must be non-negative numbers");
  }

  const totalKm = riderToPickupKm + pickupToDropoffKm;
  const totalMinutes = riderToPickupMinutes + pickupToDropoffMinutes;

  const calculatedFee = rate.baseFare + totalKm * rate.perKmRate + totalMinutes * rate.perMinRate;
  const deliveryFee = round2(Math.max(calculatedFee, rate.minimumFare));

  const riderEarning = round2(deliveryFee * RIDER_SHARE);
  const platformCommission = round2(deliveryFee * PLATFORM_SHARE);

  return {
    deliveryFee,
    riderEarning,
    platformCommission,
    totalKm,
    totalMinutes,
    calculatedFee: round2(calculatedFee),
  };
}