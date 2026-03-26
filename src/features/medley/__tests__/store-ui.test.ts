import { describe, it, expect, beforeEach } from "vitest";
import { useUIStore } from "../store-ui";

describe("useUIStore — focus mode", () => {
  beforeEach(() => {
    useUIStore.setState({
      focusMode: false,
      historyCollapsed: false,
      videoDisplayMode: "normal",
    });
  });

  it("setFocusMode(true) enables PiP and collapses history", () => {
    useUIStore.getState().setFocusMode(true);
    const s = useUIStore.getState();
    expect(s.focusMode).toBe(true);
    expect(s.historyCollapsed).toBe(true);
    expect(s.videoDisplayMode).toBe("pip");
  });

  it("setFocusMode(false) restores all sections", () => {
    useUIStore.getState().setFocusMode(true);
    useUIStore.getState().setFocusMode(false);
    const s = useUIStore.getState();
    expect(s.focusMode).toBe(false);
    expect(s.historyCollapsed).toBe(false);
    expect(s.videoDisplayMode).toBe("normal");
  });

  it("toggleHistoryCollapsed toggles independently", () => {
    expect(useUIStore.getState().historyCollapsed).toBe(false);
    useUIStore.getState().toggleHistoryCollapsed();
    expect(useUIStore.getState().historyCollapsed).toBe(true);
    useUIStore.getState().toggleHistoryCollapsed();
    expect(useUIStore.getState().historyCollapsed).toBe(false);
  });
});
