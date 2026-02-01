# FieldVoice-Pro v6.6: n8n Payload Structures

Complete documentation of payload structures sent to n8n webhook and AI response field mapping.

---

## Table of Contents

1. [Guided Mode Payload](#1-guided-mode-payload)
2. [Freeform Mode Payload](#2-freeform-mode-payload)
3. [n8n Response Structure](#3-n8n-response-structure)
4. [report.js Field Mapping Table](#4-reportjs-field-mapping-table)
5. [Complete Example Payloads](#5-complete-example-payloads)

---

## 1. Guided Mode Payload

**Source:** `js/quick-interview.js` - `buildProcessPayload()`

**Webhook URL:** `https://advidere.app.n8n.cloud/webhook/fieldvoice-refine-v6.6`

### Full Structure

```javascript
{
  reportId: "fieldvoice_report_{projectId}_{date}",
  captureMode: "guided",

  projectContext: {
    projectId: string | null,
    projectName: string,
    noabProjectNo: string,
    location: string,
    engineer: string,
    primeContractor: string,
    contractors: Array<ContractorObject>,
    equipment: Array<EquipmentObject>
  },

  fieldNotes: {
    workSummary: string,
    issues: string,
    safety: string
  },

  weather: {
    highTemp: string,
    lowTemp: string,
    precipitation: string,
    generalCondition: string,
    jobSiteCondition: string,
    adverseConditions: string
  },

  photos: Array<PhotoObject>,
  reportDate: string,
  inspectorName: string,
  operations: Array<OperationObject>,
  equipmentRows: Array<EquipmentRowObject>,
  activities: Array<ActivityObject>,
  safety: SafetyObject,
  entries: Array<EntryObject>,
  toggleStates: ToggleStatesObject
}
```

### entries[] Array - Section Types

The `entries[]` array contains timestamped notes organized by section:

```javascript
entries: [
  // Work entries per contractor
  {
    id: "entry_1703001234567_a1b2c3d",
    section: "work_contractor-uuid-1",  // Format: "work_{contractorId}"
    content: "Excavation work on foundation pit. 2 CAT 320 excavators operating.",
    timestamp: "2024-12-20T09:15:00.000Z",
    entry_order: 1,
    is_deleted: false
  },

  // Issues section
  {
    id: "entry_1703001345678_e4f5g6h",
    section: "issues",
    content: "Weather delay - heavy rain from 2pm-4pm",
    timestamp: "2024-12-20T14:30:00.000Z",
    entry_order: 1,
    is_deleted: false
  },

  // Safety section
  {
    id: "entry_1703001456789_i7j8k9l",
    section: "safety",
    content: "Near-miss: concrete truck backed up without spotter",
    timestamp: "2024-12-20T15:45:00.000Z",
    entry_order: 1,
    is_deleted: false
  },

  // Communications section
  {
    id: "entry_1703001567890_m0n1o2p",
    section: "communications",
    content: "Called Contractor A - confirm material delivery for tomorrow 8am",
    timestamp: "2024-12-20T16:00:00.000Z",
    entry_order: 1,
    is_deleted: false
  },

  // QA/QC section
  {
    id: "entry_1703001678901_q3r4s5t",
    section: "qaqc",
    content: "Concrete slump test: 4.5 inches, within spec",
    timestamp: "2024-12-20T10:30:00.000Z",
    entry_order: 1,
    is_deleted: false
  },

  // Visitors section
  {
    id: "entry_1703001789012_u6v7w8x",
    section: "visitors",
    content: "NOAB Inspector John Smith visited 11:00am-12:15pm",
    timestamp: "2024-12-20T11:15:00.000Z",
    entry_order: 1,
    is_deleted: false
  }
]
```

### operations[] Array - Personnel Counts

```javascript
operations: [
  {
    contractorId: "contractor-uuid-1",
    superintendents: 1,
    foremen: 2,
    operators: 3,
    laborers: 8,
    surveyors: 1,
    others: 0
  },
  {
    contractorId: "contractor-uuid-2",
    superintendents: null,  // null = not specified
    foremen: 1,
    operators: 2,
    laborers: 5,
    surveyors: null,
    others: null
  }
]
```

### equipmentRows[] Array - Equipment Data

```javascript
equipmentRows: [
  {
    id: "eq_1703001200000_a1b2c3d",
    contractorId: "contractor-uuid-1",
    type: "CAT 320 Excavator",
    qty: 2,
    status: "Working",  // "Working", "Idle", "Down"
    timestamp: "2024-12-20T08:00:00.000Z"
  },
  {
    id: "eq_1703001201000_e4f5g6h",
    contractorId: "contractor-uuid-1",
    type: "Dump Truck",
    qty: 3,
    status: "Working",
    timestamp: "2024-12-20T08:00:00.000Z"
  }
]
```

### activities[] Array - Contractor Work with noWork Flags

```javascript
activities: [
  {
    contractorId: "contractor-uuid-1",
    noWork: false,
    narrative: "Excavation and grading of foundation pit",
    equipmentUsed: "CAT 320 Excavator (2), Dump Truck (3)",
    crew: "Superintendent (1), Foreman (2), Equipment Operators (3), Laborers (8)"
  },
  {
    contractorId: "contractor-uuid-2",
    noWork: true  // Contractor did not work today
  }
]
```

### safety Object - Incident Flags

```javascript
safety: {
  hasIncidents: boolean,   // true if incidents occurred
  noIncidents: boolean,    // true if explicitly no incidents
  notes: Array<string>     // Safety notes/observations
}
```

### toggleStates Object - Yes/No Section Answers

```javascript
toggleStates: {
  'communications_made': boolean | null,   // "Were there contractor communications?"
  'qaqc_performed': boolean | null,        // "Was QA/QC performed?"
  'visitors_present': boolean | null,      // "Were there visitors or deliveries?"
  'personnel_onsite': boolean | null       // "Was personnel onsite?"
}
```

### photos[] Array - Photo Metadata

```javascript
photos: [
  {
    id: "photo_1703001234567_a1b2c3d",
    caption: "Overview of excavation pit",
    timestamp: "2024-12-20T09:30:00.000Z",  // ISO8601 format
    date: "12/20/2024",
    time: "9:30 AM",
    gps: {
      lat: 30.2672,
      lng: -97.7431
    }  // or null if GPS unavailable
  }
]
```

---

## 2. Freeform Mode Payload

**Source:** `js/quick-interview.js` - `buildProcessPayload()`

Freeform mode uses the same base structure but with different `fieldNotes` format:

### Key Differences from Guided Mode

```javascript
{
  captureMode: "minimal",  // or "freeform"

  fieldNotes: {
    // Combined freeform notes - all entries sorted chronologically
    freeformNotes: "[09:00] Started excavation work...\n\n[10:30] Concrete delivery...",

    // Raw timestamped entries for AI analysis
    freeform_entries: [
      {
        id: "freeform_entry_uuid_1",
        content: "Started excavation work on pit. 2 CAT 320 excavators operating.",
        created_at: 1703001000000,   // Unix timestamp in milliseconds
        updated_at: 1703001000000,
        synced: false
      },
      {
        id: "freeform_entry_uuid_2",
        content: "Concrete delivery arrived. Slump test: 4.5 inches, within spec.",
        created_at: 1703001800000,
        updated_at: 1703001800000,
        synced: false
      }
    ]
  },

  // Empty in freeform mode - AI extracts from freeform_entries
  entries: [],
  toggleStates: {},
  operations: [],
  equipmentRows: [],
  activities: []
}
```

### Timestamp Format in Freeform Mode

- `freeform_entries[].created_at`: Unix milliseconds (e.g., `1703001000000`)
- `freeformNotes`: Formatted with `[HH:MM]` prefixes from entry timestamps

---

## 3. n8n Response Structure

**Response from n8n webhook after AI processing:**

```javascript
{
  success: boolean,
  captureMode: "guided" | "freeform",

  originalInput: {
    // Echo of the complete input payload sent to n8n
    reportId: string,
    fieldNotes: {...},
    entries: [...],
    operations: [...],
    // ... all original input fields ...
  },

  refinedReport: {
    // AI-extracted and structured data
    activities: Array<{
      contractorId: string | null,      // null for freeform mode
      contractorName?: string,           // freeform mode: use name matching
      noWork: boolean,
      narrative: string,
      equipmentUsed: string,
      crew: string
    }>,

    operations: Array<{
      contractorId: string | null,
      contractorName?: string,
      superintendents: number | null,
      foremen: number | null,
      operators: number | null,
      laborers: number | null,
      surveyors: number | null,
      others: number | null
    }>,

    equipment: Array<{
      contractorId: string | null,
      contractorName?: string,
      type: string,
      qty: number,
      quantity?: number,                 // Legacy fallback
      status: string,
      hoursUsed?: number                 // Legacy fallback
    }>,

    // Text sections
    issues_delays: Array<string>,        // New v6.6 name
    qaqc_notes: Array<string>,           // New v6.6 name
    communications: string,
    visitors_deliveries: string,         // New v6.6 name

    // Safety data
    safety: {
      has_incidents: boolean,            // New v6.6 name
      noIncidents: boolean,
      summary: string                    // v6.6: preferred over notes
    },

    // v6.6 Summary Fields
    executive_summary: string,
    work_performed: string,
    inspector_notes: string,
    extraction_confidence: "high" | "medium" | "low",
    missing_data_flags: Array<string>
  }
}
```

---

## 4. report.js Field Mapping Table

**Source:** `js/report.js` lines 878-895, `js/finalreview.js` lines 289-307

### Priority Order for Field Values

```
userEdits > aiGenerated > fieldNotes/guidedNotes > defaults
```

### Complete Field Mapping

| UI Section | Primary Field (v6.6) | Fallback Field (Legacy) | Expected Type | Notes |
|------------|---------------------|------------------------|---------------|-------|
| Issues/Delays | `issues_delays` | `generalIssues` | `Array<string>` or `string` | Join array with `\n` |
| QA/QC Notes | `qaqc_notes` | `qaqcNotes` | `Array<string>` or `string` | Join array with `\n` |
| Safety Notes | `safety.summary` | `safety.notes` | `string` | Single value preferred |
| Safety Incidents | `safety.has_incidents` | `safety.hasIncidents`, `safety.hasIncident` | `boolean` | Multiple fallbacks |
| Communications | `communications` | `contractorCommunications` | `string` | - |
| Visitors | `visitors_deliveries` | `visitorsRemarks` | `string` | - |
| Executive Summary | `executive_summary` | N/A | `string` | v6.6 only |
| Work Performed | `work_performed` | N/A | `string` | v6.6 only |
| Inspector Notes | `inspector_notes` | N/A | `string` | v6.6 only |
| Confidence | `extraction_confidence` | N/A | `string` | high/medium/low |
| Missing Data | `missing_data_flags` | N/A | `Array<string>` | v6.6 only |

### Field Reading Code Pattern

```javascript
// Issues/Delays
const issues = getTextFieldValue(
  'issues',              // report field name
  'issues_delays',       // preferred AI field
  '',                    // default value
  'generalIssues'        // legacy AI field
);

// Safety Incidents (multiple fallbacks)
const hasIncident = getValue('safety.hasIncident', false) ||
                   report.aiGenerated?.safety?.has_incidents ||
                   report.aiGenerated?.safety?.hasIncidents ||
                   false;
```

---

## 5. Complete Example Payloads

### Example 1: Guided Mode - Multiple Contractors

```json
{
  "reportId": "fieldvoice_report_proj-123_2024-12-20",
  "captureMode": "guided",
  "projectContext": {
    "projectId": "proj-123",
    "projectName": "Highway Expansion Project",
    "noabProjectNo": "2024-HEX-001",
    "location": "Interstate 10, Exit 45-67",
    "engineer": "Robert Johnson",
    "primeContractor": "ABC Construction Inc.",
    "contractors": [
      {
        "id": "cont-uuid-001",
        "name": "ABC Construction Inc.",
        "type": "prime",
        "trades": "Excavation; Grading",
        "abbreviation": "ABC",
        "equipmentTypes": []
      },
      {
        "id": "cont-uuid-002",
        "name": "XYZ Subcontractors",
        "type": "sub",
        "trades": "Concrete; Paving",
        "abbreviation": "XYZ",
        "equipmentTypes": []
      }
    ],
    "equipment": []
  },
  "fieldNotes": {
    "workSummary": "Excavation work continues on foundation pit. Concrete pour scheduled for next week.",
    "issues": "Heavy rain delay from 2-4pm. Reduced crew due to holiday schedule.",
    "safety": "No incidents. All workers using proper PPE."
  },
  "weather": {
    "highTemp": "72",
    "lowTemp": "58",
    "precipitation": "0.75",
    "generalCondition": "Cloudy with rain",
    "jobSiteCondition": "Muddy",
    "adverseConditions": "Rain caused visibility and traction issues"
  },
  "photos": [
    {
      "id": "photo_1703001234567_a1b2c3d",
      "caption": "Overview of excavation pit",
      "timestamp": "2024-12-20T09:30:00.000Z",
      "date": "12/20/2024",
      "time": "9:30 AM",
      "gps": { "lat": 30.2672, "lng": -97.7431 }
    }
  ],
  "reportDate": "2024-12-20",
  "inspectorName": "John Smith",
  "operations": [
    {
      "contractorId": "cont-uuid-001",
      "superintendents": 1,
      "foremen": 2,
      "operators": 3,
      "laborers": 8,
      "surveyors": 1,
      "others": 0
    },
    {
      "contractorId": "cont-uuid-002",
      "superintendents": null,
      "foremen": 1,
      "operators": 2,
      "laborers": 5,
      "surveyors": null,
      "others": null
    }
  ],
  "equipmentRows": [
    {
      "id": "eq_1703001200000_a1b2c3d",
      "contractorId": "cont-uuid-001",
      "type": "CAT 320 Excavator",
      "qty": 2,
      "status": "Working",
      "timestamp": "2024-12-20T08:00:00.000Z"
    },
    {
      "id": "eq_1703001201000_e4f5g6h",
      "contractorId": "cont-uuid-001",
      "type": "Dump Truck",
      "qty": 3,
      "status": "Working",
      "timestamp": "2024-12-20T08:00:00.000Z"
    }
  ],
  "activities": [
    {
      "contractorId": "cont-uuid-001",
      "noWork": false,
      "narrative": "Excavation and grading of foundation pit for phase 2 structure",
      "equipmentUsed": "CAT 320 Excavator (2), Dump Truck (3), Grader (1)",
      "crew": "Superintendent (1), Foreman (2), Equipment Operators (3), Laborers (8)"
    },
    {
      "contractorId": "cont-uuid-002",
      "noWork": true
    }
  ],
  "safety": {
    "hasIncidents": false,
    "noIncidents": true,
    "notes": []
  },
  "entries": [
    {
      "id": "entry_1703001234567_a1b2c3d",
      "section": "work_cont-uuid-001",
      "content": "Started excavation of south pit at 8am. 2 CAT 320 excavators operational.",
      "timestamp": "2024-12-20T08:15:00.000Z",
      "entry_order": 1,
      "is_deleted": false
    },
    {
      "id": "entry_1703001340000_e4f5g6h",
      "section": "issues",
      "content": "Heavy rain from 2-4pm caused visibility and traction issues. Work slowed.",
      "timestamp": "2024-12-20T14:30:00.000Z",
      "entry_order": 1,
      "is_deleted": false
    },
    {
      "id": "entry_1703001450000_i7j8k9l",
      "section": "communications",
      "content": "Called ABC Construction - confirm equipment delivery schedule for next week.",
      "timestamp": "2024-12-20T15:45:00.000Z",
      "entry_order": 1,
      "is_deleted": false
    },
    {
      "id": "entry_1703001560000_m0n1o2p",
      "section": "qaqc",
      "content": "Verified excavation depth meets design specifications.",
      "timestamp": "2024-12-20T11:00:00.000Z",
      "entry_order": 1,
      "is_deleted": false
    },
    {
      "id": "entry_1703001670000_q3r4s5t",
      "section": "safety",
      "content": "All workers observed using proper PPE. Toolbox talk conducted at 7am.",
      "timestamp": "2024-12-20T07:30:00.000Z",
      "entry_order": 1,
      "is_deleted": false
    },
    {
      "id": "entry_1703001780000_u6v7w8x",
      "section": "visitors",
      "content": "NOAB Inspector Garcia visited 11:00am-12:15pm. Reviewed phase 2 drawings.",
      "timestamp": "2024-12-20T11:15:00.000Z",
      "entry_order": 1,
      "is_deleted": false
    }
  ],
  "toggleStates": {
    "communications_made": true,
    "qaqc_performed": true,
    "visitors_present": true,
    "personnel_onsite": true
  }
}
```

### Example 2: Freeform Mode

```json
{
  "reportId": "fieldvoice_report_proj-456_2024-12-20",
  "captureMode": "minimal",
  "projectContext": {
    "projectId": "proj-456",
    "projectName": "Building Site Inspection",
    "noabProjectNo": "2024-BSI-002",
    "location": "123 Main Street",
    "engineer": "Sarah Davis",
    "primeContractor": "BuildRight Corp",
    "contractors": [],
    "equipment": []
  },
  "fieldNotes": {
    "freeformNotes": "[08:45] Site inspection started. Weather clear, 72 degrees.\n\n[09:30] Inspected foundation concrete pour. Quality looks good, no visible cracks.\n\n[11:00] Inspector Garcia from NOAB visited. Reviewed drawings for phase 2.\n\n[14:15] Material delivery arrived - 50 pallets of rebar. Signed off on manifest.\n\n[15:30] Called contractor - need to schedule crane for next week.",
    "freeform_entries": [
      {
        "id": "freeform-uuid-1",
        "content": "Site inspection started. Weather clear, 72 degrees.",
        "created_at": 1703000700000,
        "updated_at": 1703000700000,
        "synced": false
      },
      {
        "id": "freeform-uuid-2",
        "content": "Inspected foundation concrete pour. Quality looks good, no visible cracks.",
        "created_at": 1703002200000,
        "updated_at": 1703002200000,
        "synced": false
      },
      {
        "id": "freeform-uuid-3",
        "content": "Inspector Garcia from NOAB visited. Reviewed drawings for phase 2.",
        "created_at": 1703005200000,
        "updated_at": 1703005200000,
        "synced": false
      },
      {
        "id": "freeform-uuid-4",
        "content": "Material delivery arrived - 50 pallets of rebar. Signed off on manifest.",
        "created_at": 1703019300000,
        "updated_at": 1703019300000,
        "synced": false
      },
      {
        "id": "freeform-uuid-5",
        "content": "Called contractor - need to schedule crane for next week.",
        "created_at": 1703022600000,
        "updated_at": 1703022600000,
        "synced": false
      }
    ]
  },
  "weather": {
    "highTemp": "74",
    "lowTemp": "62",
    "precipitation": "0",
    "generalCondition": "Clear",
    "jobSiteCondition": "Dry",
    "adverseConditions": "None"
  },
  "photos": [
    {
      "id": "photo_1703001500000_x1y2z3",
      "caption": "Foundation concrete after pour",
      "timestamp": "2024-12-20T09:30:00.000Z",
      "date": "12/20/2024",
      "time": "9:30 AM",
      "gps": null
    }
  ],
  "reportDate": "2024-12-20",
  "inspectorName": "Mike Thompson",
  "operations": [],
  "equipmentRows": [],
  "activities": [],
  "safety": {
    "hasIncidents": false,
    "noIncidents": true,
    "notes": []
  },
  "entries": [],
  "toggleStates": {}
}
```

### Example 3: n8n AI Response

```json
{
  "success": true,
  "captureMode": "guided",
  "originalInput": {
    "reportId": "fieldvoice_report_proj-123_2024-12-20",
    "captureMode": "guided",
    "projectContext": { "...": "..." },
    "fieldNotes": { "...": "..." }
  },
  "refinedReport": {
    "activities": [
      {
        "contractorId": "cont-uuid-001",
        "noWork": false,
        "narrative": "Excavation and grading of foundation pit for phase 2 structure. Removed approximately 500 cubic yards of soil.",
        "equipmentUsed": "CAT 320 Excavator (2), Dump Truck (3), Grader (1)",
        "crew": "Superintendent (1), Foreman (2), Equipment Operators (3), Laborers (8)"
      },
      {
        "contractorId": "cont-uuid-002",
        "noWork": true
      }
    ],
    "operations": [
      {
        "contractorId": "cont-uuid-001",
        "superintendents": 1,
        "foremen": 2,
        "operators": 3,
        "laborers": 8,
        "surveyors": 1,
        "others": 0
      },
      {
        "contractorId": "cont-uuid-002",
        "superintendents": null,
        "foremen": 1,
        "operators": 2,
        "laborers": 5,
        "surveyors": null,
        "others": null
      }
    ],
    "equipment": [
      {
        "contractorId": "cont-uuid-001",
        "type": "CAT 320 Excavator",
        "qty": 2,
        "status": "Working"
      },
      {
        "contractorId": "cont-uuid-001",
        "type": "Dump Truck",
        "qty": 3,
        "status": "Working"
      }
    ],
    "issues_delays": [
      "Heavy rain from 2-4pm caused visibility and traction issues",
      "Reduced crew due to holiday schedule"
    ],
    "qaqc_notes": [
      "Excavation depth verified against design specifications",
      "Site grading slope angles meet project requirements"
    ],
    "communications": "Contacted ABC Construction to confirm next week's equipment delivery schedule and concrete pour date.",
    "visitors_deliveries": "NOAB Inspector Garcia visited 11:00am-12:15pm. Reviewed phase 2 drawings.",
    "safety": {
      "has_incidents": false,
      "noIncidents": true,
      "summary": "No safety incidents reported. All personnel using required PPE. Toolbox talk conducted at 7am."
    },
    "executive_summary": "Excavation work continues on phase 2 foundation pit. Progress on schedule despite weather delay.",
    "work_performed": "Phase 2 foundation pit excavation. Removed approximately 500 cubic yards of soil using two CAT 320 excavators.",
    "inspector_notes": "Site conditions: muddy due to afternoon rain. All work practices in compliance with OSHA requirements.",
    "extraction_confidence": "high",
    "missing_data_flags": []
  }
}
```

---

## Appendix: Data Types Reference

### Timestamp Formats

| Context | Format | Example |
|---------|--------|---------|
| entries[].timestamp | ISO8601 | `"2024-12-20T09:15:00.000Z"` |
| equipmentRows[].timestamp | ISO8601 | `"2024-12-20T08:00:00.000Z"` |
| photos[].timestamp | ISO8601 | `"2024-12-20T09:30:00.000Z"` |
| freeform_entries[].created_at | Unix ms | `1703001000000` |
| freeform_entries[].updated_at | Unix ms | `1703001000000` |

### Field Constraints

| Field | Constraint |
|-------|------------|
| Personnel counts | `null` or integer 0-99 |
| Toggle states | `true`, `false`, or `null` |
| Section types | `work_{uuid}`, `issues`, `safety`, `communications`, `qaqc`, `visitors` |
| Equipment status | `"Working"`, `"Idle"`, `"Down"` |
| Confidence levels | `"high"`, `"medium"`, `"low"` |
