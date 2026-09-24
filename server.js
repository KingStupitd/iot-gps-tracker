const express = require('express');
const mysql = require('mysql2/promise');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Konfigurasi Database MySQL
const DB_CONFIG = {
  host: 'localhost',
  user: 'root',
  password: '', // Sesuaikan dengan password MySQL Anda (kosong untuk default XAMPP)
  database: 'iot_gps_db'
};

let pool;

/**
 * Inisialisasi Database & Tabel otomatis saat server pertama kali berjalan
 */
async function initDatabase() {
  try {
    // 1. Buat koneksi sementara tanpa menentukan nama database untuk memastikan database iot_gps_db ada
    const tempConn = await mysql.createConnection({
      host: DB_CONFIG.host,
      user: DB_CONFIG.user,
      password: DB_CONFIG.password
    });

    await tempConn.query(`CREATE DATABASE IF NOT EXISTS \`${DB_CONFIG.database}\`;`);
    await tempConn.end();

    // 2. Buat Connection Pool ke database iot_gps_db
    pool = mysql.createPool({
      host: DB_CONFIG.host,
      user: DB_CONFIG.user,
      password: DB_CONFIG.password,
      database: DB_CONFIG.database,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });

    // 3. Buat tabel gps_logs jika belum ada
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS gps_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        latitude DOUBLE NOT NULL,
        longitude DOUBLE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    await pool.query(createTableQuery);
    console.log('✅ Connection Pool terhubung & Tabel gps_logs siap.');
  } catch (error) {
    console.error('❌ Gagal inisialisasi Database MySQL:', error.message);
    console.error('👉 Pastikan service MySQL (XAMPP / MySQL Server) sudah AKTIF.');
  }
}

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ---------------------------------------------------------
// ENDPOINTS
// ---------------------------------------------------------

/**
 * POST /api/location
 * Menerima data koordinat GPS dari perangkat IoT / simulator.
 * Payload: { "latitude": -6.2088, "longitude": 106.8456 }
 */
app.post('/api/location', async (req, res) => {
  try {
    const { latitude, longitude } = req.body;

    // Validasi input angka
    if (latitude === undefined || longitude === undefined || isNaN(Number(latitude)) || isNaN(Number(longitude))) {
      return res.status(400).json({
        status: 'error',
        message: 'Latitude dan longitude wajib diisi dengan nilai numerik valid.'
      });
    }

    const lat = Number(latitude);
    const lng = Number(longitude);

    // Ambil data koordinat TERAKHIR dari database
    const [lastRows] = await pool.query(
      'SELECT latitude, longitude FROM gps_logs ORDER BY id DESC LIMIT 1'
    );

    // Cek jika koordinat sama persis dengan data terakhir
    if (lastRows.length > 0) {
      const lastData = lastRows[0];
      if (lastData.latitude === lat && lastData.longitude === lng) {
        return res.json({
          status: 'ignored',
          message: 'Lokasi tidak berubah'
        });
      }
    }

    // Lakukan INSERT jika beda atau tabel masih kosong
    const [result] = await pool.query(
      'INSERT INTO gps_logs (latitude, longitude) VALUES (?, ?)',
      [lat, lng]
    );

    return res.status(201).json({
      status: 'success',
      message: 'Lokasi disimpan',
      data: {
        id: result.insertId,
        latitude: lat,
        longitude: lng
      }
    });
  } catch (error) {
    console.error('Error POST /api/location:', error);
    res.status(500).json({ status: 'error', message: 'Terjadi kesalahan pada server.' });
  }
});

/**
 * GET /api/location/latest
 * Mengembalikan 1 data koordinat terbaru dari database.
 */
app.get('/api/location/latest', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, latitude, longitude, created_at FROM gps_logs ORDER BY id DESC LIMIT 1'
    );

    if (rows.length === 0) {
      return res.json({
        status: 'success',
        data: null,
        message: 'Belum ada data lokasi tercatat.'
      });
    }

    res.json({
      status: 'success',
      data: rows[0]
    });
  } catch (error) {
    console.error('Error GET /api/location/latest:', error);
    res.status(500).json({ status: 'error', message: 'Terjadi kesalahan pada server.' });
  }
});

/**
 * GET /api/location/history
 * Mengembalikan seluruh array data riwayat koordinat untuk membuat garis lintasan (Polyline).
 */
app.get('/api/location/history', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, latitude, longitude, created_at FROM gps_logs ORDER BY id ASC'
    );

    res.json({
      status: 'success',
      total: rows.length,
      data: rows
    });
  } catch (error) {
    console.error('Error GET /api/location/history:', error);
    res.status(500).json({ status: 'error', message: 'Terjadi kesalahan pada server.' });
  }
});

// Jalankan Server setelah Inisialisasi Database
initDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`🚀 IoT GPS Tracker Server running at http://localhost:${PORT}`);
    console.log(`====================================================`);
  });
});
