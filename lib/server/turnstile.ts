const VERIFY_ENDPOINT = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export async function verifyTurnstile(responseToken?: string | null) {
  if (!process.env.TURNSTILE_SECRET_KEY) return true;
  if (!responseToken) return false;

  try {
    const params = new URLSearchParams();
    params.set("secret", process.env.TURNSTILE_SECRET_KEY);
    params.set("response", responseToken);

    const res = await fetch(VERIFY_ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    if (!res.ok) {
      console.error("[turnstile] verification request failed", res.status);
      return false;
    }

    const data = (await res.json()) as { success?: boolean };
    return Boolean(data?.success);
  } catch (error) {
    console.error("[turnstile] verification exception", error);
    return false;
  }
}
