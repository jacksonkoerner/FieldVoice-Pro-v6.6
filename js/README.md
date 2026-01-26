# FieldVoice Pro - Shared JavaScript Modules

> Quick reference for AI-assisted development. Before adding a function to an HTML file, check if it exists here.

## Module Overview

| File | Purpose | Import After |
|------|---------|--------------|
| config.js | Supabase client + constants | Supabase CDN |
| supabase-utils.js | Data converters | config.js |
| pwa-utils.js | Offline/PWA features | (standalone) |
| ui-utils.js | UI helpers | (standalone) |
| media-utils.js | Photo/GPS utilities | (standalone) |
| sw.js | Service worker | (loaded by pwa-utils.js) |

---

## config.js

**Exports:** `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `supabaseClient`, `ACTIVE_PROJECT_KEY`

**Used by:** All pages with Supabase

**Import:**
```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="./js/config.js"></script>
```

---

## supabase-utils.js

**Exports:**
- `fromSupabaseProject(row)` - Convert DB row → JS object
- `fromSupabaseContractor(row)`
- `fromSupabaseEquipment(row)`
- `toSupabaseProject(project)` - Convert JS object → DB row
- `toSupabaseContractor(contractor, projectId)`
- `toSupabaseEquipment(equipment, projectId)`
- `toSupabaseReport(report, projectId, userSettings)`
- `toSupabaseRawCapture(report, reportId)`
- `toSupabaseContractorWork(activity, reportId)`
- `toSupabasePersonnel(ops, reportId)`
- `toSupabaseEquipmentUsage(equip, reportId)`
- `toSupabasePhoto(photo, reportId)`

**Used by:** index, quick-interview, report, finalreview, project-config

**Import:** After config.js
```html
<script src="./js/supabase-utils.js"></script>
```

---

## pwa-utils.js

**Exports:**
- `initPWA(options)` - Initialize all PWA features

**Options:**
```javascript
initPWA();                                    // Basic usage
initPWA({ onOnline: callback });              // Custom online handler
initPWA({ onOffline: callback });             // Custom offline handler
initPWA({ skipServiceWorker: true });         // Skip SW registration
```

**Used by:** Most pages (9 total)

**Import:**
```html
<script src="./js/pwa-utils.js"></script>
<script>initPWA();</script>
```

---

## ui-utils.js

**Exports:**
- `escapeHtml(str)` - XSS-safe HTML escaping
- `generateId()` - UUID generation
- `showToast(message, type)` - Toast notifications (success/warning/error/info)
- `formatDate(dateStr, format)` - Date formatting (short/long/numeric)
- `formatTime(timeStr)` - Time formatting
- `autoExpand(textarea, minHeight, maxHeight)` - Auto-resize textarea
- `initAutoExpand(textarea, minHeight, maxHeight)` - Setup auto-expand listeners
- `initAllAutoExpandTextareas(minHeight, maxHeight)` - Init all .auto-expand textareas

**Used by:** Most pages

**Import:**
```html
<script src="./js/ui-utils.js"></script>
```

---

## media-utils.js

**Exports:**
- `readFileAsDataURL(file)` - Read file as base64
- `dataURLtoBlob(dataURL)` - Convert data URL to Blob
- `compressImage(dataUrl, maxWidth, quality)` - Compress image
- `getHighAccuracyGPS(onWeakSignal)` - Get GPS coordinates

**Used by:** quick-interview.html

**Import:**
```html
<script src="./js/media-utils.js"></script>
```

---

## sw.js (Service Worker)

**Purpose:** Handles offline caching and network requests.

**Not imported directly** - Loaded via `pwa-utils.js` → `initPWA()`

**Cache version:** Check `CACHE_VERSION` constant when debugging cache issues.

---

## Rules for Claude Code

1. **Before adding a function to HTML** → Check if it exists here
2. **Function needed in 2+ files** → It belongs in /js/
3. **Never duplicate** → Supabase config, converters, or utilities
4. **New shared function?** → Add to appropriate module, update this README
