// FieldVoice Pro - Settings Page Logic
// Inspector profile management and PWA refresh functionality

// ============ STATE ============
// Store the current profile ID for updates
let currentProfileId = null;

// ============ PROFILE MANAGEMENT ============
async function loadSettings() {
    try {
        const { data, error } = await supabaseClient
            .from('user_profiles')
            .select('*')
            .limit(1)
            .single();

        if (error && error.code !== 'PGRST116') {
            // PGRST116 = no rows returned, which is fine for new users
            console.error('Failed to load settings:', error);
            showToast('Failed to load profile', 'error');
        }

        if (data) {
            currentProfileId = data.id;
            document.getElementById('inspectorName').value = data.full_name || '';
            document.getElementById('title').value = data.title || '';
            document.getElementById('company').value = data.company || '';
            document.getElementById('email').value = data.email || '';
            document.getElementById('phone').value = data.phone || '';
        }
    } catch (e) {
        console.error('Failed to load settings:', e);
        showToast('Failed to load profile', 'error');
    }
    updateSignaturePreview();
}

async function saveSettings() {
    const profileData = {
        full_name: document.getElementById('inspectorName').value.trim(),
        title: document.getElementById('title').value.trim(),
        company: document.getElementById('company').value.trim(),
        email: document.getElementById('email').value.trim() || null,
        phone: document.getElementById('phone').value.trim() || null,
        updated_at: new Date().toISOString()
    };

    try {
        let result;
        if (currentProfileId) {
            // Update existing profile
            result = await supabaseClient
                .from('user_profiles')
                .update(profileData)
                .eq('id', currentProfileId)
                .select()
                .single();
        } else {
            // Insert new profile
            result = await supabaseClient
                .from('user_profiles')
                .insert(profileData)
                .select()
                .single();
        }

        if (result.error) {
            console.error('Failed to save settings:', result.error);
            showToast('Failed to save profile', 'error');
            return;
        }

        // Store the profile ID for future updates
        if (result.data) {
            currentProfileId = result.data.id;
        }

        showToast('Profile saved successfully');
        updateSignaturePreview();
    } catch (e) {
        console.error('Failed to save settings:', e);
        showToast('Failed to save profile', 'error');
    }
}

function updateSignaturePreview() {
    const name = document.getElementById('inspectorName').value.trim();
    const title = document.getElementById('title').value.trim();
    const company = document.getElementById('company').value.trim();

    let signature = '--';
    if (name) {
        signature = name;
        if (title) {
            signature += `, ${title}`;
        }
        if (company) {
            signature += ` (${company})`;
        }
    }

    document.getElementById('signaturePreview').textContent = signature;
}

// Note: This function is kept for compatibility but now fetches from Supabase
async function getFormattedSignature() {
    try {
        const { data, error } = await supabaseClient
            .from('user_profiles')
            .select('full_name, title, company')
            .limit(1)
            .single();

        if (error || !data) return '';

        let signature = data.full_name || '';
        if (data.title) {
            signature += `, ${data.title}`;
        }
        if (data.company) {
            signature += ` (${data.company})`;
        }
        return signature;
    } catch (e) {
        console.error('Failed to get signature:', e);
        return '';
    }
}

// ============ PWA REFRESH FUNCTIONS ============
function refreshApp() {
    console.log('[PWA Refresh] Opening refresh confirmation modal');
    const modal = document.getElementById('refresh-modal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
}

function hideRefreshModal() {
    console.log('[PWA Refresh] Closing refresh modal');
    const modal = document.getElementById('refresh-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

async function executeRefresh() {
    console.log('[PWA Refresh] Starting app refresh...');

    // Hide modal first
    hideRefreshModal();

    // Show toast notification
    showToast('Refreshing app...', 'warning');

    try {
        // IMPORTANT: Delete caches BEFORE unregistering service workers (order matters!)
        if ('caches' in window) {
            console.log('[PWA Refresh] Deleting all caches...');
            const cacheNames = await caches.keys();
            await Promise.all(cacheNames.map(cacheName => {
                console.log('[PWA Refresh] Deleting cache:', cacheName);
                return caches.delete(cacheName);
            }));
            console.log('[PWA Refresh] All caches deleted:', cacheNames);
        }

        // Unregister all service workers AFTER caches are deleted
        if ('serviceWorker' in navigator) {
            console.log('[PWA Refresh] Unregistering service workers...');
            const registrations = await navigator.serviceWorker.getRegistrations();
            await Promise.all(registrations.map(registration => {
                console.log('[PWA Refresh] Unregistering SW:', registration.scope);
                return registration.unregister();
            }));
            console.log('[PWA Refresh] All service workers unregistered:', registrations.length);
        }

        console.log('[PWA Refresh] Reloading page...');
        // Note: localStorage is preserved - user data is safe
        // Use cache-busting redirect instead of reload() for iOS PWA compatibility
        window.location.href = window.location.pathname + '?refresh=' + Date.now();

    } catch (error) {
        console.error('[PWA Refresh] Error during refresh:', error);
        showToast('Error refreshing. Try removing and re-adding the app.', 'error');
    }
}

// ============ INIT ============
document.addEventListener('DOMContentLoaded', () => {
    // Update preview on input change
    document.getElementById('inspectorName').addEventListener('input', updateSignaturePreview);
    document.getElementById('title').addEventListener('input', updateSignaturePreview);
    document.getElementById('company').addEventListener('input', updateSignaturePreview);

    // Load settings from Supabase
    loadSettings();
});

// ============ EXPOSE TO WINDOW FOR ONCLICK HANDLERS ============
window.saveSettings = saveSettings;
window.refreshApp = refreshApp;
window.hideRefreshModal = hideRefreshModal;
window.executeRefresh = executeRefresh;
