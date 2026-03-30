import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';

export const firebaseConfig = {
  apiKey: 'AIzaSyDSMtHeaW_vt06Wt-WAA83TC07H5IuSqaA',
  authDomain: 'gabriel-estoque.firebaseapp.com',
  databaseURL: 'https://gabriel-estoque-default-rtdb.firebaseio.com',
  projectId: 'gabriel-estoque',
  storageBucket: 'gabriel-estoque.firebasestorage.app',
  messagingSenderId: '1018539632113',
  appId: '1:1018539632113:web:dd561850d832bbe4f55050',
  measurementId: 'G-BY0S7EVHRR',
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);
