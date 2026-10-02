#!/bin/bash
# Bang Story - klik 2x file ini untuk membuka aplikasi di macOS.
cd "$(dirname "$0")" || exit 1

# Terminal yang dibuka lewat klik 2x kadang belum memuat PATH Homebrew atau nvm.
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
[ -s "$HOME/.nvm/nvm.sh" ] && . "$HOME/.nvm/nvm.sh"

if ! command -v node >/dev/null 2>&1; then
  echo
  echo " Node.js belum terpasang di Mac ini."
  echo " Unduh versi LTS dari https://nodejs.org, pasang, lalu klik 2x 'START - MAC.command' lagi."
  echo
  open "https://nodejs.org/en/download"
  read -r -p " Tekan Enter untuk menutup..."
  exit 1
fi

major=$(node -p "process.versions.node.split('.')[0]" 2>/dev/null || echo 0)
if [ "$major" -lt 22 ]; then
  echo
  echo " Node.js di Mac ini versi $(node -v), butuh versi 22 atau lebih baru."
  echo " Unduh versi LTS terbaru dari https://nodejs.org, pasang, lalu klik 2x 'START - MAC.command' lagi."
  echo
  open "https://nodejs.org/en/download"
  read -r -p " Tekan Enter untuk menutup..."
  exit 1
fi

# Pertama kali dibuka, atau folder node_modules berasal dari OS lain: pasang ulang.
if [ ! -f "node_modules/.bangstory-mac" ]; then
  if [ -d "node_modules" ]; then
    echo " Membersihkan node_modules lama..."
    rm -rf node_modules
  fi
  echo
  echo " Menyiapkan Bang Story untuk pertama kali."
  echo " Butuh koneksi internet dan beberapa menit, jangan tutup jendela ini..."
  echo
  if ! npm install; then
    echo
    echo " Gagal memasang. Periksa koneksi internet lalu coba lagi."
    echo " Kalau gagal saat menyusun modul native (better-sqlite3), pasang dulu"
    echo " Xcode Command Line Tools sekali saja lewat Terminal:"
    echo "   xcode-select --install"
    read -r -p " Tekan Enter untuk menutup..."
    exit 1
  fi
  echo ok > node_modules/.bangstory-mac
fi

# Electron mengunduh programnya sendiri saat pertama dipakai.
if [ ! -d "node_modules/electron/dist/Electron.app" ]; then
  echo " Mengunduh Electron..."
  if ! node node_modules/electron/install.js; then
    echo
    echo " Gagal mengunduh Electron. Periksa koneksi internet lalu coba lagi."
    read -r -p " Tekan Enter untuk menutup..."
    exit 1
  fi
fi

if [ ! -f "out/main/index.js" ]; then
  echo " Menyusun aplikasi..."
  if ! npm run build; then
    echo
    echo " Gagal menyusun aplikasi."
    read -r -p " Tekan Enter untuk menutup..."
    exit 1
  fi
fi

nohup ./node_modules/electron/dist/Electron.app/Contents/MacOS/Electron . >/dev/null 2>&1 &
echo " Bang Story sedang dibuka. Jendela Terminal ini boleh ditutup."
echo
echo " Tips: untuk caption akurat (Whisper), pasang whisper.cpp sekali saja lewat Terminal:"
echo "   brew install whisper.cpp"
exit 0
