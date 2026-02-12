# FieldVoice Pro v6.6 — Complete System Report

---

## 1. Executive Summary

FieldVoice Pro v6.6 is an **offline-capable Progressive Web App (PWA)** for daily construction field reporting, designed for DOT (Department of Transportation) field inspectors. It enables voice-to-text capture, photo documentation with GPS, AI-powered report refinement, and client-side PDF generation — all of which work without internet connectivity.

**Technology Stack:**
- **Frontend:** Vanilla JavaScript (no framework — no React, Vue, Angular)
- **Styling:** Tailwind CSS via CDN + Font Awesome 6.4.0 icons
- **Database:** Supabase (PostgreSQL cloud) with anonymous access
- **AI Processing:** n8n webhook automations
- **Weather:** Open-Meteo free API
- **PDF Generation:** html2canvas + jsPDF (client-side)
- **Hosting:** GitHub Pages (no build step required)
- **PWA:** Service Worker v1.19.0 with full offline support

---

## 2. Code Volume

| Metric | Count |
|--------|-------|
| HTML Pages | 12 |
| JavaScript Modules | 21 (+ 1 service worker) |
| Total JavaScript Lines | **19,033** |
| Total HTML Lines | **8,214** |
| SQL Migration Lines | **384** |
| Documentation Files (.md) | 22 |
| JSON Config Files | 3 |
| Total Source Files | ~70 |
| **Estimated Total Lines of Code** | **~27,631** |

### JavaScript Files by Size (lines)

| File | Lines | Purpose |
|------|-------|---------|
| `quick-interview.js` | 5,406 | Field capture (voice, text, photos, guided/freeform) |
| `report.js` | 2,652 | AI report editing & review |
| `finalreview.js` | 2,193 | Final review, PDF generation, submission |
| `project-config.js` | 1,253 | Project & contractor CRUD, document import |
| `index.js` | 826 | Dashboard, report cards, project selector |
| `permissions.js` | 788 | Microphone/camera/location permission wizard |
| `supabase-utils.js` | 730 | Data format converters (snake_case <-> camelCase) |
| `data-layer.js` | 620 | Unified data access (IndexedDB-first pattern) |
| `report-rules.js` | 610 | Business logic, report status validation |
| `indexeddb-utils.js` | 584 | IndexedDB offline storage operations |
| `settings.js` | 522 | User profile management |
| `sync-manager.js` | 435 | Offline sync queue management |
| `storage-keys.js` | 402 | localStorage constants & helper functions |
| `archives.js` | 359 | Submitted report viewer with filters |
| `media-utils.js` | 330 | Photo capture, GPS, image compression |
| `lock-manager.js` | 328 | Multi-device report locking |
| `projects.js` | 322 | Project listing & sync |
| `ui-utils.js` | 275 | Toast, HTML escape, date formatting, auto-expand |
| `sw.js` | 216 | Service worker (offline caching) |
| `pwa-utils.js` | 174 | SW registration, offline detection, persistent storage |
| `config.js` | 8 | Supabase client initialization |

### HTML Files by Size (lines)

| File | Lines | Purpose |
|------|-------|---------|
| `landing.html` | 1,494 | Marketing / onboarding page |
| `finalreview.html` | 1,276 | Final review & PDF generation |
| `report.html` | 1,060 | AI report editing |
| `permission-debug.html` | 1,008 | Permission debugging utility |
| `quick-interview.html` | 985 | Field capture interface |
| `permissions.html` | 768 | Permission onboarding |
| `project-config.html` | 545 | Project configuration |
| `settings.html` | 303 | User profile settings |
| `admin-debug.html` | 273 | Admin data investigation |
| `index.html` | 261 | Dashboard / home |
| `projects.html` | 138 | Project selection |
| `archives.html` | 103 | Submitted report archives |

---

## 3. All Pages & What They Do

| # | Page | File | JS Module | Purpose | Who Uses It |
|---|------|------|-----------|---------|-------------|
| 1 | **Dashboard** | `index.html` | `index.js` | Report card list, new report creation, project selector, recently submitted reports | All users |
| 2 | **Quick Interview** | `quick-interview.html` | `quick-interview.js` | Field data capture: voice notes, text entries, photos, GPS, weather; supports Guided & Freeform modes | Field inspectors |
| 3 | **Report Editor** | `report.html` | `report.js` | View and edit AI-refined report sections; modify generated content before final review | Inspectors |
| 4 | **Final Review** | `finalreview.html` | `finalreview.js` | Final editable form fields, toggle sections on/off, generate PDF, submit to archives | Inspectors |
| 5 | **Archives** | `archives.html` | `archives.js` | Browse submitted reports, filter by project, inline PDF viewer, download PDFs | All users |
| 6 | **Permissions** | `permissions.html` | `permissions.js` | Microphone/camera/location permission wizard with status indicators and manual fallback | New users |
| 7 | **Projects** | `projects.html` | `projects.js` | Project list & selection, sync from Supabase | Project managers |
| 8 | **Project Config** | `project-config.html` | `project-config.js` | Create/edit projects, manage contractors, import project documents via AI extraction | Admins |
| 9 | **Settings** | `settings.html` | `settings.js` | User profile: name, title, company, email, phone; clear app cache | All users |
| 10 | **Landing** | `landing.html` | (none) | Marketing/onboarding page with feature overview | Prospective users |
| 11 | **Permission Debug** | `permission-debug.html` | (none) | Inspect permission state, device info, manual request testing | Support / QA |
| 12 | **Admin Debug** | `admin-debug.html` | (none) | Admin data investigation and webhook testing | Admins |

