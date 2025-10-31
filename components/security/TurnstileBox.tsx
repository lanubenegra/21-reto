"use client";

import { useState } from "react";
import Turnstile from "react-turnstile";

type Props = {
  action?: string;
  onVerify: (token: string) => void;
  onExpire?: () => void;
  forceVisible?: boolean;
};

export default function TurnstileBox({
  action = "generic",
  onVerify,
  onExpire,
  forceVisible = true,
}: Props) {
  const sitekey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";
  const [verified, setVerified] = useState(false);

  if (!sitekey) return null;

  return (
    <div className="cf-ts-wrapper flex min-h-[72px] items-center">
      <Turnstile
        sitekey={sitekey}
        onVerify={token => {
          setVerified(true);
          onVerify(token);
          (window as typeof window & { __lastCfToken?: string }).__lastCfToken = token;
        }}
        onExpire={() => {
          setVerified(false);
          onVerify("");
          onExpire?.();
        }}
        options={{
          appearance: forceVisible ? "always" : "auto",
          theme: "auto",
          retry: "auto",
          action,
        }}
      />
      <span className={`ml-2 text-xs transition-opacity ${verified ? "opacity-70" : "opacity-40"}`}>
        {verified ? "✔ verificado" : "—"}
      </span>
    </div>
  );
}
