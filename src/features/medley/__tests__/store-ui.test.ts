import { describe, it, expect, beforeEach } from "vitest";
import { useUIStore } from "../store-ui";

describe("useUIStore — focus mode", () => {
  beforeEach(() => {
    useUIStore.setState({
      focusMode: false,
      titleCollapsed: false,
      historyCollapsed: false,
      videoDisplayMode: "normal",
    });
  });

  it("setFocusMode(true) collapses all sections", () => {
    useUIStore.getState().setFocusMode(true);
    const s = useUIStore.getState();
    expect(s.focusMode).toBe(true);
    expect(s.titleCollapsed).toBe(true);
    expect(s.historyCollapsed).toBe(true);
    expect(s.videoDisplayMode).toBe("collapsed");
  });

  it("setFocusMode(false) restores all sections", () => {
    useUIStore.getState().setFocusMode(true);
    useUIStore.getState().setFocusMode(false);
    const s = useUIStore.getState();
    expect(s.focusMode).toBe(false);
    expect(s.titleCollapsed).toBe(false);
    expect(s.historyCollapsed).toBe(false);
    expect(s.videoDisplayMode).toBe("normal");
  });

  it("toggleTitleCollapsed toggles independently", () => {
    expect(useUIStore.getState().titleCollapsed).toBe(false);
    useUIStore.getState().toggleTitleCollapsed();
    expect(useUIStore.getState().titleCollapsed).toBe(true);
    useUIStore.getState().toggleTitleCollapsed();
    expect(useUIStore.getState().titleCollapsed).toBe(false);
  });

  it("toggleHistoryCollapsed toggles independently", () => {
    expect(useUIStore.getState().historyCollapsed).toBe(false);
    useUIStore.getState().toggleHistoryCollapsed();
    expect(useUIStore.getState().historyCollapsed).toBe(true);
    useUIStore.getState().toggleHistoryCollapsed();
    expect(useUIStore.getState().historyCollapsed).toBe(false);
  });
});
