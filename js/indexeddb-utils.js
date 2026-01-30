/**
 * IndexedDB Utilities for FieldVoice Pro
 * Generic helpers for local-first storage
 */

(function() {
    'use strict';

    const DB_NAME = 'fieldvoice-pro';
    const DB_VERSION = 2;

    let db = null;

    /**
     * Opens/creates the IndexedDB database
     * @returns {Promise<IDBDatabase>} The database instance
     */
    function initDB() {
        return new Promise((resolve, reject) => {
            if (db) {
                resolve(db);
                return;
            }

            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = (event) => {
                console.error('IndexedDB error:', event.target.error);
                reject(event.target.error);
            };

            request.onsuccess = (event) => {
                db = event.target.result;
                console.log('IndexedDB initialized successfully');
                resolve(db);
            };

            request.onupgradeneeded = (event) => {
                const database = event.target.result;

                // Create projects store
                if (!database.objectStoreNames.contains('projects')) {
                    database.createObjectStore('projects', { keyPath: 'id' });
                    console.log('Created projects object store');
                }

                // Create userProfile store
                if (!database.objectStoreNames.contains('userProfile')) {
                    database.createObjectStore('userProfile', { keyPath: 'deviceId' });
                    console.log('Created userProfile object store');
                }

                // Create photos store
                if (!database.objectStoreNames.contains('photos')) {
                    const photosStore = database.createObjectStore('photos', { keyPath: 'id' });
                    photosStore.createIndex('reportId', 'reportId', { unique: false });
                    photosStore.createIndex('syncStatus', 'syncStatus', { unique: false });
                    console.log('Created photos object store');
                }
            };
        });
    }

    /**
     * Ensures the database is initialized before operations
     * @returns {Promise<IDBDatabase>} The database instance
     */
    function ensureDB() {
        if (db) {
            return Promise.resolve(db);
        }
        return initDB();
    }

    // ============================================
    // PROJECTS STORE
    // ============================================

    /**
     * Upserts a single project object (with nested contractors)
     * @param {Object} project - The project object to save
     * @returns {Promise<void>}
     */
    function saveProject(project) {
        return ensureDB().then((database) => {
            return new Promise((resolve, reject) => {
                const transaction = database.transaction(['projects'], 'readwrite');
                const store = transaction.objectStore('projects');
                const request = store.put(project);

                request.onsuccess = () => {
                    resolve();
                };

                request.onerror = (event) => {
                    console.error('Error saving project:', event.target.error);
                    reject(event.target.error);
                };
            });
        });
    }

    /**
     * Returns a single project by ID
     * @param {string} id - The project ID
     * @returns {Promise<Object|undefined>} The project object or undefined if not found
     */
    function getProject(id) {
        return ensureDB().then((database) => {
            return new Promise((resolve, reject) => {
                const transaction = database.transaction(['projects'], 'readonly');
                const store = transaction.objectStore('projects');
                const request = store.get(id);

                request.onsuccess = (event) => {
                    resolve(event.target.result);
                };

                request.onerror = (event) => {
                    console.error('Error getting project:', event.target.error);
                    reject(event.target.error);
                };
            });
        });
    }

    /**
     * Returns all projects as an array
     * @returns {Promise<Array>} Array of all project objects
     */
    function getAllProjects() {
        return ensureDB().then((database) => {
            return new Promise((resolve, reject) => {
                const transaction = database.transaction(['projects'], 'readonly');
                const store = transaction.objectStore('projects');
                const request = store.getAll();

                request.onsuccess = (event) => {
                    resolve(event.target.result || []);
                };

                request.onerror = (event) => {
                    console.error('Error getting all projects:', event.target.error);
                    reject(event.target.error);
                };
            });
        });
    }

    /**
     * Deletes a project by ID
     * @param {string} id - The project ID to delete
     * @returns {Promise<void>}
     */
    function deleteProject(id) {
        return ensureDB().then((database) => {
            return new Promise((resolve, reject) => {
                const transaction = database.transaction(['projects'], 'readwrite');
                const store = transaction.objectStore('projects');
                const request = store.delete(id);

                request.onsuccess = () => {
                    resolve();
                };

                request.onerror = (event) => {
                    console.error('Error deleting project:', event.target.error);
                    reject(event.target.error);
                };
            });
        });
    }

    // ============================================
    // USER PROFILE STORE
    // ============================================

    /**
     * Upserts a user profile
     * @param {Object} profile - The user profile object (must include deviceId)
     * @returns {Promise<void>}
     */
    function saveUserProfile(profile) {
        return ensureDB().then((database) => {
            return new Promise((resolve, reject) => {
                const transaction = database.transaction(['userProfile'], 'readwrite');
                const store = transaction.objectStore('userProfile');
                const request = store.put(profile);

                request.onsuccess = () => {
                    resolve();
                };

                request.onerror = (event) => {
                    console.error('Error saving user profile:', event.target.error);
                    reject(event.target.error);
                };
            });
        });
    }

    /**
     * Returns a user profile by deviceId
     * @param {string} deviceId - The device ID
     * @returns {Promise<Object|undefined>} The profile object or undefined if not found
     */
    function getUserProfile(deviceId) {
        return ensureDB().then((database) => {
            return new Promise((resolve, reject) => {
                const transaction = database.transaction(['userProfile'], 'readonly');
                const store = transaction.objectStore('userProfile');
                const request = store.get(deviceId);

                request.onsuccess = (event) => {
                    resolve(event.target.result);
                };

                request.onerror = (event) => {
                    console.error('Error getting user profile:', event.target.error);
                    reject(event.target.error);
                };
            });
        });
    }

    // ============================================
    // PHOTOS STORE
    // ============================================
    
    // Photo schema:
    // {
    //   id: 'photo_xxx',              // unique photo ID
    //   reportId: 'report_xxx',       // parent report ID
    //   blob: Blob,                   // compressed image data
    //   caption: '',                  // user caption
    //   timestamp: '2026-01-30T...',  // ISO timestamp when taken
    //   gps: { lat, lng } | null,     // GPS coordinates if available
    //   syncStatus: 'pending' | 'synced' | 'failed' | 'pending-delete',
    //   retryCount: 0,                // number of failed upload attempts
    //   lastSyncAttempt: null,        // ISO timestamp of last sync attempt
    //   supabaseId: null,             // set after successful sync
    //   storagePath: null             // Supabase storage path, set after sync
    // }

    /**
     * Save a photo to IndexedDB
     * @param {Object} photo - The photo object (must include id)
     * @returns {Promise<Object>} The saved photo object
     */
    async function savePhoto(photo) {
        const database = await ensureDB();
        return new Promise((resolve, reject) => {
            const transaction = database.transaction(['photos'], 'readwrite');
            const store = transaction.objectStore('photos');
            const request = store.put(photo);
            request.onsuccess = () => resolve(photo);
            request.onerror = (e) => reject(e.target.error);
        });
    }

    /**
     * Get all photos for a report
     * @param {string} reportId - The report ID
     * @returns {Promise<Array>} Array of photo objects
     */
    async function getPhotosByReportId(reportId) {
        const database = await ensureDB();
        return new Promise((resolve, reject) => {
            const transaction = database.transaction(['photos'], 'readonly');
            const store = transaction.objectStore('photos');
            const index = store.index('reportId');
            const request = index.getAll(reportId);
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = (e) => reject(e.target.error);
        });
    }

    /**
     * Get all photos with a specific sync status
     * @param {string} status - The sync status ('pending', 'synced', 'failed')
     * @returns {Promise<Array>} Array of photo objects
     */
    async function getPhotosBySyncStatus(status) {
        const database = await ensureDB();
        return new Promise((resolve, reject) => {
            const transaction = database.transaction(['photos'], 'readonly');
            const store = transaction.objectStore('photos');
            const index = store.index('syncStatus');
            const request = index.getAll(status);
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = (e) => reject(e.target.error);
        });
    }

    /**
     * Delete a photo from IndexedDB
     * @param {string} photoId - The photo ID to delete
     * @returns {Promise<boolean>} True if deleted
     */
    async function deletePhoto(photoId) {
        const database = await ensureDB();
        return new Promise((resolve, reject) => {
            const transaction = database.transaction(['photos'], 'readwrite');
            const store = transaction.objectStore('photos');
            const request = store.delete(photoId);
            request.onsuccess = () => resolve(true);
            request.onerror = (e) => reject(e.target.error);
        });
    }

    // ============================================
    // GENERAL
    // ============================================

    /**
     * Clears all records from a store
     * @param {string} storeName - The name of the object store to clear
     * @returns {Promise<void>}
     */
    function clearStore(storeName) {
        return ensureDB().then((database) => {
            return new Promise((resolve, reject) => {
                if (!database.objectStoreNames.contains(storeName)) {
                    console.error('Store not found:', storeName);
                    reject(new Error(`Store not found: ${storeName}`));
                    return;
                }

                const transaction = database.transaction([storeName], 'readwrite');
                const store = transaction.objectStore(storeName);
                const request = store.clear();

                request.onsuccess = () => {
                    console.log(`Cleared store: ${storeName}`);
                    resolve();
                };

                request.onerror = (event) => {
                    console.error('Error clearing store:', event.target.error);
                    reject(event.target.error);
                };
            });
        });
    }

    // Export to window.idb
    window.idb = {
        // Setup
        initDB,

        // Projects store
        saveProject,
        getProject,
        getAllProjects,
        deleteProject,

        // User profile store
        saveUserProfile,
        getUserProfile,

        // Photos store
        savePhoto,
        getPhotosByReportId,
        getPhotosBySyncStatus,
        deletePhoto,

        // General
        clearStore
    };

})();
