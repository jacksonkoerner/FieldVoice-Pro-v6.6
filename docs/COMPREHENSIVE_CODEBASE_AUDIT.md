# FieldVoice Pro v6.6 - Comprehensive Codebase Audit

**Generated:** 2026-02-01
**Version:** 6.6
**Type:** Progressive Web Application (PWA)
**Purpose:** Voice-powered daily field reporting system for DOT construction projects

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Application Overview](#application-overview)
3. [Technology Stack](#technology-stack)
4. [Project Structure](#project-structure)
5. [Page-by-Page Breakdown](#page-by-page-breakdown)
6. [JavaScript Module Architecture](#javascript-module-architecture)
7. [Supabase Integration](#supabase-integration)
8. [Data Flow & State Management](#data-flow--state-management)
9. [Authentication System](#authentication-system)
10. [Styling & CSS Architecture](#styling--css-architecture)
11. [PWA Features](#pwa-features)
12. [External Integrations](#external-integrations)
13. [Security Considerations](#security-considerations)
14. [Known Issues & Technical Debt](#known-issues--technical-debt)

---

## Executive Summary

**FieldVoice Pro** is a mobile-optimized Progressive Web Application designed for construction field inspectors (specifically RPR - Resident Project Representatives) to create DOT-compliant daily field reports. The application uses a **local-first architecture** with IndexedDB for offline capability and Supabase for cloud backup.

### Key Features
- Voice dictation for hands-free field note capture
- Photo documentation with GPS tagging
- AI-powered report generation (via N8N webhooks)
- DOT-compliant report formatting
- Offline-first with cloud sync
- Multi-device conflict prevention (lock system)
- Contractor and equipment tracking per report

### Core Workflow
1. Inspector creates a project with contractor list
2. Each day, inspector starts a new daily report
3. Captures notes via voice (Quick Notes or Guided Sections mode)
4. Takes photos with GPS coordinates
5. Submits to AI for structured report generation
6. Reviews and edits AI-generated content
7. Submits final DOT-compliant report

---

## Application Overview

### What This App Does

FieldVoice Pro solves a common problem in construction: **field inspectors need to document daily activities, but traditional paper forms are slow and error-prone**. This app lets inspectors:

1. **Dictate notes** using their phone's native keyboard dictation
2. **Take geotagged photos** of work progress
3. **Track contractors and equipment** on each job
4. **Generate professional reports** via AI processing
5. **Work offline** and sync when connected

### Target Users
- **Resident Project Representatives (RPRs)** - Field inspectors for DOT projects
- **Construction supervisors** - Document daily site activities
- **Quality assurance personnel** - Track QA/QC observations

### Report Types Generated
- Daily RPR Reports (DOT-compliant format)
- Includes: Weather, work performed, contractors, equipment, safety, photos

---

## Technology Stack

### Frontend
| Technology | Purpose | Version |
|------------|---------|---------|
| **HTML5** | Page structure | - |
| **Vanilla JavaScript** | Application logic | ES6+ |
| **Tailwind CSS** | Styling (via CDN) | Latest |
| **Font Awesome** | Icons (via CDN) | 6.4.0 |

### Backend/Data
| Technology | Purpose | Details |
|------------|---------|---------|
| **Supabase** | Cloud database & storage | PostgreSQL-based |
| **IndexedDB** | Local offline storage | Browser API |
| **localStorage** | Settings & flags | Browser API |

### PWA Features
| Feature | Implementation |
|---------|---------------|
| **Service Worker** | `js/sw.js` - Offline caching |
| **Web App Manifest** | `manifest.json` - Install prompts |
| **Offline Support** | IndexedDB + Service Worker |

### External Services
| Service | Purpose | Endpoint |
|---------|---------|----------|
| **N8N Workflows** | AI processing | `advidere.app.n8n.cloud` |
| **Supabase Storage** | Photo & logo storage | Supabase buckets |

---

## Project Structure

```
FieldVoice-Pro-v6.6/
├── index.html                    # Dashboard/Home page
├── quick-interview.html          # Field note capture (51KB - largest HTML)
├── report.html                   # AI-populated report editor
├── finalreview.html              # Final review & print view
├── archives.html                 # Historical reports
├── drafts.html                   # Draft management
├── projects.html                 # Project list
├── project-config.html           # Project & contractor setup
├── settings.html                 # Inspector profile
├── permissions.html              # Device permission setup
├── permission-debug.html         # Permission troubleshooting
├── admin-debug.html              # Admin/debug tools
├── landing.html                  # Marketing/onboarding page
│
├── js/                           # JavaScript modules (23 files, ~17K lines)
│   ├── config.js                 # Supabase initialization
│   ├── storage-keys.js           # localStorage key management
│   ├── report-rules.js           # Business logic validation
│   ├── supabase-utils.js         # Data conversion utilities
│   ├── sync-manager.js           # Offline sync queue
│   ├── lock-manager.js           # Multi-device edit locking
│   ├── data-layer.js             # Data access abstraction
│   ├── indexeddb-utils.js        # IndexedDB operations
│   ├── ui-utils.js               # Toast, escaping, formatting
│   ├── media-utils.js            # Photo/GPS utilities
│   ├── pwa-utils.js              # Service worker management
│   ├── sw.js                     # Service worker
│   ├── index.js                  # Dashboard logic
│   ├── quick-interview.js        # Note capture (4,879 lines - largest)
│   ├── report.js                 # Report editing (2,275 lines)
│   ├── finalreview.js            # Final review (1,384 lines)
│   ├── project-config.js         # Project management (1,139 lines)
│   ├── settings.js               # Profile management
│   ├── permissions.js            # Permission flow
│   ├── archives.js               # Archive display
│   ├── drafts.js                 # Draft management
│   ├── projects.js               # Project list
│   └── generate-icons.js         # Build-time icon generator
│
├── supabase/                     # Database configuration
│   └── migrations/               # SQL migration files
│       ├── 20260127000000_create_all_tables.sql
│       ├── 20260127100000_add_user_profiles.sql
│       ├── 20260128220000_drop_equipment_table.sql
│       ├── 20260128225300_add_inspector_name_column.sql
│       ├── 20260129062218_add_sync_constraints.sql
│       ├── 20260129064435_add_report_entries_columns.sql
│       └── 20260129071323_add_report_toggle_columns.sql
│
├── assets/                       # Favicons and branding
├── icons/                        # PWA icons (72px-512px, standard + maskable)
├── docs/                         # Documentation
├── manifest.json                 # PWA manifest
└── package.json                  # NPM config (Sharp for icon generation)
```

---

## Page-by-Page Breakdown

### 1. Dashboard (`index.html`)
**Purpose:** Main entry point and navigation hub

**Features:**
- Display current date and weather conditions
- Show active project with quick-access
- Display report cards by urgency (late, drafts, ready, submitted)
- Navigate to archives, drafts, settings
- Project picker modal

**Key UI Elements:**
- Weather widget (syncs via N8N or manual)
- Active project card with "Begin Daily Report" button
- Report urgency cards (color-coded)
- Permissions banner (if not setup)

**JavaScript:** `js/index.js` (755 lines)

**How It Works:**
1. On load, checks for active project in localStorage
2. Loads projects from IndexedDB (falls back to Supabase)
3. Categorizes reports by urgency via `getReportsByUrgency()`
4. Renders cards with navigation links

---

### 2. Quick Interview (`quick-interview.html`)
**Purpose:** Field data capture - the core of the app

**Features:**
- **Two capture modes:**
  - **Quick Notes**: Single text box + photos (AI organizes later)
  - **Guided Sections**: Structured form with expandable sections
- Voice dictation via native keyboard
- Photo capture with GPS tagging
- Contractor and equipment selection
- Personnel count entry
- Auto-save every 10 seconds
- Real-time backup to Supabase

**Guided Sections:**
1. Weather (conditions, temps, precipitation)
2. Work Activities (with contractor assignment)
3. Personnel (counts by contractor)
4. Equipment Used
5. Issues & Delays
6. Communications
7. QA/QC Observations
8. Safety Observations
9. Visitors & Deliveries
10. Photos

**JavaScript:** `js/quick-interview.js` (4,879 lines - largest file)

**How It Works:**
1. User selects capture mode (minimal or guided)
2. For guided mode, sections expand/collapse
3. Each entry auto-saves to localStorage
4. Entries sync to Supabase via `sync-manager.js`
5. Photos compressed and uploaded to Supabase Storage
6. "Finish" button sends to N8N for AI processing
7. Redirects to `report.html` when AI response ready

---

### 3. Report Editor (`report.html`)
**Purpose:** Review and edit AI-generated report content

**Features:**
- **Form View**: Editable DOT-compliant fields
- **Original Notes Tab**: Read-only raw capture data
- Two-way sync between form and storage
- User edit highlighting (yellow background)
- Auto-save on field blur
- "Re-refine" option to send back to AI

**DOT Report Sections:**
- Executive Summary
- Work Performed
- Contractor Personnel Table
- Equipment Used Table
- Safety Observations
- Delays & Issues
- Materials Used
- QA/QC Notes
- Communications
- Visitors/Deliveries
- Inspector Notes
- Photo Documentation

**JavaScript:** `js/report.js` (2,275 lines)

**How It Works:**
1. Loads report from localStorage or Supabase
2. Checks for AI response from `ai_responses` table
3. Populates form with AI-generated content
4. User edits trigger auto-save (debounced)
5. "Next" button navigates to final review

---

### 4. Final Review (`finalreview.html`)
**Purpose:** Print-ready DOT-compliant report view

**Features:**
- Read-only formatted report
- DOT RPR Daily Report styling
- Page breaks for printing
- Section toggles (show/hide optional sections)
- Submit button (saves to `final_reports` table)
- Print-optimized CSS

**JavaScript:** `js/finalreview.js` (1,384 lines)

**How It Works:**
1. Loads final report data from storage
2. Renders in DOT-compliant format
3. Applies print styling via CSS
4. Submit saves to Supabase and marks as "submitted"
5. Redirects to dashboard with success banner

---

### 5. Archives (`archives.html`)
**Purpose:** View historical submitted reports

**Features:**
- List all submitted reports (newest first)
- Filter by project
- Swipe-to-delete (with confirmation)
- Photo count display
- Refresh from cloud button

**JavaScript:** `js/archives.js` (424 lines)

**How It Works:**
1. Loads from IndexedDB first
2. Falls back to Supabase if needed
3. Displays with date, project name, photo count
4. Delete cascades via Supabase foreign keys

---

### 6. Drafts (`drafts.html`)
**Purpose:** Manage unsaved/in-progress reports

**Features:**
- List drafts from localStorage
- Show status badge (draft, pending_refine, refined)
- Last-saved timestamp
- Delete with confirmation

**JavaScript:** `js/drafts.js` (231 lines)

---

### 7. Projects List (`projects.html`)
**Purpose:** View and select active project

**Features:**
- List all projects with status
- Show contractor count per project
- Select active project (stored to localStorage)
- Navigate to project-config for editing

**JavaScript:** `js/projects.js` (323 lines)

---

### 8. Project Configuration (`project-config.html`)
**Purpose:** Create and manage projects

**Features:**
- **Project Details**: Name, project numbers, dates, location
- **Logo Upload**: Drag-drop with compression
- **Document Import**: PDF/DOCX extraction via N8N
- **Contractor Management**: Add, edit, remove contractors
- Drag-drop reordering

**Contractor Fields:**
- Name, Company, Abbreviation
- Type (Prime, Sub, Supplier)
- Trades
- Status (Active, Removed)

**JavaScript:** `js/project-config.js` (1,139 lines)

**How It Works:**
1. Load project and contractors from IndexedDB/Supabase
2. Document import sends file to N8N webhook for extraction
3. Logo upload compresses and stores to Supabase Storage
4. Save writes to IndexedDB first, then syncs to Supabase

---

### 9. Settings (`settings.html`)
**Purpose:** Configure inspector profile

**Features:**
- Personal info (name, title, company, email, phone)
- Signature preview
- Unsaved changes warning
- Refresh from cloud
- Reset all data (admin function)

**JavaScript:** `js/settings.js` (522 lines)

---

### 10. Permissions (`permissions.html`)
**Purpose:** Request device permissions

**Features:**
- Sequential permission flow (mic → camera → location)
- OS/browser-specific instructions
- Error handling with codes
- Skip options
- Retry helpers

**Permissions Requested:**
1. Microphone (for dictation)
2. Camera (for photos)
3. Geolocation (for GPS tagging)

**JavaScript:** `js/permissions.js` (785 lines)

---

### 11. Debug Pages
**`permission-debug.html`** - Tests individual permissions
**`admin-debug.html`** - Data investigation, cache inspection

---

### 12. Landing Page (`landing.html`)
**Purpose:** Marketing and onboarding for new users

**Features:**
- Feature overview
- PWA install instructions
- Call-to-action buttons

---

## JavaScript Module Architecture

### Module Loading Order (Critical)
```html
<!-- Order matters - dependencies must load first -->
<script src="@supabase/supabase-js@2"></script>  <!-- CDN -->
<script src="./js/config.js"></script>            <!-- Supabase init -->
<script src="./js/storage-keys.js"></script>      <!-- Storage helpers -->
<script src="./js/report-rules.js"></script>      <!-- Business logic -->
<script src="./js/supabase-utils.js"></script>    <!-- Data converters -->
<script src="./js/sync-manager.js"></script>      <!-- Offline sync -->
<script src="./js/ui-utils.js"></script>          <!-- UI helpers -->
<script src="./js/indexeddb-utils.js"></script>   <!-- IndexedDB -->
<script src="./js/data-layer.js"></script>        <!-- Data access -->
<script src="./js/[page].js"></script>            <!-- Page-specific -->
```

### Module Descriptions

#### Core Infrastructure

**`config.js`** (8 lines)
- Supabase URL and anonymous key
- Creates global `supabaseClient`

**`storage-keys.js`** (346 lines)
- Defines all localStorage keys (20+)
- Helper functions: `getStorageItem()`, `setStorageItem()`, `removeStorageItem()`
- Sync queue management
- Device ID generation

**`report-rules.js`** (612 lines)
- Business logic validation (pure functions)
- Constants: `REPORT_STATUS`, `CAPTURE_MODE`, `GUIDED_SECTIONS`
- Project eligibility: `canStartNewReport()`
- Status flow: `canTransitionStatus()`, `isReportEditable()`
- Validation: `validateReportForAI()`, `validateReportForSubmit()`

#### Data Layer

**`supabase-utils.js`** (725 lines)
- Data converters between Supabase (snake_case) and JS (camelCase)
- `fromSupabaseProject()` / `toSupabaseProject()`
- `fromSupabaseReport()` / `toSupabaseReport()`
- Similar for contractors, entries, photos, etc.

**`data-layer.js`** (604 lines)
- Single source of truth for data operations
- IndexedDB-first, Supabase-fallback pattern
- Project loading with contractors join
- User profile management
- Report sync status

**`indexeddb-utils.js`** (584 lines)
- Database: `fieldvoice-pro`, version 2
- Stores: `projects`, `userProfile`, `photos`, `archives`
- CRUD operations for each store

**`sync-manager.js`** (435 lines)
- Entry backup: `queueEntryBackup()` (debounced)
- Report syncing: `syncReport()`, `syncRawCapture()`
- Offline queue: `processOfflineQueue()`

**`lock-manager.js`** (328 lines)
- Prevents simultaneous editing
- 30-minute lock timeout, 2-minute heartbeat
- Uses `active_reports` table

#### Utilities

**`ui-utils.js`** (188 lines)
- `escapeHtml()` - XSS prevention
- `generateId()` - UUID generation
- `showToast()` - Notifications
- `formatDate()`, `formatTime()`
- Textarea auto-expansion

**`media-utils.js`** (283 lines)
- Image compression (max 1200px)
- Logo upload/delete
- GPS capture with accuracy checking

**`pwa-utils.js`** (155 lines)
- Service worker registration
- Offline banner management
- Update notifications

---

## Supabase Integration

### Database Tables (11 Active)

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `projects` | Project metadata | id, project_name, location, status |
| `contractors` | Contractors per project | project_id (FK), name, company, type |
| `reports` | Daily report records | project_id (FK), report_date, status |
| `report_entries` | Individual field entries | report_id (FK), section, content |
| `report_raw_capture` | Raw field data (1:1) | report_id (FK), raw_data (JSONB) |
| `ai_responses` | AI-generated content (1:1) | report_id (FK), generated_content (JSONB) |
| `final_reports` | Submitted reports | report_id (FK), all DOT fields |
| `photos` | Photo metadata | report_id (FK), storage_path, caption |
| `user_profiles` | Inspector info | full_name, title, company |
| `active_reports` | Edit locks | project_id, device_id, locked_at |
| `equipment` | (DEPRECATED) | - |

### Storage Buckets

| Bucket | Purpose | Naming Pattern |
|--------|---------|----------------|
| `project-logos` | Project logos | `{projectId}.{ext}` |
| `report-photos` | Report photos | `{reportId}/{photoId}_{filename}` |

### Query Patterns

**Joins:**
```javascript
supabaseClient.from('projects').select('*, contractors(*)');
```

**Upserts:**
```javascript
supabaseClient.from('reports').upsert(data, { onConflict: 'id' });
```

**Real-time:** NOT IMPLEMENTED (all HTTP-based)

### Row-Level Security
```sql
-- Currently PERMISSIVE for development
CREATE POLICY "Allow all access" ON table FOR ALL USING (true);
```
**Warning:** Must be tightened for production multi-user deployment.

---

## Data Flow & State Management

### Storage Tiers

```
┌─────────────────────────────────────────────────────────┐
│                      USER DEVICE                        │
├─────────────────────────────────────────────────────────┤
│  Tier 1: localStorage (~5MB limit)                      │
│  ├── Device ID, User ID                                 │
│  ├── Permission flags                                   │
│  ├── Active project ID                                  │
│  ├── UI state (banners, hints)                          │
│  └── Sync queue                                         │
├─────────────────────────────────────────────────────────┤
│  Tier 2: IndexedDB (unlimited, offline-capable)         │
│  ├── Projects with contractors (cached)                 │
│  ├── User profile (cached)                              │
│  ├── Archives (submitted reports)                       │
│  └── Photos (metadata + blobs)                          │
└─────────────────────────────────────────────────────────┘
                          │
                          │ Sync (on save, on online)
                          ▼
┌─────────────────────────────────────────────────────────┐
│                     SUPABASE CLOUD                      │
├─────────────────────────────────────────────────────────┤
│  PostgreSQL Database                                    │
│  ├── All tables (source of truth)                       │
│  └── RLS policies (currently permissive)                │
├─────────────────────────────────────────────────────────┤
│  Storage Buckets                                        │
│  ├── project-logos                                      │
│  └── report-photos                                      │
└─────────────────────────────────────────────────────────┘
```

### Report Lifecycle Flow

```
1. CREATE REPORT
   index.html → Click "Begin Daily Report"
   ↓
   Check canStartNewReport(projectId)
   ↓
   Navigate to quick-interview.html

2. CAPTURE DATA
   quick-interview.html → Select capture mode
   ↓
   Enter notes (dictation or typing)
   ↓
   Take photos (GPS tagged)
   ↓
   Auto-save every 10 seconds
   ↓
   Entries sync to Supabase

3. SUBMIT TO AI
   Click "Finish" → validateReportForAI()
   ↓
   Send to N8N webhook
   ↓
   Status: draft → pending_refine
   ↓
   Wait for AI response

4. REVIEW AI OUTPUT
   report.html → Load AI response
   ↓
   Status: pending_refine → refined
   ↓
   Edit fields (auto-save)
   ↓
   Click "Next"

5. FINAL REVIEW
   finalreview.html → Read-only view
   ↓
   Click "Submit"
   ↓
   Status: refined → submitted
   ↓
   Save to final_reports table

6. ARCHIVE
   Submitted reports visible in archives.html
```

---

## Authentication System

### Current Implementation: Device-Based (No Login)

```javascript
// Generate device ID on first visit
function getDeviceId() {
  let deviceId = localStorage.getItem('fvp_device_id');
  if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem('fvp_device_id', deviceId);
  }
  return deviceId;
}
```

**Key Points:**
- No username/password login
- No OAuth or social login
- Device identified by UUID in localStorage
- Optional user profile (name, title, etc.)
- Supabase uses anonymous key

### No Protected Routes
All pages are publicly accessible. No authentication guards exist.

### No Logout Mechanism
Users cannot sign out or switch accounts.

### Security Implications
- Single-user per device model
- Data visible to all users with URL
- Suitable for trusted internal use only
- Must implement proper auth for multi-user

---

## Styling & CSS Architecture

### Tailwind CSS (CDN)
```html
<script src="https://cdn.tailwindcss.com"></script>
```

### Custom Theme Colors
```javascript
tailwind.config = {
  theme: {
    extend: {
      colors: {
        'dot-navy': '#0a1628',     // Primary brand
        'dot-blue': '#1e3a5f',     // Secondary
        'dot-slate': '#334155',    // Neutral
        'dot-orange': '#ea580c',   // Warning/accent
        'dot-yellow': '#f59e0b',   // Highlight
        'safety-green': '#16a34a', // Success
      }
    }
  }
}
```

### Common Patterns

**Header Stripe:**
```css
.header-stripe {
  background: repeating-linear-gradient(
    -45deg,
    #f59e0b,
    #f59e0b 10px,
    #0a1628 10px,
    #0a1628 20px
  );
  height: 4px;
}
```

**Safe Area Insets (iOS notch support):**
```css
body {
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
}
```

**Print Optimization:**
```css
@media print {
  .screen-header { display: none; }
  .page { box-shadow: none; margin: 0; }
}
```

---

## PWA Features

### Manifest (`manifest.json`)
```json
{
  "name": "FieldVoice Pro",
  "short_name": "FieldVoice",
  "display": "standalone",
  "orientation": "portrait-primary",
  "theme_color": "#0a1628",
  "start_url": "./index.html",
  "scope": "./"
}
```

### Service Worker (`js/sw.js`)
- Cache-first strategy for static assets
- Network-first for API calls
- Offline fallback page
- Cache versioning for updates

### Offline Capabilities
- Projects cached to IndexedDB
- Reports saved locally first
- Sync queue for pending uploads
- Offline banner notification

---

## External Integrations

### N8N Workflows

**Document Extractor:**
```
Endpoint: https://advidere.app.n8n.cloud/webhook/fieldvoice-project-extractor-6.5
Purpose: Extract project details from PDF/DOCX uploads
Input: File upload
Output: Project name, numbers, dates, contractors
```

**Report Refiner (AI):**
```
Endpoint: https://advidere.app.n8n.cloud/webhook/fieldvoice-refine-v6.6
Purpose: Generate structured report from raw notes
Input: Raw capture data, photos, weather
Output: DOT-compliant report sections
```

### Supabase Services
- Database (PostgreSQL)
- Storage (S3-compatible buckets)
- Auth (anonymous key only)

---

## Security Considerations

### Current Vulnerabilities

1. **No Authentication**
   - Anyone with URL can access all data
   - Anonymous Supabase key exposed in `config.js`

2. **Permissive RLS Policies**
   ```sql
   -- All tables have this:
   CREATE POLICY "Allow all" FOR ALL USING (true);
   ```

3. **No Input Sanitization**
   - XSS prevention via `escapeHtml()` in `ui-utils.js`
   - SQL injection prevented by Supabase client

4. **Exposed API Keys**
   - Supabase anon key in source code
   - N8N webhook URLs visible

### Recommendations for Production

1. Implement proper Supabase Auth (email/password or OAuth)
2. Tighten RLS policies based on `auth.uid()`
3. Move API keys to environment variables
4. Add rate limiting to N8N webhooks
5. Implement session timeout
6. Add CSRF protection

---

## Known Issues & Technical Debt

### Deprecated Code
- **Equipment table** dropped but still referenced in code
- **`final_report_sections`** table referenced but not defined

### Missing Features
- No real-time subscriptions (all polling/manual refresh)
- No transaction support for multi-table operations
- No automated testing

### Technical Debt
1. Large single files (quick-interview.js is 4,879 lines)
2. Global variables via `window.*` instead of modules
3. Mixed async patterns (callbacks + promises)
4. Inconsistent error handling

### Known Bugs
- Lock cleanup relies on client heartbeat (can leave stale locks)
- Photo storage paths not cleaned up on report delete failure

---

## Appendix: Storage Keys Reference

```javascript
const STORAGE_KEYS = {
  // Core identifiers
  DEVICE_ID: 'fvp_device_id',
  USER_ID: 'fvp_user_id',

  // Data
  PROJECTS: 'fvp_projects',
  CURRENT_REPORTS: 'fvp_current_reports',
  ACTIVE_PROJECT_ID: 'fvp_active_project_id',

  // Permissions
  MIC_GRANTED: 'fvp_mic_granted',
  CAM_GRANTED: 'fvp_cam_granted',
  LOC_GRANTED: 'fvp_loc_granted',
  SPEECH_GRANTED: 'fvp_speech_granted',
  ONBOARDED: 'fvp_onboarded',

  // UI state
  BANNER_DISMISSED: 'fvp_banner_dismissed',
  DICTATION_HINT_DISMISSED: 'fvp_dictation_hint_dismissed',

  // Sync
  SYNC_QUEUE: 'fvp_sync_queue',
  LAST_SYNC: 'fvp_last_sync'
};
```

---

## Appendix: Report Status Flow

```
┌─────────┐     ┌────────────────┐     ┌─────────┐     ┌───────────┐
│  draft  │ ──▶ │ pending_refine │ ──▶ │ refined │ ──▶ │ submitted │
└─────────┘     └────────────────┘     └─────────┘     └───────────┘
     │                  │                   │                │
     │ User edits       │ AI processes      │ User reviews   │ Final
     │ notes/photos     │ raw data          │ & edits        │ archive
     │                  │                   │                │
     ▼                  ▼                   ▼                ▼
  Editable          Read-only           Editable         Read-only
```

---

*This audit was generated as part of the FieldVoice Pro v6.6 codebase review.*
