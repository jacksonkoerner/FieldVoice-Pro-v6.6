/**
 * FieldVoice Pro v6.6 — Data Layer
 *
 * Single source of truth for all data operations.
 * All pages import from here instead of implementing their own loading logic.
 *
 * Storage Strategy:
 * - localStorage: Small flags only (active_project_id, device_id, user_id, permissions)
 * - IndexedDB: All cached data (projects, reports, photos, userProfile)
 * - Supabase: Source of truth, sync target
 *
 * Pattern: IndexedDB-first, Supabase-fallback, cache on fetch
 */

(function() {
    'use strict';

    // ========================================
    // PROJECTS
    // ========================================

    /**
     * Load all projects (IndexedDB-first, Supabase-fallback)
     * @returns {Promise<Array>} Array of project objects (JS format, camelCase)
     */
    async function loadProjects() {
        const userId = getStorageItem(STORAGE_KEYS.USER_ID);

        // 1. Try IndexedDB first
        try {
            const allLocalProjects = await window.idb.getAllProjects();
            const localProjects = userId
                ? allLocalProjects.filter(p => (p.userId || p.user_id) === userId)
                : allLocalProjects;

            if (localProjects && localProjects.length > 0) {
                console.log('[DATA] Loaded projects from IndexedDB:', localProjects.length);
                // Convert to JS format in case raw Supabase data was cached
                return localProjects.map(p => normalizeProject(p));
            }
        } catch (e) {
            console.warn('[DATA] IndexedDB read failed:', e);
        }

        // 2. Check if offline
        if (!navigator.onLine) {
            console.log('[DATA] Offline, no cached projects');
            return [];
        }

        // 3. Fetch from Supabase
        try {
            let query = supabaseClient
                .from('projects')
                .select('*')
                .order('project_name');

            if (userId) {
                query = query.eq('user_id', userId);
            }

            const { data, error } = await query;

            if (error) throw error;

            // 4. Convert to JS format
            const projects = (data || []).map(row => fromSupabaseProject(row));

            // 5. Cache to IndexedDB (store converted format)
            for (const project of projects) {
                try {
                    await window.idb.saveProject(project);
                } catch (e) {
                    console.warn('[DATA] Failed to cache project:', e);
                }
            }

            // 6. Also cache to localStorage for report-rules.js
            const projectsMap = {};
            projects.forEach(p => { projectsMap[p.id] = p; });
            setStorageItem(STORAGE_KEYS.PROJECTS, projectsMap);

            console.log('[DATA] Loaded projects from Supabase:', projects.length);
            return projects;
        } catch (e) {
            console.error('[DATA] Supabase fetch failed:', e);
            return [];
        }
    }

    /**
     * Load active project with contractors (IndexedDB-first, Supabase-fallback)
     * @returns {Promise<Object|null>} Project object with contractors, or null
     */
    async function loadActiveProject() {
        const activeId = getStorageItem(STORAGE_KEYS.ACTIVE_PROJECT_ID);
        if (!activeId) {
            console.log('[DATA] No active project ID set');
            return null;
        }

        const userId = getStorageItem(STORAGE_KEYS.USER_ID);

        // 1. Try IndexedDB first
        try {
            const localProject = await window.idb.getProject(activeId);
            if (localProject && (!userId || (localProject.userId || localProject.user_id) === userId)) {
                console.log('[DATA] Loaded active project from IndexedDB:', activeId);
                const project = normalizeProject(localProject);
                // Ensure contractors array exists and is normalized
                project.contractors = (localProject.contractors || []).map(c => normalizeContractor(c));
                return project;
            }
        } catch (e) {
            console.warn('[DATA] IndexedDB read failed:', e);
        }

        // 2. Check if offline
        if (!navigator.onLine) {
            console.log('[DATA] Offline, no cached active project');
            return null;
        }

        // 3. Fetch from Supabase
        try {
            const { data: projectRow, error: projectError } = await supabaseClient
                .from('projects')
                .select('*')
                .eq('id', activeId)
                .single();

            if (projectError || !projectRow) {
                console.warn('[DATA] Project not found in Supabase:', activeId);
                return null;
            }

            // 4. Fetch contractors
            const { data: contractorRows } = await supabaseClient
                .from('contractors')
                .select('*')
                .eq('project_id', activeId);

            // 5. Convert to JS format
            const project = fromSupabaseProject(projectRow);
            project.contractors = (contractorRows || []).map(c => fromSupabaseContractor(c));

            // 6. Cache to IndexedDB (with contractors)
            try {
                const projectToCache = { ...project, contractors: project.contractors };
                await window.idb.saveProject(projectToCache);
                console.log('[DATA] Cached active project to IndexedDB:', activeId);
            } catch (e) {
                console.warn('[DATA] Failed to cache project:', e);
            }

            return project;
        } catch (e) {
            console.error('[DATA] Failed to load active project:', e);
            return null;
        }
    }

    /**
     * Set the active project ID
     * @param {string} projectId
     */
    function setActiveProjectId(projectId) {
        setStorageItem(STORAGE_KEYS.ACTIVE_PROJECT_ID, projectId);
        console.log('[DATA] Set active project ID:', projectId);
    }

    /**
     * Get the active project ID
     * @returns {string|null}
     */
    function getActiveProjectId() {
        return getStorageItem(STORAGE_KEYS.ACTIVE_PROJECT_ID);
    }

    // ========================================
    // NORMALIZERS (handle mixed formats)
    // ========================================

    /**
     * Normalize project object to consistent JS format
     * Handles: raw Supabase (snake_case), converted (camelCase), or mixed
     */
    function normalizeProject(p) {
        if (!p) return null;
        return {
            id: p.id,
            name: p.name || p.projectName || p.project_name || '',
            projectName: p.name || p.projectName || p.project_name || '',
            noabProjectNo: p.noabProjectNo || p.noab_project_no || '',
            cnoSolicitationNo: p.cnoSolicitationNo || p.cno_solicitation_no || '',
            location: p.location || '',
            primeContractor: p.primeContractor || p.prime_contractor || '',
            status: p.status || 'active',
            userId: p.userId || p.user_id || '',
            logoUrl: p.logoUrl || p.logo_url || null,
            logoThumbnail: p.logoThumbnail || p.logo_thumbnail || null,
            contractors: p.contractors || []
        };
    }

    /**
     * Normalize contractor object to consistent JS format
     */
    function normalizeContractor(c) {
        if (!c) return null;
        return {
            id: c.id,
            projectId: c.projectId || c.project_id || '',
            name: c.name || '',
            company: c.company || '',
            type: c.type || 'sub',
            status: c.status || 'active'
        };
    }

    // ========================================
    // USER SETTINGS
    // ========================================

    /**
     * Load user settings (localStorage-first, Supabase-fallback)
     * @returns {Promise<Object|null>} User settings object or null
     */
    async function loadUserSettings() {
        const deviceId = getStorageItem(STORAGE_KEYS.DEVICE_ID);

        // 1. Try localStorage first
        const localSettings = getStorageItem(STORAGE_KEYS.USER_PROFILE);
        if (localSettings) {
            console.log('[DATA] Loaded user settings from localStorage');
            return normalizeUserSettings(localSettings);
        }

        // 2. Check if offline
        if (!navigator.onLine) {
            console.log('[DATA] Offline, no cached user settings');
            return null;
        }

        // 3. Fetch from Supabase
        if (!deviceId) {
            console.log('[DATA] No device ID, cannot fetch user settings');
            return null;
        }

        try {
            const { data, error } = await supabaseClient
                .from('user_profiles')
                .select('*')
                .eq('device_id', deviceId)
                .maybeSingle();

            if (error) {
                console.warn('[DATA] Supabase user settings error:', error);
                return null;
            }

            if (!data) {
                console.log('[DATA] No user profile found for device:', deviceId);
                return null;
            }

            // 4. Cache to localStorage
            const settings = normalizeUserSettings(data);
            setStorageItem(STORAGE_KEYS.USER_PROFILE, settings);
            console.log('[DATA] Loaded user settings from Supabase');

            return settings;
        } catch (e) {
            console.error('[DATA] Failed to load user settings:', e);
            return null;
        }
    }

    /**
     * Normalize user settings to consistent JS format
     */
    function normalizeUserSettings(s) {
        if (!s) return null;
        return {
            id: s.id,
            deviceId: s.deviceId || s.device_id || '',
            fullName: s.fullName || s.full_name || '',
            title: s.title || '',
            company: s.company || '',
            email: s.email || '',
            phone: s.phone || ''
        };
    }

    // ========================================
    // DRAFTS (localStorage only — temporary data)
    // ========================================

    /**
     * Get current draft for a project/date
     */
    function getCurrentDraft(projectId, date) {
        const reports = getStorageItem(STORAGE_KEYS.CURRENT_REPORTS) || {};
        const key = `${projectId}_${date}`;
        return reports[key] || null;
    }

    /**
     * Save draft (called on every keystroke, debounced by caller)
     */
    function saveDraft(projectId, date, data) {
        const reports = getStorageItem(STORAGE_KEYS.CURRENT_REPORTS) || {};
        const key = `${projectId}_${date}`;
        reports[key] = {
            ...data,
            updatedAt: new Date().toISOString()
        };
        setStorageItem(STORAGE_KEYS.CURRENT_REPORTS, reports);
        console.log('[DATA] Draft saved:', key);
    }

    /**
     * Delete a draft
     */
    function deleteDraft(projectId, date) {
        const reports = getStorageItem(STORAGE_KEYS.CURRENT_REPORTS) || {};
        const key = `${projectId}_${date}`;
        delete reports[key];
        setStorageItem(STORAGE_KEYS.CURRENT_REPORTS, reports);
        console.log('[DATA] Draft deleted:', key);
    }

    /**
     * Get all drafts (for drafts.html)
     */
    function getAllDrafts() {
        const reports = getStorageItem(STORAGE_KEYS.CURRENT_REPORTS) || {};
        return Object.entries(reports).map(([key, data]) => ({
            key,
            ...data
        }));
    }

    // ========================================
    // PHOTOS (IndexedDB — temporary until submitted)
    // ========================================

    /**
     * Save photo to IndexedDB
     */
    async function savePhoto(photo) {
        const photoRecord = {
            id: photo.id || `photo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            reportId: photo.reportId,
            blob: photo.blob,
            caption: photo.caption || '',
            timestamp: photo.timestamp || new Date().toISOString(),
            gps: photo.gps || null,
            syncStatus: 'pending',
            supabaseId: null,
            storagePath: null
        };
        await window.idb.savePhoto(photoRecord);
        console.log('[DATA] Photo saved to IndexedDB:', photoRecord.id);
        return photoRecord;
    }

    /**
     * Get all photos for a report
     */
    async function getPhotos(reportId) {
        try {
            const photos = await window.idb.getPhotosByReportId(reportId);
            return photos || [];
        } catch (e) {
            console.warn('[DATA] Failed to get photos:', e);
            return [];
        }
    }

    /**
     * Delete photo from IndexedDB
     */
    async function deletePhoto(photoId) {
        try {
            await window.idb.deletePhoto(photoId);
            console.log('[DATA] Photo deleted:', photoId);
        } catch (e) {
            console.warn('[DATA] Failed to delete photo:', e);
        }
    }

    // ========================================
    // AI RESPONSE CACHE (localStorage — temporary)
    // ========================================

    /**
     * Cache AI response locally
     */
    function cacheAIResponse(reportId, response) {
        const cache = getStorageItem('fvp_ai_cache') || {};
        cache[reportId] = {
            response,
            cachedAt: new Date().toISOString()
        };
        setStorageItem('fvp_ai_cache', cache);
        console.log('[DATA] AI response cached:', reportId);
    }

    /**
     * Get cached AI response
     */
    function getCachedAIResponse(reportId) {
        const cache = getStorageItem('fvp_ai_cache') || {};
        return cache[reportId]?.response || null;
    }

    /**
     * Clear AI response cache for a report
     */
    function clearAIResponseCache(reportId) {
        const cache = getStorageItem('fvp_ai_cache') || {};
        delete cache[reportId];
        setStorageItem('fvp_ai_cache', cache);
    }

    // ========================================
    // ARCHIVES (last 3 in IndexedDB, rest from Supabase)
    // ========================================

    /**
     * Load archived reports
     */
    async function loadArchivedReports(limit = 20) {
        if (!navigator.onLine) {
            console.log('[DATA] Offline, cannot load archives');
            return [];
        }

        try {
            const userId = getStorageItem(STORAGE_KEYS.USER_ID);

            let query = supabaseClient
                .from('reports')
                .select('*, projects(id, project_name)')
                .eq('status', 'submitted')
                .order('created_at', { ascending: false })
                .limit(limit);

            if (userId) {
                query = query.eq('user_id', userId);
            }

            const { data, error } = await query;

            if (error) throw error;

            return data || [];
        } catch (e) {
            console.error('[DATA] Failed to load archives:', e);
            return [];
        }
    }

    // ========================================
    // SUBMIT (Supabase — final destination)
    // ========================================

    /**
     * Submit final report to Supabase
     */
    async function submitFinalReport(finalData) {
        if (!navigator.onLine) {
            throw new Error('Cannot submit offline — internet required');
        }

        const { reportId, sections } = finalData;

        try {
            for (const section of sections) {
                await supabaseClient
                    .from('final_report_sections')
                    .upsert({
                        report_id: reportId,
                        section_key: section.key,
                        section_title: section.title,
                        content: section.content,
                        order: section.order
                    }, { onConflict: 'report_id,section_key' });
            }

            await supabaseClient
                .from('reports')
                .update({
                    status: 'submitted',
                    submitted_at: new Date().toISOString()
                })
                .eq('id', reportId);

            console.log('[DATA] Final report submitted:', reportId);
            return true;
        } catch (e) {
            console.error('[DATA] Submit failed:', e);
            throw e;
        }
    }

    /**
     * Clear all temporary data after successful submit
     */
    async function clearAfterSubmit(projectId, date, reportId) {
        deleteDraft(projectId, date);
        clearAIResponseCache(reportId);

        const photos = await getPhotos(reportId);
        for (const photo of photos) {
            await deletePhoto(photo.id);
        }

        console.log('[DATA] Cleared temporary data after submit');
    }

    // ========================================
    // UTILITIES
    // ========================================

    /**
     * Check if online
     */
    function isOnline() {
        return navigator.onLine;
    }

    // ========================================
    // EXPORTS
    // ========================================

    window.dataLayer = {
        // Projects
        loadProjects,
        loadActiveProject,
        setActiveProjectId,
        getActiveProjectId,

        // User Settings
        loadUserSettings,

        // Drafts (localStorage)
        getCurrentDraft,
        saveDraft,
        deleteDraft,
        getAllDrafts,

        // Photos (IndexedDB)
        savePhoto,
        getPhotos,
        deletePhoto,

        // AI Response Cache
        cacheAIResponse,
        getCachedAIResponse,
        clearAIResponseCache,

        // Archives
        loadArchivedReports,

        // Submit
        submitFinalReport,
        clearAfterSubmit,

        // Normalizers (exposed for edge cases)
        normalizeProject,
        normalizeContractor,
        normalizeUserSettings,

        // Utilities
        isOnline
    };

    console.log('[DATA] Data layer initialized');

})();
