# Final Review Page Technical Specification

## Overview

`finalreview.html` is the read-only DOT RPR Daily Report viewer in FieldVoice Pro. It serves as the final review step before report submission, displaying a print-ready formatted report that complies with DOT reporting standards.

### Purpose

- Read-only preview of the completed daily report
- Print-ready DOT RPR format with proper page breaks
- Final verification before submission to archives
- Export-ready layout (PDF via browser print)

### Data Flow

```
report.html (edit & review)
         │
         ▼
    User clicks "Final Review"
         │
         ▼
finalreview.html (read-only preview)
         │
         ├──→ Edit Report → back to report.html
         │
         ├──→ Export PDF → browser print dialog
         │
         └──→ Submit Report
                    │
                    ▼
         Mark report.meta.submitted = true
                    │
                    ▼
         Save to localStorage
                    │
                    ▼
         Success modal → archives.html
```

---

## Data Sources

### localStorage Keys

| Key Pattern | Description |
|-------------|-------------|
| `fieldvoice_report_[projectId]_YYYY-MM-DD` | Project-specific daily report (primary) |
| `fieldvoice_report_YYYY-MM-DD` | Legacy date-only key (fallback) |
| `fieldvoice_report` | Most recent report (backward compatibility) |
| `fvp_projects` | Array of project configurations |
| `fvp_active_project` | Active project ID |

### Data Priority

The page uses a priority system for resolving field values:

```
1. userEdits        (highest priority - user modifications from report.html)
2. aiGenerated      (AI-processed content from webhook)
3. report data      (raw field capture data)
4. defaults         (project config or hardcoded defaults)
```

### Key Functions

| Function | Purpose |
|----------|---------|
| `getValue(path, default)` | Generic value resolver with full priority chain |
| `getTextValue(reportPath, aiPath, fallbackPath, default)` | Text sections with AI path mapping |
| `getContractorActivity(contractorId)` | Per-contractor work activity data |
| `getContractorOperations(contractorId)` | Per-contractor personnel counts |
| `getEquipmentData()` | Equipment list with AI fallback |
| `getNestedValueSimple(obj, path)` | Dot-notation path accessor |
| `calculateShiftDuration(start, end)` | Calculate shift duration from times |

---

## Page Structure

The report is organized into 4+ pages (additional pages added dynamically for photos):

### Page 1: Project Overview & Work Summary

| Section | Content |
|---------|---------|
| Report Header | Project logo (or placeholder), "RPR DAILY REPORT" title |
| Project Overview | 2-column table with project details, weather, signature |
| Daily Work Summary | Per-contractor work narratives |

### Page 2: Operations & Issues

| Section | Content |
|---------|---------|
| Report Header | (repeated) |
| Daily Operations | Personnel counts table by contractor |
| Equipment Table | Mobilized equipment with utilization |
| General Issues | Issues, delays, unforeseen conditions |
| Communications | Communications with contractor |

### Page 3: QA/QC & Safety

| Section | Content |
|---------|---------|
| Report Header | (repeated) |
| QA/QC | Testing and inspections |
| Safety Report | Incident status checkboxes + notes |
| Visitors | Visitors, deliveries, remarks |

### Page 4+: Photos

| Section | Content |
|---------|---------|
| Report Header | (repeated) |
| Photos Header | Project name and number |
| Photos Grid | 2x2 grid of photos with metadata |

---

## Field Mapping Table

### Project Overview Section

| Element ID | Label | Data Path | Source |
|------------|-------|-----------|--------|
| `projectName` | PROJECT NAME | `overview.projectName` | Project config / report |
| `reportDate` | DATE | `overview.date` | Report date |
| `noabProjectNo` | NOAB PROJECT NO. | `overview.noabProjectNo` | Project config / report |
| `location` | LOCATION | `overview.location` | Project config / report |
| `cnoSolicitationNo` | CNO SOLICITATION NO. | `overview.cnoSolicitationNo` | Default: "N/A" |
| `engineer` | ENGINEER | `overview.engineer` | Project config / report |
| `noticeToProceed` | NOTICE TO PROCEED | - | Project config (formatted date) |
| `contractor` | CONTRACTOR | `overview.contractor` | Project config / report |
| `contractDuration` | CONTRACT DURATION | - | Project config (`X days`) |
| `startTime` | START TIME | `overview.startTime` | Report / project default |
| `expectedCompletion` | EXPECTED COMPLETION | - | Project config (formatted date) |
| `endTime` | END TIME | `overview.endTime` | Report / project default |
| `contractDay` | CONTRACT DAY # | `overview.contractDay` | Format: "X of Y days" |
| `shiftDuration` | SHIFT DURATION | - | Calculated from start/end |
| `weatherDays` | WEATHER DAYS | `overview.weatherDays` | Report / project config |
| `completedBy` | COMPLETED BY | `overview.completedBy` | Report / inspector name |

### Weather Block