### User Workflow (Report Lifecycle)

```
Landing → Permissions → Projects → Dashboard (index.html)
                                        ↓
                                 Quick Interview (capture)
                                        ↓
                                 Report Editor (AI review)
                                        ↓
                                 Final Review (PDF + submit)
                                        ↓
                                 Archives (view submitted)
```

### Report Status Lifecycle

```
draft → pending_refine → refined → ready_to_submit → submitted
```

---

## 4. Supabase Database Tables

**Total: 14 table/bucket references in code**

- 10 database tables
- 2 storage buckets
- 2 additional tables added via migrations

### Table-by-Table Breakdown

#### 4.1 `projects`
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID (PK) | Auto-generated |
| `user_id` | UUID | Owner |
| `project_name` | TEXT | Required |
| `noab_project_no` | TEXT | NOAB project number |
| `cno_solicitation_no` | TEXT | CNO solicitation number |
| `location` | TEXT | Project location |
| `engineer` | TEXT | Project engineer |
| `prime_contractor` | TEXT | Prime contractor name |
| `notice_to_proceed` | DATE | NTP date |
| `contract_duration` | INTEGER | Duration in days |
| `expected_completion` | DATE | Expected completion |
| `default_start_time` | TEXT | Default work start |
| `default_end_time` | TEXT | Default work end |
| `weather_days` | INTEGER | Weather delay days |
| `logo` | TEXT | Legacy logo field |
| `logo_thumbnail` | TEXT | Logo thumbnail URL (v6.6) |
| `logo_url` | TEXT | Full logo URL (v6.6) |
| `status` | TEXT | Default: 'active' |
| `created_at` | TIMESTAMPTZ | Auto |
| `updated_at` | TIMESTAMPTZ | Auto |

**Operations:** SELECT, INSERT, UPDATE (UPSERT on `id`), DELETE (CASCADE to contractors/equipment)
**Used by:** `data-layer.js`, `project-config.js`, `projects.js`, `report.js`, `finalreview.js`, `index.js`, `archives.js`

---

#### 4.2 `contractors`
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID (PK) | Auto-generated |
| `project_id` | UUID (FK) | References projects(id) ON DELETE CASCADE |
| `name` | TEXT | Required |
| `company` | TEXT | Company name |
| `abbreviation` | TEXT | Short name |
| `type` | TEXT | Default: 'sub' (prime or sub) |
| `trades` | TEXT | Trade/specialty |
| `status` | TEXT | Default: 'active' |
| `added_date` | DATE | When added to project |
| `removed_date` | DATE | When removed |
| `created_at` | TIMESTAMPTZ | Auto |

**Operations:** SELECT, INSERT, UPDATE (UPSERT on `id`), DELETE
**Used by:** `data-layer.js`, `project-config.js`, `finalreview.js`, `report.js`, `quick-interview.js`

---

#### 4.3 `equipment`
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID (PK) | Auto-generated |
| `project_id` | UUID (FK) | References projects(id) ON DELETE CASCADE |
| `name` | TEXT | Required |
| `description` | TEXT | Equipment description |
| `is_active` | BOOLEAN | Default: true |
| `created_at` | TIMESTAMPTZ | Auto |

**Operations:** SELECT, INSERT, UPDATE, DELETE
**Used by:** `project-config.js`, `report.js`

---

#### 4.4 `reports`
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID (PK) | Auto-generated |
| `project_id` | UUID (FK) | References projects(id) ON DELETE CASCADE |
| `user_id` | UUID | User who created report |
| `device_id` | TEXT | Device identifier |
| `report_date` | DATE | Required — the date being reported on |
| `status` | TEXT | Default: 'draft' |
| `capture_mode` | TEXT | Default: 'guided' (guided, freeform, minimal) |
| `pdf_url` | TEXT | URL to generated PDF |
| `created_at` | TIMESTAMPTZ | Auto |
| `updated_at` | TIMESTAMPTZ | Auto |
| `submitted_at` | TIMESTAMPTZ | When finalized |

**Logical unique constraint:** `(project_id, report_date)` — one report per project per day
**Operations:** SELECT, INSERT, UPDATE (UPSERT on `id`), DELETE (CASCADE)
**Used by:** `data-layer.js`, `sync-manager.js`, `report.js`, `finalreview.js`, `archives.js`, `lock-manager.js`, `quick-interview.js`

---

