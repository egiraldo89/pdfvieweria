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

    // Calculate Colombia time by applying UTC offset for America/Bogota (UTC-5)
    const nowMs = Date.now() - 5 * 60 * 60 * 1000;
console.log('Current Colombia time (ms):', nowMs);
    // 1) Select pending word notifications (do not update yet)
    const notifResult = await pool.query(
      'SELECT id, word, translation, created_at FROM word_notifications WHERE created_at < $1 ORDER BY created_at ASC',
      [nowMs]
    );
    console.log('Pending notifications:', notifResult.rows.length, notifResult.rows);
    if (notifResult.rows.length === 0) {
      await pool.end();
      return NextResponse.json({ success: true, message: 'No hay registros vencidos' }, { status: 200 });
    }

    // 2) Load subscriptions
    const subsResult = await pool.query('SELECT id, subscription FROM push_subscriptions');
    const subscriptions = subsResult.rows;

    // 3) Send one notification per word to every subscription
    const failedSubIds = new Set<number>();
    for (const row of notifResult.rows) {
      const payload = JSON.stringify({
        title: 'Remember Word',
        body: `${row.word}: ${row.translation}`,
        data: { record: row },
      });

      for (const subRow of subscriptions) {
        try {
          await webpush.sendNotification(subRow.subscription, payload);
        } catch (sendError: any) {
          console.error('Error enviando push a suscripción', subRow.id, sendError);
          const status = sendError?.statusCode ?? sendError?.status;
          if (status === 410 || status === 404) {
            failedSubIds.add(subRow.id);
          }
        }
      }
    }

    // 4) Remove invalid subscriptions
    if (failedSubIds.size > 0) {
      const ids = Array.from(failedSubIds);
      await pool.query('DELETE FROM push_subscriptions WHERE id = ANY($1)', [ids]);
    }

    // 5) After attempted sends, advance each notified word by 24 hours
    const notifiedIds = notifResult.rows.map((r: any) => r.id);
    if (notifiedIds.length > 0) {
      await pool.query('UPDATE word_notifications SET created_at = created_at + $1 WHERE id = ANY($2)', [24 * 60 * 60 * 1000, notifiedIds]);
    }

    await pool.end();
    return NextResponse.json({ success: true, notified: true, count: notifResult.rows.length }, { status: 200 });
  } catch (error) {
    console.error('Error en notify-word/expired:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
