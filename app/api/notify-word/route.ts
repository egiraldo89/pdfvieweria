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

    // Crear tabla si no existe
    await pool.query(`
      CREATE TABLE IF NOT EXISTS word_notifications (
        id SERIAL PRIMARY KEY,
        word VARCHAR(255) NOT NULL,
        translation TEXT NOT NULL,
        created_at BIGINT NOT NULL
      )
    `);

    // Insertar el registro
    const baseTs = typeof timestamp === 'number' ? timestamp : Date.now();
    const timestampMs = baseTs + 24 * 60 * 60 * 1000;
    await pool.query(
      'INSERT INTO word_notifications (word, translation, created_at) VALUES ($1, $2, $3)',
      [word, translation, timestampMs]
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
