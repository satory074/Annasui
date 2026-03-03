import { http, HttpResponse } from "msw";

export const handlers = [
  // Auth: verify password
  http.post("/api/auth/verify-password/", async ({ request }) => {
    const body = (await request.json()) as {
      nickname?: string;
      password?: string;
    };
    if (body.password === "test-password") {
      return HttpResponse.json({ success: true });
    }
    return HttpResponse.json(
      { success: false, error: "パスワードが正しくありません" },
      { status: 401 }
    );
  }),

  // Niconico thumbnail proxy
  http.get("/api/thumbnail/niconico/:videoId/", () => {
    return new HttpResponse(new Uint8Array(8), {
      headers: { "Content-Type": "image/jpeg" },
    });
  }),

  // Niconico metadata proxy
  http.get("/api/metadata/niconico/:videoId/", ({ params }) => {
    return HttpResponse.json({
      title: `テストメドレー ${params.videoId}`,
      description: "テスト用メドレー",
      thumbnailUrl: "https://example.com/thumb.jpg",
    });
  }),

  // Spotify thumbnail proxy
  http.get("/api/thumbnail/spotify/:trackId/", () => {
    return new HttpResponse(new Uint8Array(8), {
      headers: { "Content-Type": "image/jpeg" },
    });
  }),
];
