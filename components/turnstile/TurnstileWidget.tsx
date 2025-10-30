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
    let cancelled = false;

    const renderWidget = () => {
      if (cancelled || !containerRef.current || !window.turnstile) return;
      try {
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          action,
          theme: "auto",
          callback: token => onToken(token ?? null),
          "error-callback": () => onToken(null),
          "expired-callback": () => onToken(null),
        });
      } catch (error) {
        console.error("[turnstile] render failed", error);
      }
    };

    const existingScript = document.querySelector<HTMLScriptElement>("script[data-turnstile]");
    if (existingScript) {
      if (window.turnstile) {
        renderWidget();
      } else {
        existingScript.addEventListener("load", renderWidget, { once: true });
      }
    } else {
      const script = document.createElement("script");
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.defer = true;
      script.dataset.turnstile = "true";
      script.onload = renderWidget;
      script.onerror = () => {
        console.error("[turnstile] script failed to load");
      };
      document.head.appendChild(script);
    }

    return () => {
      cancelled = true;
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
      }
    };
  }, [action, onToken, siteKey]);

  if (!siteKey) return null;

  return <div ref={containerRef} className={className} />;
}
