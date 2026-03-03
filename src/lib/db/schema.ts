import {
  pgTable,
  uuid,
  text,
  real,
  timestamp,
  integer,
  jsonb,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// =============================================================================
// Tables — Single source of truth for the database schema
// =============================================================================

export const medleys = pgTable("medleys", {
  id: uuid("id").defaultRandom().primaryKey(),
  videoId: text("video_id").notNull().unique(),
  platform: text("platform").notNull().default("niconico"),
  title: text("title").notNull(),
  creator: text("creator"),
  duration: real("duration"),
  lastEditor: text("last_editor"),
  lastEditedAt: timestamp("last_edited_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const songMaster = pgTable("song_master", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  artist: text("artist"),
  normalizedId: text("normalized_id").unique(),
  niconicoLink: text("niconico_link"),
  youtubeLink: text("youtube_link"),
  spotifyLink: text("spotify_link"),
  applemusicLink: text("applemusic_link"),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const medleySongs = pgTable("medley_songs", {
  id: uuid("id").defaultRandom().primaryKey(),
  medleyId: uuid("medley_id")
    .references(() => medleys.id, { onDelete: "cascade" })
    .notNull(),
  songId: uuid("song_id").references(() => songMaster.id),
  orderIndex: integer("order_index"),
  startTime: real("start_time"),
  endTime: real("end_time"),
  title: text("title"),
  artist: text("artist"),
  composers: text("composers"),
  arrangers: text("arrangers"),
  color: text("color"),
  niconicoLink: text("niconico_link"),
  youtubeLink: text("youtube_link"),
  spotifyLink: text("spotify_link"),
  applemusicLink: text("applemusic_link"),
  lastEditor: text("last_editor"),
  lastEditedAt: timestamp("last_edited_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const medleyEdits = pgTable("medley_edits", {
  id: uuid("id").defaultRandom().primaryKey(),
  medleyId: uuid("medley_id").references(() => medleys.id, {
    onDelete: "cascade",
  }),
  songId: uuid("song_id").references(() => medleySongs.id),
  editorNickname: text("editor_nickname").notNull(),
  action: text("action").notNull(),
  changes: jsonb("changes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const artists = pgTable("artists", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  normalizedName: text("normalized_name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const songArtistRelations = pgTable("song_artist_relations", {
  id: uuid("id").defaultRandom().primaryKey(),
  songId: uuid("song_id")
    .references(() => songMaster.id, { onDelete: "cascade" })
    .notNull(),
  artistId: uuid("artist_id")
    .references(() => artists.id, { onDelete: "cascade" })
    .notNull(),
  role: text("role").notNull().default("artist"), // 'artist' | 'composer' | 'arranger'
  orderIndex: integer("order_index").default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// =============================================================================
// Relations
// =============================================================================

export const medleysRelations = relations(medleys, ({ many }) => ({
  songs: many(medleySongs),
  edits: many(medleyEdits),
}));

export const songMasterRelations = relations(songMaster, ({ many }) => ({
  medleySongs: many(medleySongs),
  artistRelations: many(songArtistRelations),
}));

export const medleySongsRelations = relations(medleySongs, ({ one }) => ({
  medley: one(medleys, {
    fields: [medleySongs.medleyId],
    references: [medleys.id],
  }),
  song: one(songMaster, {
    fields: [medleySongs.songId],
    references: [songMaster.id],
  }),
}));

export const medleyEditsRelations = relations(medleyEdits, ({ one }) => ({
  medley: one(medleys, {
    fields: [medleyEdits.medleyId],
    references: [medleys.id],
  }),
}));

export const artistsRelations = relations(artists, ({ many }) => ({
  songRelations: many(songArtistRelations),
}));

export const songArtistRelationsRelations = relations(
  songArtistRelations,
  ({ one }) => ({
    song: one(songMaster, {
      fields: [songArtistRelations.songId],
      references: [songMaster.id],
    }),
    artist: one(artists, {
      fields: [songArtistRelations.artistId],
      references: [artists.id],
    }),
  })
);

// =============================================================================
// Inferred types (from Drizzle schema — no manual types needed)
// =============================================================================

export type Medley = typeof medleys.$inferSelect;
export type NewMedley = typeof medleys.$inferInsert;

export type SongMasterRecord = typeof songMaster.$inferSelect;
export type NewSongMaster = typeof songMaster.$inferInsert;

export type MedleySong = typeof medleySongs.$inferSelect;
export type NewMedleySong = typeof medleySongs.$inferInsert;

export type MedleyEdit = typeof medleyEdits.$inferSelect;
export type NewMedleyEdit = typeof medleyEdits.$inferInsert;

export type Artist = typeof artists.$inferSelect;
export type NewArtist = typeof artists.$inferInsert;
