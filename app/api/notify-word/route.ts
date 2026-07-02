import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { word, translation, timestamp } = await req.json();

    if (!word || !translation) {
      return NextResponse.json(
        { error: 'Palabra y traducción son requeridas' },
        { status: 400 }
      );
    }

    // Importar dinámicamente el cliente de pg
    const { Pool } = await import('pg');

    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      return NextResponse.json(
        { error: 'DATABASE_URL no configurada' },
        { status: 500 }
      );
    }

    const pool = new Pool({
      connectionString: databaseUrl,
    });

    // Insertar el registro
    const now = new Date();
    const baseTs = typeof timestamp === 'number' ? timestamp : new Date(now.toLocaleString('es-CO', { timeZone: 'America/Bogota' }));
    const timestampMs = baseTs;
    await pool.query(
      'INSERT INTO word_notifications (word, translation, created_at, active) VALUES ($1, $2, $3, $4)',
      [word, translation, timestampMs, true]
    );

    await pool.end();

    return NextResponse.json(
      { success: true, message: 'Palabra guardada exitosamente' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error en notify-word:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
