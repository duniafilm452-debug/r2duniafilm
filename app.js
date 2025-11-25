// Ambil elemen DOM yang dibutuhkan
const fileInput = document.getElementById('fileInput');
const statusText = document.getElementById('status');
const fileList = document.getElementById('fileList');
const uploadBtn = document.getElementById('uploadBtn');
const bucketSelector = document.getElementById('bucketSelector');
const searchInput = document.getElementById('searchInput');

// Elemen Modal Upload
const uploadModal = document.getElementById('uploadModal');
const modalTitle = document.getElementById('modalTitle');
const modalMessage = document.getElementById('modalMessage');
const modalFileName = document.getElementById('modalFileName');
const progressBar = document.getElementById('progressBar');
const modalCloseBtn = document.getElementById('modalCloseBtn');
const modalSpinner = document.getElementById('modalSpinner');

// Elemen Modal Hapus Kustom
const deleteConfirmModal = document.getElementById('deleteConfirmModal');
const deleteFileNameDisplay = document.getElementById('deleteFileName');
const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');

// Elemen Modal Preview Video BARU
const videoPreviewModal = document.getElementById('videoPreviewModal');
const videoPlayer = document.getElementById('videoPlayer');
const videoTitle = document.getElementById('videoTitle');


// State lokal untuk menyimpan daftar file yang sedang ditampilkan dan konfigurasi aktif
let currentFiles = [];
let currentConfig = BUCKET_CONFIGS[DEFAULT_BUCKET_KEY];

// ==========================================================
// FUNGSI HELPER
// ==========================================================

/**
 * Memformat ukuran file menjadi B, KB, MB, atau GB.
 */
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Menampilkan pesan status singkat di bawah tombol Upload.
 */
function setStatus(msg, isError = false) {
    statusText.innerText = msg;
    statusText.className = `status-msg show ${isError ? 'error' : 'success'}`;
    setTimeout(() => {
        statusText.className = 'status-msg';
    }, 3000);
}

/**
 * Mengisi dropdown bucket selector saat inisialisasi.
 */
function populateBucketSelector() {
    bucketSelector.innerHTML = '';
    for (const key in BUCKET_CONFIGS) {
        const option = document.createElement('option');
        option.value = key;
        option.textContent = BUCKET_CONFIGS[key].name;
        if (key === DEFAULT_BUCKET_KEY) {
            option.selected = true;
        }
        bucketSelector.appendChild(option);
    }
}

/**
 * 5. Pilih Bucket: Mengganti konfigurasi aktif dan memuat file baru.
 */
function switchBucket() {
    const selectedKey = bucketSelector.value;
    // PENTING: Mengganti currentConfig agar loadFiles menggunakan BUCKET_KEY yang baru
    currentConfig = BUCKET_CONFIGS[selectedKey]; 
    
    searchInput.value = ''; // Reset pencarian
    setStatus(`Mengganti ke Bucket: ${currentConfig.name}`);
    
    // Ini memastikan file berubah karena loadFiles menggunakan currentConfig yang baru.
    loadFiles(); 
}


// ==========================================================
// FUNGSI UTAMA (CRUD OPERATIONS & FILTERING)
// ==========================================================

/**
 * 1. Load Files: Mengambil daftar file dari Cloudflare Worker.
 */
async function loadFiles() {
    currentFiles = []; // Reset daftar file
    fileList.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Memuat daftar file...</div>';
    
    try {
        // Endpoint: /api/{bucketKey} (Worker akan LIST berdasarkan bucketKey ini)
        const endpoint = `${SINGLE_WORKER_URL}/${currentConfig.bucketKey}`;
        
        // Tambahkan timestamp untuk mencegah caching browser
        const cacheBuster = Date.now(); 

        const response = await fetch(`${endpoint}?t=${cacheBuster}`);
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const files = await response.json();
        
        // Urutkan berdasarkan kunci secara default
        currentFiles = files.sort((a, b) => a.key.localeCompare(b.key));
        filterFiles(); 

    } catch (error) {
        console.error("Error saat memuat file:", error);
        fileList.innerHTML = `<div class="loading error" style="color: var(--danger-color);">Gagal memuat data dari ${currentConfig.name}. Pastikan URL Worker dan Binding R2 sudah benar!</div>`;
    }
}

/**
 * 6. Pencarian File: Memfilter daftar file yang sudah dimuat.
 */