#### 4.5 `report_entries`
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID (PK) | Auto-generated |
| `report_id` | UUID (FK) | References reports(id) ON DELETE CASCADE |
| `local_id` | TEXT | Client-side ID for offline tracking |
| `section` | TEXT | Required — section key (issues, safety, qaqc, communications, visitors, work_{UUID}) |
| `content` | TEXT | Entry text content |
| `entry_order` | INTEGER | Display order (default: 0) |
| `created_at` | TIMESTAMPTZ | Auto |
| `updated_at` | TIMESTAMPTZ | Auto |
| `is_deleted` | BOOLEAN | Soft delete flag (default: false) |

**Unique constraint:** `(report_id, local_id)` — for upsert conflict resolution
**Operations:** SELECT, INSERT, UPDATE (UPSERT on `report_id, local_id`), soft DELETE
**Used by:** `sync-manager.js`, `report.js`, `quick-interview.js`

---

#### 4.6 `report_raw_capture`
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID (PK) | Auto-generated |
| `report_id` | UUID (FK) | References reports(id) ON DELETE CASCADE |
| `capture_mode` | TEXT | Default: 'guided' |
| `raw_data` | JSONB | Full raw capture (entries, contractors, equipment arrays) |
| `weather` | JSONB | Weather data object |
| `location` | JSONB | GPS location object |
| `site_conditions` | TEXT | Site conditions notes |
| `qaqc_notes` | TEXT | QA/QC notes |
| `communications` | TEXT | Communications notes |
| `visitors_remarks` | TEXT | Visitors/deliveries notes |
| `safety_has_incident` | BOOLEAN | Default: false |
| `created_at` | TIMESTAMPTZ | Auto |

**Relationship:** 1:1 with reports (upsert on `report_id`)
**Operations:** SELECT, INSERT, UPDATE (UPSERT on `report_id`), DELETE
**Used by:** `sync-manager.js`, `quick-interview.js`, `report.js`

---

#### 4.7 `photos`
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID (PK) | Auto-generated |
| `report_id` | UUID (FK) | References reports(id) ON DELETE CASCADE |
| `photo_url` | TEXT | Public storage URL |
| `storage_path` | TEXT | Internal storage path |
| `caption` | TEXT | Photo description |
| `photo_type` | TEXT | Photo category |
| `taken_at` | TIMESTAMPTZ | When photo was captured |
| `location_lat` | NUMERIC | GPS latitude |
| `location_lng` | NUMERIC | GPS longitude |
| `created_at` | TIMESTAMPTZ | Auto |

**Operations:** SELECT, INSERT, DELETE
**Used by:** `quick-interview.js`
**Note:** `report-photos` is also referenced as a separate table/alias for final photo storage

---

#### 4.8 `active_reports` (Lock Management)
| Column | Type | Notes |
|--------|------|-------|
| `project_id` | UUID (FK) | Part of composite PK |
| `report_date` | DATE | Part of composite PK |
| `device_id` | TEXT | Which device holds the lock |
| `inspector_name` | TEXT | Who is editing |
| `locked_at` | TIMESTAMPTZ | When lock was acquired |
| `last_heartbeat` | TIMESTAMPTZ | Updated every 2 minutes |

**Composite PK:** `(project_id, report_date)`
**Stale lock timeout:** 30 minutes without heartbeat
**Operations:** SELECT (check lock), INSERT/UPSERT (acquire), UPDATE (heartbeat), DELETE (release)
**Used by:** `lock-manager.js`, `quick-interview.js`

---

#### 4.9 `ai_responses`
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID (PK) | Auto-generated |
| `report_id` | UUID (FK) | References reports(id) ON DELETE CASCADE |
| `raw_response` | JSONB | Full API response from n8n |
| `generated_content` | JSONB | Processed/structured content |
| `created_at` | TIMESTAMPTZ | Auto |

**Relationship:** 1:1 with reports (upsert on `report_id`)
**Operations:** SELECT, INSERT/UPSERT
**Used by:** `quick-interview.js`, `sync-manager.js`

---

