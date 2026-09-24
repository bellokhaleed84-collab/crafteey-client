import { calculateDeliveryFee } from "./calculateDeliveryFee";

// These match the "Worked examples to validate against" in the spec exactly.
describe("calculateDeliveryFee", () => {
  test("bicycle, 0.5km pickup + 1.5km delivery (2km / 8min total)", () => {
    const result = calculateDeliveryFee({
      vehicleType: "bicycle",
      riderToPickupKm: 0.5,
      riderToPickupMinutes: 4,
      pickupToDropoffKm: 1.5,
      pickupToDropoffMinutes: 4,
    });
    expect(result.deliveryFee).toBe(964);
    expect(result.riderEarning).toBe(771.2);
    expect(result.platformCommission).toBe(192.8);
  });

  test("motorcycle, same trip shape (2km / 4min total)", () => {
    const result = calculateDeliveryFee({
      vehicleType: "motorcycle",
      riderToPickupKm: 0.5,
      riderToPickupMinutes: 2,
      pickupToDropoffKm: 1.5,
      pickupToDropoffMinutes: 2,
    });
    expect(result.deliveryFee).toBe(1340);
    expect(result.riderEarning).toBe(1072);
  });

  test("motorcycle, 5km total (10min)", () => {
    const result = calculateDeliveryFee({
      vehicleType: "motorcycle",
      riderToPickupKm: 2,
      riderToPickupMinutes: 4,
      pickupToDropoffKm: 3,
      pickupToDropoffMinutes: 6,
    });
    expect(result.deliveryFee).toBe(2150);
    expect(result.riderEarning).toBe(1720);
  });

  test("cargo, same 2km/4.8min trip", () => {
    const result = calculateDeliveryFee({
      vehicleType: "cargo",
      riderToPickupKm: 0.5,
      riderToPickupMinutes: 1.8,
      pickupToDropoffKm: 1.5,
      pickupToDropoffMinutes: 3,
    });
    expect(result.deliveryFee).toBe(1896);
    expect(result.riderEarning).toBe(1516.8);
  });

  test("cargo, 5km total (12min)", () => {
    const result = calculateDeliveryFee({
      vehicleType: "cargo",
      riderToPickupKm: 2,
      riderToPickupMinutes: 5,
      pickupToDropoffKm: 3,
      pickupToDropoffMinutes: 7,
    });
    expect(result.deliveryFee).toBe(3240);
    expect(result.riderEarning).toBe(2592);
  });

  test("minimum fare floor triggers for a near-zero trip", () => {
    const result = calculateDeliveryFee({
      vehicleType: "motorcycle",
      riderToPickupKm: 0,
      riderToPickupMinutes: 0,
      pickupToDropoffKm: 0,
      pickupToDropoffMinutes: 0,
    });
    // calculatedFee === baseFare === minimumFare here, so this just confirms
    // the floor logic doesn't produce anything below minimumFare.
    expect(result.deliveryFee).toBe(800);
  });

  test("throws on unknown vehicle type", () => {
    expect(() =>
      calculateDeliveryFee({
        // @ts-expect-error intentionally invalid
        vehicleType: "car",
        riderToPickupKm: 1,
        riderToPickupMinutes: 1,
        pickupToDropoffKm: 1,
        pickupToDropoffMinutes: 1,
      })
    ).toThrow();
  });

  test("throws on negative distance", () => {
    expect(() =>
      calculateDeliveryFee({
        vehicleType: "bicycle",
        riderToPickupKm: -1,
        riderToPickupMinutes: 1,
        pickupToDropoffKm: 1,
        pickupToDropoffMinutes: 1,
      })
    ).toThrow();
  });
});