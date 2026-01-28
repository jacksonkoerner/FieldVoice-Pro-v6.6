// FieldVoice Pro - Archives Page Logic
// Report listing, deletion, and project lookup

// ============ STATE ============
let pendingDeleteId = null;
let pendingDeleteDate = null;
let projectsCache = [];

// ============ PROJECT LOADING ============
async function loadProjects() {
    try {
        const { data, error } = await supabaseClient
            .from('projects')
            .select('id, project_name, status')
            .order('project_name', { ascending: true });

        if (error) {
            console.error('[SUPABASE] Error loading projects:', error);
            return [];
        }

        projectsCache = data.map(row => ({
            id: row.id,
            name: row.project_name || '',
            status: row.status || 'active'
        }));

        console.log('[SUPABASE] Loaded projects:', projectsCache.length);
        return projectsCache;
    } catch (e) {
        console.error('[SUPABASE] Failed to load projects:', e);
        return [];
    }
}

function getProjectById(projectId) {
    return projectsCache.find(p => p.id === projectId) || null;
}

// ============ REPORT LOADING ============
async function getAllReports() {
    try {
        // Query reports table with photo count
        const { data: reportRows, error: reportError } = await supabaseClient
            .from('reports')
            .select(`
                id,
                project_id,
                report_date,
                inspector_name,
                status,
                created_at,
                submitted_at,
                updated_at,
                projects (
                    project_name
                )
            `)
            .order('report_date', { ascending: false });

        if (reportError) {
            console.error('[SUPABASE] Error loading reports:', reportError);
            throw new Error(reportError.message || 'Failed to load reports');
        }

        if (!reportRows || reportRows.length === 0) {
            return [];
        }

        // Get photo counts for all reports
        const reportIds = reportRows.map(r => r.id);
        const { data: photoCounts, error: photoError } = await supabaseClient
            .from('photos')
            .select('report_id')
            .in('report_id', reportIds);

        // Count photos per report
        const photoCountMap = {};
        if (!photoError && photoCounts) {
            photoCounts.forEach(p => {
                photoCountMap[p.report_id] = (photoCountMap[p.report_id] || 0) + 1;
            });
        }

        // Map to the format expected by the UI
        const reports = reportRows.map(row => {
            const project = getProjectById(row.project_id);
            return {
                id: row.id,
                date: row.report_date,
                projectId: row.project_id,
                projectName: project?.name || row.projects?.project_name || 'Unknown Project',
                submitted: row.status === 'submitted',
                photoCount: photoCountMap[row.id] || 0,
                createdAt: row.created_at,
                submittedAt: row.submitted_at
            };
        });

        console.log('[SUPABASE] Loaded reports:', reports.length);
        return reports;
    } catch (e) {
        console.error('[SUPABASE] Failed to load reports:', e);
        throw e;
    }
}

async function deleteReport(reportId) {
    try {
        // Delete the report - related tables will cascade automatically
        const { error } = await supabaseClient
            .from('reports')
            .delete()
            .eq('id', reportId);

        if (error) {
            console.error('[SUPABASE] Error deleting report:', error);
            throw error;
        }

        console.log('[SUPABASE] Report deleted:', reportId);
        return true;
    } catch (e) {
        console.error('[SUPABASE] Failed to delete report:', e);
        return false;
    }
}

// ============ RENDER ============
async function renderReportList() {
    const section = document.getElementById('reportListSection');

    // Show loading state
    section.innerHTML = `
        <div class="flex flex-col items-center justify-center py-16 px-4">
            <i class="fas fa-spinner fa-spin text-slate-400 text-3xl mb-4"></i>
            <p class="text-sm text-slate-500">Loading reports...</p>
        </div>
    `;

    let reports;
    try {
        reports = await getAllReports();
    } catch (err) {
        console.error('[ARCHIVES] Error loading reports:', err);
        section.innerHTML = `
            <div class="flex flex-col items-center justify-center py-16 px-4">
                <div class="w-20 h-20 bg-red-100 border-2 border-red-300 flex items-center justify-center mb-6">
                    <i class="fas fa-exclamation-triangle text-red-500 text-3xl"></i>
                </div>
                <p class="text-lg font-bold text-slate-500 mb-2 text-center">Error loading reports</p>
                <p class="text-sm text-red-500 text-center mb-6">${err.message || 'Unknown error'}</p>
                <button onclick="location.reload()" class="px-6 py-3 bg-dot-navy text-white font-bold uppercase tracking-wide hover:bg-dot-blue transition-colors">
                    <i class="fas fa-redo mr-2"></i>Retry
                </button>
            </div>
        `;
        return;
    }

    if (reports.length === 0) {
        section.innerHTML = `
            <div class="flex flex-col items-center justify-center py-16 px-4">
                <div class="w-20 h-20 bg-slate-200 border-2 border-dashed border-slate-300 flex items-center justify-center mb-6">
                    <i class="fas fa-folder-open text-slate-400 text-3xl"></i>
                </div>
                <p class="text-lg font-bold text-slate-500 mb-2 text-center">No reports yet</p>
                <p class="text-sm text-slate-400 text-center mb-6">Complete your first daily report to see it here.</p>
                <a href="index.html" class="px-6 py-3 bg-dot-navy text-white font-bold uppercase tracking-wide hover:bg-dot-blue transition-colors">
                    <i class="fas fa-plus mr-2"></i>Start a Report
                </a>
            </div>
        `;
        return;
    }

    section.innerHTML = `
        <p class="text-xs text-slate-500 mb-3 uppercase tracking-wider font-bold">
            <i class="fas fa-info-circle mr-1"></i>Swipe left to delete
        </p>
        <div class="space-y-2">
            ${reports.map(report => renderReportRow(report)).join('')}
        </div>
    `;
}