#### 4.10 `final_reports`
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID (PK) | Auto-generated |
| `report_id` | UUID (FK) | Unique constraint |
| `pdf_url` | TEXT | Public URL to generated PDF |
| `weather_high_temp` | NUMERIC | High temperature |
| `weather_low_temp` | NUMERIC | Low temperature |
| `weather_precipitation` | TEXT | Precipitation description |
| `weather_general_condition` | TEXT | General weather |
| `weather_job_site_condition` | TEXT | Site conditions |
| `weather_adverse_conditions` | TEXT | Adverse conditions |
| `executive_summary` | TEXT | Report summary |
| `work_performed` | TEXT | Work description |
| `safety_observations` | TEXT | Safety notes |
| `delays_issues` | TEXT | Delays / issues |
| `materials_used` | TEXT | Materials used |
| `qaqc_notes` | TEXT | QA/QC notes |
| `communications_notes` | TEXT | Communications |
| `visitors_deliveries_notes` | TEXT | Visitors & deliveries |
| `inspector_notes` | TEXT | Inspector remarks |
| `has_contractor_personnel` | BOOLEAN | Toggle: show contractor section |
| `has_equipment` | BOOLEAN | Toggle: show equipment section |
| `has_issues` | BOOLEAN | Toggle: show issues section |
| `has_communications` | BOOLEAN | Toggle: show communications |
| `has_qaqc` | BOOLEAN | Toggle: show QA/QC |
| `has_safety_incidents` | BOOLEAN | Toggle: show safety |
| `has_visitors_deliveries` | BOOLEAN | Toggle: show visitors |
| `has_photos` | BOOLEAN | Toggle: show photos |
| `contractors_display` | TEXT | Formatted contractor text |
| `contractors_json` | JSONB | Structured contractor data |
| `equipment_display` | TEXT | Formatted equipment text |
| `equipment_json` | JSONB | Structured equipment data |
| `personnel_display` | TEXT | Formatted personnel text |
| `personnel_json` | JSONB | Structured personnel data |
| `created_at` | TIMESTAMPTZ | Auto |
| `submitted_at` | TIMESTAMPTZ | Submission timestamp |

**Unique constraint:** `(report_id)` — one final report per report
**Operations:** SELECT, INSERT/UPSERT
**Used by:** `finalreview.js`, `archives.js`, `data-layer.js`

---

#### 4.11 `final_report_sections`
| Column | Type | Notes |
|--------|------|-------|
| `report_id` | UUID (FK) | References reports |
| `section_key` | TEXT | Section identifier |
| `section_title` | TEXT | Display title |
| `content` | TEXT | Section content |
| `order` | INTEGER | Display order |

**Operations:** SELECT, INSERT/UPSERT
**Used by:** `data-layer.js`

---

#### 4.12 `user_profiles`
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID (PK) | Auto-generated |
| `full_name` | TEXT | Inspector name |
| `title` | TEXT | Job title |
| `company` | TEXT | Company name |
| `email` | TEXT | Contact email |
| `phone` | TEXT | Contact phone |
| `created_at` | TIMESTAMPTZ | Auto |
| `updated_at` | TIMESTAMPTZ | Auto |

**Operations:** SELECT, INSERT/UPSERT (on `device_id`)
**Used by:** `data-layer.js`, `settings.js`, `report.js`, `finalreview.js`, `quick-interview.js`

---

### Supabase Storage Buckets

| Bucket | Path Format | Purpose |
|--------|-------------|---------|
| `report-pdfs` | `reports/{reportId}/report.pdf` | Generated PDF files |
| `project-logos` | `projects/{projectId}/logo.{ext}` | Project logo images |
| `report-photos` | `reports/{reportId}/photos/{photoId}.jpg` | Uploaded field photos |

---

### Database Indexes (6)

| Index | Table | Column(s) |
|-------|-------|-----------|
| `idx_contractors_project_id` | contractors | project_id |
| `idx_equipment_project_id` | equipment | project_id |
| `idx_reports_project_id` | reports | project_id |
| `idx_reports_report_date` | reports | report_date |
| `idx_report_entries_report_id` | report_entries | report_id |
| `idx_photos_report_id` | photos | report_id |

### Row Level Security
- RLS is **enabled** on all 10 tables
- Current policies are **permissive** (allow all for anon) — development mode
- Uses anonymous key only (no user authentication)

---

### Database Migrations (9 files)

| # | Date | Migration | What Changed |
|---|------|-----------|-------------|
| 1 | 2026-01-27 | `20260127000000_create_all_tables.sql` | Initial schema: 9 tables, 6 indexes, RLS policies |
| 2 | 2026-01-27 | `20260127100000_add_user_profiles.sql` | Added user_profiles table |
| 3 | 2026-01-28 | `20260128220000_drop_equipment_table.sql` | Removed unused equipment table |
| 4 | 2026-01-28 | `20260128225300_add_inspector_name_column.sql` | Added inspector_name to active_reports |
| 5 | 2026-01-29 | `20260129062218_add_sync_constraints.sql` | Added unique constraint on active_reports(project_id, report_date) |
| 6 | 2026-01-29 | `20260129064435_add_report_entries_columns.sql` | Added columns to report_entries for section tracking |
| 7 | 2026-01-29 | `20260129071323_add_report_toggle_columns.sql` | Added toggle flags to final_reports |
| 8 | 2026-02-03 | `20260203084631_add_report_pdfs_policies.sql` | Added RLS policies for report-pdfs storage bucket |
| 9 | 2026-02-03 | `20260203084933_add_final_reports_unique_constraint.sql` | Added uniqueness constraint on final_reports(report_id) |

---

## 5. localStorage Usage (26 keys)

All keys are prefixed `fvp_` and defined in `js/storage-keys.js`.

### Identity & Device

| Key | Purpose | Data Type | Lifetime |
|-----|---------|-----------|----------|
| `fvp_device_id` | Persistent unique device UUID (generated once via `crypto.randomUUID()`) | String (UUID) | **Permanent** — never expires |
| `fvp_user_id` | Current user ID from Supabase | String | Session-based |
| `fvp_user_profile` | Full user profile (name, title, company, email, phone) | JSON Object | Until updated |

