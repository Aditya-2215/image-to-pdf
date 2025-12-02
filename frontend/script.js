/* ================= STATE ================= */
let files = [];
const MAX_FILES = 50;
const MAX_TOTAL_SIZE = 50 * 1024 * 1024;
const API_URL = "http://127.0.0.1:5000/generate";

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
const API_URL = "https://backend-82dc.onrender.com";

async function uploadImage(formData) {
    const response = await fetch(`${API_URL}/convert`, {
        method: "POST",
        body: formData
    });

    return response.blob();
}

/* ================= EVENTS ================= */
filePickerBtn.onclick = () => fileInput.click();
fileInput.onchange = (e) => processFiles([...e.target.files]);
uploadZone.onclick = () => fileInput.click();

uploadZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    uploadZone.classList.add("drag-over");
});
uploadZone.addEventListener("dragleave", () =>
    uploadZone.classList.remove("drag-over")
);
uploadZone.addEventListener("drop", (e) => {
    e.preventDefault();
    uploadZone.classList.remove("drag-over");
    processFiles([...e.dataTransfer.files]);
});

clearAllBtn.onclick = clearAll;
generatePdfBtn.onclick = generatePDF;

/* ================= LOGIC ================= */

function processFiles(newFiles) {
    let currentSize = files.reduce((t, f) => t + f.size, 0);

    for (let file of newFiles) {
        if (!file.type.startsWith("image/")) {
            showStatus("Only image files allowed.", "error");
            continue;
        }
        if (files.length >= MAX_FILES) {
            showStatus("Maximum 50 images allowed.", "error");
            break;
        }
        if (currentSize + file.size > MAX_TOTAL_SIZE) {
            showStatus("Total size exceeds 50MB.", "error");
            break;
        }

        currentSize += file.size;
        files.push(file);
    }

    updatePreview();
}

function updatePreview() {
    if (files.length === 0) {
        previewSection.style.display = "none";
        return;
    }

    previewSection.style.display = "block";
    imageCount.textContent = files.length;
    previewGrid.innerHTML = "";

    files.forEach((file, index) => {
        const div = document.createElement("div");
        div.className = "preview-item";

        div.innerHTML = `
            <img src="${URL.createObjectURL(file)}">
            <div class="preview-item-info">
                <span>#${index + 1}</span>
                <button class="btn-remove" onclick="removeFile(${index})">×</button>
            </div>
        `;

        previewGrid.appendChild(div);
    });
}

function removeFile(index) {
    files.splice(index, 1);
    updatePreview();
    showStatus("Image removed.", "info");
}

function clearAll() {
    files = [];
    updatePreview();
    showStatus("All images cleared.", "info");
}

async function generatePDF() {
    if (files.length === 0) {
        showStatus("Add at least one image!", "error");
        return;
    }

    generatePdfBtn.disabled = true;
    const loader = generatePdfBtn.querySelector(".btn-loader");
    const text = generatePdfBtn.querySelector(".btn-text");
    loader.style.display = "block";
    text.style.display = "none";

    try {
        const formData = new FormData();
        files.forEach(f => formData.append("images", f));

        const res = await fetch(API_URL, {
            method: "POST",
            body: formData
        });

        if (!res.ok) throw new Error("Server error occurred.");

        const blob = await res.blob();
        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = "converted.pdf";
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);

        showStatus("PDF downloaded successfully.", "success");
    } catch (err) {
        showStatus(err.message, "error");
    }

    generatePdfBtn.disabled = false;
    loader.style.display = "none";
    text.style.display = "block";
}

function showStatus(msg, type) {
    statusMessage.innerText = msg;
    statusMessage.className = "status-message show " + type;

    setTimeout(() => {
        statusMessage.classList.remove("show");
    }, 3000);
}

