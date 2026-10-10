// Tells crafteey-rider to push-notify matching online riders about a new
// request. It never throws: a failed notification must not stop the client
// from placing their order or booking.
const DEFAULT_RIDER_URL = "https://crafteey-rider.vercel.app";

export async function notifyRidersOfRequest(requestId: string): Promise<void> {
  const secret = process.env.INTERNAL_NOTIFY_SECRET;
  if (!secret) {
    console.warn("[notifyRiders] INTERNAL_NOTIFY_SECRET is not set - riders were not pushed");
    return;
  }

  const base = (process.env.RIDER_APP_URL || DEFAULT_RIDER_URL).replace(/\/$/, "");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);

  try {
    const res = await fetch(base + "/api/internal/notify-new-request", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-internal-secret": secret },
      body: JSON.stringify({ requestId }),
      signal: controller.signal,
    });
    if (!res.ok) {
      console.error("[notifyRiders] rider app answered", res.status);
    }
  } catch (e) {
    console.error("[notifyRiders] could not reach the rider app", e);
  } finally {
    clearTimeout(timer);
  }
}