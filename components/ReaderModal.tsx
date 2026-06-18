'use client';

import { RefObject } from 'react';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ReaderModalProps {
  modalOpen: boolean;
  isFadingOut: boolean;
  modalTitle: string;
  modalContent: string;
  lastSelection: string;
  isLoading: boolean;
  chatMessages: ChatMessage[];
  chatInput: string;
  modalType: 'translate' | 'explain';
  chatContainerRef: RefObject<HTMLDivElement | null>;
  onChatInputChange: (value: string) => void;
  onSendChatMessage: () => void;
  onClose: () => void;
}

export default function ReaderModal({
  modalOpen,
  isFadingOut,
  modalTitle,
  modalContent,
  lastSelection,
  isLoading,
  chatMessages,
  chatInput,
  modalType,
  chatContainerRef,
  onChatInputChange,
  onSendChatMessage,
  onClose,
}: ReaderModalProps) {
  if (!modalOpen) {
    return null;
  }

  return (
    <>
      <div
        className={`fixed z-50 mx-auto w-full max-w-[calc(100vw-8rem)] rounded-xl border border-slate-200 bg-white shadow-lg transition-opacity duration-300 ${isFadingOut ? 'opacity-0' : 'opacity-100'}`}
        style={{
          top: 24,
          left: '50%',
          transform: 'translateX(-50%)',
          position: 'fixed',
          width: 'auto',
          minWidth: '18rem',
          maxWidth: 'calc(100vw - 4rem)',
          maxHeight: 'calc(100vh - 2rem)',
          WebkitOverflowScrolling: 'touch',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div className="border-b border-slate-200 px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-slate-900">{modalTitle}</h2>
              <p className="mt-1 text-xs text-slate-500">Seleccionado: {lastSelection}</p>
            </div>
            <button
              onClick={onClose}
              className="rounded-md bg-slate-100 px-2 py-1 text-sm text-slate-700 hover:bg-slate-200"
            >
              Cerrar
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3">
          <div className="text-sm leading-6 text-slate-800 whitespace-pre-wrap">
            {isLoading && chatMessages.length === 0 ? 'Cargando respuesta...' : modalContent}
          </div>
          {modalType === 'explain' && chatMessages.length > 0 && (
            <div ref={chatContainerRef} className="mt-4 max-h-64 overflow-y-auto border-t border-slate-200 pt-3">
              {chatMessages.map((msg, idx) => (
                <div key={idx} className={`mb-3 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                  <div className={`inline-block max-w-xs rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-blue-500 text-white'
                      : 'bg-slate-100 text-slate-800'
                  }`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {isLoading && <div className="text-xs text-slate-500 text-center">Cargando...</div>}
            </div>
          )}
        </div>

        {modalType === 'explain' && (
          <div className="border-t border-slate-200 px-4 py-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(event) => onChatInputChange(event.target.value)}
                onKeyDown={(event) => event.key === 'Enter' && onSendChatMessage()}
                placeholder="Haz una pregunta sobre esto..."
                className="flex-1 min-w-0 rounded border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none"
                disabled={isLoading}
              />
              <button
                onClick={onSendChatMessage}
                disabled={isLoading || !chatInput.trim()}
                className="flex-shrink-0 rounded bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Enviar
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
