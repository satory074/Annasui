"use client";

interface HeaderProps {
  inputVideoId: string;
  onInputVideoIdChange: (value: string) => void;
  onVideoIdSubmit: (e: React.FormEvent) => void;
  medleyTitle: string;
  medleyCreator: string;
}

export default function Header({
  inputVideoId,
  onInputVideoIdChange,
  onVideoIdSubmit,
  medleyTitle,
  medleyCreator,
}: HeaderProps) {
  return (
    <div className="bg-pink-600 text-white p-4">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold">
          ニコニコ楽曲アノテーションプレイヤー
        </h1>
        <form onSubmit={onVideoIdSubmit} className="flex gap-2">
          <input
            type="text"
            value={inputVideoId}
            onChange={(e) => onInputVideoIdChange(e.target.value)}
            placeholder="動画ID (例: sm500873)"
            className="px-3 py-1 text-black rounded"
          />
          <button type="submit" className="px-3 py-1 bg-pink-700 rounded">
            表示
          </button>
        </form>
      </div>
      {medleyTitle && (
        <div className="mt-2 text-sm">
          <div>{medleyTitle}</div>
          {medleyCreator && <div className="text-pink-200">制作: {medleyCreator}</div>}
        </div>
      )}
    </div>
  );
}