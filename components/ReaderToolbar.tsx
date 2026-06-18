'use client';

import { ChangeEvent } from 'react';

interface ReaderToolbarProps {
  fileName: string;
  pdfFile: string | null;
  eventMessage: string;
  isSpeaking: boolean;
  speechSupported: boolean;
  speechRate: number;
  onFileUpload: (event: ChangeEvent<HTMLInputElement>) => void;
  onToggleSpeaking: () => void;
  onSetSpeechRate: (rate: number) => void;
}

const speedOptions = [0.75, 1, 1.25, 1.5];

export default function ReaderToolbar({
  fileName,
  pdfFile,
  eventMessage,
  isSpeaking,
  speechSupported,
  speechRate,
  onFileUpload,
  onToggleSpeaking,
  onSetSpeechRate,
}: ReaderToolbarProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-md cursor-pointer hover:bg-blue-700 transition-colors text-sm">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Subir PDF
          <input type="file" accept=".pdf" onChange={onFileUpload} className="hidden" />
        </label>

        {fileName && (
          <span className="text-sm text-gray-600">
            Archivo: <strong>{fileName}</strong>
          </span>
        )}

        {speechSupported && pdfFile && (
          <>
            <button
              onClick={onToggleSpeaking}
              className="rounded-md bg-slate-100 px-3 py-1 text-slate-700 hover:bg-slate-200"
              aria-label={isSpeaking ? 'Detener lectura' : 'Leer página actual'}
            >
              {isSpeaking ? (
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="6" y="6" width="12" height="12" rx="2" />
                </svg>
              ) : (
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
              )}
            </button>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-slate-600">Velocidad:</span>
              {speedOptions.map((rate) => (
                <button
                  key={rate}
                  type="button"
                  onClick={() => onSetSpeechRate(rate)}
                  className={`rounded-md px-2 py-1 text-sm ${speechRate === rate ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                >
                  {rate}x
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {eventMessage && <div className="text-sm text-blue-600">{eventMessage}</div>}
    </div>
  );
}
