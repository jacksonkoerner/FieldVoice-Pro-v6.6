# Photo Flow Audit: quick-interview.js to report.html

**Date:** 2026-02-02
**Status:** Bug Identified
**Severity:** Medium - Photos display correctly in Form View, broken in Original Notes tab

---

## Executive Summary

Photos captured in `quick-interview.js` are properly stored in Supabase Storage and IndexedDB with full URL data. However, when the n8n response's `originalInput` is used in `report.js`, the photos lack URLs because the n8n payload only sends metadata (not storage paths/URLs).

**Root Cause:** Line 184 in `report.js` prioritizes `original?.photos` over `report.photos`, but `original.photos` (from n8n's `originalInput`) has no URL field.

---

## Photo Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                    PHOTO CAPTURE (quick-interview.js)                │
├─────────────────────────────────────────────────────────────────────┤
│  Photo Object Created:                                               │
│  {                                                                   │
│    id, url, base64, storagePath,                                     │
│    caption, timestamp, date, time, gps                               │
│  }                                                                   │
│           │                                                          │
│           ├──→ report.photos (in-memory)     [HAS url]               │
│           ├──→ IndexedDB                     [HAS url/base64]        │
│           └──→ Supabase Storage              [HAS storage_path]      │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    N8N PAYLOAD (buildProcessPayload)                 │
├─────────────────────────────────────────────────────────────────────┤
│  photos: report.photos.map(p => ({                                   │
│    id, caption, timestamp, date, time, gps                           │
│  }))                                                                 │
│                                                                      │
│  ⚠️  url, base64, storagePath are NOT included in payload            │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         N8N RESPONSE                                 │
├─────────────────────────────────────────────────────────────────────┤
│  {                                                                   │
│    originalInput: {                                                  │
│      photos: [{ id, caption, timestamp, date, time, gps }]           │
│      // ⚠️ NO URL - echoes what was sent                             │
│    },                                                                │
│    refinedReport: { ... }                                            │
│  }                                                                   │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    REPORT.JS LOADING                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Source 1: Supabase `photos` table (line 744-755)                    │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │ loadedReport.photos = photosResult.data.map(p => ({            │  │
│  │   id, url: `${SUPABASE_URL}/storage/.../report-photos/${path}`,│  │
│  │   storagePath, caption, date, time, gps                        │  │
│  │ }))                                                            │  │
│  │ ✅ HAS URL                                                     │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  Source 2: originalInput from n8n cache (line 774-780)               │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │ originalInput = cacheData.originalInput;                       │  │
│  │ // originalInput.photos = [{ id, caption, ... }]               │  │
│  │ ❌ NO URL                                                       │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       PHOTO DISPLAY                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  FORM VIEW (renderPhotos - line 1678)                                │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │ const photos = report.photos || [];                            │  │
│  │ src="${photo.url}"   ✅ WORKS                                   │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ORIGINAL NOTES TAB (populateOriginalPhotos - line 184)              │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │ const photos = original?.photos || report.photos || [];        │  │
│  │                ^^^^^^^^^^^^^^^^^                               │  │
│  │                Takes precedence but HAS NO URL!                │  │
│  │ src="${photo.url}"   ❌ BROKEN (photo.url is undefined)         │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## PART 1: Photo Capture (quick-interview.js)

### Where are photos stored during capture?

| Storage Layer | Location | Code Reference | Contains URL? |
|---------------|----------|----------------|---------------|
| In-memory | `report.photos` array | line 3235 | ✅ Yes |
| IndexedDB | via `savePhotoToIndexedDB()` | lines 3437-3454 | ✅ Yes |
| Supabase Storage | `report-photos` bucket | lines 3405-3411 | ✅ (storage_path) |
| Supabase DB | `photos` table | lines 3483-3497 | ✅ (storage_path) |

### Photo Object Structure

```javascript
// Created in handlePhotoInput() - lines 3878-3898
{
  id: "photo_1703001234567_a1b2c3d",     // unique ID
  url: "https://supabase.../public/...", // PUBLIC URL
  base64: "data:image/jpeg;base64,...",  // OFFLINE BACKUP
  storagePath: "reportId/photoId_file",  // STORAGE PATH
  caption: "",
  timestamp: "2024-12-20T09:30:00.000Z",
  date: "12/20/2024",
  time: "9:30 AM",
  gps: { lat: 30.2672, lng: -97.7431, accuracy: 10 },
  fileName: "IMG_001.jpg",
  syncStatus: "synced"
}
```

### Photos sent to n8n (buildProcessPayload - lines 1847-1854)

```javascript
photos: (report.photos || []).map(p => ({
    id: p.id,
    caption: p.caption || '',
    timestamp: p.timestamp,
    date: p.date,
    time: p.time,
    gps: p.gps
    // ⚠️ url, base64, storagePath NOT SENT
}))
```

---

## PART 2: n8n Response Structure

### originalInput echoes input payload (no URLs)

```javascript
{
  success: true,
  captureMode: "guided",
  originalInput: {
    photos: [
      { id, caption, timestamp, date, time, gps }  // NO url!
    ]
    // ... other fields
  },
  refinedReport: { ... }
}
```

### Photo fields in originalInput

| Field | Included? |
|-------|-----------|
| `id` | ✅ |
| `caption` | ✅ |
| `timestamp` | ✅ |
| `date` | ✅ |
| `time` | ✅ |
| `gps` | ✅ |
| `url` | ❌ MISSING |
| `storagePath` | ❌ MISSING |
| `base64` | ❌ MISSING |

---

## PART 3: Photo Display (report.js)

### Photo Sources in report.js

| View | Source | Code | Has URL? |
|------|--------|------|----------|
| Form View | `report.photos` | line 1680 | ✅ Yes |
| Original Notes | `original?.photos \|\| report.photos` | line 184 | ⚠️ Bug |

### Rendering Functions

| View | Function | Element ID |
|------|----------|------------|
| Form View | `renderPhotos()` | `photosContainer` |
| Original Notes | `populateOriginalPhotos()` | `originalPhotosGrid` |

### Form View - Works Correctly

```javascript
// Line 1678
function renderPhotos() {
    const photos = report.photos || [];  // From Supabase - HAS url
    // ... renders with photo.url ✅
}
```

### Original Notes - BROKEN

```javascript
// Line 184
const photos = original?.photos || report.photos || [];
//             ^^^^^^^^^^^^^^^^^
//             Exists but has NO url!

// Line 410
function populateOriginalPhotos(photos) {
    container.innerHTML = photos.map((photo, index) => `
        <img src="${photo.url}" ...>  // ❌ photo.url is undefined
    `).join('');
}
```

---

## PART 4: The Bug

### Location

**File:** `js/report.js`
**Line:** 184
**Function:** `populateOriginalNotes()`

### Problem Code

```javascript
const photos = original?.photos || report.photos || [];
```

When `original.photos` exists (always after n8n processing), it takes precedence - but it has **NO URL**.

### Why Form View Works

`renderPhotos()` uses `report.photos` directly, which is loaded from Supabase with constructed URLs (lines 744-755).

### Why Original Notes Fails

`populateOriginalNotes()` uses `original?.photos` first, which comes from n8n's `originalInput` - these photos have only metadata, no URLs.

---

## Recommended Fix

### Option A: Merge URLs from report.photos into original.photos

```javascript
// In populateOriginalNotes() - around line 183-185
// Merge URLs from report.photos into original.photos metadata
const originalPhotos = original?.photos || [];
const reportPhotos = report.photos || [];

const photosWithUrls = originalPhotos.length > 0
    ? originalPhotos.map(op => {
        const matchingPhoto = reportPhotos.find(rp => rp.id === op.id);
        return {
            ...op,
            url: matchingPhoto?.url || ''
        };
      })
    : reportPhotos;

populateOriginalPhotos(photosWithUrls);
```

### Option B: Always use report.photos for display (simpler)

```javascript
// Always use report.photos which has URLs
const photos = report.photos || [];
populateOriginalPhotos(photos);
```

---

## Files Affected

| File | Lines | Purpose |
|------|-------|---------|
| `js/quick-interview.js` | 1847-1854 | Payload building (sends metadata only) |
| `js/report.js` | 184 | Bug location - wrong photo source priority |
| `js/report.js` | 410-427 | `populateOriginalPhotos()` expects URL |

---

## Testing Checklist

- [ ] After fix, Original Notes tab shows photos with proper images
- [ ] Form View continues to display photos correctly
- [ ] Photos in both views have correct captions, dates, times
- [ ] GPS coordinates display properly where available
- [ ] Fix works for both Guided and Freeform capture modes
