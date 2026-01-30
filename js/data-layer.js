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

        // Normalizers (exposed for edge cases)
        normalizeProject,
        normalizeContractor,

        // Utilities
        isOnline
    };

    console.log('[DATA] Data layer initialized');

})();
