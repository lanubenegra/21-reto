'use client';

import { useCookies } from "next-client-cookies";

type Sku = "agenda" | "retos" | "combo";

interface Props {
  sku: Sku;
}

export default function PayButton({ sku }: Props) {
  const cookies = useCookies();
  const country = (cookies.get("country") || "US").toUpperCase();

  async function go() {
    const res = await fetch(`/api/prices?sku=${sku}&country=${country}`, { cache: "no-store" });
    const data = (await res.json()) as { provider: "wompi" | "stripe"; url: string };
    if (data.url) window.location.href = data.url;
  }

  return (
    <button className="btn btn-primary" onClick={go}>
      Comprar {sku}
    </button>
  );
}
