import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = Number(searchParams.get('page') || '1');
    const pageSize = Number(searchParams.get('pageSize') || '8');

    const { Pool } = await import('pg');
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      return NextResponse.json({ error: 'DATABASE_URL no configurada' }, { status: 500 });
    }

    const pool = new Pool({ connectionString: databaseUrl });
    const offset = (Math.max(page, 1) - 1) * Math.max(pageSize, 1);

    const countResult = await pool.query('SELECT COUNT(*)::int AS total FROM word_notifications');
    const total = countResult.rows[0]?.total || 0;
    const totalPages = Math.max(1, Math.ceil(total / Math.max(pageSize, 1)));

    const itemsResult = await pool.query(
      'SELECT id, word, translation, created_at, active FROM word_notifications ORDER BY created_at DESC LIMIT $1 OFFSET $2',
      [Math.max(pageSize, 1), offset]
    );

    await pool.end();

    return NextResponse.json({ items: itemsResult.rows, totalPages });
  } catch (error) {
    console.error('Error al listar palabras notificadas:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
