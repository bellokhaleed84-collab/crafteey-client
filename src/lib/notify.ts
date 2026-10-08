import { connectToDatabase } from "@/lib/mongodb";
import Notification from "@/models/Notification";

export async function createNotification(input: {
  clientUid: string;
  title: string;
  body?: string;
  type?: string;
  link?: string;
}) {
  try {
    await connectToDatabase();
    await Notification.create({
      clientUid: input.clientUid,
      title: input.title,
      body: input.body ?? "",
      type: input.type ?? "general",
      link: input.link ?? "",
    });
  } catch (err) {
    // A failed notification must never break the action that triggered it.
    console.error("createNotification failed:", err);
  }
}