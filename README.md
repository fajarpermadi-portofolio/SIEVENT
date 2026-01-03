# 🎉 SIEVENT — Sistem Informasi Event Berbasis Web

SIEVENT adalah platform **manajemen event dan seminar berbasis web** yang mendukung:
- Registrasi peserta (gratis & berbayar)
- Pembayaran online (Midtrans Snap)
- Presensi QR Code (Check-in & Check-out)
- Manajemen sertifikat otomatis
- Dashboard Admin & User terpisah

Dibangun menggunakan **React + Supabase + Midtrans**, sistem ini cocok untuk:
kampus, organisasi, komunitas, dan penyelenggara event.

---

## 🚀 Fitur Utama

### 👤 User
- Registrasi & login
- Melihat daftar event
- Daftar event gratis
- Daftar & bayar event berbayar (Midtrans)
- Lanjutkan pembayaran (pending)
- Scan QR Check-in & Check-out
- Akses sertifikat digital

### 🛠 Admin
- CRUD Event
- Generate QR Dinamis (Check-in / Check-out)
- Rekap kehadiran peserta
- Export data ke Excel
- Generate sertifikat (manual & massal)
- Monitoring pembayaran peserta

### 💳 Pembayaran
- Midtrans Snap (Sandbox & Production ready)
- Webhook otomatis
- Status: `pending`, `paid`, `expired`, `failed`
- Idempotent & aman

---

## 🧱 Tech Stack

| Layer | Teknologi |
|-----|----------|
| Frontend | React + Vite + Tailwind CSS |
| Backend | Supabase (PostgreSQL + Edge Functions) |
| Auth | Supabase Auth |
| Payment | Midtrans Snap |
| Presensi | QR Code |
| Deployment | Vercel / Netlify / Supabase |

---

## 🗂 Struktur Database (Ringkas)

### `events`
- id
- name
- date
- price
- location

### `event_payments`
- order_id
- event_id
- user_id
- amount
- status (`pending`, `paid`, `expired`)
- payment_method

### `event_registrations`
- user_id
- event_id
- payment_status
- order_id

### `attendance`
- user_id
- event_id
- attendance_type (`checkin` / `checkout`)
- timestamp

### `certificates`
- user_id
- event_id
- file_url

---

## 🔄 Alur Pembayaran (Final)

1. User klik **Daftar & Bayar**
2. `create-payment` Edge Function:
   - Insert ke `event_payments` (pending)
   - Redirect ke Midtrans Snap
3. Midtrans kirim webhook
4. Webhook:
   - Update `event_payments.status = paid`
   - Insert `event_registrations`
5. User otomatis terdaftar & bisa presensi

---
