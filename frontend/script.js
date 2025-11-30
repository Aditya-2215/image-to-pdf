// Global state
let files = [];
let draggedIndex = null;

// DOM elements
const uploadZone = document.getElementById('uploadZone');
const fileInput = document.getElementById('fileInput');
const filePickerBtn = document.getElementById('filePickerBtn');
const previewSection = document.getElementById('previewSection');
const previewGrid = document.getElementById('previewGrid');
const imageCount = document.getElementById('imageCount');
const clearAllBtn = document.getElementById('clearAllBtn');
const generatePdfBtn = document.getElementById('generatePdfBtn');
const statusMessage = document.getElementById('statusMessage');

// Constants
const MAX_FILES = 50;
const MAX_TOTAL_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/bmp', 'image/tiff'];
const API_URL = 'http://127.0.0.1:5000/generate';

// Initialize
filePickerBtn.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', handleFileSelect);
clearAllBtn.addEventListener('click', clearAll);
generatePdfBtn.addEventListener('click', generatePdf);

// Drag and drop handlers
uploadZone.addEventListener('dragover', handleDragOver);
uploadZone.addEventListener('dragleave', handleDragLeave);
uploadZone.addEventListener('drop', handleDrop);
uploadZone.addEventListener('click', () => fileInput.click());

// Drag and drop functions
function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    uploadZone.classList.add('drag-over');
}

function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    uploadZone.classList.remove('drag-over');
}

function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    uploadZone.classList.remove('drag-over');
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    processFiles(droppedFiles);
}

function handleFileSelect(e) {
    const selectedFiles = Array.from(e.target.files);
    processFiles(selectedFiles);
    fileInput.value = ''; // Reset input
}

// Process and validate files
function processFiles(newFiles) {
    const validFiles = [];
    const errors = [];

    for (const file of newFiles) {
        // Check file type
        if (!ALLOWED_TYPES.includes(file.type)) {
            errors.push(`${file.name}: Invalid file type. Only images are allowed.`);
            continue;
        }

        // Check total file count
        if (files.length + validFiles.length >= MAX_FILES) {
            errors.push(`Maximum ${MAX_FILES} files allowed.`);
            break;
        }

        // Check total size
        const currentTotalSize = files.reduce((sum, f) => sum + f.size, 0);
        const newTotalSize = validFiles.reduce((sum, f) => sum + f.size, 0);
        if (currentTotalSize + newTotalSize + file.size > MAX_TOTAL_SIZE) {
            errors.push(`${file.name}: Total size exceeds ${MAX_TOTAL_SIZE / (1024 * 1024)}MB limit.`);
            continue;
        }

        validFiles.push(file);
    }

    // Add valid files
    if (validFiles.length > 0) {
        files.push(...validFiles);
        updatePreview();
        showStatus(`Added ${validFiles.length} image(s)`, 'success');
    }

    // Show errors
    if (errors.length > 0) {
        showStatus(errors.join(' '), 'error');
    }
}

// Update preview
function updatePreview() {
    if (files.length === 0) {
        previewSection.style.display = 'none';
        return;
    }

    previewSection.style.display = 'block';
    imageCount.textContent = files.length;
    previewGrid.innerHTML = '';

    files.forEach((file, index) => {
        const previewItem = createPreviewItem(file, index);
        previewGrid.appendChild(previewItem);
    });
}

// Create preview item
function createPreviewItem(file, index) {
    const item = document.createElement('div');
    item.className = 'preview-item';
    item.draggable = true;
    item.dataset.index = index;

    const img = document.createElement('img');
    img.src = URL.createObjectURL(file);
    img.alt = file.name;

    const info = document.createElement('div');
    info.className = 'preview-item-info';

    const indexSpan = document.createElement('span');
    indexSpan.className = 'preview-item-index';
    indexSpan.textContent = `#${index + 1}`;

    const actions = document.createElement('div');
    actions.className = 'preview-item-actions';

    const dragBtn = document.createElement('button');
    dragBtn.className = 'btn-icon btn-drag';
    dragBtn.innerHTML = '⋮⋮';
    dragBtn.title = 'Drag to reorder';
    dragBtn.addEventListener('mousedown', (e) => e.stopPropagation());

    const removeBtn = document.createElement('button');
    removeBtn.className = 'btn-icon btn-remove';
    removeBtn.innerHTML = '×';
    removeBtn.title = 'Remove';
    removeBtn.addEventListener('click', () => removeFile(index));

    actions.appendChild(dragBtn);
    actions.appendChild(removeBtn);
    info.appendChild(indexSpan);
    info.appendChild(actions);

    item.appendChild(img);
    item.appendChild(info);

    // Drag and drop for reordering
    item.addEventListener('dragstart', (e) => {
        draggedIndex = index;
        item.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
    });

    item.addEventListener('dragend', () => {
        item.classList.remove('dragging');
        draggedIndex = null;
    });

    item.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    });

    item.addEventListener('drop', (e) => {
        e.preventDefault();
        if (draggedIndex !== null && draggedIndex !== index) {
            reorderFiles(draggedIndex, index);
        }
    });

    return item;
}

// Remove file
function removeFile(index) {
    files.splice(index, 1);
    updatePreview();
    showStatus('Image removed', 'info');
}

// Reorder files
function reorderFiles(fromIndex, toIndex) {
    const [moved] = files.splice(fromIndex, 1);
    files.splice(toIndex, 0, moved);
    updatePreview();
}

// Clear all files
function clearAll() {
    if (files.length === 0) return;
    
    if (confirm(`Remove all ${files.length} image(s)?`)) {
        files.forEach(file => URL.revokeObjectURL(file));
        files = [];
        updatePreview();
        showStatus('All images cleared', 'info');
    }
}

// Generate PDF
async function generatePdf() {
    if (files.length === 0) {
        showStatus('Please add at least one image', 'error');
        return;
    }

    // Disable button and show loading
    generatePdfBtn.disabled = true;
    const btnText = generatePdfBtn.querySelector('.btn-text');
    const btnLoader = generatePdfBtn.querySelector('.btn-loader');
    btnText.style.display = 'none';
    btnLoader.style.display = 'block';

    try {
        // Create FormData
        const formData = new FormData();
        files.forEach((file, index) => {
            formData.append('images', file);
        });

        // Send request
        const response = await fetch(API_URL, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error occurred' }));
            throw new Error(errorData.error || `Server error: ${response.status}`);
        }

        // Get PDF blob
        const blob = await response.blob();
        
        // Create download link
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'photos.pdf';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        showStatus('PDF generated and downloaded successfully!', 'success');
    } catch (error) {
        console.error('Error generating PDF:', error);
        showStatus(`Error: ${error.message}`, 'error');
    } finally {
        // Re-enable button
        generatePdfBtn.disabled = false;
        btnText.style.display = 'block';
        btnLoader.style.display = 'none';
    }
}

// Show status message
function showStatus(message, type = 'info') {
    statusMessage.textContent = message;
    statusMessage.className = `status-message show ${type}`;
    
    // Auto-hide after 5 seconds for success/info, 10 seconds for errors
    const timeout = type === 'error' ? 10000 : 5000;
    setTimeout(() => {
        statusMessage.classList.remove('show');
    }, timeout);
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    files.forEach(file => URL.revokeObjectURL(file));
});

