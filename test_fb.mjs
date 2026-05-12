import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const config = require('./firebase-applet-config.json');

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';

const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);

async function test() {
  try {
    const d = doc(db, 'users', 'test_123');
    await setDoc(d, { val: 1 });
    const snap = await getDoc(d);
    console.log('Result:', snap.data());
// keep process from hanging out forever?
    process.exit(0);
  } catch(e) {
    console.error('Error:', e);
    process.exit(1);
  }
}
test();
