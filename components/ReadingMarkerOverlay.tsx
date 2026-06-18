'use client';

interface ReadingMarkerOverlayProps {
  textMarkerPos: { top: number; left: number } | null;
  readingMarkerRect: { top: number; left: number; width: number; height: number } | null;
}

export default function ReadingMarkerOverlay({ textMarkerPos, readingMarkerRect }: ReadingMarkerOverlayProps) {
  return (
    <>
      {textMarkerPos && (
        <div
          className="fixed z-40 h-3 w-3 rounded-full bg-blue-600 shadow-lg"
          style={{
            top: textMarkerPos.top,
            left: textMarkerPos.left,
            transform: 'translate(-50%, -50%)',
          }}
        />
      )}

      {readingMarkerRect && (
        <div
          className="fixed z-40 rounded-md border-2 border-blue-500 bg-blue-500/10 shadow-lg"
          style={{
            top: readingMarkerRect.top,
            left: readingMarkerRect.left,
            width: readingMarkerRect.width,
            height: readingMarkerRect.height,
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none',
          }}
        />
      )}
    </>
  );
}
