type HeaderLike = {
  get(name: string): string | null | undefined;
};

type RequestLike = {
  headers: HeaderLike;
};

export function getClientIp(request: Request | RequestLike) {
  const headers = request instanceof Request ? request.headers : request.headers;
  const header =
    headers.get("x-forwarded-for") ??
    headers.get("cf-connecting-ip") ??
    headers.get("x-real-ip");

  if (!header) return "unknown";

  const parts = header.split(",");
  return parts[0]?.trim() || "unknown";
}
