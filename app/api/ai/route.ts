'use server';

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || '' });

const explainPrompt = (text: string) => `You are a teaching assistant that explains English phrases for Spanish learners.
Explain the full meaning of the phrase, the grammar used, and a clear Spanish translation. Here is the text:

"${text}"

Respond clearly and briefly, mentioning how it would be translated and which part is grammatically important. Answer in Spanish.`;

const translatePrompt = (text: string) => `Traduce el siguiente texto del inglés al español. Devuelve solo la traducción en español, sin explicaciones adicionales:

"${text}"`;

export async function POST(request: NextRequest) {
  try {
    const { text, type } = await request.json();
    if (!text || !type) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    if (type === 'translate') {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: translatePrompt(text),
          },
        ],
        max_completion_tokens: 200,
      });

      const translation = completion.choices[0]?.message?.content?.trim() || 'No se obtuvo traducción.';
      return NextResponse.json({ result: translation });
    }

    const prompt = explainPrompt(text);
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_completion_tokens: 400,
    });


    const responseText = completion.choices[0]?.message?.content || 'No response obtained.';
    return NextResponse.json({ result: responseText });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Unexpected error' }, { status: 500 });
  }
}
