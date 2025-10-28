import localFont from "next/font/local";

export const intro = localFont({
  src: [
    { path: "../public/fonts/intro/Intro-Light.woff2", weight: "300", style: "normal" },
    { path: "../public/fonts/intro/Intro-Regular.woff2", weight: "400", style: "normal" },
    { path: "../public/fonts/intro/Intro-Book.woff2", weight: "500", style: "normal" },
    // Bold solo está disponible en .woff, lo incluimos como fallback.
    { path: "../public/fonts/intro/Intro-Bold.woff", weight: "700", style: "normal" },
    { path: "../public/fonts/intro/Intro-Black.woff2", weight: "900", style: "normal" },
  ],
  variable: "--font-body",
  display: "swap",
  fallback: ["Inter", "system-ui", "sans-serif"],
});

export const introHead = localFont({
  src: [
    { path: "../public/fonts/intro/Intro-Bold.woff", weight: "700", style: "normal" },
    { path: "../public/fonts/intro/Intro-Black.woff2", weight: "900", style: "normal" },
  ],
  variable: "--font-head",
  display: "swap",
  fallback: ["Inter", "system-ui", "sans-serif"],
});
