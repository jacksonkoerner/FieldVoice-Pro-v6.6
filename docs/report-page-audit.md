# Comprehensive Audit: report.html and report.js Data Flow

**Date:** 2026-02-01
**Version:** v6.6

---

## PART 1: How Data Arrives

### 1. URL Parameters Expected

**File:** `js/report.js:404-408, 415-416, 429-438`

```javascript
function getReportDateStr() {
    const params = new URLSearchParams(window.location.search);
    const dateParam = params.get('date');
    return dateParam || new Date().toISOString().split('T')[0];
}
```

| Parameter | Purpose | Required | Default |
|-----------|---------|----------|---------|
| `date` | Report date (YYYY-MM-DD) | No | Today's date |
| `reportId` | Direct report UUID lookup | No | None (lookup by project+date) |

### 2. Initialization Flow on DOMContentLoaded

**File:** `js/report.js:29-77`

```javascript
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Load project and user settings from Supabase (in parallel)
    const [projectResult, settingsResult] = await Promise.all([
        window.dataLayer.loadActiveProject(),   // From data-layer.js
        window.dataLayer.loadUserSettings()     // From data-layer.js
    ]);
    activeProject = projectResult;
    userSettings = settingsResult;

    // 2. Extract contractors from active project
    if (activeProject) {
        projectContractors = activeProject.contractors || [];
    }

    // 3. Load report data from Supabase
    report = await loadReport();   // Main report loading

    // 4. Initialize user edits tracking
    if (!report.userEdits) report.userEdits = {};
    userEdits = report.userEdits;

    // 5. Mark report as viewed
    if (!report.meta) report.meta = {};
    report.meta.reportViewed = true;
    await saveReportSilent();

    // 6. Populate all fields from loaded data
    populateAllFields();

    // 7. Populate original notes view
    populateOriginalNotes();

    // 8. Check for pending refine status
    checkPendingRefineStatus();

    // 9. Setup auto-save listeners
    setupAutoSave();

    // 10. Initialize auto-expand textareas
    initAllAutoExpandTextareas();

    // 11. Update header date
    updateHeaderDate();

    // 12. Initialize debug panel
    initializeDebugPanel();
});
```

### 3. Data Sources and Load Order

| Priority | Source | Function | What It Provides |
|----------|--------|----------|------------------|
| 1 | localStorage | `STORAGE_KEYS.ACTIVE_PROJECT_ID` | Active project ID |
| 2 | IndexedDB | `window.idb.getProject()` | Active project + contractors |
| 3 | Supabase | `loadActiveProject()` fallback | If not in IndexedDB |
| 4 | Supabase | `loadReport()` | Report data by ID or project+date |
| 5 | localStorage | `fvp_ai_response_{reportId}` | Cached AI response (temporary) |
| 6 | Supabase | `ai_responses` table | AI-generated content |

### 4. localStorage Keys Read

**File:** `js/storage-keys.js:15-38` and `js/report.js:563-588`

| Key | Purpose | Read Location |
|-----|---------|---------------|
| `fvp_active_project_id` | Get active project UUID | `data-layer.js:113` |
| `fvp_device_id` | Device identification | `data-layer.js:232` |
| `fvp_ai_response_{reportId}` | Cached AI response | `report.js:564-588` |

### 5. Supabase Queries on Load

**File:** `js/report.js:410-626`

```javascript
// Query 1: Load report by ID (if reportId param exists)
supabaseClient.from('reports').select('*').eq('id', reportIdParam).single();

// Query 2: Load report by project_id + date (fallback)
supabaseClient.from('reports')
    .select('*')
    .eq('project_id', activeProject.id)
    .eq('report_date', reportDateStr)
    .single();

// Query 3: Load related data in parallel
const [rawCaptureResult, photosResult, aiResponseResult] = await Promise.all([
    supabaseClient.from('report_raw_capture').select('*').eq('report_id', reportRow.id).maybeSingle(),
    supabaseClient.from('photos').select('*').eq('report_id', reportRow.id).order('created_at'),
    supabaseClient.from('ai_responses').select('*').eq('report_id', reportRow.id)
        .order('received_at', { ascending: false }).limit(1).maybeSingle()
]);
```

---

## PART 2: Expected Data Structures

### 1. Project Info

