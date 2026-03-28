interface GtagEventParams {
  [key: string]: string | number | boolean | undefined;
}

interface Window {
  gtag?: (
    command: "config" | "event" | "set",
    targetId: string,
    params?: GtagEventParams,
  ) => void;
}
