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
    loadUserFiles(userId);
}

async function loadUserFiles(userId) {
    try {
        const response = await fetch(`/api/files?user_id=${userId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.result) {
                data.result.forEach(file => {
                    createFileItem({
                        name: file.file_name,
                        size: file.file_size,
                        id: file.file_id
                    }, true);
                });
            }
        }
    } catch (error) {
        console.error('Error loading files:', error);
    }
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
        formData.append('document', file);
        formData.append('chat_id', tg.initDataUnsafe.user.id);
        
        const response = await fetch(`${API_BASE_URL}/sendDocument`, {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (!response.ok) throw new Error(data.description || 'Upload failed');
        
        // Store file ID from response
        fileItem.dataset.fileId = data.result.document.file_id;
        updateFileStatus(fileItem, 'success');
    } catch (error) {
        updateFileStatus(fileItem, 'error', error.message);
    }
}

function createFileItem(file, isExisting = false) {
    const item = document.createElement('div');
    item.className = 'file-item';
    
    const size = isExisting ? formatFileSize(file.size) : formatFileSize(file.size);
    const name = isExisting ? file.name : file.name;
    
    item.innerHTML = `
        <div class="file-icon">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                      d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
            </svg>
        </div>
        <div class="file-info">
            <div class="file-name">${name}</div>
            <div class="file-size">${size}</div>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${isExisting ? '100%' : '0%'}"></div>
            </div>
        </div>
        <div class="file-actions">
            <button class="btn btn-primary" onclick="downloadFile(this)">Download</button>
            <button class="btn btn-danger" onclick="deleteFile(this)">Delete</button>
        </div>
    `;
    
    if (isExisting) {
        item.dataset.fileId = file.id;
        const progressBar = item.querySelector('.progress-fill');
        progressBar.style.backgroundColor = '#10b981';
    }
    
    fileList.appendChild(item);
    return item;
}

async function downloadFile(button) {
    const fileItem = button.closest('.file-item');
    const fileId = fileItem.dataset.fileId;
    
    if (!fileId) {
        showError('File ID not found');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/getFile`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                file_id: fileId
            })
        });
        
        const data = await response.json();
        
        if (!response.ok) throw new Error(data.description || 'Download failed');
        
        // Open file in new tab
        window.open(`https://api.telegram.org/file/bot${BOT_TOKEN}/${data.result.file_path}`);
    } catch (error) {
        showError(error.message);
    }
}

async function deleteFile(button) {
    const fileItem = button.closest('.file-item');
    const fileId = fileItem.dataset.fileId;
    
    if (!fileId) {
        fileItem.remove();
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/deleteMessage`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                chat_id: tg.initDataUnsafe.user.id,
                message_id: fileId
            })
        });
        
        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.description || 'Delete failed');
        }
        
        fileItem.remove();
    } catch (error) {
        showError(error.message);
    }
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

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function showError(message) {
    tg.showAlert(message);
}

// Main button handler
tg.MainButton.setText('Upload Files').show().onClick(() => {
    fileInput.click();
}); 