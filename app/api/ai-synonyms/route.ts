import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST(req: NextRequest) {
  try {
    const { word } = await req.json();

    if (!word || typeof word !== 'string' || !word.trim()) {
      return NextResponse.json({ error: 'Palabra requerida' }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'OPENAI_API_KEY no configurada' }, { status: 500 });
    }

    const client = new OpenAI({ apiKey });

    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Responde solo con JSON válido. Devuelve un array de objetos con keys: word, translation, reason. Mínimo 5 y máximo 8 elementos. Las palabras deben ser sinónimos de la palabra dada, en inglés, y con traducción al español. Usa palabras comunes y útiles para aprendizaje. El reason debe explicar el tipo de sinonimia (sinonimia total, parcial, contextual, etc).',
        },
        {
          role: 'user',
          content: `Encuentra sinónimos para la palabra: ${word}`,
        },
      ],
      temperature: 0.5,
    });

    console.log('IA response content:', completion.choices?.[0]?.message);
    const content = completion.choices?.[0]?.message?.content || '[]';
    
    // Limpiar backticks markdown si vienen en el formato ```json ... ```
    let cleanedContent = content.trim();
    if (cleanedContent.startsWith('```json')) {
      cleanedContent = cleanedContent.slice(7); // quita ```json
    } else if (cleanedContent.startsWith('```')) {
      cleanedContent = cleanedContent.slice(3); // quita ```
    }
    if (cleanedContent.endsWith('```')) {
      cleanedContent = cleanedContent.slice(0, -3); // quita ``` al final
    }
    cleanedContent = cleanedContent.trim();
    
    const parsed = JSON.parse(cleanedContent);

    return NextResponse.json({ synonyms: parsed });
  } catch (error) {
    console.error('Error in AI synonyms:', error);
    return NextResponse.json({ error: 'Error procesando sinónimos' }, { status: 500 });
  }
}
