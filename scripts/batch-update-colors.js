// Batch update medley_songs colors from platform thumbnails
// Uses the production color extract API to avoid duplicating extraction logic
//
// Usage:
//   node scripts/batch-update-colors.js --dry-run   # Preview only
//   node scripts/batch-update-colors.js              # Actually update DB

const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = "https://dheairurkxjftugrwdjl.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRoZWFpcnVya3hqZnR1Z3J3ZGpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYyODI3OTEsImV4cCI6MjA3MTg1ODc5MX0.7VSQnn4HdWrMf3qgdPkB2bSyjSH1nuJhH1DR8m4Y4h8";

const supabase = createClient(supabaseUrl, supabaseKey);

const API_BASE = "https://anasui-e6f49.web.app";
const CONCURRENCY = 5;
const DRY_RUN = process.argv.includes("--dry-run");

function chunks(arr, size) {
  const result = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

async function extractColor(links) {
  try {
    const res = await fetch(`${API_BASE}/api/color/extract/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        niconicoLink: links.niconicoLink || undefined,
        youtubeLink: links.youtubeLink || undefined,
        spotifyLink: links.spotifyLink || undefined,
      }),
    });

    if (!res.ok) return null;
    const data = await res.json();
    return data.color ?? null;
  } catch (err) {
    console.error(`  ⚠ API error: ${err.message}`);
    return null;
  }
}

async function main() {
  console.log(`\n🎨 Batch Color Update ${DRY_RUN ? "(DRY RUN)" : "(LIVE)"}\n`);

  // 1. Fetch medley_songs with song_id
  const { data: songs, error: songsError } = await supabase
    .from("medley_songs")
    .select(
      "id, color, title, song_id, niconico_link, youtube_link, spotify_link, applemusic_link"
    )
    .not("song_id", "is", null);

  if (songsError) {
    console.error("❌ Failed to fetch medley_songs:", songsError.message);
    return;
  }

  console.log(`📋 Found ${songs.length} medley_songs with song_id`);

  // 2. Fetch song_master links
  const songIds = [...new Set(songs.map((s) => s.song_id))];
  const { data: masters, error: mastersError } = await supabase
    .from("song_master")
    .select(
      "id, niconico_link, youtube_link, spotify_link, applemusic_link"
    )
    .in("id", songIds);

  if (mastersError) {
    console.error("❌ Failed to fetch song_master:", mastersError.message);
    return;
  }

  const masterMap = Object.fromEntries(masters.map((m) => [m.id, m]));

  // 3. Filter to songs that have at least one platform link
  const targets = songs.filter((s) => {
    const master = masterMap[s.song_id];
    return (
      master?.niconico_link ||
      master?.youtube_link ||
      master?.spotify_link ||
      s.niconico_link ||
      s.youtube_link ||
      s.spotify_link
    );
  });

  const skipped = songs.length - targets.length;
  console.log(
    `🎯 ${targets.length} songs have platform links (${skipped} skipped — no links)\n`
  );

  // 4. Process in chunks
  let updated = 0;
  let failed = 0;
  let unchanged = 0;

  const allChunks = chunks(targets, CONCURRENCY);
  for (let i = 0; i < allChunks.length; i++) {
    const chunk = allChunks[i];
    console.log(
      `--- Batch ${i + 1}/${allChunks.length} (${chunk.length} songs) ---`
    );

    await Promise.all(
      chunk.map(async (song) => {
        const master = masterMap[song.song_id];
        const links = {
          niconicoLink: master?.niconico_link || song.niconico_link,
          youtubeLink: master?.youtube_link || song.youtube_link,
          spotifyLink: master?.spotify_link || song.spotify_link,
        };

        const color = await extractColor(links);

        if (!color) {
          console.log(`  ⏭ ${song.title}: extraction failed (keeping ${song.color})`);
          failed++;
          return;
        }

        if (color === song.color) {
          console.log(`  = ${song.title}: ${song.color} (unchanged)`);
          unchanged++;
          return;
        }

        console.log(`  ✏ ${song.title}: ${song.color} → ${color}`);

        if (!DRY_RUN) {
          const { error: updateError } = await supabase
            .from("medley_songs")
            .update({ color })
            .eq("id", song.id);

          if (updateError) {
            console.error(`  ❌ Update failed for ${song.title}: ${updateError.message}`);
            failed++;
            return;
          }
        }

        updated++;
      })
    );
  }

  // 5. Summary
  console.log(`\n${"=".repeat(50)}`);
  console.log(`📊 Summary ${DRY_RUN ? "(DRY RUN — no changes written)" : ""}`);
  console.log(`  Updated:   ${updated}`);
  console.log(`  Unchanged: ${unchanged}`);
  console.log(`  Failed:    ${failed}`);
  console.log(`  Skipped:   ${skipped} (no links)`);
  console.log(`  Total:     ${songs.length}`);
}

main().catch((err) => {
  console.error("❌ Unexpected error:", err);
  process.exit(1);
});
