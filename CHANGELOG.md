# Changelog

Semua perubahan penting dicatat di sini. Format mengikuti [Keep a Changelog](https://keepachangelog.com/id-ID/1.1.0/),
dan nomor versi mengikuti [Semantic Versioning](https://semver.org/lang/id/): **mayor** untuk perubahan yang merusak
data atau alur lama, **minor** untuk fitur baru, **patch** untuk perbaikan.

Cara menaikkan versi ada di [docs/pengembangan.md](docs/pengembangan.md#versi-dan-rilis).

## [Belum dirilis]

### Penyedia visual Google (Nano Banana + Omni Flash)
- Langkah Ide cerita kini punya pilihan penyedia visual: **Higgsfield** atau **Google**. Pilihan tersimpan per proyek
  dan menjadi bawaan untuk proyek baru.
- **Nano Banana** (`gemini-2.5-flash-image`) menggambar gambar klip dan lembar karakter, memakai lembar karakter
  (maks 3) sebagai referensi agar tokoh konsisten.
- **Omni Flash** (`gemini-omni-1.1-flash`) menganimasikan gambar klip jadi video 3-10 detik lewat Interactions API.
- Keduanya memakai **kunci Gemini yang sama** dengan penyusun cerita dan narator (tidak perlu kunci baru);
  Pengaturan menjelaskan pemakaian bersama ini. Video Omni Flash butuh paid tier di Google AI Studio.
- Biaya ditampilkan dalam USD (≈ $0,04/gambar, ≈ $0,10/detik video 720p), bukan kredit Higgsfield.

### Dukungan macOS
- Aplikasi berjalan penuh di macOS lewat `START - MAC.command` / `npm run dev` (sebelumnya caption akurat tidak
  tersedia di Mac).
- Caption akurat (Whisper) di Mac memakai `whisper-cli` dari PATH: cukup `brew install whisper.cpp`, tanpa biner
  bundel. Kalau programnya belum terpasang, Pengaturan menampilkan panduan dan tombol sinkron caption kembali ke
  perkiraan waktu.
- `npm run dist:mac` menghasilkan `.dmg` untuk Intel (x64) dan Apple Silicon (arm64). Skrip `prepare-dist`
  menyalin lisensi FFmpeg sesuai platform dan memastikan folder `resources/whisper` ada sebelum packaging.
- `START - MAC.command` memeriksa Node.js 22+, memberi petunjuk `xcode-select --install` kalau modul native gagal
  disusun, dan mengingatkan pemasangan whisper.cpp.
- Dev harness: data demo memakai `say` bawaan macOS sebagai pengganti PowerShell di Windows.

## [1.0.0] - 2026-10-02

Rilis pertama Bang Story (sebelumnya bernama Studio Cerita).

### Alur produksi
- Empat langkah: **Ide cerita → Naskah → Storyboard → Editor**, tersimpan otomatis di database lokal.
- Penyusun cerita memakai Gemini, OpenRouter, Groq, atau endpoint custom yang kompatibel dengan OpenAI. Daftar
  modelnya diambil langsung dari penyedia.
- Naskah bisa diubah, ditambah, dihapus, dan diurutkan ulang. Narasi boleh memuat tag ekspresi suara.
- Rencana visual dibuat dari naskah final: prompt gambar berlabel (dunia dan era, aksi, baju per adegan, hal yang
  harus dihindari), pemeran beserta lembar karakter, gerak kamera, transisi, dan arahan gerak video.
- 14 model gambar dan 34 model video Higgsfield, dengan perkiraan kredit dari endpoint `estimate`. Resolusi video
  bisa dipilih per proyek.
- Narasi dibuat dalam satu rekaman utuh (Gemini TTS atau ElevenLabs), lalu dipotong otomatis per adegan.
- Caption akurat dengan Whisper lokal (mode DTW). Klip lama bisa disinkronkan ulang dari tab Caption.
- Panel Musik bisa membuat prompt musik latar untuk Suno atau AI musik lain.

### Editor
- Pratinjau langsung dengan gerak kamera, transisi, caption karaoke, musik latar, dan overlay (logo, watermark,
  teks) yang bisa digeser di pratinjau.
- Timeline seperti editor video:
  - tarik tepi klip untuk mengatur panjangnya (video tidak bisa melebihi panjang aslinya);
  - geser dan potong suara, caption, musik, dan overlay;
  - **Potong** (S atau Ctrl+B) dan **Hapus** (Delete);
  - snap ke playhead dan sambungan;
  - overlay bertumpuk di baris masing-masing.
- Transisi diatur per sambungan dari tombol di antara klip. Panelnya punya pratinjau yang diputar berulang, durasi
  0,2–2 detik, dan tombol terapkan ke semua.
- Gerak kamera bisa diatur untuk klip gambar maupun video. Pratinjaunya diputar tanpa menggeser playhead.
- Caption:
  - 4 gaya dan pilihan tanpa caption;
  - 15 font (4 tegas, 9 kartun/komik, 2 tulisan tangan/elegan) dengan contoh di daftar;
  - ukuran, posisi, warna, dan kotak latar rounded;
  - teksnya bisa diedit langsung dan tersimpan otomatis.
- Suara: volume per klip dan volume narasi. Musik: volume, otomatis mengecil saat narasi, dipotong, dan digeser.

### Ekspor
- MP4 dirender dengan FFmpeg di komputer pengguna. Hasilnya sama dengan pratinjau karena aturan gerak, transisi,
  caption, dan potongan suara dipakai bersama (`src/shared/`).
- Gerak kamera halus memakai filter `perspective`. Caption memakai libass dengan kotak rounded, dan ukurannya
  sama dengan pratinjau.
- Proyek bisa diekspor berulang kali setelah diedit.

### Lainnya
- Kunci API milik pengguna (BYOK), disimpan terenkripsi dengan DPAPI Windows (`safeStorage`).
- Halaman About menampilkan versi aplikasi, tautan ke channel Bang Tutorial, dan video tutorial.
- Salinan siap jalan dengan skrip START untuk Windows dan macOS.
- Dokumentasi pengembang: [AGENTS.md](AGENTS.md) dan folder [docs/](docs/README.md).
- Kode dirilis dengan [lisensi MIT](LICENSE). README dilengkapi badge dan screenshot.
- Installer Windows (`BangStory-Setup-1.0.0.exe`) dengan ikon dari logo Bang Story.

### Batasan yang diketahui
Lihat [docs/masalah-diketahui.md](docs/masalah-diketahui.md). Yang paling terasa:
- gerak kamera di atas video masih bergetar di pratinjau (hasil ekspor halus);
- belum ada undo/redo;
- Whisper dan installer baru tersedia untuk Windows.
