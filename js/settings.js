// FieldVoice Pro - Settings Page Logic
// Inspector profile management and PWA refresh functionality

// ============ STATE ============
// Store the current profile ID for updates
let currentProfileId = null;

// ============ PROFILE MANAGEMENT ============
async function loadSettings() {
    // DEBUG: Log device ID at start
    const deviceId = getDeviceId();
    console.log('[loadSettings] This device ID:', deviceId);

    // Step 1: Load from localStorage first (local-first)
    const localProfile = getStorageItem(STORAGE_KEYS.USER_PROFILE);

    // DEBUG: Log localStorage state
    console.log('[loadSettings] localStorage profile:', localProfile);
    console.log('[loadSettings] localStorage user_id:', getStorageItem(STORAGE_KEYS.USER_ID));

    if (localProfile) {
        currentProfileId = localProfile.id || null;
        document.getElementById('inspectorName').value = localProfile.fullName || '';
        document.getElementById('title').value = localProfile.title || '';
        document.getElementById('company').value = localProfile.company || '';
        document.getElementById('email').value = localProfile.email || '';
        document.getElementById('phone').value = localProfile.phone || '';
    }

    updateSignaturePreview();

    // Step 2: Try to fetch from Supabase to sync any cloud changes
    try {
        const { data, error } = await supabaseClient
            .from('user_profiles')
            .select('*')
            .eq('device_id', deviceId)
            .maybeSingle();  // Returns null if not found, doesn't throw error

        // DEBUG: Log Supabase query result
        console.log('[loadSettings] Supabase result for this device:', data);
        console.log('[loadSettings] Error:', error);

        if (error && error.code !== 'PGRST116') {
            // PGRST116 = no rows returned, which is fine for new users
            console.error('Failed to load settings from Supabase:', error);
            // Don't show error toast - we already have local data
            return;
        }

        if (data) {
            // Convert to JS format
            const cloudProfile = fromSupabaseUserProfile(data);

            // Check if cloud data is newer than local data
            const cloudUpdatedAt = cloudProfile.updatedAt ? new Date(cloudProfile.updatedAt).getTime() : 0;
            const localUpdatedAt = localProfile?.updatedAt ? new Date(localProfile.updatedAt).getTime() : 0;

            if (cloudUpdatedAt > localUpdatedAt) {
                // Cloud data is newer - update form and localStorage
                currentProfileId = cloudProfile.id;
                document.getElementById('inspectorName').value = cloudProfile.fullName || '';
                document.getElementById('title').value = cloudProfile.title || '';
                document.getElementById('company').value = cloudProfile.company || '';
                document.getElementById('email').value = cloudProfile.email || '';
                document.getElementById('phone').value = cloudProfile.phone || '';

                // Update localStorage with cloud data
                setStorageItem(STORAGE_KEYS.USER_PROFILE, cloudProfile);

                // Also store the user_id for use by other pages
                if (cloudProfile.id) {
                    setStorageItem(STORAGE_KEYS.USER_ID, cloudProfile.id);
                }

                updateSignaturePreview();
            }
        }
    } catch (e) {
        console.error('Failed to sync settings from Supabase:', e);
        // Don't show error - we already have local data
    }
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