**Source:** `activeProject` from `window.dataLayer.loadActiveProject()`

**File:** `js/report.js:634-656` (`createFreshReport`)

```javascript
// Accessed via activeProject object:
activeProject?.projectName          // Line 635, 809
activeProject?.noabProjectNo        // Line 636, 810
activeProject?.cnoSolicitationNo    // Line 637, 811
activeProject?.location             // Line 638, 854
activeProject?.noticeToProceed      // Line 816
activeProject?.contractDuration     // Line 821-822
activeProject?.expectedCompletion   // Line 827
activeProject?.contractDayNo        // Line 640, 832
activeProject?.weatherDays          // Line 641, 841
activeProject?.engineer             // Line 642, 855
activeProject?.primeContractor      // Line 643, 856
activeProject?.defaultStartTime     // Line 644, 859
activeProject?.defaultEndTime       // Line 645, 860
activeProject?.logoUrl              // Line 800
activeProject?.logoThumbnail        // Line 800
activeProject?.logo                 // Line 800 (legacy)
```

### 2. Contractors

**Source:** `projectContractors` array

**File:** `js/report.js:39-40, 982-1061`

```javascript
// Loaded from activeProject:
projectContractors = activeProject.contractors || [];

// Expected structure:
{
    id: string,           // UUID
    name: string,         // Display name
    abbreviation: string, // Short name for tables
    type: 'prime'|'sub',  // Contractor type
    trades: string        // Trade description
}
```

### 3. AI Response (`report.aiGenerated`)

**Source:** `ai_responses.response_payload` from Supabase or localStorage cache

**File:** `js/report.js:591-610, 1923-2093`

#### Expected Top-Level Structure:
```javascript
// v6.6 NEW field names (from n8n refinedReport):
{
    activities: [{
        contractorId: string|null,      // UUID or null for freeform
        contractorName: string,         // For freeform matching
        narrative: string,
        noWork: boolean,
        equipmentUsed: string,
        crew: string
    }],
    operations: [{
        contractorId: string|null,
        contractorName: string,
        superintendents: number,
        foremen: number,
        operators: number,
        laborers: number,
        surveyors: number,
        others: number
    }],
    equipment: [{
        contractorId: string|null,
        contractorName: string,
        equipmentId: string,
        type: string,
        qty: number,
        status: string,
        hoursUsed: number
    }],
    issues_delays: string|string[],     // NEW v6.6 name
    qaqc_notes: string|string[],        // NEW v6.6 name
    communications: string|string[],     // Same as v6.6
    visitors_deliveries: string|string[], // NEW v6.6 name
    safety: {
        has_incidents: boolean,          // NEW v6.6 name
        summary: string|string[]         // NEW v6.6 name
    }
}

// LEGACY field names (still supported):
{
    generalIssues: string|string[],      // OLD - maps to issues_delays
    qaqcNotes: string|string[],          // OLD - maps to qaqc_notes
    contractorCommunications: string,    // OLD - maps to communications
    visitorsRemarks: string,             // OLD - maps to visitors_deliveries
    safety: {
        hasIncidents: boolean,           // OLD - maps to has_incidents
        hasIncident: boolean,            // Also OLD
        notes: string|string[]           // OLD - maps to summary
    }
}
```

#### Field Mapping Code:
**File:** `js/report.js:747-782`

```javascript
function getTextFieldValue(reportPath, aiPath, defaultValue = '', legacyAiPath = null) {
    // 1. Check user edits first
    if (userEdits[reportPath] !== undefined) return userEdits[reportPath];

    // 2. Check AI-generated (new field name first, then legacy)
    if (report.aiGenerated) {
        let aiValue = getNestedValue(report.aiGenerated, aiPath);

        // Fallback to legacy field name
        if ((aiValue === undefined || aiValue === null || aiValue === '') && legacyAiPath) {
            aiValue = getNestedValue(report.aiGenerated, legacyAiPath);
        }
        // ...
    }
}
```

### 4. Original/Prior Notes (`report.originalInput`)

**Source:** `ai_responses.response_payload.originalInput` or `report.fieldNotes`/`report.guidedNotes`

**File:** `js/report.js:104-229`

