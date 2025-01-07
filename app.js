// Initialize Telegram WebApp
const tg = window.Telegram.WebApp;
tg.expand();

// Elements
const fileInput = document.getElementById('fileInput');
const dropZone = document.querySelector('.border-dashed');
const fileList = document.getElementById('fileList');

// File storage
let files = [];

// Initialize from bot data if available
if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
    const userId = tg.initDataUnsafe.user.id;
    // TODO: Fetch user's files from bot
}

// Drag and drop handlers
dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
});

dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('drag-over');
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    handleFiles(e.dataTransfer.files);
});

// File input handler
fileInput.addEventListener('change', (e) => {
    handleFiles(e.target.files);
});

function handleFiles(fileList) {
    for (const file of fileList) {
        if (file.size > 2 * 1024 * 1024 * 1024) { // 2GB limit
            showError(`File ${file.name} exceeds 2GB limit`);
            continue;
        }
        uploadFile(file);
    }
}

async function uploadFile(file) {
    const fileItem = createFileItem(file);
    files.push({ file, element: fileItem });
    
    try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('chat_id', tg.initDataUnsafe.user.id);
        
        const response = await fetch('YOUR_BOT_API_ENDPOINT', {
            method: 'POST',
            body: formData,
            headers: {
                'Authorization': `Bearer ${tg.initData}`
            }
        });
        
        if (!response.ok) throw new Error('Upload failed');
        
        updateFileStatus(fileItem, 'success');
    } catch (error) {
        updateFileStatus(fileItem, 'error', error.message);
    }
}

function createFileItem(file) {
    const item = document.createElement('div');
    item.className = 'file-item';
    
    const size = formatFileSize(file.size);
    
    item.innerHTML = `
        <div class="file-icon">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                      d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
            </svg>
        </div>
        <div class="file-info">
            <div class="file-name">${file.name}</div>
            <div class="file-size">${size}</div>
            <div class="progress-bar">
                <div class="progress-fill" style="width: 0%"></div>
            </div>
        </div>
        <div class="file-actions">
            <button class="btn btn-danger" onclick="deleteFile(this)">Delete</button>
        </div>
    `;
    
    fileList.appendChild(item);
    return item;
}

function updateFileStatus(fileItem, status, message = '') {
    const progressBar = fileItem.querySelector('.progress-fill');
    
    if (status === 'success') {
        progressBar.style.width = '100%';
        progressBar.style.backgroundColor = '#10b981';
    } else if (status === 'error') {
        progressBar.style.width = '100%';
        progressBar.style.backgroundColor = '#ef4444';
        showError(message);
    }
}

function deleteFile(button) {
    const fileItem = button.closest('.file-item');
    const index = files.findIndex(f => f.element === fileItem);
    
    if (index !== -1) {
        files.splice(index, 1);
        fileItem.remove();
    }
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function showError(message) {
    // You can customize this to show errors in a better way
    tg.showAlert(message);
}

// Main button handler
tg.MainButton.setText('Upload Files').show().onClick(() => {
    fileInput.click();
}); 