### Project & Report State

| Key | Purpose | Data Type | Lifetime |
|-----|---------|-----------|----------|
| `fvp_active_project_id` | Currently selected project UUID | String (UUID) | Until changed |
| `fvp_projects` | Map of all projects (cached for fast access) | JSON Object Map | Until refresh |
| `fvp_current_reports` | Active report drafts keyed by reportId | JSON Object Map | Until submitted/deleted |
| `fvp_report_{reportId}` | Detailed report data (entries, photos, metadata) | JSON Object | Until submitted/deleted |
| `fvp_drafts` | Draft reports for offline persistence | JSON Object | Until submitted |
| `fvp_ai_reports` | AI processing results cache | JSON Object | Until cleared |
| `fvp_quick_interview_draft` | Quick interview scratch data | JSON Object | Until submitted |

### Permission Flags

| Key | Purpose | Data Type | Lifetime |
|-----|---------|-----------|----------|
| `fvp_mic_granted` | Microphone permission status | String ('true'/'false') | Until reset |
| `fvp_mic_timestamp` | When mic permission was granted | String (timestamp) | Until reset |
| `fvp_cam_granted` | Camera permission status | String ('true'/'false') | Until reset |
| `fvp_loc_granted` | Location permission status | String ('true'/'false') | Until reset |
| `fvp_speech_granted` | Speech recognition permission | String ('true'/'false') | Until reset |

### Location Cache

| Key | Purpose | Data Type | Lifetime |
|-----|---------|-----------|----------|
| `fvp_loc_lat` | Cached GPS latitude | String (float) | Max 1 hour |
| `fvp_loc_lng` | Cached GPS longitude | String (float) | Max 1 hour |
| `fvp_loc_timestamp` | GPS cache timestamp | String (ms) | Max 1 hour |

### Sync & Offline

| Key | Purpose | Data Type | Lifetime |
|-----|---------|-----------|----------|
| `fvp_sync_queue` | Offline operations pending sync to Supabase | JSON Array | Until synced |
| `fvp_last_sync` | Timestamp of last successful sync | String (ISO) | Updated each sync |
| `fvp_offline_queue` | Legacy offline operations queue | JSON Array | Deprecated |

### UI State

| Key | Purpose | Data Type | Lifetime |
|-----|---------|-----------|----------|
| `fvp_onboarded` | App onboarding completed | String ('true'/'false') | **Permanent** |
| `fvp_banner_dismissed` | Permission banner dismissed | String ('true'/'false') | Until reset |
| `fvp_banner_dismissed_date` | When banner was dismissed | String (date) | Until reset |
| `fvp_dictation_hint_dismissed` | Voice dictation hint dismissed | String ('true'/'false') | Until reset |
| `fvp_permissions_dismissed` | Permission prompt dismissed | String | Until reset |

---

## 6. IndexedDB Usage

**Database name:** `fieldvoice-pro`
**Current version:** 2

### Object Stores

| # | Store Name | Key Path | Indexes | Purpose |
|---|-----------|----------|---------|---------|
| 1 | `projects` | `id` | (none) | Cached project data with nested contractors |
| 2 | `userProfile` | `deviceId` | (none) | User settings cache (name, title, company, email, phone) |
| 3 | `photos` | `id` | `reportId` (non-unique), `syncStatus` (non-unique) | Photo blobs with metadata and sync tracking |
| 4 | `archives` | `id` | `projectId` (non-unique), `reportDate` (non-unique) | Submitted reports cached for offline viewing |

### IndexedDB API (exposed as `window.idb`)

**Projects:** `saveProject()`, `getProject()`, `getAllProjects()`, `deleteProject()`
**User:** `saveUserProfile()`, `getUserProfile()`
**Photos:** `savePhoto()`, `getPhoto()`, `getPhotosByReportId()`, `getPhotosBySyncStatus()`, `deletePhoto()`, `deletePhotosByReportId()`
**Archives:** `saveArchive()`, `getArchive()`, `getAllArchives()`, `getArchivesByProjectId()`, `deleteArchive()`
**General:** `clearStore()`, `initDB()`

---

## 7. Three-Layer Storage Architecture

```
┌────────────────────────────────────────────────────────────┐
│  Layer 1: localStorage         (~5 MB capacity)            │
│  Flags, IDs, permissions, small JSON caches                │
│  Fast read/write, survives browser restart                 │
├────────────────────────────────────────────────────────────┤
│  Layer 2: IndexedDB            (~50 MB+ capacity)          │
│  Projects, photos (binary), archives, user profiles        │
│  Structured queries via indexes, transaction support       │
├────────────────────────────────────────────────────────────┤
│  Layer 3: Supabase Cloud       (unlimited)                 │
│  PostgreSQL source of truth                                │
│  Synced explicitly via user action (no auto-sync)          │
└────────────────────────────────────────────────────────────┘
```