```javascript
// v6.6 NEW structure from n8n response:
report.originalInput = {
    fieldNotes: {
        freeformNotes: string,      // For minimal/freeform mode
        freeform_entries: [{        // Timestamped entries
            content: string,
            created_at: string
        }]
    },
    entries: [{                     // For guided mode
        section: string,            // 'work_*', 'issues', 'safety'
        content: string,
        entry_order: number,
        is_deleted: boolean
    }],
    weather: {
        highTemp: string,
        lowTemp: string,
        generalCondition: string,
        jobSiteCondition: string
    },
    photos: [{
        url: string,
        caption: string,
        date: string,
        time: string
    }],
    safety: {
        noIncidents: boolean
    }
};

// LEGACY fallback:
report.fieldNotes = { freeformNotes: string };
report.guidedNotes = {
    workSummary: string,
    issues: string,
    safety: string
};
```

---

## PART 3: Field Name Mapping Table

| UI Element/Section | HTML ID | Field Accessed in Code | Where It Should Come From |
|-------------------|---------|----------------------|---------------------------|
| **Executive Summary** | — | *Not present* | *Not implemented* |
| **Work Performed Narrative** | `workSummaryContainer` | `report.aiGenerated.activities[].narrative` | n8n `refinedReport.activities` |
| **Activities per Contractor** | `.contractor-narrative` | `getContractorActivity(contractorId)` | `aiGenerated.activities[]` matched by `contractorId` or `contractorName` |
| **Operations (personnel)** | `personnelTableBody` | `getContractorOperations(contractorId)` | `aiGenerated.operations[]` |
| **Equipment Table** | `equipmentTableBody` | `getEquipmentData()` | `aiGenerated.equipment[]` |
| **Issues/Delays** | `issuesText` | `getTextFieldValue('issues', 'issues_delays', ..., 'generalIssues')` | `aiGenerated.issues_delays` OR legacy `generalIssues` |
| **QA/QC** | `qaqcText` | `getTextFieldValue('qaqc', 'qaqc_notes', '', 'qaqcNotes')` | `aiGenerated.qaqc_notes` OR legacy `qaqcNotes` |
| **Communications** | `communicationsText` | `getTextFieldValue('communications', 'communications', '', 'contractorCommunications')` | `aiGenerated.communications` OR legacy `contractorCommunications` |
| **Visitors/Deliveries** | `visitorsText` | `getTextFieldValue('visitors', 'visitors_deliveries', '', 'visitorsRemarks')` | `aiGenerated.visitors_deliveries` OR legacy `visitorsRemarks` |
| **Safety Notes** | `safetyText` | `getTextFieldValue('safety.notes', 'safety.summary', ..., 'safety.notes')` | `aiGenerated.safety.summary` OR legacy `safety.notes` |
| **Safety Incident Toggle** | `safetyNoIncident`/`safetyHasIncident` | `safety.hasIncident`, `safety.has_incidents`, `safety.hasIncidents` | Lines 889-894 |
| **Photos** | `photosContainer` | `report.photos[]` | Supabase `photos` table |

### Field Mapping Code Locations:

**File:** `js/report.js:875-895`

```javascript
// Issues - v6.6 field names with legacy fallback
document.getElementById('issuesText').value = getTextFieldValue('issues', 'issues_delays',
    report.guidedNotes?.issues || '', 'generalIssues');  // Line 878-879

// QA/QC
document.getElementById('qaqcText').value = getTextFieldValue('qaqc', 'qaqc_notes', '', 'qaqcNotes'); // Line 880

// Safety
document.getElementById('safetyText').value = getTextFieldValue('safety.notes', 'safety.summary',
    report.guidedNotes?.safety || '', 'safety.notes');  // Line 881-882

// Communications
document.getElementById('communicationsText').value = getTextFieldValue('communications',
    'communications', '', 'contractorCommunications');  // Line 883-884

// Visitors/Deliveries
document.getElementById('visitorsText').value = getTextFieldValue('visitors', 'visitors_deliveries', '', 'visitorsRemarks'); // Line 885

// Safety incident - checks 3 different field names
const hasIncident = getValue('safety.hasIncident', false) ||
                    report.aiGenerated?.safety?.has_incidents ||
                    report.aiGenerated?.safety?.hasIncidents ||
                    false;  // Lines 889-892
```

---

## PART 4: Save Behavior

### 1. Auto-Save Configuration