| Element ID | Display Format | Data Path |
|------------|----------------|-----------|
| `weatherTemps` | "High Temp: X° Low Temp: Y°" | `overview.weather.highTemp`, `overview.weather.lowTemp` |
| `weatherPrecip` | "Precipitation: X" | `overview.weather.precipitation` |
| `weatherCondition` | "General Condition: X" | `overview.weather.generalCondition` |
| `weatherJobSite` | "Job Site Condition: X" | `overview.weather.jobSiteCondition` |
| `weatherAdverse` | "Adverse Conditions: X" | `overview.weather.adverseConditions` |

### Signature Block

| Element ID | Data Path | Notes |
|------------|-----------|-------|
| `signatureName` | `signature.name` or `overview.completedBy` | Cursive font display |
| `signatureDetails` | `signature.title`, `signature.company` | Digital signature format |

### Work Summary Section

Per-contractor blocks rendered from `projectContractors` array:

| Data Source | Display |
|-------------|---------|
| `activity.noWork` | "No work performed on [date]." |
| `activity.narrative` | Work description paragraph |
| `activity.equipmentUsed` | "EQUIPMENT: [text]" |
| `activity.crew` | "CREW: [text]" |

### Operations Table

| Column | Data Path |
|--------|-----------|
| CONTRACTOR | `contractor.abbreviation` or `contractor.name` |
| TRADE | `contractor.trades` (abbreviated) |
| SUPER(S) | `operations.superintendents` |
| FOREMAN | `operations.foremen` |
| OPERATOR(S) | `operations.operators` |
| LABORER(S) | `operations.laborers` |
| SURVEYOR(S) | `operations.surveyors` |
| OTHER(S) | `operations.others` |

### Equipment Table

| Column | Data Path |
|--------|-----------|
| CONTRACTOR | `equipment.contractorId` → contractor name |
| EQUIPMENT TYPE / MODEL # | `equipment.type` |
| QTY | `equipment.qty` or `equipment.quantity` |
| NOTES | Derived from `equipment.status` ("IDLE" or "X HOURS UTILIZED") |

### Text Sections

| Section | Element ID | Report Path | AI Path | Fallback Path |
|---------|------------|-------------|---------|---------------|
| Issues | `issuesContent` | `issues` | `generalIssues` | `guidedNotes.issues` |
| Communications | `communicationsContent` | `communications` | `contractorCommunications` | - |
| QA/QC | `qaqcContent` | `qaqc` | `qaqcNotes` | - |
| Visitors | `visitorsContent` | `visitors` | `visitorsRemarks` | - |
| Safety Notes | `safetyContent` | `safety.notes` | `safety.notes` | `guidedNotes.safety` |

### Safety Section

| Element ID | Data Path | Description |
|------------|-----------|-------------|
| `checkYes` | `safety.hasIncident` or `aiGenerated.safety.hasIncidents` | Checked if incident occurred |
| `checkNo` | (inverse of above) | Checked if no incident |

### Photos Section

| Element ID | Data Path | Description |
|------------|-----------|-------------|
| `photoProjectName` | `overview.projectName` | Project name header |
| `photoProjectNo` | `overview.noabProjectNo` | Project number header |
| `photosGrid` | `report.photos[]` | 2x2 grid of photos |

Photo card structure:

| Element | Data Source |
|---------|-------------|
| Image | `photo.url` |
| Date | `photo.date` or `overview.date` |
| Caption | `photo.caption` |

---

## Navigation Options

### Header Buttons

| Button | Class | Action |
|--------|-------|--------|
| Home | `btn-home` | Navigate to `index.html` |
| Edit | `btn-edit` | Navigate to `report.html` (preserves date param) |
| Submit | `btn-submit` | Call `submitReport()` function |

### Edit Report Navigation

```javascript
function goToEdit() {
    const params = new URLSearchParams(window.location.search);
    const dateParam = params.get('date');
    if (dateParam) {
        window.location.href = `report.html?date=${dateParam}`;
    } else {
        window.location.href = 'report.html';
    }
}
```

### Export PDF

PDF export is accomplished via browser print functionality. The print CSS styles format the report for letter-size paper with proper page breaks.

---

## Submit Workflow

### Submit Process

```
User clicks "Submit" button
         │
         ▼
submitReport() function called
         │
         ▼
Set report.meta.submitted = true
Set report.meta.submittedAt = ISO timestamp
         │
         ▼
Determine storage key:
  - Project-specific: fieldvoice_report_[projectId]_[date]
  - Legacy: fieldvoice_report_[date]
         │
         ▼
localStorage.setItem(key, JSON.stringify(report))
         │
         ▼
showSubmitSuccess() - display modal
         │
         ├──→ "Close" button - closes modal
         │
         └──→ "View Archives" button - navigate to archives.html
```

### Storage Key Pattern

```javascript
let storageKey;
if (activeProject) {
    storageKey = `fieldvoice_report_${activeProject.id}_${todayStr}`;
} else {
    storageKey = `fieldvoice_report_${todayStr}`;
}
```

### Report Meta Fields Set on Submit

| Field | Value | Description |
|-------|-------|-------------|
| `report.meta.submitted` | `true` | Marks report as submitted |
| `report.meta.submittedAt` | ISO timestamp | Submission timestamp |

