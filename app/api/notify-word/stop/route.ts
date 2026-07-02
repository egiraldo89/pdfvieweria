import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { id } = await req.json();

    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
    }

    const { Pool } = await import('pg');
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
      return NextResponse.json({ error: 'DATABASE_URL no configurada' }, { status: 500 });
    }

    const pool = new Pool({ connectionString: databaseUrl });

    await pool.query(
      'UPDATE word_notifications SET active = false WHERE id = $1',
      [id]
    );

    await pool.end();

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error al detener notificación:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
