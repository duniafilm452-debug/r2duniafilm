// --- PENTING: GANTI NILAI DI BAWAH INI DENGAN DATA ASLI CLOUDFLARE KAMU ---

/**
 * URL Worker tunggal yang akan menangani semua permintaan ke R2.
 * Worker ini harus di-binding ke SEMUA R2 Bucket yang ada di BUCKET_CONFIGS.
 */
const SINGLE_WORKER_URL = "https://r2-api.duniafilm452.workers.dev/api"; // Tambahkan "/api" sebagai basis path

/**
 * Daftar konfigurasi bucket. 
 * NOTE: 'bucketKey' harus sesuai dengan Nama Binding R2 di Worker!
 */
const BUCKET_CONFIGS = {
    "MY_BUCKET": { 
        name: "videostorage", 
        bucketKey: "MY_BUCKET", // Ganti ini dengan NAMA BINDING di Worker
        publicUrl: "https://pub-8c8da68125074104a602760af43e15f2.r2.dev" 
    },
    
    "VIDEO_DONGHUA": {
        name: "videodonghua",
        bucketKey: "VIDEO_DONGHUA", // Ganti ini dengan NAMA BINDING di Worker
        publicUrl: "https://pub-ee386c8e8fb44f10a429ff370067fac2.r2.dev"
    },
    
    "DONGHUA": {
        name: "donghua",
        bucketKey: "DONGHUA", // Ganti ini dengan NAMA BINDING di Worker
        publicUrl: "https://pub-7eec910773b24498a4ee9bebab96f7e9.r2.dev"
    },

    "IMAGE_STORAGE": {
        name: "imagestorage",
        bucketKey: "IMAGE_STORAGE", // Ganti ini dengan NAMA BINDING di Worker
        publicUrl: "https://pub-54b97618f37649d2a7c9d9dcc7748ff5.r2.dev"
    },
};

// Kunci bucket default yang akan dimuat saat aplikasi dibuka pertama kali
const DEFAULT_BUCKET_KEY = "MY_BUCKET";