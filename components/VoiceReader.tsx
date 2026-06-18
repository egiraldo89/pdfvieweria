'use client';

import { ChangeEvent, useEffect, useRef, useState } from 'react';
import ReaderToolbar from './ReaderToolbar';

interface VoiceReaderProps {
  pdfFile: string | null;
  fileName: string;
  eventMessage: string;
  currentPageIndex: number;
  onFileUpload: (event: ChangeEvent<HTMLInputElement>) => void;
  onSetEventMessage: (message: string) => void;
  onReadingMarkerRectChange: (rect: { top: number; left: number; width: number; height: number } | null) => void;
}

export default function VoiceReader({
  pdfFile,
  fileName,
  eventMessage,
  currentPageIndex,
  onFileUpload,
  onSetEventMessage,
  onReadingMarkerRectChange,
}: VoiceReaderProps) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [speechRate, setSpeechRate] = useState(1);
  const speechUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const pageTextSpansRef = useRef<Array<{ span: HTMLElement; text: string; start: number; end: number }>>([]);
  const currentReadingSpanRef = useRef<HTMLElement | null>(null);
  const readingTimerRef = useRef<number | null>(null);

  useEffect(() => {
    setSpeechSupported(
      typeof window !== 'undefined' &&
        'speechSynthesis' in window &&
        'SpeechSynthesisUtterance' in window
    );

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const handleVoicesChanged = () => setSpeechSupported(true);
      window.speechSynthesis.addEventListener('voiceschanged', handleVoicesChanged);
      return () => {
        window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged);
      };
    }

    return;
  }, []);

  const stopSpeaking = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    speechUtteranceRef.current = null;
    clearReadingState();
  };

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

  const updateReadingMarker = (span: HTMLElement | null) => {
    currentReadingSpanRef.current = span;

    if (!span) {
      onReadingMarkerRectChange(null);
      return;
    }

    const rect = span.getBoundingClientRect();
    const width = Math.max(rect.width, 12);
    const height = Math.max(rect.height, 12);

    onReadingMarkerRectChange({
      top: rect.top + rect.height / 2,
      left: rect.left + rect.width / 2,
      width: width + 6,
      height: height + 6,
    });
  };

  const clearReadingState = () => {
    if (readingTimerRef.current) {
      window.clearInterval(readingTimerRef.current);
      readingTimerRef.current = null;
    }
    currentReadingSpanRef.current = null;
    onReadingMarkerRectChange(null);
  };

  const getTextDataFromLayer = (textLayer: HTMLElement) => {
    let fullText = '';
    const spanInfos = Array.from(
      textLayer.querySelectorAll<HTMLElement>('.rpv-core__text-layer-text')
    ).map((span) => {
      const text = (span.textContent || '').replace(/\u00A0/g, ' ');
      const start = fullText.length;
      fullText += text;
      const end = fullText.length;
      return { span, text, start, end };
    });

    // Return raw fullText (no trimming) so span start/end indices
    // match the utterance charIndex values.
    return {
      fullText,
      spanInfos,
    };
  };

  const getCurrentPageTextData = () => {
    if (typeof window === 'undefined') {
      return null;
    }

    const textLayer =
      document.querySelector<HTMLElement>(
        `.rpv-core__text-layer[data-testid="core__text-layer-${currentPageIndex}"]`
      ) ||
      document
        .querySelector<HTMLElement>(
          `.rpv-core__page-layer[data-testid="core__page-layer-${currentPageIndex}"]`
        )
        ?.querySelector<HTMLElement>('.rpv-core__text-layer');

    if (!textLayer) {
      const fallback = Array.from(
        document.querySelectorAll<HTMLElement>('.rpv-core__text-layer')
      ).find((layer) => layer.dataset.testid?.endsWith(`-${currentPageIndex}`));
      if (fallback) {
        return getTextDataFromLayer(fallback);
      }
      return null;
    }

    return getTextDataFromLayer(textLayer);
  };

  const speakPageText = (
    text: string,
    spanInfos: Array<{ span: HTMLElement; text: string; start: number; end: number }>,
    lang = 'en-US'
  ) => {
    if (!speechSupported || !text) {
      return;
    }

    stopSpeaking();
    pageTextSpansRef.current = spanInfos;
    clearReadingState();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    const voice = getEnglishVoice();
    if (voice) {
      utterance.voice = voice;
    }
    utterance.rate = speechRate;
    utterance.pitch = 1;

    const updateMarkerByCharIndex = (charIndex: number) => {
      const match =
        spanInfos.find((info) => charIndex >= info.start && charIndex < info.end) ||
        spanInfos[spanInfos.length - 1];
      if (!match?.span) {
        return;
      }
      updateReadingMarker(match.span);
    };

    const supportsBoundary = 'onboundary' in utterance;
    let boundaryFired = false;
    if (supportsBoundary) {
      (utterance as any).onboundary = (event: any) => {
        if (event?.charIndex != null) {
          boundaryFired = true;
          if (readingTimerRef.current) {
            window.clearInterval(readingTimerRef.current);
            readingTimerRef.current = null;
          }
          updateMarkerByCharIndex(event.charIndex);
        }
      };
    }

    utterance.onstart = () => {
      updateMarkerByCharIndex(0);
      // If boundary events don't arrive, fallback to interval-based updates.
      const fallbackDelay = 300; // ms
      window.setTimeout(() => {
        if (boundaryFired) return;
        if (readingTimerRef.current) return;

        // Estimate characters per second (approx). Tuned down to avoid overshoot.
        const avgCharsPerSecBase = 16; // chars/sec at rate=1 (reduced)
        const charsPerSec = avgCharsPerSecBase * Math.max(0.1, speechRate);
        const updateInterval = 180; // ms (moderate ticks)
        const charsPerInterval = ((charsPerSec * updateInterval) / 1000) * 1.05; // small boost

        let currentChar = 0;
        const lastChar = spanInfos[spanInfos.length - 1]?.end || 0;
        readingTimerRef.current = window.setInterval(() => {
          if (!window.speechSynthesis.speaking) return;
          if (currentChar >= lastChar) return;

          // Find span for currentChar
          const idx = spanInfos.findIndex((info) => currentChar >= info.start && currentChar < info.end);
          const match = idx >= 0 ? spanInfos[idx] : spanInfos[spanInfos.length - 1];
          if (match?.span) updateReadingMarker(match.span);

          currentChar += Math.max(1, Math.round(charsPerInterval));
        }, updateInterval);
      }, fallbackDelay);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      speechUtteranceRef.current = null;
      clearReadingState();
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
      speechUtteranceRef.current = null;
      clearReadingState();
    };

    speechUtteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  };

  const startReadingCurrentPage = () => {
    const pageData = getCurrentPageTextData();
    if (!pageData || !pageData.fullText) {
      onSetEventMessage(
        'No se encontró texto legible en la página visible. Asegúrate de que la página está cargada.'
      );
      return;
    }

    onSetEventMessage('Leyendo la página actual...');
    speakPageText(pageData.fullText, pageData.spanInfos, 'en-US');
  };

  const toggleSpeaking = () => {
    if (isSpeaking) {
      stopSpeaking();
    } else {
      startReadingCurrentPage();
    }
  };

  return (
    <div className="bg-white border-b border-gray-200 px-4 py-4 sm:px-6 lg:px-8">
      <ReaderToolbar
        fileName={fileName}
        pdfFile={pdfFile}
        eventMessage={eventMessage}
        isSpeaking={isSpeaking}
        speechSupported={speechSupported}
        speechRate={speechRate}
        onFileUpload={onFileUpload}
        onToggleSpeaking={toggleSpeaking}
        onSetSpeechRate={setSpeechRate}
      />
    </div>
  );
}
