import localFont from "next/font/local";

const fallbackStack = ["Inter", "system-ui", "sans-serif"];
const basePath = "../public/fonts/intro";

export const intro = localFont({
  src: [
    { path: `${basePath}/Intro-Light.woff2`, weight: "300", style: "normal" },
    { path: `${basePath}/Intro-Regular.woff2`, weight: "400", style: "normal" },
    { path: `${basePath}/Intro-Book.woff2`, weight: "500", style: "normal" },
    // Bold solo está disponible en .woff, lo incluimos como fallback.
    { path: `${basePath}/Intro-Bold.woff`, weight: "700", style: "normal" },
    { path: `${basePath}/Intro-Black.woff2`, weight: "900", style: "normal" },
  ],
  variable: "--font-body",
  display: "swap",
  fallback: fallbackStack,
});

export const introHead = localFont({
  src: [
    { path: `${basePath}/Intro-Bold.woff`, weight: "700", style: "normal" },
    { path: `${basePath}/Intro-Black.woff2`, weight: "900", style: "normal" },
  ],
  variable: "--font-head",
  display: "swap",
  fallback: fallbackStack,
});