**File:** `js/report.js:1629-1715`

- **Debounce delay:** 500ms (`js/report.js:1707`)
- **Save destination:** Supabase (primary), no localStorage save

### 2. What Happens When User Edits a Field

**File:** `js/report.js:1661-1672`

```javascript
field.addEventListener('blur', () => {
    const value = field.value;
    setNestedValue(report, path, value);    // Update report object
    userEdits[path] = value;                 // Track as user edit
    report.userEdits = userEdits;            // Persist userEdits
    field.classList.add('user-edited');      // Visual indicator (yellow bg)
    scheduleSave();                          // Queue save
});
```

### 3. localStorage Keys Written

| Key | When Written | Purpose |
|-----|--------------|---------|
| `fvp_ai_response_{reportId}` | After n8n response | Temporary AI cache (5 min TTL) |
| `fvp_active_project_id` | On project selection | Persist active project |

**Note:** The report itself is NOT saved to localStorage. It goes directly to Supabase.

### 4. Supabase Sync

**File:** `js/report.js:1720-1853`

Tables written to:

| Table | Data Stored | Line Reference |
|-------|-------------|----------------|
| `reports` | Main report record (id, project_id, date, inspector, status) | 1741-1758 |
| `report_raw_capture` | Raw capture + `raw_data` JSONB containing user_edits, contractor_work, personnel, equipment_usage | 1809-1835 |

**Structure of `report_raw_capture.raw_data`:**
```javascript
raw_data: {
    user_edits: [{ field_path, edited_value, edited_at }],
    contractor_work: [{ contractor_id, no_work_performed, narrative, equipment_used, crew }],
    personnel: [{ contractor_id, superintendents, foremen, operators, laborers, surveyors, others }],
    equipment_usage: [{ equipment_id, contractor_id, type, qty, status, hours_used }]
}
```

---

## PART 5: Navigation

### 1. "Back" Button (Home Icon)

**File:** `report.html:432-434`

```html
<a href="index.html" class="..." title="Home">
    <i class="fas fa-home text-slate-400"></i>
</a>
```

**Behavior:** Direct navigation to `index.html` - no save triggered.

### 2. "Continue to Final Review" Button

**File:** `js/report.js:1877-1890`

```javascript
async function goToFinalReview() {
    // Save the current report before navigating
    await saveReport();

    const reportDateStr = getReportDateStr();

    let url = `finalreview.html?date=${reportDateStr}`;
    if (currentReportId) {
        url += `&reportId=${currentReportId}`;
    }
    window.location.href = url;
}
```

**Behavior:** Saves report, then navigates with `date` and `reportId` params.

### 3. Other Navigation Paths

| Button | Location | Behavior |
|--------|----------|----------|
| Save | Header | Saves to Supabase, shows indicator |
| PDF | Header | Shows "Coming soon" alert (`exportPDF()` line 2349-2352) |
| Submit Report (modal) | Legacy | Redirects to `goToFinalReview()` |

---

## PART 6: Known Issues

### 1. Hardcoded Field Names That Don't Match n8n Response

**File:** `js/report.js:1923-1926`

```javascript
// Debug panel expects OLD field names only:
const expectedTopLevelKeys = [
    'activities', 'generalIssues', 'qaqcNotes', 'safety',
    'contractorCommunications', 'visitorsRemarks', 'operations', 'equipment'
];
```

**Issue:** This will flag NEW v6.6 field names (`issues_delays`, `qaqc_notes`, `communications`, `visitors_deliveries`) as "unexpected" in the debug panel.

### 2. Legacy vs New Field Name Inconsistency

**Issue:** The code handles both old and new field names, but the debug validator only knows about old names.

| New v6.6 Field | Legacy Field | Status |
|----------------|--------------|--------|
| `issues_delays` | `generalIssues` | ✓ Handled |
| `qaqc_notes` | `qaqcNotes` | ✓ Handled |
| `communications` | `contractorCommunications` | ✓ Handled |
| `visitors_deliveries` | `visitorsRemarks` | ✓ Handled |
| `safety.summary` | `safety.notes` | ✓ Handled |
| `safety.has_incidents` | `safety.hasIncident`/`hasIncidents` | ✓ Handled |

### 3. Missing Null Checks

**File:** `js/report.js:1486-1488`

