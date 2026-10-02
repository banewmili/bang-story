# Masalah yang diketahui dan ide pengembangan

## Masalah terbuka

| Masalah | Keterangan | Petunjuk |
|---|---|---|
| Gerak kamera di atas **video** bergetar di **pratinjau** | Hasil ekspor sudah halus; yang bergetar hanya pratinjau editor. Overlay hardware sudah dimatikan dan opasitasnya 0,999, tapi pemilik aplikasi masih melihat getaran (kartu grafis NVIDIA). | Kemungkinan lain: konten video 24 fps vs transform 60 fps, atau compositor. Ide: gambar frame video ke `<canvas>` dan terapkan transform di canvas, atau putar pratinjau dari frame yang sudah diskalakan. |
| Belum ada undo/redo | Hapus overlay, caption, atau suara langsung terjadi (hapus klip ada konfirmasi). | Undo bisa dibuat di store renderer (riwayat snapshot) + IPC untuk aksi di main (split, setWords). |
| Whisper di macOS | Sejak v1.1.0 aplikasi memakai `whisper-cli` dari PATH kalau biner bundel tidak ada, jadi `brew install whisper.cpp` mengaktifkan caption akurat di Mac. Kalau programnya belum terpasang, Pengaturan menampilkan panduan dan tombol sinkron memakai perkiraan waktu. | Selesai (butuh `brew install whisper.cpp` di komputer pengguna). |
| Installer macOS | `npm run dist:mac` menghasilkan `.dmg` (x64 + arm64) dan hanya bisa dijalankan di Mac. Belum ditandatangani: butuh akun Apple Developer untuk tanda tangan + notarisasi supaya Gatekeeper tidak memblokir, dan `build/icon.icns` belum dibuat (lihat [pengembangan.md](pengembangan.md#rilis-macos)). | Selesai sebagian; penandatanganan menunggu akun Apple Developer. |
| Installer belum ditandatangani | Windows SmartScreen memperingatkan "Windows melindungi PC Anda". Pengguna harus klik **Info selengkapnya › Tetap jalankan**. | Beli sertifikat code signing, lalu pasang lewat variabel `CSC_LINK` dan `CSC_KEY_PASSWORD` (lihat bagian *Code Signing* di dokumentasi electron-builder). |
| Rekam ulang narasi mereset durasi | Durasi klip dan potongan suara manual kembali mengikuti suara baru. | Disengaja; bisa ditambah opsi "pertahankan durasi". |
| Sinkron Whisper menimpa edit caption manual | `syncCaptions` menulis ulang `meta.words` dari naskah, jadi teks caption yang diedit tangan kembali ke naskah. Ini terjadi pada mode "semua klip", dan pada klip yang memang perlu disinkronkan. | Lewati klip dengan `meta.editedWords`, atau tanya pengguna dulu. |
| Riwayat versi aset setelah split | Bagian kedua memakai gambar/video milik klip asal; riwayat versinya ada di klip asal. | Salin baris aset untuk klip baru kalau riwayat per bagian diperlukan. |
| Caption sulit digeser utuh | Potongan caption berdempetan, jadi menyeret badannya sering tidak punya ruang. | Tarik tepinya; atau izinkan geser yang ikut mendorong potongan tetangga. |
| Tidak semua model sudah diuji langsung | Katalog Higgsfield berisi 48 model; sebagian besar baru diuji lewat body permintaan, belum lewat generate sungguhan. Penyedia LLM selain Gemini juga belum semuanya diuji. | Uji model yang sering dipakai, lalu catat model yang bermasalah. |

## Ide pengembangan

- Undo/redo dan riwayat versi per klip di editor.
- Ekspor langsung ke YouTube (OAuth) dengan judul dan deskripsi dari naskah.
- Template intro/outro dan watermark tersimpan per channel.
- Pilihan TTS lokal (tanpa API) untuk pengguna tanpa kunci.
- Dukungan macOS penuh (Whisper, installer).
- Unit test untuk modul `src/shared/` (caption, timeline, motion) dengan Vitest.
