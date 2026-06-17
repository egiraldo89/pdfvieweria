'use server';

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || '' });

export async function POST(request: NextRequest) {
  try {
    const { text, context, systemPrompt, lastSelection } = await request.json();
    
    if (!text) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const chatPrompt = `${systemPrompt || 'Responde la siguiente pregunta basándote en el contexto proporcionado.'}

CONTEXTO:
${context}

SELECCIÓN ORIGINAL:
${lastSelection}

PREGUNTA DEL USUARIO:
${text}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: chatPrompt,
        },
      ],
      max_completion_tokens: 500,
    });

    const responseText = completion.choices[0]?.message?.content || 'No se obtuvo respuesta.';
    return NextResponse.json({ result: responseText });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Unexpected error' }, { status: 500 });
  }
}
