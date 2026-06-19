'use client';

import { RefObject, useEffect, useState } from 'react';

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
  modalPosition: { top: number; left: number; anchor?: 'above' | 'center' } | null;
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
  modalPosition,
  chatContainerRef,
  onChatInputChange,
  onSendChatMessage,
  onClose,
}: ReaderModalProps) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      setSpeechSupported(false);
      return;
    }

    const supportsSpeech =
      'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
    setSpeechSupported(supportsSpeech);

    const handleVoicesChanged = () => {
      setSpeechSupported(
        'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window
      );
    };

    if (supportsSpeech && 'speechSynthesis' in window) {
      window.speechSynthesis.addEventListener('voiceschanged', handleVoicesChanged);
    }

    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged);
      }
    };
  }, []);

  if (!modalOpen) {
    return null;
  }

  const getEnglishVoice = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return null;
    }

    const voices = window.speechSynthesis.getVoices();
    return (
      voices.find((voice) => voice.lang.toLowerCase().startsWith('en-us')) ||
      voices.find((voice) => voice.lang.toLowerCase().startsWith('en')) ||
      voices[0] ||
      null
    );
  };

  const stopSpeaking = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  };

  const pronounceSelection = () => {
    if (!speechSupported || !lastSelection.trim()) {
      return;
    }

    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }

    stopSpeaking();

    const utterance = new SpeechSynthesisUtterance(lastSelection.trim());
    utterance.lang = 'en-US';
    const voice = getEnglishVoice();
    if (voice) {
      utterance.voice = voice;
    }
    utterance.rate = 1;

    utterance.onend = () => {
      setIsSpeaking(false);
    };
    utterance.onerror = () => {
      setIsSpeaking(false);
    };

    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  };

  const positionStyle = modalPosition
    ? {
        top: modalPosition.top,
        left: modalPosition.left,
        transform:
          modalPosition.anchor === 'above'
            ? 'translate(-50%, -100%)'
            : 'translateX(-50%)',
      }
    : {
        top: 24,
        left: '50%',
        transform: 'translateX(-50%)',
      };

  return (
    <>
      <div
        className={`fixed z-50 mx-auto rounded-xl border border-slate-200 bg-white shadow-lg transition-opacity duration-300 ${modalType === 'translate' || modalType === 'explain' ? 'reader-modal-full-width' : ''} ${isFadingOut ? 'opacity-0' : 'opacity-100'}`}
        style={{
          ...positionStyle,
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
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-slate-900">{modalTitle}</h2>
                {modalType === 'translate' && speechSupported && lastSelection.trim() && (
                  <button
                    type="button"
                    onClick={pronounceSelection}
                    title={isSpeaking ? 'Detener audio' : 'Reproducir pronunciación'}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-5 w-5"
                    >
                      <path d="M11 5 6 9H2v6h4l5 4V5z" />
                      <path d="M15.54 8.46a5 5 0 010 7.07" />
                      <path d="M19 5a9 9 0 010 14" />
                    </svg>
                  </button>
                )}
              </div>
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
