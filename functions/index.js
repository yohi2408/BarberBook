const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();

// Helper: split array into chunks of size n
function chunkArray(arr, n) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += n) chunks.push(arr.slice(i, i + n));
  return chunks;
}

exports.sendBroadcastNotification = functions.firestore
  .document('broadcast_notifications/{docId}')
  .onCreate(async (snap, context) => {
    const data = snap.data() || {};
    const title = data.title || 'עדכון';
    const body = data.body || '';
    const url = data.url || '/';

    try {
      const tokensSnap = await db.collection('fcm_tokens').get();
      const tokens = tokensSnap.docs.map(d => d.data().token).filter(Boolean);
      if (!tokens.length) {
        console.log('No FCM tokens found');
        return null;
      }

      const payload = {
        notification: {
          title,
          body,
          click_action: url
        },
        data: {
          url: url
        }
      };

      const batches = chunkArray(tokens, 500);
      const results = [];

      for (const batch of batches) {
        const resp = await admin.messaging().sendToDevice(batch, payload, { priority: 'high' });
        results.push(resp);

        // Clean up invalid tokens
        const toRemove = [];
        resp.results.forEach((r, idx) => {
          const err = r.error;
          if (err) {
            const code = err.code || '';
            if (code === 'messaging/registration-token-not-registered' || code === 'messaging/invalid-registration-token') {
              toRemove.push(batch[idx]);
            }
          }
        });

        if (toRemove.length) {
          const q = db.collection('fcm_tokens').where('token', 'in', toRemove);
          const snapRemove = await q.get();
          const batchDel = db.batch();
          snapRemove.docs.forEach(docRef => batchDel.delete(docRef.ref));
          await batchDel.commit();
          console.log('Removed invalid tokens:', toRemove.length);
        }
      }

      console.log('Notifications sent, batches:', batches.length);
      return { success: true };
    } catch (e) {
      console.error('Error sending broadcast notifications', e);
      return null;
    }
  });