**Data flow on read:**
1. Try IndexedDB first (fast, works offline)
2. If empty → check if online
3. If online → fetch from Supabase → cache in IndexedDB + localStorage
4. If offline → return null / show offline banner

**Data flow on write:**
1. Save to localStorage / IndexedDB immediately
2. Queue sync operation to `fvp_sync_queue`
3. When online → replay queue against Supabase
4. Failed operations retry up to 3 times, then re-queue

---

## 8. PWA & App-Readiness Features

### Service Worker (`js/sw.js`)
- **Cache version:** v1.19.0
- **Cache name:** `fieldvoice-pro-v1.19.0`
- **Strategy for static assets:** Cache-first with stale-while-revalidate background update
- **Strategy for API calls:** Network-first with offline JSON fallback
- **Cached static assets:** All 11 HTML pages + 7 JS modules + manifest + icons
- **Cached CDN assets:** Tailwind CSS, Font Awesome CSS + webfonts
- **Offline navigation:** Falls back to cached `index.html`
- **Update handling:** `SKIP_WAITING` message from app triggers immediate activation

### PWA Manifest (`manifest.json`)
- **App name:** FieldVoice Pro
- **Display:** Standalone (fullscreen, no browser chrome)
- **Orientation:** Portrait-primary
- **Theme:** DOT Navy (`#0a1628`)
- **Categories:** Business, Productivity, Utilities
- **Icons:** 16 icons (8 sizes x 2 variants: regular + maskable)
  - Sizes: 72, 96, 128, 144, 152, 192, 384, 512

### PWA Utilities (`js/pwa-utils.js`)
- **`initPWA()`** — Registers service worker, sets up offline banner, requests persistent storage
- **`registerServiceWorker()`** — Handles SW registration with update detection & banner
- **`setupOfflineBanner()`** — Shows/hides offline warning with connectivity listeners
- **`requestPersistentStorage()`** — Calls `navigator.storage.persist()` to prevent Android from clearing app data under storage pressure
- **`setupPWANavigation()`** — Fixes Safari standalone mode by intercepting link clicks to prevent navigation breaking out of the app shell

### App-Readiness Summary
- Installable on Android (Add to Home Screen → standalone app)
- Installable on iOS Safari (Add to Home Screen → standalone app)
- Works fully offline with local data storage
- Offline operations queue persists across browser restarts
- Background sync when connectivity returns
- Persistent storage prevents OS data clearing
- Auto-update detection with user notification

---

## 9. JavaScript Module Architecture

### Infrastructure Layer (4 modules, 1,614 lines)

| Module | Lines | Purpose |
|--------|-------|---------|
| `config.js` | 8 | Supabase client initialization (URL + anon key) |
| `storage-keys.js` | 402 | All localStorage key constants, type definitions, helper functions (getDeviceId, getStorageItem, setStorageItem, getCurrentReport, saveCurrentReport, addToSyncQueue, etc.) |
| `indexeddb-utils.js` | 584 | Full IndexedDB CRUD: initDB, save/get/delete for projects, userProfile, photos, archives; exposed as `window.idb` |
| `data-layer.js` | 620 | Unified data access layer: IndexedDB-first reads, Supabase fallback, project/settings/draft/photo/archive management |

### Utility Layer (7 modules, 2,882 lines)

| Module | Lines | Purpose |
|--------|-------|---------|
| `supabase-utils.js` | 730 | Bidirectional data converters (snake_case ↔ camelCase) for all 10+ entity types; normalization functions |
| `ui-utils.js` | 275 | `escapeHtml()`, `generateId()`, `showToast()`, `formatDate()`, `formatTime()`, `autoExpand()` for textareas, GPS caching helpers |
| `media-utils.js` | 330 | `capturePhotoWithGPS()`, `compressImage()`, `readFileAsDataURL()`, `dataURLtoBlob()`, `uploadPhotoToSupabase()`, logo upload/delete |
| `pwa-utils.js` | 174 | Service worker registration, offline banner, persistent storage request, Safari standalone navigation fix |
| `report-rules.js` | 610 | Business logic: report status validation, status transitions, date helpers, section queries, completeness checks |
| `sync-manager.js` | 435 | Offline sync queue: debounced entry backup, batch sync, report sync, raw capture sync, queue processing, online/offline listeners |
| `lock-manager.js` | 328 | Multi-device lock: checkLock, acquireLock, releaseLock, heartbeat (2-min interval), stale lock detection (30-min timeout), formatLockMessage |

### Page Layer (10 modules, 14,537 lines)

