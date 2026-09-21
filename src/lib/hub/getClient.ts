// ⚠️ Adjust this one import if your Client model lives elsewhere.
import Client from "@/models/Client";

export async function getClientByUid(firebaseUid: string) {
  return Client.findOne({ firebaseUid }).select("_id name email phone").lean<{
    _id: unknown;
    name: string;
    email: string;
    phone: string;
  }>();
}
