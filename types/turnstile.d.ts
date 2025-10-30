export {};

declare global {
  interface Window {
    turnstile?: {
      render(
        element: HTMLElement,
        options: {
          sitekey: string;
          callback?: (token: string) => void;
          "error-callback"?: () => void;
          "expired-callback"?: () => void;
          action?: string;
          theme?: string;
        },
      ): string;
      reset(widgetId?: string): void;
      remove(widgetId: string): void;
    };
    __turnstile_onload__?: () => void;
  }
}
