import { describe, it, expect } from "vitest";
import { loginSchema } from "../auth";
import { songFormSchema, medleySongFormSchema } from "../song";
import { medleyFormSchema } from "../medley";

describe("loginSchema", () => {
  it("accepts valid login data", () => {
    const result = loginSchema.safeParse({
      nickname: "テストユーザー",
      password: "secret123",
    });
    expect(result.success).toBe(true);
  });

  it("trims nickname whitespace", () => {
    const result = loginSchema.safeParse({
      nickname: "  テスト  ",
      password: "secret",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.nickname).toBe("テスト");
    }
  });

  it("rejects empty nickname", () => {
    const result = loginSchema.safeParse({ nickname: "", password: "secret" });
    expect(result.success).toBe(false);
  });

  it("rejects nickname over 50 chars", () => {
    const result = loginSchema.safeParse({
      nickname: "a".repeat(51),
      password: "secret",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty password", () => {
    const result = loginSchema.safeParse({ nickname: "user", password: "" });
    expect(result.success).toBe(false);
  });
});

describe("songFormSchema", () => {
  it("accepts valid song data", () => {
    const result = songFormSchema.safeParse({
      title: "千本桜",
      artist: "黒うさP",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty title", () => {
    const result = songFormSchema.safeParse({
      title: "",
      artist: "Artist",
    });
    expect(result.success).toBe(false);
  });

  it("allows empty artist", () => {
    const result = songFormSchema.safeParse({ title: "Song" });
    expect(result.success).toBe(true);
  });

  it("validates URL format for links", () => {
    const result = songFormSchema.safeParse({
      title: "Song",
      niconicoLink: "not-a-url",
    });
    expect(result.success).toBe(false);
  });

  it("allows empty string for links", () => {
    const result = songFormSchema.safeParse({
      title: "Song",
      niconicoLink: "",
      youtubeLink: "",
      spotifyLink: "",
      applemusicLink: "",
    });
    expect(result.success).toBe(true);
  });

  it("accepts valid URLs for links", () => {
    const result = songFormSchema.safeParse({
      title: "Song",
      niconicoLink: "https://www.nicovideo.jp/watch/sm12345",
      youtubeLink: "https://www.youtube.com/watch?v=abc123",
    });
    expect(result.success).toBe(true);
  });
});

describe("medleySongFormSchema", () => {
  it("accepts valid medley song data", () => {
    const result = medleySongFormSchema.safeParse({
      title: "千本桜",
      artist: "黒うさP",
      startTime: 30,
      endTime: 60,
      color: "#ff0000",
    });
    expect(result.success).toBe(true);
  });

  it("rejects negative start time", () => {
    const result = medleySongFormSchema.safeParse({
      title: "Song",
      startTime: -1,
      endTime: 60,
    });
    expect(result.success).toBe(false);
  });

  it("provides defaults for optional fields", () => {
    const result = medleySongFormSchema.safeParse({
      title: "Song",
      startTime: 0,
      endTime: 30,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.color).toBe("#4299e1");
      expect(result.data.artist).toBe("");
    }
  });
});

describe("medleyFormSchema", () => {
  it("accepts valid medley data", () => {
    const result = medleyFormSchema.safeParse({
      videoId: "sm12345",
      title: "テストメドレー",
      platform: "niconico",
      duration: 300,
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty videoId", () => {
    const result = medleyFormSchema.safeParse({
      videoId: "",
      title: "Test",
      platform: "niconico",
      duration: 100,
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid platform", () => {
    const result = medleyFormSchema.safeParse({
      videoId: "sm12345",
      title: "Test",
      platform: "invalid",
      duration: 100,
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-positive duration", () => {
    const result = medleyFormSchema.safeParse({
      videoId: "sm12345",
      title: "Test",
      platform: "niconico",
      duration: 0,
    });
    expect(result.success).toBe(false);
  });

  it("accepts all valid platforms", () => {
    for (const platform of ["niconico", "youtube", "spotify", "appleMusic"]) {
      const result = medleyFormSchema.safeParse({
        videoId: "id123",
        title: "Test",
        platform,
        duration: 100,
      });
      expect(result.success).toBe(true);
    }
  });
});
