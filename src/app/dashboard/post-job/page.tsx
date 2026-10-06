import { redirect } from "next/navigation";

export default function PostJobRedirect() {
  redirect("/dashboard/technicians");
}