'use client';

import { useEffect, useRef, useState } from 'react';
import { Worker, Viewer } from '@react-pdf-viewer/core';
import { defaultLayoutPlugin } from '@react-pdf-viewer/default-layout';
import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/default-layout/lib/styles/index.css';

export default function Home() {
  const [pdfFile, setPdfFile] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [eventMessage, setEventMessage] = useState<string>('');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalContent, setModalContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [lastSelection, setLastSelection] = useState('');
  const defaultLayoutPluginInstance = defaultLayoutPlugin();

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setPdfFile(content);
        setFileName(file.name);
        setEventMessage('PDF cargado correctamente. Selecciona texto para traducir o explicar.');
      };
      reader.readAsDataURL(file);
    } else {
      alert('Por favor selecciona un archivo PDF válido');
      setEventMessage('Selecciona un PDF válido para cargar.');
    }
  };

  const fetchAIResponse = async (text: string, type: 'translate' | 'explain') => {
    setIsLoading(true);
    setModalOpen(true);
    setModalTitle(type === 'translate' ? 'Traducción' : 'Explicación AI');
    setModalContent('Consultando el modelo...');

    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text, type }),
      });
      const data = await response.json();

      if (!response.ok) {
        setModalContent(`Error: ${data.error || 'No se recibió respuesta del servidor.'}`);
      } else {
        setModalContent(data.result || 'No se obtuvo respuesta.');
      }
    } catch (error) {
      setModalContent('Error de red al consultar la IA. Intenta nuevamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const closeModal = () => {
    setModalOpen(false);
  };

const selectionTimeout = useRef<number | null>(null);
const lastSelectionRef = useRef('');

useEffect(() => {
  const handleSelectionChange = () => {
    console.log(
      'selectionchange:',
      window.getSelection()?.toString()
    );

    if (selectionTimeout.current) {
      window.clearTimeout(selectionTimeout.current);
    }

    selectionTimeout.current = window.setTimeout(async () => {
      const selection =
        window.getSelection()?.toString().trim() || '';

      if (
        !selection ||
        selection === lastSelectionRef.current
      ) {
        return;
      }

      lastSelectionRef.current = selection;
      setLastSelection(selection);

      const wordCount = selection
        .split(/\s+/)
        .filter(Boolean).length;

      if (wordCount > 2) {
        setEventMessage(
          'Seleccionaste más de dos palabras. Consultando IA para explicar la frase...'
        );

        await fetchAIResponse(selection, 'explain');
      } else {
        setEventMessage(
          'Seleccionaste una palabra o frase corta. Consultando traductor...'
        );

        await fetchAIResponse(selection, 'translate');
      }
    }, 500);
  };

  document.addEventListener(
    'selectionchange',
    handleSelectionChange
  );

  document.addEventListener(
    'touchend',
    handleSelectionChange
  );

  return () => {
    document.removeEventListener(
      'selectionchange',
      handleSelectionChange
    );

    document.removeEventListener(
      'touchend',
      handleSelectionChange
    );

    if (selectionTimeout.current) {
      window.clearTimeout(selectionTimeout.current);
    }
  };
}, []);

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900">PDF Viewer</h1>
        </div>
      </header>

      <main className="flex-1 overflow-hidden flex flex-col">
        <div className="bg-white border-b border-gray-200 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700 transition-colors">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                Subir PDF
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
              {fileName && (
                <span className="text-sm text-gray-600">
                  Archivo: <strong>{fileName}</strong>
                </span>
              )}
            </div>
            {eventMessage && (
              <div className="text-sm text-blue-600">{eventMessage}</div>
            )}
          </div>
        </div>

        {pdfFile ? (
          <div className="flex-1 overflow-auto">
            <Worker workerUrl="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.0.279/pdf.worker.min.js">
              <Viewer
                fileUrl={pdfFile}
                plugins={[defaultLayoutPluginInstance]}
              />
            </Worker>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                />
              </svg>
              <h3 className="mt-4 text-lg font-medium text-gray-900">
                No hay PDF seleccionado
              </h3>
              <p className="mt-2 text-sm text-gray-500">
                Haz clic en "Subir PDF" para cargar un archivo
              </p>
            </div>
          </div>
        )}
      </main>

      {modalOpen && (
        <div className="fixed inset-x-0 bottom-6 z-50 mx-auto w-full max-w-[calc(100vw-8rem)] rounded-xl border border-slate-200 bg-white p-4 shadow-lg">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-slate-900">{modalTitle}</h2>
              <p className="mt-1 text-xs text-slate-500">Seleccionado: {lastSelection}</p>
            </div>
            <button
              onClick={closeModal}
              className="rounded-md bg-slate-100 px-2 py-1 text-sm text-slate-700 hover:bg-slate-200"
            >
              Cerrar
            </button>
          </div>
          <div className="mt-3 text-sm leading-6 text-slate-800 whitespace-pre-wrap">
            {isLoading ? 'Cargando respuesta...' : modalContent}
          </div>
        </div>
      )}
    </div>
  );
}
