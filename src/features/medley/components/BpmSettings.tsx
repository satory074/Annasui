"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { medleyKeys } from "../queries/keys";
import { supabase } from "@/lib/supabase";
import { hasBpm, secondsToBeat } from "@/lib/utils/beat";
import { useCurrentTime, usePlayerStore } from "@/features/player/store";
import { useMetronome } from "../hooks/useMetronome";

interface BpmSettingsProps {
  videoId: string;
  bpm?: number;
  beatOffset?: number;
  isAuthenticated: boolean;
}

export function BpmSettings({ videoId, bpm, beatOffset, isAuthenticated }: BpmSettingsProps) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [bpmInput, setBpmInput] = useState(bpm?.toString() ?? "");
  const [offsetInput, setOffsetInput] = useState(beatOffset?.toString() ?? "0");
  const [saving, setSaving] = useState(false);
  const [metronomeEnabled, setMetronomeEnabled] = useState(false);

  // ローカルに保存済みの値を保持（親がReact Query外のフェッチのため、保存後に prop が更新されない対策）
  const [localBpm, setLocalBpm] = useState<number | undefined>(bpm);
  const [localBeatOffset, setLocalBeatOffset] = useState<number | undefined>(beatOffset);

  const currentTime = useCurrentTime();
  const active = hasBpm(localBpm);

  // 入力値をパース（メトロノームとBeatインジケーターで共有）
  const parsedBpmInput = parseFloat(bpmInput);
  const parsedOffsetInput = parseFloat(offsetInput);
  const editingInputsValid =
    !isNaN(parsedBpmInput) && parsedBpmInput > 0 &&
    !isNaN(parsedOffsetInput) && parsedOffsetInput >= 0;

  // 編集中は入力値、非編集中は保存済み値を使用
  const metronomeBpm = editing && editingInputsValid ? parsedBpmInput : localBpm;
  const metronomeOffset = editing && editingInputsValid ? parsedOffsetInput : (localBeatOffset ?? 0);

  useMetronome({ bpm: metronomeBpm, beatOffset: metronomeOffset, enabled: metronomeEnabled });

  // 編集モード用 Beat 表示
  const editingBeat =
    editing && editingInputsValid
      ? Math.max(1, secondsToBeat(currentTime, parsedBpmInput, parsedOffsetInput))
      : null;

  const currentBeat = active ? Math.max(1, secondsToBeat(currentTime, localBpm!, localBeatOffset ?? 0)) : null;

  const updateBpm = async (bpm: number | null, beatOffset: number | null): Promise<{ success: boolean; error?: string }> => {
    if (!supabase) return { success: false, error: "Supabase client not available" };
    const { error } = await supabase
      .from("medleys")
      .update({ bpm, beat_offset: beatOffset, updated_at: new Date().toISOString() })
      .eq("video_id", videoId);
    if (error) return { success: false, error: error.message };
    return { success: true };
  };

  const handleSave = async () => {
    const parsedBpm = parseFloat(bpmInput);
    const parsedOffset = parseFloat(offsetInput);

    if (isNaN(parsedBpm) || parsedBpm <= 0) {
      alert("BPMは正の数で入力してください");
      return;
    }
    if (isNaN(parsedOffset) || parsedOffset < 0) {
      alert("オフセットは0以上の秒数で入力してください");
      return;
    }

    setSaving(true);
    const result = await updateBpm(parsedBpm, parsedOffset);
    setSaving(false);

    if (result.success) {
      setLocalBpm(parsedBpm);
      setLocalBeatOffset(parsedOffset);
      setMetronomeEnabled(false);
      await queryClient.invalidateQueries({ queryKey: medleyKeys.detail(videoId) });
      setEditing(false);
    } else {
      alert("保存に失敗しました: " + (result.error ?? "Unknown error"));
    }
  };

  const handleClear = async () => {
    if (!confirm("BPM設定をクリアして秒入力モードに戻しますか？")) return;

    setSaving(true);
    const result = await updateBpm(null, null);
    setSaving(false);

    if (result.success) {
      setBpmInput("");
      setOffsetInput("0");
      setLocalBpm(undefined);
      setLocalBeatOffset(undefined);
      setMetronomeEnabled(false);
      await queryClient.invalidateQueries({ queryKey: medleyKeys.detail(videoId) });
      setEditing(false);
    } else {
      alert("クリアに失敗しました: " + (result.error ?? "Unknown error"));
    }
  };

  if (!isAuthenticated) {
    if (!active) return null;
    return (
      <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 px-3 py-1.5 rounded-md border border-gray-200">
        <span className="font-medium text-orange-700">♩</span>
        <span>BPM {localBpm}</span>
        {localBeatOffset !== undefined && localBeatOffset !== 0 && (
          <span className="text-gray-400">/ offset {localBeatOffset}s</span>
        )}
        <span className="text-xs text-gray-400">（拍数入力モード）</span>
      </div>
    );
  }

  if (!editing) {
    return (
      <div className="flex items-center gap-2">
        {/* BPM button */}
        <button
          onClick={() => {
            setBpmInput(localBpm?.toString() ?? "");
            setOffsetInput(localBeatOffset?.toString() ?? "0");
            setEditing(true);
          }}
          className={`flex items-center gap-2 text-sm px-3 py-1.5 rounded-md border transition-colors ${
            active
              ? "bg-orange-50 border-orange-200 text-orange-800 hover:bg-orange-100"
              : "bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100"
          }`}
        >
          <span className="font-medium">♩</span>
          {active ? (
            <span>BPM {localBpm} {localBeatOffset ? `/ +${localBeatOffset}s` : ""}</span>
          ) : (
            <span>BPM設定</span>
          )}
        </button>

        {/* Beat indicator */}
        {active && currentBeat !== null && (
          <span className="text-sm text-gray-500 tabular-nums">
            Beat: {currentBeat}
          </span>
        )}

        {/* メトロノームトグル（BPM設定時のみ表示） */}
        {active && (
          <button
            onClick={() => setMetronomeEnabled((v) => !v)}
            className={`flex items-center gap-1.5 text-sm px-3 py-1 rounded-md border transition-colors ${
              metronomeEnabled
                ? "bg-orange-500 border-orange-600 text-white hover:bg-orange-600"
                : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
            }`}
            title={metronomeEnabled ? "メトロノームをOFFにする" : "メトロノームをONにする"}
          >
            <span>♪</span>
            <span>{metronomeEnabled ? "メトロノーム ON" : "メトロノーム"}</span>
          </button>
        )}

      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 px-3 py-2 rounded-md flex-wrap">
      <span className="text-sm font-medium text-orange-800">♩ BPM</span>
      <input
        type="number"
        value={bpmInput}
        onChange={(e) => setBpmInput(e.target.value)}
        placeholder="128"
        min={1}
        max={999}
        step={0.1}
        className="w-20 px-2 py-1 text-sm border border-orange-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white text-gray-900"
      />
      <span className="text-sm text-gray-600">offset</span>
      <input
        type="number"
        value={offsetInput}
        onChange={(e) => setOffsetInput(e.target.value)}
        placeholder="0"
        min={0}
        step={0.01}
        className="w-20 px-2 py-1 text-sm border border-orange-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white text-gray-900"
      />
      <span className="text-sm text-gray-500">s</span>

      {/* メトロノームボタン（編集中） */}
      <button
        onClick={() => setMetronomeEnabled((v) => !v)}
        className={`flex items-center gap-1.5 text-sm px-3 py-1 rounded-md border transition-colors ${
          metronomeEnabled
            ? "bg-orange-500 border-orange-600 text-white hover:bg-orange-600"
            : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
        }`}
        title={metronomeEnabled ? "メトロノームをOFFにする" : "メトロノームをONにする"}
      >
        <span>♪</span>
        <span>{metronomeEnabled ? "メトロノーム ON" : "メトロノーム"}</span>
      </button>

      {/* Beat インジケーター（編集中） */}
      {editingInputsValid && editingBeat !== null && (
        <span className="text-sm text-gray-500 tabular-nums">Beat: {editingBeat}</span>
      )}

      <button
        onClick={() => {
          const t = usePlayerStore.getState().currentTime;
          setOffsetInput(t.toFixed(2));
        }}
        className="flex items-center gap-1 px-2 py-1 text-xs text-blue-700 border border-blue-300 rounded hover:bg-blue-50 bg-white"
        title="再生中のタイミングをビート1のoffsetとして設定"
      >
        現在位置を offset に設定
        <span className="text-blue-400">({currentTime.toFixed(2)}s)</span>
      </button>
      <button
        onClick={handleSave}
        disabled={saving}
        className="px-3 py-1 text-sm bg-orange-600 text-white rounded hover:bg-orange-700 disabled:opacity-50"
      >
        {saving ? "保存中..." : "保存"}
      </button>
      {active && (
        <button
          onClick={handleClear}
          disabled={saving}
          className="px-3 py-1 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50"
        >
          クリア
        </button>
      )}
      <button
        onClick={() => setEditing(false)}
        className="px-3 py-1 text-sm text-gray-500 hover:text-gray-700"
      >
        キャンセル
      </button>
    </div>
  );
}
