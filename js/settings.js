// FieldVoice Pro - Settings Page Logic
// Inspector profile management and PWA refresh functionality

// ============ STATE ============
// Store the current profile ID for updates
let currentProfileId = null;

// ============ PROFILE MANAGEMENT ============
async function loadSettings() {
    // Load user settings via data-layer (handles localStorage + Supabase fallback)
    const profile = await window.dataLayer.loadUserSettings();

    if (profile) {
        currentProfileId = profile.id || null;
        // Populate form fields
        document.getElementById('inspectorName').value = profile.fullName || '';
        document.getElementById('title').value = profile.title || '';
        document.getElementById('company').value = profile.company || '';
        document.getElementById('email').value = profile.email || '';
        document.getElementById('phone').value = profile.phone || '';
    }

    updateSignaturePreview();
}

async function saveSettings() {
    // Step 1: Get device_id (generates if not exists)
    const deviceId = getDeviceId();

    // DEBUG: Log device and localStorage state before building profile
    console.log('[saveSettings] This device ID:', deviceId);
    console.log('[saveSettings] Current user_id in localStorage:', getStorageItem(STORAGE_KEYS.USER_ID));
    console.log('[saveSettings] currentProfileId variable:', currentProfileId);

    // Step 2: Get user_id (only if we have one for THIS device)
    // Do NOT fall back to currentProfileId — it might be from another device
    // Do NOT generate a new UUID — let Supabase generate it
    let userId = getStorageItem(STORAGE_KEYS.USER_ID);
    console.log('[saveSettings] userId from localStorage:', userId);

    // Step 3: Build profile object with all fields
    const profile = {
        // Only include id if we have one for THIS device
        ...(userId && { id: userId }),
        deviceId: deviceId,
        fullName: document.getElementById('inspectorName').value.trim(),
        title: document.getElementById('title').value.trim(),
        company: document.getElementById('company').value.trim(),
        email: document.getElementById('email').value.trim() || '',
        phone: document.getElementById('phone').value.trim() || '',
        updatedAt: new Date().toISOString()
    };

    // Step 4: Save to localStorage first (local-first)
    setStorageItem(STORAGE_KEYS.USER_PROFILE, profile);

    // Step 5: Only store user_id if we have one (will be set after Supabase upsert for new devices)
    if (userId) {
        setStorageItem(STORAGE_KEYS.USER_ID, userId);
        currentProfileId = userId;
    }

    updateSignaturePreview();

    // Step 6: Try to upsert to Supabase
    try {
        // DEBUG: Log the profile object being built
        console.log('[saveSettings] Profile object:', JSON.stringify(profile, null, 2));

        const supabaseData = toSupabaseUserProfile(profile);

        // DEBUG: Log the converted Supabase payload
        console.log('[saveSettings] Supabase payload:', JSON.stringify(supabaseData, null, 2));
        console.log('[saveSettings] Payload has id?', !!supabaseData?.id, 'id value:', supabaseData?.id);

        const result = await supabaseClient
            .from('user_profiles')
            .upsert(supabaseData, { onConflict: 'device_id' })
            .select()
            .single();

        // DEBUG: Log the full Supabase response
        console.log('[saveSettings] Supabase result:', JSON.stringify(result, null, 2));
        console.log('[saveSettings] Supabase data:', result.data);
        console.log('[saveSettings] Supabase error:', result.error);
        console.log('[saveSettings] Supabase status:', result.status);

        if (result.error) {
            console.error('[saveSettings] Failed to save settings to Supabase:', result.error);
            console.error('[saveSettings] Error code:', result.error.code);
            console.error('[saveSettings] Error message:', result.error.message);
            console.error('[saveSettings] Error details:', result.error.details);
            console.error('[saveSettings] Error hint:', result.error.hint);
            showToast('Saved locally. Save again when online to backup.', 'warning');
            return;
        }

        // Step 7: Store the Supabase-returned id (especially important for new devices)
        if (result.data && result.data.id) {
            const returnedId = result.data.id;
            setStorageItem(STORAGE_KEYS.USER_ID, returnedId);
            currentProfileId = returnedId;
            console.log('[saveSettings] Stored user_id from Supabase:', returnedId);
        }

        // Step 8: Success - show confirmation
        console.log('[saveSettings] SUCCESS - Profile saved to Supabase');
        showToast('Profile saved');
    } catch (e) {
        console.error('[saveSettings] EXCEPTION caught:', e);
        console.error('[saveSettings] Exception name:', e.name);
        console.error('[saveSettings] Exception message:', e.message);
        console.error('[saveSettings] Exception stack:', e.stack);
        // Step 8: Offline or error - inform user
        showToast('Saved locally. Save again when online to backup.', 'warning');
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
        const deviceId = getDeviceId();
        const { data, error } = await supabaseClient
            .from('user_profiles')
            .select('full_name, title, company')
            .eq('device_id', deviceId)
            .maybeSingle();

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

// ============ NUCLEAR RESET ============
async function resetAllData() {
    // Show confirmation dialog
    const confirmed = confirm(
        'This will delete ALL local data including your profile, projects, and drafts. This cannot be undone. Continue?'
    );

    if (!confirmed) {
        return;
    }

    console.log('[Nuclear Reset] Starting complete data reset...');

    // Update button to show resetting state
    const resetBtn = document.getElementById('reset-all-btn');
    if (resetBtn) {
        resetBtn.disabled = true;
        resetBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Resetting...';
    }

    try {
        // Step 1: Clear localStorage
        console.log('[Nuclear Reset] Clearing localStorage...');
        localStorage.clear();

        // Step 2: Clear sessionStorage
        console.log('[Nuclear Reset] Clearing sessionStorage...');
        sessionStorage.clear();

        // Step 3: Delete IndexedDB database
        console.log('[Nuclear Reset] Deleting IndexedDB database...');
        indexedDB.deleteDatabase('fieldvoice-pro');

        // Step 4: Delete all caches
        if ('caches' in window) {
            console.log('[Nuclear Reset] Deleting all caches...');
            const cacheNames = await caches.keys();
            await Promise.all(cacheNames.map(name => caches.delete(name)));
            console.log('[Nuclear Reset] Deleted caches:', cacheNames);
        }

        // Step 5: Unregister all service workers
        if ('serviceWorker' in navigator) {
            console.log('[Nuclear Reset] Unregistering service workers...');
            const registrations = await navigator.serviceWorker.getRegistrations();
            await Promise.all(registrations.map(reg => reg.unregister()));
            console.log('[Nuclear Reset] Unregistered service workers:', registrations.length);
        }

        console.log('[Nuclear Reset] All local data cleared. Redirecting to index...');

        // Hard reload to index.html
        window.location.href = '/index.html';

    } catch (error) {
        console.error('[Nuclear Reset] Error during reset:', error);
        // Even if some steps fail, try to redirect
        window.location.href = '/index.html';
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
window.resetAllData = resetAllData;
