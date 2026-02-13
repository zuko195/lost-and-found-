// Frontend JavaScript Utilities
// Place this in frontend/js/utils.js

// ==================== DARK MODE ==================== //

class DarkMode {
    constructor() {
        this.theme = localStorage.getItem('theme') || 'light';
        this.init();
    }

    init() {
        // Apply saved theme
        this.applyTheme(this.theme);
        
        // Create toggle button
        this.createToggleButton();
        
        // Listen for system theme changes
        this.watchSystemTheme();
    }

    applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        this.theme = theme;
        localStorage.setItem('theme', theme);
    }

    toggle() {
        const newTheme = this.theme === 'light' ? 'dark' : 'light';
        this.applyTheme(newTheme);
        
        // Animate the transition
        document.documentElement.style.transition = 'background-color 0.3s ease, color 0.3s ease';
        setTimeout(() => {
            document.documentElement.style.transition = '';
        }, 300);
    }

    createToggleButton() {
        const button = document.createElement('button');
        button.className = 'dark-mode-toggle';
        button.setAttribute('aria-label', 'Toggle dark mode');
        button.innerHTML = `
            <svg class="moon-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path>
            </svg>
            <svg class="sun-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path>
            </svg>
        `;
        
        button.addEventListener('click', () => this.toggle());
        document.body.appendChild(button);
    }

    watchSystemTheme() {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        mediaQuery.addEventListener('change', (e) => {
            if (!localStorage.getItem('theme')) {
                this.applyTheme(e.matches ? 'dark' : 'light');
            }
        });
    }
}

// ==================== IMAGE UPLOAD ==================== //

class ImageUploader {
    constructor(inputElement, previewElement, options = {}) {
        this.input = inputElement;
        this.preview = previewElement;
        this.options = {
            maxSize: options.maxSize || 5 * 1024 * 1024, // 5MB
            allowedTypes: options.allowedTypes || ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
            multiple: options.multiple || false,
            ...options
        };
        
        this.files = [];
        this.init();
    }

    init() {
        if (!this.input || !this.preview) return;

        // File input change
        this.input.addEventListener('change', (e) => this.handleFiles(e.target.files));

        // Drag and drop
        this.setupDragAndDrop();

        // Paste from clipboard
        this.setupPaste();
    }

    handleFiles(fileList) {
        const files = Array.from(fileList);
        
        files.forEach(file => {
            // Validate file
            if (!this.validateFile(file)) return;

            // Add to files array
            if (this.options.multiple) {
                this.files.push(file);
            } else {
                this.files = [file];
            }

            // Show preview
            this.showPreview(file);
        });

        // Trigger custom event
        this.input.dispatchEvent(new CustomEvent('filesSelected', { 
            detail: { files: this.files } 
        }));
    }

    validateFile(file) {
        // Check file type
        if (!this.options.allowedTypes.includes(file.type)) {
            this.showError(`Invalid file type. Allowed: ${this.options.allowedTypes.join(', ')}`);
            return false;
        }

        // Check file size
        if (file.size > this.options.maxSize) {
            this.showError(`File too large. Maximum size: ${this.formatBytes(this.options.maxSize)}`);
            return false;
        }

        return true;
    }

    showPreview(file) {
        const reader = new FileReader();

        reader.onload = (e) => {
            const container = document.createElement('div');
            container.className = 'image-preview-container';

            const img = document.createElement('img');
            img.src = e.target.result;
            img.className = 'image-preview';
            img.alt = file.name;

            const removeBtn = document.createElement('button');
            removeBtn.className = 'remove-image-btn';
            removeBtn.innerHTML = '&times;';
            removeBtn.type = 'button';
            removeBtn.onclick = () => this.removeImage(file, container);

            container.appendChild(img);
            container.appendChild(removeBtn);

            if (!this.options.multiple) {
                this.preview.innerHTML = '';
            }

            this.preview.appendChild(container);
        };

        reader.readAsDataURL(file);
    }

    removeImage(file, container) {
        // Remove from files array
        this.files = this.files.filter(f => f !== file);

        // Remove preview
        container.remove();

        // Update input
        this.updateFileInput();

        // Trigger custom event
        this.input.dispatchEvent(new CustomEvent('fileRemoved', { 
            detail: { file, remainingFiles: this.files } 
        }));
    }

    updateFileInput() {
        // Create new FileList (workaround since FileList is read-only)
        const dataTransfer = new DataTransfer();
        this.files.forEach(file => dataTransfer.items.add(file));
        this.input.files = dataTransfer.files;
    }

