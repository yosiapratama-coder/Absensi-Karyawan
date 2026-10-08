# Sistem Absensi Karyawan Berbasis Web

## Fitur
- Login pengguna melalui Firebase Authentication
- Role Karyawan dan HRD
- Absensi masuk dan pulang
- Tanggal dan waktu otomatis
- Riwayat absensi
- Pengajuan izin/sakit
- Persetujuan izin/sakit oleh HRD
- Dashboard HRD
- Data karyawan
- Laporan absensi
- Export CSV
- Data tersimpan otomatis di Cloud Firestore

## Cara membuat online
1. Buat project di Firebase Console.
2. Aktifkan Authentication > Sign-in method > Email/Password.
3. Buat Cloud Firestore Database.
4. Buat Web App pada Project Settings.
5. Salin konfigurasi Firebase ke `app.js` pada bagian `firebaseConfig`.
6. Buat akun HRD dan akun karyawan di Authentication.
7. Di Firestore, buat collection `users`.
8. Untuk setiap user, buat document dengan Document ID = UID Firebase.
9. Isi field:
   - name: nama
   - email: email
   - position: jabatan
   - role: `hrd` atau `employee`
10. Upload folder ini ke Firebase Hosting, Netlify, Vercel, atau GitHub Pages.

## Catatan keamanan
Sebelum dipakai sungguhan, pasang Firestore Security Rules agar karyawan hanya bisa membaca/menulis data miliknya dan HRD dapat mengelola data sesuai kewenangan.

## Struktur Firestore
- users/{uid}
- attendance/{uid_YYYY-MM-DD}
- leaves/{autoId}
