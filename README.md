# IoT GPS Tracker Project

Aplikasi sederhana berbasis **Node.js, Express, MySQL, dan Leaflet.js** untuk menerima koordinat lokasi GPS dan menampilkannya pada peta secara real-time.

## Prasyarat

1. **Node.js** terinstal di sistem Anda.
2. **Database MySQL** berjalan. (Bisa menggunakan XAMPP, WAMP, atau MySQL Server).

## Cara Menjalankan Aplikasi

### 1. Menjalankan Database MySQL
- Pastikan service **MySQL** sudah berjalan (Misal: klik "Start" pada MySQL di XAMPP Control Panel).
- Secara default, aplikasi ini menggunakan user `root` dengan password kosong `""`. Jika password MySQL Anda berbeda, silakan ubah pada file `server.js` di bagian `DB_CONFIG`.
- **Tidak perlu membuat tabel secara manual!** Aplikasi akan otomatis membuat database `iot_gps_db` dan tabel `gps_logs` ketika server dijalankan pertama kali.

### 2. Menjalankan Node.js Server
Jalankan perintah berikut di terminal (berada di dalam folder `iot-gps-tracker`):

```bash
npm start
# Jika error eksekusi (PowerShell), gunakan:
node server.js
```

Jika berhasil, akan muncul tulisan:
```
✅ Connection Pool terhubung & Tabel gps_logs siap.
====================================================
🚀 IoT GPS Tracker Server running at http://localhost:3000
====================================================
```

### 3. Membuka Frontend Peta
Buka web browser dan akses:
👉 **[http://localhost:3000](http://localhost:3000)**

Anda akan melihat peta Leaflet.js yang otomatis mengupdate titik koordinat (polling tiap 3 detik).

## Fitur Simulator
Pada halaman frontend, terdapat form kecil di pojok kiri atas untuk simulasi!
Anda dapat memasukkan `Latitude` dan `Longitude` lalu klik `Kirim Koordinat` atau klik `Move Random Step` untuk mencoba melihat pin dan garis lintasan berubah secara real-time, layaknya Tracker GPS asli.
