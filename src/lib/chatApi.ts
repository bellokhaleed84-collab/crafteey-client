/** fetch with the login token attached. Throws if signed out. */
export async function authedFetch(
  getIdToken: () => Promise<string | null>,
  url: string,
  init: Omit<RequestInit, "headers"> = {}
): Promise<Response> {
  const token = await getIdToken();
  if (!token) throw new Error("You're signed out. Please log in again.");
  return fetch(url, {
    ...init,
    cache: "no-store",
    headers: {
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      Authorization: `Bearer ${token}`,
    },
  });
}