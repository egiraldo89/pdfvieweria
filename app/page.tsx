'use client';

import { useEffect, useRef, useState } from 'react';
import { Worker, Viewer } from '@react-pdf-viewer/core';
import { defaultLayoutPlugin } from '@react-pdf-viewer/default-layout';
import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/default-layout/lib/styles/index.css';
import lodash from 'lodash';

export default function Home() {
  const [pdfFile, setPdfFile] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [eventMessage, setEventMessage] = useState<string>('');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalContent, setModalContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [lastSelection, setLastSelection] = useState('');
  const [modalPosition, setModalPosition] = useState<{ top: number; left: number } | null>(null);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [showConfirmSmall, setShowConfirmSmall] = useState(false);
  const [pendingExplain, setPendingExplain] = useState<string | null>(null);
  const [pendingExplainPos, setPendingExplainPos] = useState<{ top: number; left: number } | null>(null);
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [chatInput, setChatInput] = useState('');
  const autoCloseTimer = useRef<number | null>(null);
  const defaultCloseTimer = useRef<number | null>(null);
  const chatContainerRef = useRef<HTMLDivElement | null>(null);
  const defaultLayoutPluginInstance = defaultLayoutPlugin({ sidebarTabs: () => [] });
  const [dictionary, setNewWordToDicctionary] = useState<{ [key: string]: string }>({});
  const dictionaryRef = useRef<{ [key: string]: string }>({});

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

  useEffect(() => {
    dictionaryRef.current = dictionary;
  }, [dictionary]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const fetchAIResponse = async (
    text: string,
    type: 'translate' | 'explain',
    autoClose = false
  ) => {
    text = text.trim();
    setIsLoading(true);
    setModalOpen(true);
    setIsFadingOut(false);
    setModalTitle(type === 'translate' ? 'Traducción' : 'Explicación AI');
    setModalContent('Consultando el modelo...');
    if (autoClose && autoCloseTimer.current) {
      window.clearTimeout(autoCloseTimer.current);
      autoCloseTimer.current = null;
    }

    if (defaultCloseTimer.current) {
      window.clearTimeout(defaultCloseTimer.current);
      defaultCloseTimer.current = null;
    }

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
        if (type === 'translate') {
          console.log('---->', data.result)
          console.log('Updated dictionary:');

          setNewWordToDicctionary(prev => ({
            ...prev,
            [text]: data.result || 'Traducción no disponible'
          }));
        }
        setModalContent(data.result || 'No se obtuvo respuesta.');
      }
    } catch (error) {
      setModalContent('Error de red al consultar la IA. Intenta nuevamente.');
    } finally {
      setIsLoading(false);
      if (autoClose) {
        autoCloseTimer.current = window.setTimeout(() => {
          setIsFadingOut(true);
          defaultCloseTimer.current = window.setTimeout(() => {
            setModalOpen(false);
            setIsFadingOut(false);
            defaultCloseTimer.current = null;
          }, 300);
          autoCloseTimer.current = null;
        }, 1000);
      }
    }
  };

  const closeModal = () => {
    setModalOpen(false);
    setIsFadingOut(false);
    setChatMessages([]);
    setChatInput('');
  };

  const sendChatMessage = async () => {
    if (!chatInput.trim() || isLoading) return;
    
    const userMessage = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);