function filterFiles() {
    const query = searchInput.value.toLowerCase();
    
    const filteredFiles = currentFiles.filter(file => file.key.toLowerCase().includes(query));

    fileList.innerHTML = ''; 

    if (filteredFiles.length === 0) {
        fileList.innerHTML = `<div class="loading">Tidak ada file yang cocok dengan "${query}" di bucket ini.</div>`;
        return;
    }

    filteredFiles.forEach(file => {
        const fileUrl = `${currentConfig.publicUrl}/${file.key}`;
        const isImage = file.key.match(/\.(jpeg|jpg|gif|png|webp)$/i);
        const isVideo = file.key.match(/\.(mp4|webm|mov|avi|mkv)$/i); // Ditambah format video umum

        let previewAction = `window.open('${fileUrl}', '_blank')`;
        let previewIcon = `<i class="fas fa-file text-gray-500"></i>`;
        
        if (isImage) {
            previewIcon = `<img src="${fileUrl}" onerror="this.onerror=null; this.src='https://placehold.co/50x50/e5e7eb/5d5d5d?text=IMG';" alt="preview">`;
        } else if (isVideo) {
            // Tindakan baru: Memanggil fungsi preview video
            previewAction = `showVideoPreview('${fileUrl}', '${file.key}')`;
            previewIcon = `<i class="fas fa-video text-gray-500"></i>`;
        }


        const itemHtml = `
            <div class="file-item">
                <div class="file-preview" onclick="${previewAction}">
                    ${previewIcon}
                </div>

                <div class="file-info">
                    <p class="file-name">${file.key}</p>
                    <p class="file-size">${formatFileSize(file.size)}</p>
                </div>

                <div class="action-buttons">
                    <button onclick="copyLink('${fileUrl}')" class="btn-icon btn-copy" title="Salin Link">
                        <i class="fas fa-link"></i>
                    </button>
                    <button onclick="showDeleteConfirmation('${file.key}')" class="btn-icon btn-delete" title="Hapus File">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
        fileList.innerHTML += itemHtml;
    });
}


/**
 * 2. Upload/Update File: Mengirim file yang dipilih ke Cloudflare Worker (metode PUT).
 */
async function uploadFile() {
    const file = fileInput.files[0];
    if (!file) return setStatus("Pilih file dulu sebelum upload!", true);

    uploadBtn.disabled = true;
    
    // Tampilkan Modal Status Upload
    modalTitle.textContent = "Mengupload File...";
    modalMessage.textContent = "Sedang mempersiapkan data...";
    modalFileName.textContent = file.name;
    progressBar.style.width = '0%';
    modalCloseBtn.style.display = 'none';
    modalSpinner.style.display = 'block';
    uploadModal.style.display = 'flex';

    try {
        const filename = encodeURIComponent(file.name); 
        // Endpoint: /api/{bucketKey}/{fileName}
        const endpoint = `${SINGLE_WORKER_URL}/${currentConfig.bucketKey}/${filename}`;

        modalMessage.textContent = "Mengirim data ke Worker...";
        let progress = 0;
        const interval = setInterval(() => {
            progress += 10;
            if (progress < 90) {
                progressBar.style.width = `${progress}%`;
            } else {
                clearInterval(interval);
                progressBar.style.width = `90%`; 
            }
        }, 300);

        // Kirim request PUT ke Worker
        const response = await fetch(endpoint, {
            method: 'PUT',
            body: file 
        });

        clearInterval(interval); 
        
        if (!response.ok) {
             throw new Error("Gagal mengupload file ke Worker.");
        }

        modalTitle.textContent = "Upload Berhasil!";
        modalMessage.textContent = `File ${file.name} telah diupload ke ${currentConfig.name}.`;
        progressBar.style.width = '100%';
        modalSpinner.style.display = 'none';
        modalCloseBtn.style.display = 'block';

        fileInput.value = ''; 
        loadFiles(); 

    } catch (error) {
        console.error("Error saat upload:", error);
        modalTitle.textContent = "Upload Gagal!";
        modalMessage.textContent = `Terjadi kesalahan: ${error.message}`;
        progressBar.style.width = '0%';
        modalSpinner.style.display = 'none';
        modalCloseBtn.style.display = 'block';
    } finally {
        uploadBtn.disabled = false;
    }
}


/**
 * 3A. Menampilkan Modal Konfirmasi Hapus.
 */
function showDeleteConfirmation(key) {
    deleteFileNameDisplay.textContent = key;
    deleteConfirmModal.style.display = 'flex';

    confirmDeleteBtn.onclick = null;
    
    confirmDeleteBtn.onclick = () => {
        deleteConfirmModal.style.display = 'none';
        executeDelete(key);
    };
}


/**
 * 3B. Menghapus File: Menghapus file dari bucket R2 (metode DELETE).
 */
async function executeDelete(key) {
    try {
        setStatus(`Menghapus ${key}...`);
        
        // Endpoint: /api/{bucketKey}/{fileName}
        const endpoint = `${SINGLE_WORKER_URL}/${currentConfig.bucketKey}/${key}`;

        const response = await fetch(endpoint, {
            method: 'DELETE'
        });

        if (!response.ok) {
             throw new Error("Gagal menghapus file dari Worker.");
        }

        setStatus(`File ${key} berhasil dihapus.`);
        loadFiles(); 
    } catch (error) {
        console.error("Error saat menghapus:", error);
        setStatus("Gagal menghapus file.", true);
    }
}


/**
 * 4. Copy Link: Menyalin URL publik R2 ke clipboard.
 */
function copyLink(url) {
    // Menggunakan API Clipboard
    navigator.clipboard.writeText(url).then(() => {
        setStatus("Link berhasil disalin ke clipboard!");
    }).catch(err => {
        console.error('Gagal menyalin:', err);
        setStatus("Gagal menyalin. Silakan salin URL ini secara manual: " + url, true);
    });
}


/**
 * 7. BARU: Menampilkan Modal Preview Video
 */
function showVideoPreview(url, title) {
    videoTitle.textContent = title;
    videoPlayer.src = url;
    videoPreviewModal.style.display = 'flex';
    // Otomatis putar video saat modal muncul
    videoPlayer.play();
}

/**
 * 8. BARU: Menutup Modal Preview Video
 */
function closeVideoPreview() {
    videoPlayer.pause();
    videoPlayer.removeAttribute('src'); // Hentikan loading video saat ditutup
    videoTitle.textContent = '';
    videoPreviewModal.style.display = 'none';
}


// ==========================================================
// INISIALISASI
// ==========================================================

// Isi dropdown dan muat file saat pertama kali dibuka
populateBucketSelector();
loadFiles();