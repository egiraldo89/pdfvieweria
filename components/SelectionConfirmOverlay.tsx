'use client';

interface SelectionConfirmOverlayProps {
  showConfirmSmall: boolean;
  pendingExplain: string | null;
  pendingExplainPos: { top: number; left: number } | null;
  onConfirmExplain: () => void;
  onCancelExplain: () => void;
}

export default function SelectionConfirmOverlay({
  showConfirmSmall,
  pendingExplain,
  pendingExplainPos,
  onConfirmExplain,
  onCancelExplain,
}: SelectionConfirmOverlayProps) {
  if (!showConfirmSmall || !pendingExplain) {
    return null;
  }

  return (
    <div
      className="fixed z-50"
      style={
        pendingExplainPos
          ? {
              top: pendingExplainPos.top,
              left: pendingExplainPos.left,
              transform: 'translateX(-50%)',
            }
          : { top: 120, left: '50%', transform: 'translateX(-50%)' }
      }
    >
      <div className="bg-white border border-slate-200 rounded-md p-3 shadow-md w-56 text-center">
        <div className="text-sm text-slate-700 mb-2">Solicitar explicación para la selección?</div>
        <div className="flex justify-center gap-2">
          <button onClick={onConfirmExplain} className="bg-blue-600 text-white px-3 py-1 rounded text-sm">
            OK
          </button>
          <button onClick={onCancelExplain} className="bg-slate-100 text-slate-700 px-2 py-1 rounded text-sm">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
