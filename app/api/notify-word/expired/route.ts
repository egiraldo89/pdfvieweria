import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    console.log('notify-word/expired GET called');
    const { Pool } = await import('pg');
    const webpush = await import('web-push');
    const databaseUrl = process.env.DATABASE_URL;
    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
    const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@example.com';

    if (!databaseUrl) {
      return NextResponse.json({ error: 'DATABASE_URL no configurada' }, { status: 500 });
    }
    if (!vapidPublicKey || !vapidPrivateKey) {
      return NextResponse.json({ error: 'VAPID keys no configuradas' }, { status: 500 });
    }

    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

    const pool = new Pool({ connectionString: databaseUrl });
    const nowMs = Date.now();

    const result = await pool.query(
      'UPDATE word_notifications SET created_at = created_at + $1 WHERE created_at < $2 RETURNING id, word, translation, created_at',
      [24 * 60 * 60 * 1000, nowMs]
    );

    if (result.rows.length === 0) {
      await pool.end();
      return NextResponse.json({ success: true, message: 'No hay registros vencidos' }, { status: 200 });
    }


    const subsResult = await pool.query('SELECT id, subscription FROM push_subscriptions');
    const subscriptions = subsResult.rows;
    const firstRow = result.rows[0];
    const bodyText = result.rows.length === 1
      ? `${firstRow.word}: ${firstRow.translation}`
      : `${firstRow.word}: ${firstRow.translation} (+${result.rows.length - 1} más)`;

    const payload = JSON.stringify({
      title: 'Remember Word',
      body: bodyText,
      data: {
        records: result.rows,
      },
    });

    const sendPromises = subscriptions.map(async (subRow: { id: number; subscription: any }) => {
      try {
        await webpush.sendNotification(subRow.subscription, payload);
      } catch (sendError : any) {
        console.error('Error enviando push a suscripción', subRow.id, sendError);
        const status = sendError?.statusCode ?? sendError?.status;
        if (status === 410 || status === 404) {
          await pool.query('DELETE FROM push_subscriptions WHERE id = $1', [subRow.id]);
        }
      }
    });

    await Promise.all(sendPromises);
    await pool.end();

    return NextResponse.json({ success: true, notified: true }, { status: 200 });
  } catch (error) {
    console.error('Error en notify-word/expired:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