console.log('lastSelection', lastSelection);
    try {
      const response = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          text: userMessage, 
          type: 'chat',
          context: modalContent,
          lastSelection: lastSelection
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        setChatMessages(prev => [...prev, { role: 'assistant', content: `Error: ${data.error || 'Error al procesar la solicitud'}` }]);
      } else {
        setChatMessages(prev => [...prev, { role: 'assistant', content: data.result || 'Sin respuesta' }]);
      }
    } catch (error) {
      setChatMessages(prev => [...prev, { role: 'assistant', content: 'Error de red al consultar la IA.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const confirmExplain = async () => {
    if (!pendingExplain) return;
    const text = pendingExplain;
    setShowConfirmSmall(false);
    setPendingExplain(null);
    setPendingExplainPos(null);
    await fetchAIResponse(text, 'explain');
  };

  const cancelExplain = () => {
    setShowConfirmSmall(false);
    setPendingExplain(null);
    setPendingExplainPos(null);
  };

  const selectionTimeout = useRef<number | null>(null);
  const lastSelectionRef = useRef('');
  useEffect(() => { console.log('dictionary: ', dictionary); }, [dictionary]);

  useEffect(() => {
    const handleSelectionChange = () => {
      if (selectionTimeout.current) {
        window.clearTimeout(selectionTimeout.current);
      }

      selectionTimeout.current = window.setTimeout(async () => {
        const selection =
          window.getSelection()?.toString().trim() || '';

        if (!selection) {
          return;
        }

        const translation = dictionaryRef.current[selection];

        if (translation) {
          setLastSelection(selection);
          setModalContent(translation);
          setModalOpen(true);
          setIsLoading(false);
          return;
        }

        lastSelectionRef.current = selection;
        setLastSelection(selection);

        const wordCount = selection
          .split(/\s+/)
          .filter(Boolean).length;

        if (wordCount > 2) {
          setEventMessage(
            'Seleccionaste más de dos palabras. Confirma para solicitar explicación...'
          );
          setModalPosition(null);
          // Show small confirmation modal (OK to request explanation)
          const range = window.getSelection()?.getRangeAt(0);
          if (range) {
            const rect = range.getBoundingClientRect();
            if (rect && rect.width && rect.height) {
              setPendingExplainPos({ top: 20, left: rect.left + rect.width / 2 });
            } else {
              setPendingExplainPos(null);
            }
          } else {
            setPendingExplainPos(null);
          }
          setPendingExplain(selection);
          setShowConfirmSmall(true);
        } else {
          setEventMessage(
            'Seleccionaste una palabra o frase corta. Consultando traductor...'
          );
          const range = window.getSelection()?.getRangeAt(0);
          if (range) {
            const rect = range.getBoundingClientRect();
            if (rect && rect.width && rect.height) {
              setModalPosition({
                top: Math.max(rect.top - 180, 8),
                left: rect.left + rect.width / 2,
              });
            } else {
              setModalPosition(null);
            }
          } else {
            setModalPosition(null);
          }
          await fetchAIResponse(selection, 'translate', true);
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

      if (autoCloseTimer.current) {
        window.clearTimeout(autoCloseTimer.current);
        autoCloseTimer.current = null;
      }
    };
  }, []);

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <main className="flex-1 overflow-hidden flex flex-col">
        <div className="bg-white border-b border-gray-200 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-md cursor-pointer hover:bg-blue-700 transition-colors text-sm">
                <svg
                  className="w-4 h-4"
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
            <Worker workerUrl="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js">
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
        <div
          className={`fixed z-50 mx-auto w-full max-w-[calc(100vw-8rem)] rounded-xl border border-slate-200 bg-white p-4 shadow-lg transition-opacity duration-300 ${isFadingOut ? 'opacity-0' : 'opacity-100'}`}
          style={
            modalPosition
              ? {
                top: modalPosition.top,
                left: modalPosition.left,
                transform: 'translateX(-50%)',
                position: 'fixed',
                width: 'auto',
                minWidth: '18rem',
                maxWidth: 'calc(100vw - 4rem)',
              }
              : {
                top: 24,
                left: '50%',
                transform: 'translateX(-50%)',
              }
          }
        >
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
            {isLoading && chatMessages.length === 0 ? 'Cargando respuesta...' : modalContent}
          </div>
          
          {chatMessages.length > 0 && (
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
          
          <div className="mt-4 flex gap-2 border-t border-slate-200 pt-3">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}
              placeholder="Haz una pregunta sobre esto..."
              className="flex-1 rounded border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              disabled={isLoading}
            />
            <button
              onClick={sendChatMessage}
              disabled={isLoading || !chatInput.trim()}
              className="rounded bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Enviar
            </button>
          </div>
        </div>
      )}

      {showConfirmSmall && pendingExplain && (
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
              <button onClick={confirmExplain} className="bg-blue-600 text-white px-3 py-1 rounded text-sm">OK</button>
              <button onClick={cancelExplain} className="bg-slate-100 text-slate-700 px-2 py-1 rounded text-sm">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
