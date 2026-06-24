import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { subscription } = await req.json();

    if (!subscription || typeof subscription !== 'object') {
      return NextResponse.json({ error: 'Suscripción inválida' }, { status: 400 });
    }

    const { Pool } = await import('pg');
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      return NextResponse.json({ error: 'DATABASE_URL no configurada' }, { status: 500 });
    }

    const pool = new Pool({ connectionString: databaseUrl });

    await pool.query(`
      CREATE TABLE IF NOT EXISTS push_subscriptions (
        id SERIAL PRIMARY KEY,
        subscription JSONB NOT NULL,
        created_at BIGINT NOT NULL
      )
    `);

    await pool.query(
      'INSERT INTO push_subscriptions (subscription, created_at) VALUES ($1, $2)',
      [subscription, Date.now()]
    );

    await pool.end();

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error('Error en push/subscribe:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