```javascript
const gpsStr = photo.gps
    ? `${photo.gps.lat.toFixed(5)}, ${photo.gps.lng.toFixed(5)}`
    : null;
```

**Potential Issue:** If `photo.gps` exists but `lat` or `lng` is null/undefined, this will throw.

### 4. TODO Comments

**File:** `js/report.js:2350`

```javascript
// TODO: Implement PDF export
```

### 5. Debug Panel Expected Keys Mismatch

**File:** `js/report.js:1957-1966`

```javascript
// Safety structure validation only checks OLD field names:
const expectedSafetyKeys = ['notes', 'hasIncident', 'noIncidents'];
```

**Missing:** `has_incidents`, `summary` (new v6.6 names)

**File:** `js/report.js:1942-1943`

```javascript
// Activity keys don't include contractorName:
const expectedActivityKeys = ['contractorId', 'narrative', 'noWork', 'equipmentUsed', 'crew'];
```

**Missing:** `contractorName` (used in freeform mode)

**File:** `js/report.js:1972-1973`

```javascript
// Operations keys don't include contractorName:
const expectedOpKeys = ['contractorId', 'superintendents', 'foremen', 'operators', 'laborers', 'surveyors', 'others'];
```

**Missing:** `contractorName` (used in freeform mode)

### 6. Home Button Doesn't Trigger Save

**Issue:** Clicking the Home button (`<a href="index.html">`) navigates away without saving unsaved changes.

---

## Summary Table: All Issues Found

| # | Category | Location | Issue | Severity |
|---|----------|----------|-------|----------|
| 1 | Field Names | Line 1923-1926 | Debug panel `expectedTopLevelKeys` missing new v6.6 field names | Medium |
| 2 | Field Names | Line 1957-1958 | Debug safety validator missing `has_incidents`, `summary` | Low |
| 3 | Field Names | Line 1942-1943 | Debug activity validator missing `contractorName` | Low |
| 4 | Field Names | Line 1972-1973 | Debug operations validator missing `contractorName` | Low |
| 5 | Null Safety | Line 1486-1488 | GPS `lat`/`lng` not null-checked before `.toFixed()` | Low |
| 6 | Navigation | Line 432-434 | Home button doesn't save before navigating | Medium |
| 7 | Feature Gap | Line 2350 | PDF export not implemented | Low |
| 8 | Consistency | Debug panel | Legacy field detection could cause false positives with v6.6 data | Medium |

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         INITIALIZATION                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  URL Params ──┬── ?date=YYYY-MM-DD                                  │
│               └── ?reportId=UUID                                    │
│                                                                     │
│  localStorage ── fvp_active_project_id ──► Project ID               │
│                                                                     │
│  IndexedDB ────► window.idb.getProject() ──► activeProject          │
│       │                                                             │
│       └── Fallback to Supabase if empty                             │
│                                                                     │
│  Supabase ────┬── reports table ──────────► Main report             │
│               ├── report_raw_capture ─────► fieldNotes, userEdits   │
│               ├── photos ─────────────────► report.photos[]         │
│               └── ai_responses ───────────► report.aiGenerated      │
│                                                                     │
│  localStorage ── fvp_ai_response_{id} ───► Cached AI (5 min TTL)    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                         DATA PRIORITY                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  For each field:                                                    │
│                                                                     │
│  1. userEdits[path]           ◄── Highest priority (user override)  │
│  2. aiGenerated.{new_field}   ◄── v6.6 field name                   │
│  3. aiGenerated.{legacy}      ◄── Fallback for older data           │
│  4. report.{path}             ◄── Raw capture data                  │
│  5. defaultValue              ◄── Lowest priority                   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                         SAVE FLOW                                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  User Edit ──► blur event ──► scheduleSave() ──► 500ms debounce     │
│                                     │                               │
│                                     ▼                               │
│                            saveReportToSupabase()                   │
│                                     │                               │
│                      ┌──────────────┼──────────────┐                │
│                      ▼              ▼              ▼                │
│               Supabase:      report_raw_capture   (parallel)        │
│               reports                                               │
│                                                                     │
│  Data stored in raw_data JSONB:                                     │
│    - user_edits[]                                                   │
│    - contractor_work[]                                              │
│    - personnel[]                                                    │
│    - equipment_usage[]                                              │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```
