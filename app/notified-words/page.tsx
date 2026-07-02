'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

interface NotifiedWord {
  id: number;
  word: string;
  translation: string;
  created_at: number;
  active: boolean;
}

interface SimilarSuggestion {
  word: string;
  translation: string;
  reason: string;
}

export default function NotifiedWordsPage() {
  const [items, setItems] = useState<NotifiedWord[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'similar' | 'synonyms'>('similar');
  const [selectedWord, setSelectedWord] = useState<string>('');
  const [suggestions, setSuggestions] = useState<SimilarSuggestion[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);

  const pageSize = 8;

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/notify-word/list?page=${page}&pageSize=${pageSize}`);
        const data = await res.json();
        if (res.ok) {
          setItems(data.items || []);
          setTotalPages(data.totalPages || 1);
        }
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [page]);

  const playPronunciation = (word: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = 'en-US';
    utterance.rate = 1;
    window.speechSynthesis.speak(utterance);
  };

  const pages = useMemo(() => {
    const arr = [] as number[];
    for (let i = 1; i <= totalPages; i += 1) {
      arr.push(i);
    }
    return arr;
  }, [totalPages]);

  const openSuggestions = async (word: string) => {
    setSelectedWord(word);
    setSuggestions([]);
    setSuggestionsLoading(true);
    setModalType('similar');
    setModalOpen(true);
    try {
      const res = await fetch('/api/ai-similar-words', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuggestions(data.suggestions || []);
      }
    } finally {
      setSuggestionsLoading(false);
    }
  };

  const openSynonyms = async (word: string) => {
    setSelectedWord(word);
    setSuggestions([]);
    setSuggestionsLoading(true);
    setModalType('synonyms');
    setModalOpen(true);
    try {
      const res = await fetch('/api/ai-synonyms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuggestions(data.synonyms || []);
      }
    } finally {
      setSuggestionsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mx-auto max-w-5xl rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4 md:px-6">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Palabras notificadas</h1>
            <p className="text-sm text-slate-500">Lista de palabras guardadas para recordarte</p>
          </div>
          <Link href="/" className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
            Volver
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Palabra</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Traducción</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Estado</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Similares</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Sinónimos</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500">Cargando…</td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500">No hay palabras notificadas aún.</td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm text-slate-900">{item.word}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{item.translation}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${item.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                        {item.active ? 'Activa' : 'Inactiva'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <button
                        type="button"
                        onClick={() => openSuggestions(item.word)}
                        className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                      >
                        Ver parecidas
                      </button>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <button
                        type="button"
                        onClick={() => openSynonyms(item.word)}
                        className="rounded-lg border border-blue-200 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50"
                      >
                        Ver sinónimos
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => playPronunciation(item.word)}
                        className="text-xl text-slate-400 hover:text-slate-600"
                      >
                        🔊
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-4 md:px-6">
          <p className="text-sm text-slate-500">Página {page} de {totalPages}</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={page === 1}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Anterior
            </button>
            {pages.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPage(p)}
                className={`rounded-lg px-3 py-2 text-sm ${p === page ? 'bg-slate-900 text-white' : 'border border-slate-200 text-slate-700'}`}
              >
                {p}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={page === totalPages}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  {modalType === 'similar' ? 'Palabras parecidas' : 'Sinónimos'}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {modalType === 'similar' ? 'Sugerencias para' : 'Sinónimos de'} {selectedWord}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-full p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 max-h-[60vh] overflow-y-auto">
              {suggestionsLoading ? (
                <p className="text-sm text-slate-500">Consultando la IA…</p>
              ) : suggestions.length === 0 ? (
                <p className="text-sm text-slate-500">No hay sugerencias disponibles.</p>
              ) : (
                <ul className="space-y-3">
                  {suggestions.map((item, index) => (
                    <li key={`${item.word}-${index}`} className="rounded-xl border border-slate-200 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-medium text-slate-900">{item.word}</p>
                          <p className="text-sm text-slate-600">{item.translation}</p>
                          <p className="mt-1 text-xs text-slate-500">{item.reason}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => playPronunciation(item.word)}
                          className="text-xl text-slate-400 hover:text-slate-600"
                        >
                          🔊
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