| Module | Lines | Page | Key Functions |
|--------|-------|------|---------------|
| `quick-interview.js` | 5,406 | Quick Interview | Guided mode sections (weather, work, issues, safety, QA/QC, communications, visitors), freeform mode, voice dictation, photo capture, entry CRUD, AI processing trigger, contractor personnel tracking |
| `report.js` | 2,652 | Report Editor | Load AI response, render editable sections, inline editing, auto-save, status tracking, submit to final review |
| `finalreview.js` | 2,193 | Final Review | Editable form fields for all sections, section toggle switches, html2canvas + jsPDF PDF generation, Supabase upload, report submission |
| `project-config.js` | 1,253 | Project Config | Project CRUD, contractor CRUD, document upload + AI extraction, logo upload/crop, form validation |
| `index.js` | 826 | Dashboard | Project selector dropdown, report card rendering, "begin report" flow, recently submitted cards, auto-weather fetch, offline status |
| `permissions.js` | 788 | Permissions | Step-by-step permission wizard, individual mic/camera/location requests, status indicators, error handling, manual request fallback |
| `settings.js` | 522 | Settings | Load/save user profile (Supabase + IndexedDB), clear app cache, version display |
| `archives.js` | 359 | Archives | Fetch submitted reports from Supabase, project filter dropdown, inline PDF viewer (Google Docs Viewer), download link |
| `projects.js` | 322 | Projects | Load projects from IndexedDB, refresh from Supabase, project card rendering, selection handling |
| `sw.js` | 216 | Service Worker | Install (cache static + CDN), activate (cleanup old caches), fetch (cache-first static / network-first API), message handling |

---

## 10. External API Integrations

### Supabase (Primary Backend)
- **URL:** `https://wejwhplqnhciyxbinivx.supabase.co`
- **Auth:** Anonymous key (public access, no user authentication)
- **Services used:** Database (PostgreSQL), Storage (file buckets)
- **Client library:** `@supabase/supabase-js@2` via CDN

### n8n Webhooks (AI Processing)

| Webhook | URL | Purpose |
|---------|-----|---------|
| Report Refinement | `https://advidere.app.n8n.cloud/webhook/fieldvoice-refine-v6.6` | Takes raw field notes → returns structured DOT RPR format with AI-refined sections |
| Project Extraction | `https://advidere.app.n8n.cloud/webhook/fieldvoice-project-extractor-6.5` | Takes uploaded project document → extracts project metadata (name, number, contractor, dates) |

### Open-Meteo (Weather)
- **Endpoint:** `https://api.open-meteo.com/v1/forecast`
- **Parameters:** latitude, longitude, current_weather, daily forecast, Fahrenheit, inches
- **Returns:** High/low temp, precipitation, general conditions
- **Used in:** `quick-interview.js`, `index.js`

### Google Docs Viewer (PDF Display)
- **URL pattern:** `https://docs.google.com/gview?url={pdfUrl}&embedded=true`
- **Used in:** `archives.js` for inline PDF viewing

### CDN Libraries

| Library | Version | CDN | Purpose |
|---------|---------|-----|---------|
| Supabase JS | @2 | `cdn.jsdelivr.net` | Database client |
| Tailwind CSS | Latest | `cdn.tailwindcss.com` | Utility-first CSS (JIT) |
| Font Awesome | 6.4.0 | `cdnjs.cloudflare.com` | Icons (solid, regular, brands) |
| html2canvas | Latest | `cdn.jsdelivr.net` | DOM-to-canvas screenshot |
| jsPDF | Latest | `cdn.jsdelivr.net` | Canvas-to-PDF generation |

---

## 11. Key Business Features

### Core Capabilities

1. **Daily Field Reporting** — Create one report per project per day in DOT RPR (Resident Project Representative) format
2. **Two Capture Modes:**
   - **Guided** — Structured interview with defined sections (weather, work, issues, safety, QA/QC, communications, visitors)
   - **Freeform** — Quick unstructured notes with voice + text
3. **Voice Dictation** — Record voice notes via Web Speech API; speech-to-text transcription for hands-free field use
4. **Photo Documentation** — Camera capture with automatic GPS geotagging, image compression (max 1200px, 70% quality), captions
5. **AI Report Refinement** — Raw field notes sent to n8n webhook; AI refines into professional DOT report format with structured sections
6. **Client-Side PDF Generation** — html2canvas screenshots the final report → jsPDF builds multi-page PDF; no server rendering needed
7. **Full Offline Operation** — IndexedDB stores all data locally; sync queue persists operations; replays automatically on reconnect
8. **Multi-Device Report Locking** — Heartbeat-based lock (active_reports table) prevents simultaneous editing; 30-min auto-release on stale locks
9. **Project & Contractor Management** — Full CRUD for projects and contractors; document import via AI extraction
10. **Weather Auto-Population** — GPS coordinates sent to Open-Meteo API; high/low temp, precipitation, conditions auto-filled
11. **Report Lifecycle Management** — Status flow: draft → pending_refine → refined → ready_to_submit → submitted
12. **Archive & Compliance** — Submitted reports archived with inline PDF viewer, project filtering, download capability
13. **Permission Onboarding** — Step-by-step wizard for mic, camera, location permissions with manual fallback
14. **User Profile / Inspector Signature** — Name, title, company, email, phone stored and auto-applied to reports
15. **PWA Installable** — Add to Home Screen on Android & iOS; runs as standalone app with full offline support

### Personnel Tracking
Each contractor entry tracks headcount by role:
- Superintendents
- Foremen
- Operators
- Laborers
- Surveyors
- Others