    setupDragAndDrop() {
        const dropZone = this.preview.closest('.image-upload-container') || this.preview;

        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => {
                dropZone.classList.add('dragover');
            });
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => {
                dropZone.classList.remove('dragover');
            });
        });

        dropZone.addEventListener('drop', (e) => {
            const files = e.dataTransfer.files;
            this.handleFiles(files);
        });
    }

    setupPaste() {
        document.addEventListener('paste', (e) => {
            if (document.activeElement === this.input || 
                this.preview.contains(document.activeElement)) {
                const items = e.clipboardData.items;
                
                for (let item of items) {
                    if (item.type.indexOf('image') !== -1) {
                        const file = item.getAsFile();
                        this.handleFiles([file]);
                    }
                }
            }
        });
    }

    showError(message) {
        const notification = document.createElement('div');
        notification.className = 'notification error slide-down';
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #ef4444;
            color: white;
            padding: 1rem;
            border-radius: 0.5rem;
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
            z-index: 9999;
            max-width: 300px;
        `;
        notification.textContent = message;

        document.body.appendChild(notification);

        setTimeout(() => notification.remove(), 5000);
    }

    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
    }

    reset() {
        this.files = [];
        this.preview.innerHTML = '';
        this.input.value = '';
    }

    getFiles() {
        return this.files;
    }

    getBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
            reader.readAsDataURL(file);
        });
    }
}

// ==================== IMAGE COMPRESSION ==================== //

class ImageCompressor {
    static async compress(file, options = {}) {
        const maxWidth = options.maxWidth || 1200;
        const maxHeight = options.maxHeight || 1200;
        const quality = options.quality || 0.8;

        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                const img = new Image();

                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;

                    // Calculate new dimensions
                    if (width > maxWidth) {
                        height = (height * maxWidth) / width;
                        width = maxWidth;
                    }

                    if (height > maxHeight) {
                        width = (width * maxHeight) / height;
                        height = maxHeight;
                    }

                    canvas.width = width;
                    canvas.height = height;

                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    canvas.toBlob(
                        (blob) => {
                            resolve(new File([blob], file.name, {
                                type: file.type,
                                lastModified: Date.now()
                            }));
                        },
                        file.type,
                        quality
                    );
                };

                img.onerror = reject;
                img.src = e.target.result;
            };

            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }
}

// ==================== LIGHTBOX ==================== //

class Lightbox {
    static show(imageSrc) {
        const lightbox = document.createElement('div');
        lightbox.className = 'lightbox fade-in';
        lightbox.innerHTML = `
            <button class="lightbox-close">&times;</button>
            <img src="${imageSrc}" alt="Full size image">
        `;

        const closeBtn = lightbox.querySelector('.lightbox-close');
        closeBtn.onclick = () => this.close(lightbox);

        lightbox.onclick = (e) => {
            if (e.target === lightbox) {
                this.close(lightbox);
            }
        };

        document.body.appendChild(lightbox);
        document.body.style.overflow = 'hidden';

        // ESC key to close
        const escHandler = (e) => {
            if (e.key === 'Escape') {
                this.close(lightbox);
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);
    }

    static close(lightbox) {
        lightbox.style.opacity = '0';
        setTimeout(() => {
            lightbox.remove();
            document.body.style.overflow = '';
        }, 300);
    }
}

// ==================== RESPONSIVE UTILITIES ==================== //

class ResponsiveUtils {
    static isMobile() {
        return window.innerWidth <= 640;
    }

    static isTablet() {
        return window.innerWidth > 640 && window.innerWidth <= 1024;
    }

    static isDesktop() {
        return window.innerWidth > 1024;
    }

    static isTouchDevice() {
        return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    }

    static getViewportSize() {
        return {
            width: window.innerWidth,
            height: window.innerHeight
        };
    }
}

// ==================== NOTIFICATION SYSTEM ==================== //

class Notification {
    static show(message, type = 'info', duration = 5000) {
        const colors = {
            success: { bg: '#10b981', icon: 'check-circle' },
            error: { bg: '#ef4444', icon: 'x-circle' },
            warning: { bg: '#f59e0b', icon: 'alert-circle' },
            info: { bg: '#3b82f6', icon: 'info' }
        };

        const config = colors[type] || colors.info;

        const notification = document.createElement('div');
        notification.className = 'notification slide-down';
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${config.bg};
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 0.5rem;
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
            z-index: 9999;
            max-width: 400px;
            display: flex;
            align-items: center;
            gap: 0.75rem;
        `;

        notification.innerHTML = `
            <svg style="width: 20px; height: 20px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <span>${message}</span>
        `;

        document.body.appendChild(notification);

        if (duration > 0) {
            setTimeout(() => {
                notification.style.opacity = '0';
                setTimeout(() => notification.remove(), 300);
            }, duration);
        }

        return notification;
    }
}

// ==================== INITIALIZE ON PAGE LOAD ==================== //

document.addEventListener('DOMContentLoaded', () => {
    // Initialize dark mode
    window.darkMode = new DarkMode();

    // Auto-initialize image uploaders
    document.querySelectorAll('[data-image-upload]').forEach(element => {
        const previewId = element.getAttribute('data-preview');
        const preview = document.getElementById(previewId);
        
        if (preview) {
            new ImageUploader(element, preview, {
                maxSize: 5 * 1024 * 1024,
                multiple: element.hasAttribute('multiple')
            });
        }
    });

    // Setup lightbox for all images with data-lightbox attribute
    document.querySelectorAll('[data-lightbox]').forEach(img => {
        img.style.cursor = 'pointer';
        img.addEventListener('click', () => {
            Lightbox.show(img.src);
        });
    });

    // Mobile menu toggle (if exists)
    const mobileMenuBtn = document.querySelector('[data-mobile-menu-toggle]');
    const mobileMenu = document.querySelector('[data-mobile-menu]');
    
    if (mobileMenuBtn && mobileMenu) {
        mobileMenuBtn.addEventListener('click', () => {
            mobileMenu.classList.toggle('hidden');
        });
    }
});

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        DarkMode,
        ImageUploader,
        ImageCompressor,
        Lightbox,
        ResponsiveUtils,
        Notification
    };
}
