/* ================= STATE ================= */
let files = [];
const MAX_FILES = 50;
const MAX_TOTAL_SIZE = 50 * 1024 * 1024;

const API_URL = "https://backend-pdf-zzjl.onrender.com/generate";

/* ================= ELEMENTS ================= */
const uploadZone = document.getElementById("uploadZone");
const fileInput = document.getElementById("fileInput");
const filePickerBtn = document.getElementById("filePickerBtn");
const previewSection = document.getElementById("previewSection");
const previewGrid = document.getElementById("previewGrid");
const imageCount = document.getElementById("imageCount");
const clearAllBtn = document.getElementById("clearAllBtn");
const generatePdfBtn = document.getElementById("generatePdfBtn");
const statusMessage = document.getElementById("statusMessage");

/* ================= PERFORMANCE UTILITIES ================= */

// Debounce function to prevent excessive updates
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Request Animation Frame wrapper for smooth UI updates
function smoothUpdate(callback) {
    requestAnimationFrame(() => {
        callback();
    });
}

// Object URL cache to prevent memory leaks
const urlCache = new Map();

function createObjectURL(file) {
    const key = `${file.name}-${file.size}-${file.lastModified}`;
    if (!urlCache.has(key)) {
        urlCache.set(key, URL.createObjectURL(file));
    }
    return urlCache.get(key);
}

function clearURLCache() {
    urlCache.forEach(url => URL.revokeObjectURL(url));
    urlCache.clear();
}

/* ================= EVENTS ================= */
filePickerBtn.onclick = () => fileInput.click();
fileInput.onchange = (e) => processFiles([...e.target.files]);
uploadZone.onclick = (e) => {
    // Prevent click when clicking on child elements
    if (e.target === uploadZone) {
        fileInput.click();
    }
};

uploadZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    uploadZone.classList.add("drag-over");
});

uploadZone.addEventListener("dragleave", (e) => {
    // Only remove if leaving the upload zone itself
    if (e.target === uploadZone) {
        uploadZone.classList.remove("drag-over");
    }
});

uploadZone.addEventListener("drop", (e) => {
    e.preventDefault();
    uploadZone.classList.remove("drag-over");
    processFiles([...e.dataTransfer.files]);
});

clearAllBtn.onclick = clearAll;
generatePdfBtn.onclick = generatePDF;

/* ================= OPTIMIZED LOGIC ================= */

function processFiles(newFiles) {
    // Filter and validate files first
    const validFiles = [];
    let currentSize = files.reduce((t, f) => t + f.size, 0);
    let hasError = false;

    for (let file of newFiles) {
        // Check file type
        if (!file.type.startsWith("image/")) {
            if (!hasError) {
                showStatus("Only image files allowed.", "error");
                hasError = true;
            }
            continue;
        }

        // Check max files
        if (files.length + validFiles.length >= MAX_FILES) {
            if (!hasError) {
                showStatus("Maximum 50 images allowed.", "error");
                hasError = true;
            }
            break;
        }

        // Check total size
        if (currentSize + file.size > MAX_TOTAL_SIZE) {
            if (!hasError) {
                showStatus("Total size exceeds 50MB.", "error");
                hasError = true;
            }
            break;
        }

        currentSize += file.size;
        validFiles.push(file);
    }

    // Batch add files
    if (validFiles.length > 0) {
        files.push(...validFiles);
        updatePreviewOptimized();
    }

    // Reset file input
    fileInput.value = '';
}

// Optimized preview update with batching
function updatePreviewOptimized() {
    smoothUpdate(() => {
        if (files.length === 0) {
            previewSection.style.display = "none";
            clearURLCache();
            return;
        }

        previewSection.style.display = "block";
        imageCount.textContent = files.length;

        // Use DocumentFragment for batch DOM insertion
        const fragment = document.createDocumentFragment();

        files.forEach((file, index) => {
            const div = document.createElement("div");
            div.className = "preview-item";

            const imgUrl = createObjectURL(file);
            
            div.innerHTML = `
                <img src="${imgUrl}" alt="Preview ${index + 1}" loading="lazy">
                <div class="preview-item-info">
                    <span>#${index + 1}</span>
                    <button class="btn-remove" data-index="${index}" aria-label="Remove image">×</button>
                </div>
            `;

            // Add load event for smooth image appearance
            const img = div.querySelector('img');
            img.onload = function() {
                this.classList.add('loaded');
            };

            fragment.appendChild(div);
        });

        // Clear and append in one operation
        previewGrid.innerHTML = "";
        previewGrid.appendChild(fragment);

        // Event delegation for remove buttons
        attachRemoveListeners();
    });
}

// Event delegation for better performance
function attachRemoveListeners() {
    previewGrid.onclick = (e) => {
        if (e.target.classList.contains('btn-remove')) {
            const index = parseInt(e.target.dataset.index);
            removeFile(index);
        }
    };
}

function removeFile(index) {
    smoothUpdate(() => {
        files.splice(index, 1);
        updatePreviewOptimized();
        showStatus("Image removed.", "info");
    });
}

function clearAll() {
    smoothUpdate(() => {
        files = [];
        updatePreviewOptimized();
        showStatus("All images cleared.", "info");
    });
}

async function generatePDF() {
    if (files.length === 0) {
        showStatus("Add at least one image!", "error");
        return;
    }

    // Disable button and show loader
    generatePdfBtn.disabled = true;
    const loader = generatePdfBtn.querySelector(".btn-loader");
    const text = generatePdfBtn.querySelector(".btn-text");
    
    smoothUpdate(() => {
        if (loader) loader.style.display = "block";
        if (text) text.style.display = "none";
    });

    try {
        const formData = new FormData();
        
        // Batch append files
        files.forEach(f => formData.append("images", f));

        const res = await fetch(API_URL, {
            method: "POST",
            body: formData
        });

        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(errorText || "Server error occurred.");
        }

        const blob = await res.blob();
        
        // Use modern download approach
        downloadBlob(blob, "converted.pdf");

        showStatus("PDF downloaded successfully.", "success");
        
    } catch (err) {
        console.error("PDF generation error:", err);
        showStatus(err.message || "Failed to generate PDF.", "error");
    } finally {
        // Re-enable button
        smoothUpdate(() => {
            generatePdfBtn.disabled = false;
            if (loader) loader.style.display = "none";
            if (text) text.style.display = "block";
        });
    }
}

// Optimized download function
function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.style.display = "none";
    a.href = url;
    a.download = filename;
    
    document.body.appendChild(a);
    a.click();
    
    // Cleanup
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 100);
}

// Optimized status message with auto-hide
let statusTimeout;
function showStatus(msg, type) {
    smoothUpdate(() => {
        statusMessage.innerText = msg;
        statusMessage.className = "status-message show " + type;
    });

    // Clear existing timeout
    if (statusTimeout) {
        clearTimeout(statusTimeout);
    }

    // Auto-hide after 3 seconds
    statusTimeout = setTimeout(() => {
        smoothUpdate(() => {
            statusMessage.classList.remove("show");
        });
    }, 3000);
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    clearURLCache();
});

// Prevent memory leaks from drag events
window.addEventListener('dragover', (e) => {
    e.preventDefault();
}, false);

window.addEventListener('drop', (e) => {
    e.preventDefault();
}, false);