"use client";

import { useEffect, useRef } from "react";

type Props = {
  action: string;
  onToken: (token: string | null) => void;
  className?: string;
};

export function TurnstileWidget({ action, onToken, className }: Props) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!siteKey) return;

    const renderWidget = () => {
      if (!containerRef.current || !window.turnstile) return;
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        action,
        theme: "auto",
        callback: token => onToken(token ?? null),
        "error-callback": () => onToken(null),
        "expired-callback": () => onToken(null),
      });
    };

    const ensureScript = () => {
      if (window.turnstile) {
        renderWidget();
        return;
      }
      window.__turnstile_onload__ = renderWidget;

      if (!document.querySelector("script[data-turnstile]")) {
        const script = document.createElement("script");
        script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
        script.async = true;
        script.defer = true;
        script.dataset.turnstile = "true";
        document.head.appendChild(script);
      }
    };

    ensureScript();

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
      }
    };
  }, [action, onToken, siteKey]);

  if (!siteKey) return null;

  return <div ref={containerRef} className={className} />;
}
