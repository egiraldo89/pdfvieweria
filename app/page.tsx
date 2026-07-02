'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Plugin, ViewerState } from '@react-pdf-viewer/core';
import { defaultLayoutPlugin } from '@react-pdf-viewer/default-layout';
import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/default-layout/lib/styles/index.css';
import VoiceReader from '@/components/VoiceReader';
import PdfViewerWrapper from '@/components/PdfViewerWrapper';
import ReaderModal from '@/components/ReaderModal';
import ReadingMarkerOverlay from '@/components/ReadingMarkerOverlay';
import SelectionConfirmOverlay from '@/components/SelectionConfirmOverlay';
import PushNotificationPanel from '@/components/PushNotificationPanel';

export default function Home() {
  const [pdfFile, setPdfFile] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [eventMessage, setEventMessage] = useState<string>('');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalType, setModalType] = useState<'translate' | 'explain'>('translate');
  const [modalContent, setModalContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [lastSelection, setLastSelection] = useState('');
  const [modalPosition, setModalPosition] = useState<{ top: number; left: number; anchor?: 'above' | 'center' } | null>(null);
  const [textMarkerPos, setTextMarkerPos] = useState<{ top: number; left: number } | null>(null);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [showConfirmSmall, setShowConfirmSmall] = useState(false);
  const [pendingExplain, setPendingExplain] = useState<string | null>(null);
  const [pendingExplainPos, setPendingExplainPos] = useState<{ top: number; left: number } | null>(null);
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [readingMarkerRect, setReadingMarkerRect] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const [pushNotification, setPushNotification] = useState<{
    id: number;
    title: string;
    body: string;
    word?: string;
    translation?: string;
  } | null>(null);
  const pagesContainerRef = useRef<HTMLDivElement | null>(null);
  const autoCloseTimer = useRef<number | null>(null);
  const defaultCloseTimer = useRef<number | null>(null);
  const markerClearTimer = useRef<number | null>(null);
  const chatContainerRef = useRef<HTMLDivElement | null>(null);
  const defaultLayoutPluginInstance = defaultLayoutPlugin({
    sidebarTabs: () => [],
  });
  const viewerStatePlugin = useMemo<Plugin>(() => ({
    onViewerStateChange: (viewerState: ViewerState) => {
      setCurrentPageIndex(viewerState.pageIndex);
      return viewerState;
    },
    renderViewer: (props) => {
      pagesContainerRef.current = props.pagesContainerRef.current;
      return props.slot;
    },
  }), []);
  const [dictionary, setNewWordToDicctionary] = useState<{ [key: string]: string }>({});
  const dictionaryRef = useRef<{ [key: string]: string }>({});

  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const subscribeToPushNotifications = async () => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
      return;
    }

    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidKey) {
      console.warn('NEXT_PUBLIC_VAPID_PUBLIC_KEY no configurada');
      return;
    }

    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        return;
      }

      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey),
        });
      }

      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription }),
      });
    } catch (error) {
      console.error('Error al registrar suscripción push:', error);
    }
  };

  const stopPushNotification = async (id: number) => {
    try {
      await fetch('/api/notify-word/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      setPushNotification(null);
    } catch (error) {
      console.error('Error al detener notificación:', error);
    }
  };

  useEffect(() => {
    subscribeToPushNotifications();

    const handlePushMessage = (event: MessageEvent) => {
      if (event.data?.type === 'PUSH_NOTIFICATION_CLICKED') {
        const record = event.data?.data?.record;
        if (record?.id) {
          setPushNotification({
            id: record.id,
            title: 'Notificación activa',
            body: record.translation ? `${record.word}: ${record.translation}` : 'Esta notificación puede detenerse desde aquí.',
            word: record.word,
            translation: record.translation,
          });
        }
      }
    };

    navigator.serviceWorker.addEventListener('message', handlePushMessage);

    return () => {
      navigator.serviceWorker.removeEventListener('message', handlePushMessage);
    };
  }, []);

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
    setModalType(type);
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
      if (type === 'explain') {
        setModalPosition(null);
      }

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
        }, 3000);
      }
    }
  };

  const closeModal = () => {
    setModalOpen(false);
    setIsFadingOut(false);
    setModalPosition(null);
    setChatMessages([]);
    setChatInput('');
    
    if (markerClearTimer.current) {
      window.clearTimeout(markerClearTimer.current);
    }
    
    markerClearTimer.current = window.setTimeout(() => {
      setTextMarkerPos(null);
      markerClearTimer.current = null;
    }, 3000);
  };

  const sendChatMessage = async () => {
    if (!chatInput.trim() || isLoading) return;
    
    const userMessage = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);
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

    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      if (rect && rect.width && rect.height) {
        setTextMarkerPos({
          top: rect.bottom + 4,
          left: rect.right,
        });
      }
      selection.removeAllRanges();
    }

    await fetchAIResponse(text, 'explain');
  };

  const cancelExplain = () => {
    setShowConfirmSmall(false);
    setPendingExplain(null);
    setPendingExplainPos(null);
  };

  const selectionTimeout = useRef<number | null>(null);
  const lastSelectionRef = useRef('');

  useEffect(() => {
    const handleContextMenu = (e: Event) => {
      if (pdfFile) {
        e.preventDefault();
      }
    };

    document.addEventListener('contextmenu', handleContextMenu, true);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu, true);
    };
  }, [pdfFile]);

  
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

          const range = window.getSelection()?.getRangeAt(0);
          if (range) {
            const rect = range.getBoundingClientRect();
            if (rect && rect.width && rect.height) {
              const centerX = rect.left + rect.width / 2;
              const minLeft = 160;
              const maxLeft = Math.max(window.innerWidth - 160, 160);
              setModalPosition({
                top: Math.max(rect.top - 26, 8),
                left: Math.min(Math.max(centerX, minLeft), maxLeft),
                anchor: 'above',
              });
            } else {
              setModalPosition(null);
            }
          } else {
            setModalPosition(null);
          }

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
              const centerX = rect.left + rect.width / 2;
              const minLeft = 160;
              const maxLeft = Math.max(window.innerWidth - 160, 160);
              setModalPosition({
                top: Math.max(rect.top - 26, 8),
                left: Math.min(Math.max(centerX, minLeft), maxLeft),
                anchor: 'above',
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
        <VoiceReader
          fileName={fileName}
          pdfFile={pdfFile}
          eventMessage={eventMessage}
          currentPageIndex={currentPageIndex}
          onFileUpload={handleFileUpload}
          onSetEventMessage={setEventMessage}
          onReadingMarkerRectChange={setReadingMarkerRect}
        />

        {pdfFile ? (
          <PdfViewerWrapper
            pdfFile={pdfFile}
            plugins={[defaultLayoutPluginInstance, viewerStatePlugin]}
          />
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

      <ReaderModal
        modalOpen={modalOpen}
        isFadingOut={isFadingOut}
        modalTitle={modalTitle}
        modalContent={modalContent}
        lastSelection={lastSelection}
        isLoading={isLoading}
        chatMessages={chatMessages}
        chatInput={chatInput}
        modalType={modalType}
        modalPosition={modalPosition}
        chatContainerRef={chatContainerRef}
        onChatInputChange={setChatInput}
        onSendChatMessage={sendChatMessage}
        onClose={closeModal}
      />

      <ReadingMarkerOverlay textMarkerPos={textMarkerPos} readingMarkerRect={readingMarkerRect} />
      <SelectionConfirmOverlay
        showConfirmSmall={showConfirmSmall}
        pendingExplain={pendingExplain}
        pendingExplainPos={pendingExplainPos}
        onConfirmExplain={confirmExplain}
        onCancelExplain={cancelExplain}
      />
      <PushNotificationPanel
        notification={pushNotification}
        onStop={stopPushNotification}
        onClose={() => setPushNotification(null)}
      />
    </div>
  );
}
