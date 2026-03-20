"use client";

import { useEffect, useRef } from "react";
import { usePlayerStore } from "@/features/player/store";
import { hasBpm } from "@/lib/utils/beat";

interface UseMetronomeOptions {
  bpm?: number;
  beatOffset?: number;
  enabled: boolean;
}

/**
 * Web Audio API lookahead metronome for BPM/offset verification.
 * Plays click sounds synced to video playback position.
 * Auto-stops when paused; resyncs on seek (drift > 0.5s detected in scheduler).
 *
 * bpm/beatOffset are held in refs so the interval never restarts when they change —
 * changes are detected inside the interval callback and trigger a resync only.
 */
export function useMetronome({ bpm, beatOffset = 0, enabled }: UseMetronomeOptions) {
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const syncRef = useRef<{ videoTime: number; audioCtxTime: number } | null>(null);
  const nextBeatIndexRef = useRef<number>(0);

  // Keep refs up-to-date every render so the interval callback always reads the latest values
  const bpmRef = useRef(bpm);
  const beatOffsetRef = useRef(beatOffset);
  const prevBpmRef = useRef(bpm);
  const prevBeatOffsetRef = useRef(beatOffset);
  bpmRef.current = bpm;
  beatOffsetRef.current = beatOffset;

  const shouldRun = enabled && isPlaying && hasBpm(bpm);

  // Track scheduled nodes so we can cancel them on BPM/offset change or seek
  const scheduledRef = useRef<Array<{ osc: OscillatorNode; gain: GainNode; time: number }>>([]);

  useEffect(() => {
    if (!shouldRun) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      syncRef.current = null;
      return;
    }

    // Initialize or resume AudioContext
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext();
    }
    const audioCtx = audioCtxRef.current;
    if (audioCtx.state === "suspended") {
      void audioCtx.resume();
    }

    const currentBpm = bpmRef.current;
    if (!hasBpm(currentBpm)) return;

    const currentBeatOffset = beatOffsetRef.current;
    const beatDuration = 60 / currentBpm;
    const currentVideoTime = usePlayerStore.getState().currentTime;

    // Record sync point
    syncRef.current = {
      videoTime: currentVideoTime,
      audioCtxTime: audioCtx.currentTime,
    };

    // First beat index at or after currentVideoTime
    const beatsFromOffset = (currentVideoTime - currentBeatOffset) / beatDuration;
    nextBeatIndexRef.current = Math.max(0, Math.ceil(beatsFromOffset));

    // Sync prev refs so the interval doesn't immediately trigger a resync
    prevBpmRef.current = currentBpm;
    prevBeatOffsetRef.current = currentBeatOffset;

    const LOOKAHEAD = 0.3; // seconds to schedule ahead (buffer for JS scheduler jitter)
    const SCHEDULE_INTERVAL = 25; // ms polling interval

    // Cancel all future-scheduled beats immediately (silence old BPM on change/seek)
    const cancelFutureBeats = (ctx: AudioContext) => {
      const now = ctx.currentTime;
      for (const { osc, gain, time } of scheduledRef.current) {
        if (time > now) {
          try {
            gain.gain.cancelScheduledValues(now);
            gain.gain.setValueAtTime(0, now);
            osc.stop(now);
          } catch {
            // already stopped — ignore
          }
        }
      }
      scheduledRef.current = [];
    };

    const scheduleClick = (ctx: AudioContext, time: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 1000;
      gain.gain.setValueAtTime(1.0, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.03);
      osc.start(time);
      osc.stop(time + 0.03);
      scheduledRef.current.push({ osc, gain, time });
    };

    intervalRef.current = setInterval(() => {
      const ctx = audioCtxRef.current;
      const sync = syncRef.current;
      if (!ctx || !sync) return;

      const currentBpmNow = bpmRef.current;
      const currentBeatOffsetNow = beatOffsetRef.current;
      if (!hasBpm(currentBpmNow)) return;

      // BPM or offset changed — cancel old scheduled beats and resync immediately
      if (currentBpmNow !== prevBpmRef.current || currentBeatOffsetNow !== prevBeatOffsetRef.current) {
        cancelFutureBeats(ctx);
        const actualVideoTime = usePlayerStore.getState().currentTime;
        syncRef.current = { videoTime: actualVideoTime, audioCtxTime: ctx.currentTime };
        const newBeatDuration = 60 / currentBpmNow;
        const beats = (actualVideoTime - currentBeatOffsetNow) / newBeatDuration;
        nextBeatIndexRef.current = Math.max(0, Math.ceil(beats));
        prevBpmRef.current = currentBpmNow;
        prevBeatOffsetRef.current = currentBeatOffsetNow;
        return; // skip scheduling this tick; next tick uses the new BPM
      }

      const beatDurationNow = 60 / currentBpmNow;

      // Detect seek: compare estimated video time vs actual
      const actualVideoTime = usePlayerStore.getState().currentTime;
      const estimatedVideoTime = sync.videoTime + (ctx.currentTime - sync.audioCtxTime);
      const drift = Math.abs(actualVideoTime - estimatedVideoTime);

      if (drift > 0.5) {
        // Cancel old beats and resync after seek
        cancelFutureBeats(ctx);
        syncRef.current = {
          videoTime: actualVideoTime,
          audioCtxTime: ctx.currentTime,
        };
        const beats = (actualVideoTime - currentBeatOffsetNow) / beatDurationNow;
        nextBeatIndexRef.current = Math.max(0, Math.ceil(beats));
        return; // skip scheduling this tick to let sync settle
      }

      const scheduleUntil = estimatedVideoTime + LOOKAHEAD;

      // Schedule all beats within lookahead window
      while (true) {
        const beatIndex = nextBeatIndexRef.current;
        const beatVideoTime = currentBeatOffsetNow + beatIndex * beatDurationNow;
        if (beatVideoTime > scheduleUntil) break;

        const beatAudioTime = sync.audioCtxTime + (beatVideoTime - sync.videoTime);
        if (beatAudioTime > ctx.currentTime) {
          scheduleClick(ctx, beatAudioTime);
        }
        nextBeatIndexRef.current++;
      }

      // Purge already-played nodes to prevent memory leak
      scheduledRef.current = scheduledRef.current.filter((n) => n.time > ctx.currentTime - 0.1);
    }, SCHEDULE_INTERVAL);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      syncRef.current = null;
    };
    // bpm/beatOffset intentionally excluded — held in refs and read inside the interval
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldRun]);

  // Cleanup AudioContext on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (audioCtxRef.current) {
        void audioCtxRef.current.close();
        audioCtxRef.current = null;
      }
    };
  }, []);
}
