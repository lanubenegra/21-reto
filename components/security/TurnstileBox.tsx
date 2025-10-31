"use client";

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

  if (!sitekey) return null;

  return (
    <div className="cf-ts-wrapper flex min-h-[72px] items-center">
      <Turnstile
        sitekey={sitekey}
        action={action}
        appearance={forceVisible ? "always" : "interaction-only"}
        theme="auto"
        retry="auto"
        onVerify={token => {
          onVerify(token);
          (window as typeof window & { __lastCfToken?: string }).__lastCfToken = token;
        }}
        onExpire={() => {
          onVerify("");
          onExpire?.();
        }}
      />
    </div>
  );
}