### Post-Submit UI State

After submission, the Submit button is disabled:

```javascript
submitBtn.innerHTML = '<i class="fas fa-check"></i><span>Submitted</span>';
submitBtn.disabled = true;
submitBtn.style.opacity = '0.7';
submitBtn.style.cursor = 'default';
```

### Submitted State Detection

On page load, `checkSubmittedState()` checks if report was previously submitted:

```javascript
function checkSubmittedState() {
    if (report && report.meta && report.meta.submitted) {
        // Disable submit button, show "Submitted" state
    }
}
```

---

## Webhook Calls

**No webhook calls are made on submit.** The submit action only:
1. Updates localStorage with submitted status
2. Displays success modal
3. Offers navigation to archives

---

## Print CSS Details

### Page Setup

```css
@page {
    size: letter;
    margin: 0;
}
```

### Print-Specific Styles

| Rule | Purpose |
|------|---------|
| `.screen-header { display: none !important; }` | Hide navigation header |
| `.page-container { max-width: none; margin: 0; }` | Full-width container |
| `.page { padding: 0.4in 0.5in; }` | DOT-compliant margins |
| `.page-break { page-break-after: always; break-after: page; }` | Force page breaks |
| `print-color-adjust: exact` | Preserve background colors |

### Page Dimensions

| Property | Value |
|----------|-------|
| Page size | Letter (8.5" x 11") |
| Margins | 0.4" top/bottom, 0.5" left/right |
| Min page height | 11in (screen), auto (print) |

### Color Preservation

Section headers and table backgrounds use `-webkit-print-color-adjust: exact` and `print-color-adjust: exact` to ensure colors print correctly:

```css
.section-header,
.overview-table .label,
.ops-table th,
.equip-table th {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
}
```

### DOT Format Compliance

The report follows DOT RPR Daily Report formatting:

- Green header bar (#4a7c34) for section titles
- 2-column layout for project overview
- Standardized weather block format
- Digital signature format with DN details
- Per-contractor work summary blocks
- Personnel table with standard columns
- Equipment utilization format (IDLE or X HOURS UTILIZED)

---

## Responsive Design

### Mobile Breakpoint (max-width: 900px)

| Element | Adaptation |
|---------|------------|
| `.page-container` | Full width with 16px padding |
| `.page` | Minimum 360px width, reduced padding |
| `.report-header` | Stack vertically, center-aligned |
| `.photos-grid` | Single column layout |
| `.photo-image` | Reduced height (150px) |
| `.page-footer` | Relative positioning |
| Tables | Horizontal scroll enabled |

---

## Dynamic Photo Pages

When more than 4 photos exist, additional pages are created dynamically:

```javascript
function addAdditionalPhotoPages(remainingPhotos) {
    // Creates new page elements for each group of 4 photos
    // Each page has:
    // - Report header with logo
    // - "Daily Photos (Continued)" section header
    // - 2x2 photo grid
    // - Page footer with page number
}
```

### Total Page Count Update

```javascript
function updateTotalPages() {
    const pages = document.querySelectorAll('.page');
    const totalPages = pages.length;
    document.querySelectorAll('.total-pages').forEach(el => {
        el.textContent = totalPages;
    });
}
```

---

## Logo Rendering

If the active project has a logo (`activeProject.logo`), it replaces the default placeholder on all pages:

```javascript
const logoContainers = [
    { placeholder: 'logoPlaceholder', image: 'logoImage' },
    { placeholder: 'logoPlaceholder2', image: 'logoImage2' },
    { placeholder: 'logoPlaceholder3', image: 'logoImage3' },
    { placeholder: 'logoPlaceholder4', image: 'logoImage4' }
];
```

Default placeholder text:
```
LOUIS ARMSTRONG
NEW ORLEANS
INTERNATIONAL AIRPORT
```

---

## Trade Abbreviation Mapping

The `formatTradesAbbrev()` function converts trade names to standard abbreviations:

| Trade | Abbreviation |
|-------|--------------|
| construction management | CM |
| project management | PM |
| pile driving | PLE |
| concrete | CONC |
| asphalt | ASP |
| utilities | UTL |
| earthwork | ERTHWRK |
| electrical | ELEC |
| communications | COMM |
| fence | FENCE |
| pavement markings | PVMNT MRK |
| hauling | HAUL |
| pavement subgrade | PVMT SUB |
| demo / demolition | DEMO |
| general | GEN |

---

## Error Handling

### No Report Found

```javascript
if (!report) {
    alert('No report found for this date.');
    window.location.href = 'index.html';
    return;
}
```

### Storage Full Error

```javascript
try {
    localStorage.setItem(storageKey, JSON.stringify(report));
    showSubmitSuccess();
} catch (e) {
    console.error('Failed to save report:', e);
    alert('Failed to submit report. Storage may be full.');
}
```

---

## URL Parameters

| Parameter | Description | Example |
|-----------|-------------|---------|
| `date` | Report date in YYYY-MM-DD format | `?date=2024-01-15` |

If no date parameter is provided, defaults to today's date.