### Section Toggle System
Final reports have toggle switches to show/hide sections:
- Contractor Personnel
- Equipment
- Issues / Delays
- Communications
- QA/QC
- Safety Incidents
- Visitors / Deliveries
- Photos

---

## 12. Offline Sync Architecture

### Sync Manager (`js/sync-manager.js`)

**Mode:** `AUTO_SYNC_ENABLED = false` — User controls sync via explicit buttons

**Queued Operation Types:**
- `ENTRY_BACKUP` — Individual entry upsert (debounced 2 seconds)
- `ENTRY_DELETE` — Soft delete entry (is_deleted flag)
- `REPORT_SYNC` — Create/update report record
- `RAW_CAPTURE_SYNC` — Save raw capture data

**Queue Lifecycle:**
1. User edits data → operation queued to `fvp_sync_queue` (localStorage)
2. Queue persists across browser restarts
3. On reconnect → `processOfflineQueue()` replays all operations
4. Failed operations retry up to 3 times with backoff
5. Permanently failed operations are re-queued for manual retry

### Lock Manager (`js/lock-manager.js`)

**Lock Table:** `active_reports` (Supabase)

| Operation | Method | Details |
|-----------|--------|---------|
| Check | `checkLock()` | Returns lock info if held by another device |
| Acquire | `acquireLock()` | UPSERT with device_id + inspector_name |
| Heartbeat | `updateHeartbeat()` | Every 2 minutes via `setInterval` |
| Release | `releaseLock()` | DELETE from active_reports |
| Stale check | Automatic | Locks older than 30 min without heartbeat are overridable |

---

## 13. State Management

**Approach:** No framework — vanilla JavaScript with closure-based page state

```
Supabase (cloud source of truth)
    ↓ (explicit refresh)
localStorage + IndexedDB (local cache)
    ↓ (read on page load)
Page-level variables (runtime state)
    ↓ (render)
DOM (user interface)
    ↓ (user edits)
Page-level variables (modified)
    ↓ (save)
localStorage + IndexedDB (updated)
    ↓ (queue if offline)
Sync queue → Supabase (when online)
```

**Global singletons (window):**
- `window.STORAGE_KEYS` — All localStorage key constants
- `window.supabaseClient` — Database connection
- `window.idb` — IndexedDB API
- All utility functions exposed on `window` for cross-module access

---

## 14. UI & Styling

### Tailwind CSS (CDN, JIT)
Custom color palette configured inline:
| Color | Hex | Usage |
|-------|-----|-------|
| `dot-navy` | `#0a1628` | Primary dark / app background |
| `dot-blue` | `#1e3a5f` | Secondary blue / headers |
| `dot-slate` | `#334155` | Neutral / borders |
| `dot-orange` | `#ea580c` | Warning / emphasis |
| `dot-yellow` | `#f59e0b` | Safety stripe / caution |
| `safety-green` | `#16a34a` | Success / active states |

### Font Awesome 6.4.0
Used for all icons: camera, microphone, location pin, checkmarks, spinners, alerts, navigation arrows, etc.

### Fonts
- System font stack: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif`
- Google Fonts Inter on landing page only

### No Component Library
- No shadcn/ui, Material UI, Bootstrap, or similar
- All UI built from Tailwind CSS utility classes
- Toast notifications, modals, toggles, spinners — all custom implementations

---

## 15. Build & Deployment

| Aspect | Details |
|--------|---------|
| **Build step** | None — vanilla JS deployed directly |
| **Bundler** | None (no Vite, Webpack, Rollup) |
| **Minification** | None |
| **TypeScript** | No — plain JavaScript with JSDoc type annotations |
| **Linting** | No ESLint or Prettier configured |
| **Testing** | No automated tests |
| **Hosting** | GitHub Pages |
| **Deployment** | Push to `main` → auto-deploy |
| **Dev server** | `python -m http.server 8000` or `npx serve .` |
| **Dependencies** | 1 devDependency: `sharp` (icon generation only) |

---

## 16. Summary Statistics

| Category | Count |
|----------|-------|
| **HTML Pages** | 12 |
| **JavaScript Modules** | 22 |
| **Total JS Lines** | 19,033 |
| **Total HTML Lines** | 8,214 |
| **Total SQL Lines** | 384 |
| **Estimated Total LOC** | ~27,631 |
| **Supabase Database Tables** | 12 |
| **Supabase Storage Buckets** | 3 |
| **Database Indexes** | 6 |
| **Database Migrations** | 9 |
| **localStorage Keys** | 26 |
| **IndexedDB Object Stores** | 4 |
| **External API Integrations** | 4 (Supabase, n8n x2, Open-Meteo) |
| **CDN Libraries** | 5 (Supabase JS, Tailwind, Font Awesome, html2canvas, jsPDF) |
| **PWA Icon Variants** | 16 |
| **Service Worker Cache Version** | v1.19.0 |
| **Business Features** | 15 major capabilities |
| **Documentation Files** | 22 |
