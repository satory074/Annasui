/**
 * Send a custom event to Google Analytics 4.
 * Safe to call even when GA is not loaded (dev, missing env var).
 */
export function trackEvent(
  eventName: string,
  params?: Record<string, string | number | boolean>,
): void {
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("event", eventName, params);
  }
}