function renderReportRow(report) {
    const formattedDate = formatDate(report.date, 'long');
    const statusClass = report.submitted
        ? 'bg-safety-green text-white'
        : 'bg-dot-yellow text-slate-800';
    const statusText = report.submitted ? 'Submitted' : 'Draft';
    const projectDisplay = report.projectName
        ? `<p class="text-xs text-slate-500 truncate"><i class="fas fa-building mr-1"></i>${escapeHtml(report.projectName)}</p>`
        : '';

    // Build URL with reportId for Supabase lookup
    const viewUrl = `finalreview.html?date=${report.date}&reportId=${report.id}`;

    return `
        <div class="swipe-container flex bg-white shadow-sm border border-slate-200">
            <!-- Main content (clickable) -->
            <a href="${viewUrl}"
               class="swipe-content flex-shrink-0 w-full p-4 flex items-center gap-4 hover:bg-slate-50 transition-colors">
                <div class="flex-1 min-w-0">
                    <p class="font-bold text-slate-800 truncate">${formattedDate}</p>
                    ${projectDisplay}
                    <div class="flex items-center gap-3 mt-1">
                        <span class="inline-flex items-center px-2 py-0.5 text-[10px] font-bold uppercase ${statusClass}">
                            ${statusText}
                        </span>
                        ${report.photoCount > 0 ? `
                            <span class="text-xs text-slate-500 flex items-center gap-1">
                                <i class="fas fa-camera text-slate-400"></i>
                                ${report.photoCount}
                            </span>
                        ` : ''}
                    </div>
                </div>
                <i class="fas fa-chevron-right text-slate-400"></i>
            </a>
            <!-- Delete button (revealed on swipe) -->
            <div class="delete-btn-container flex-shrink-0">
                <button onclick="showDeleteModal('${report.id}', '${formattedDate.replace(/'/g, "\\'")}')"
                        class="h-full w-20 bg-red-600 text-white flex flex-col items-center justify-center hover:bg-red-700 transition-colors">
                    <i class="fas fa-trash-alt text-lg mb-1"></i>
                    <span class="text-[10px] font-bold uppercase">Delete</span>
                </button>
            </div>
        </div>
    `;
}

// ============ DELETE MODAL ============
function showDeleteModal(reportId, dateStr) {
    pendingDeleteId = reportId;
    pendingDeleteDate = dateStr;
    document.getElementById('deleteReportDate').textContent = dateStr;
    document.getElementById('deleteModal').classList.remove('hidden');
}

function closeDeleteModal() {
    pendingDeleteId = null;
    pendingDeleteDate = null;
    document.getElementById('deleteModal').classList.add('hidden');
}

async function confirmDelete() {
    if (pendingDeleteId) {
        const success = await deleteReport(pendingDeleteId);
        if (success) {
            showToast('Report deleted', 'success');
        } else {
            showToast('Failed to delete report', 'error');
        }
        closeDeleteModal();
        await renderReportList();
    }
}

// ============ INIT ============
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Load projects first (for project name lookups)
        await loadProjects();
        // Then render the report list
        await renderReportList();
    } catch (err) {
        console.error('Failed to initialize:', err);
        const section = document.getElementById('reportListSection');
        section.innerHTML = `
            <div class="flex flex-col items-center justify-center py-16 px-4">
                <div class="w-20 h-20 bg-red-100 border-2 border-red-300 flex items-center justify-center mb-6">
                    <i class="fas fa-exclamation-triangle text-red-500 text-3xl"></i>
                </div>
                <p class="text-lg font-bold text-slate-500 mb-2 text-center">Failed to load reports</p>
                <p class="text-sm text-slate-400 text-center mb-6">Please check your connection and try again.</p>
                <button onclick="location.reload()" class="px-6 py-3 bg-dot-navy text-white font-bold uppercase tracking-wide hover:bg-dot-blue transition-colors">
                    <i class="fas fa-redo mr-2"></i>Retry
                </button>
            </div>
        `;
    }
});

// ============ EXPOSE TO WINDOW FOR ONCLICK HANDLERS ============
window.showDeleteModal = showDeleteModal;
window.closeDeleteModal = closeDeleteModal;
window.confirmDelete = confirmDelete;
