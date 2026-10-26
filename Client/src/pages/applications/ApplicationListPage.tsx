import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { listApplications, submitApplication } from '../../services/applicationApi';
import type { Application, ApplicationStatus, PaginationMeta } from '../../types/application';

// ─── Header Component (shared design) ────────────────────────────────────────
const AppHeader = () => {
  const { user, logout } = useAuth();
  return (
    <header className="bg-white border-b border-[#e2e8f0]">
      <div className="max-w-[1440px] mx-auto px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 bg-[#b91c1c] rounded-lg flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6 text-white" stroke="currentColor" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
            </div>
            <span className="font-bold text-lg text-[#131b2e]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
              Fire Dept. Inspection & NoC
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-1" style={{ fontFamily: 'Inter, sans-serif' }}>
            <Link to="/applicant/dashboard" className="px-4 py-2 text-sm font-medium text-[#5b403d] hover:bg-[#f8fafc] rounded-lg transition-colors">
              Dashboard
            </Link>
            <Link to="/applicant/applications" className="px-4 py-2 text-sm font-medium text-[#b91c1c] bg-[#fef2f2] rounded-lg">
              My Applications
            </Link>
            <Link to="/applicant/schedule" className="px-4 py-2 text-sm font-medium text-[#5b403d] hover:bg-[#f8fafc] rounded-lg transition-colors">
              Inspection Schedule
            </Link>
            <Link to="/applicant/certificates" className="px-4 py-2 text-sm font-medium text-[#5b403d] hover:bg-[#f8fafc] rounded-lg transition-colors">
              Verification &amp; Certificates
            </Link>
            <Link to="/applicant/support" className="px-4 py-2 text-sm font-medium text-[#5b403d] hover:bg-[#f8fafc] rounded-lg transition-colors">
              Support
            </Link>
          </nav>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 pl-4 border-l border-[#e2e8f0]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-[#b91c1c] rounded-full flex items-center justify-center text-white text-sm font-semibold" style={{ fontFamily: 'Inter, sans-serif' }}>
                  {user?.name.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm font-semibold text-[#131b2e]" style={{ fontFamily: 'Inter, sans-serif' }}>
                  {user?.name}
                </span>
              </div>
              <button
                onClick={logout}
                className="p-2 text-[#5b403d] hover:bg-[#f8fafc] rounded-lg transition-colors"
                title="Logout"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

// ─── Status Badge ─────────────────────────────────────────────────────────────
const StatusBadge = ({ status }: { status: ApplicationStatus }) => {
  const config: Record<ApplicationStatus, { bg: string; text: string; dot: string; label: string }> = {
    DRAFT: { bg: 'bg-[#f1f5f9]', text: 'text-[#475569]', dot: 'bg-[#475569]', label: 'Draft' },
    SUBMITTED: { bg: 'bg-[#eff6ff]', text: 'text-[#1d4ed8]', dot: 'bg-[#1d4ed8]', label: 'Submitted' },
    UNDER_REVIEW: { bg: 'bg-[#fff7ed]', text: 'text-[#c2410c]', dot: 'bg-[#c2410c]', label: 'Under Review' },
  };
  const c = config[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full border border-[#e2e8f0] ${c.bg} ${c.text}`} style={{ fontFamily: 'Inter, sans-serif' }}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const ApplicationListPage = () => {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [applications, setApplications] = useState<Application[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({ total: 0, page: 1, limit: 10, pages: 0 });
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | ''>('');
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState('');

  const fetchApplications = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    setError('');
    try {
      const data = await listApplications(token, { page, limit: 10, status: statusFilter });
      setApplications(data.applications);
      setPagination(data.pagination);
    } catch (err: any) {
      setError(err.message || 'Failed to load applications');
    } finally {
      setIsLoading(false);
    }
  }, [token, page, statusFilter]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  const handleSubmit = async (app: Application) => {
    if (!token) return;
    if (!window.confirm(`Submit application ${app.applicationId}? This cannot be undone.`)) return;
    setSubmittingId(app._id);
    try {
      await submitApplication(token, app._id);
      setToastMessage(`Application ${app.applicationId} submitted successfully!`);
      setTimeout(() => setToastMessage(''), 4000);
      fetchApplications();
    } catch (err: any) {
      alert(err.message || 'Failed to submit application');
    } finally {
      setSubmittingId(null);
    }
  };

  const filterTabs: { label: string; value: ApplicationStatus | '' }[] = [
    { label: 'All', value: '' },
    { label: 'Draft', value: 'DRAFT' },
    { label: 'Submitted', value: 'SUBMITTED' },
    { label: 'Under Review', value: 'UNDER_REVIEW' },
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <AppHeader />

      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 bg-green-600 text-white px-5 py-3 rounded-lg shadow-lg text-sm font-medium" style={{ fontFamily: 'Inter, sans-serif' }}>
          {toastMessage}
        </div>
      )}

      <main className="max-w-[1440px] mx-auto px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[#131b2e] mb-1" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', letterSpacing: '-0.025em' }}>
              My Applications
            </h1>
            <p className="text-sm text-[#5b403d]" style={{ fontFamily: 'Inter, sans-serif' }}>
              Manage and track your fire NOC applications
            </p>
          </div>
          <Link
            to="/applicant/applications/new"
            className="px-5 py-2.5 bg-[#b91c1c] text-white text-sm font-semibold rounded-lg hover:bg-[#991b1b] transition-all shadow-sm flex items-center gap-2"
            style={{ fontFamily: 'Inter, sans-serif' }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Application
          </Link>
        </div>

        {/* Table Card */}
        <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-[0_1px_3px_0_rgba(15,23,42,0.05),0_1px_2px_-1px_rgba(15,23,42,0.05)]">
          {/* Filter Tabs */}
          <div className="px-6 py-4 border-b border-[#e2e8f0] flex items-center gap-2">
            {filterTabs.map((tab) => (
              <button
                key={tab.value}
                onClick={() => { setStatusFilter(tab.value); setPage(1); }}
                className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                  statusFilter === tab.value ? 'bg-[#b91c1c] text-white' : 'text-[#5b403d] hover:bg-[#f8fafc]'
                }`}
                style={{ fontFamily: 'Inter, sans-serif' }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Body */}
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-4 border-[#b91c1c] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <svg className="w-12 h-12 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3m0 3h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
              <p className="text-[#5b403d] text-sm" style={{ fontFamily: 'Inter, sans-serif' }}>{error}</p>
              <button onClick={fetchApplications} className="text-sm text-[#b91c1c] font-medium hover:underline" style={{ fontFamily: 'Inter, sans-serif' }}>
                Retry
              </button>
            </div>
          ) : applications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-16 h-16 bg-[#f1f5f9] rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-[#94a3b8]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="text-center">
                <p className="text-[#131b2e] font-semibold mb-1" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>No applications found</p>
                <p className="text-sm text-[#5b403d]" style={{ fontFamily: 'Inter, sans-serif' }}>
                  {statusFilter ? 'No applications match this filter.' : 'Get started by creating your first application.'}
                </p>
              </div>
              {!statusFilter && (
                <Link
                  to="/applicant/applications/new"
                  className="px-5 py-2.5 bg-[#b91c1c] text-white text-sm font-semibold rounded-lg hover:bg-[#991b1b] transition-all"
                  style={{ fontFamily: 'Inter, sans-serif' }}
                >
                  Create Application
                </Link>
              )}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[#f8fafc]">
                    <tr>
                      {['Application ID', 'Building Name', 'Occupancy', 'Status', 'Last Updated', 'Actions'].map((col, i) => (
                        <th
                          key={col}
                          className={`px-6 py-3 text-xs font-semibold text-[#475569] uppercase tracking-wider border-b border-[#e2e8f0] ${i === 5 ? 'text-right' : 'text-left'}`}
                          style={{ fontFamily: 'Inter, sans-serif' }}
                        >
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-[#f1f5f9]">
                    {applications.map((app) => (
                      <tr key={app._id} className="hover:bg-[#fbfcfd] transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-semibold text-[#b91c1c]" style={{ fontFamily: 'Inter, sans-serif' }}>
                            {app.applicationId}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-medium text-[#131b2e]" style={{ fontFamily: 'Inter, sans-serif' }}>
                            {app.buildingDetails?.buildingName || <span className="text-[#94a3b8] italic">—</span>}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-[#5b403d]" style={{ fontFamily: 'Inter, sans-serif' }}>
                            {app.buildingDetails?.occupancyCategory
                              ? app.buildingDetails.occupancyCategory.charAt(0) + app.buildingDetails.occupancyCategory.slice(1).toLowerCase()
                              : <span className="text-[#94a3b8] italic">—</span>}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <StatusBadge status={app.status} />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-[#5b403d]" style={{ fontFamily: 'Inter, sans-serif' }}>
                            {new Date(app.updatedAt).toLocaleDateString('en-IN')}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-3">
                            {app.status === 'DRAFT' ? (
                              <>
                                <Link
                                  to={`/applicant/applications/${app._id}`}
                                  className="text-sm font-medium text-[#5b403d] hover:text-[#131b2e] transition-colors"
                                  style={{ fontFamily: 'Inter, sans-serif' }}
                                >
                                  View
                                </Link>
                                <Link
                                  to={`/applicant/applications/${app._id}/edit`}
                                  className="text-sm font-semibold text-[#b91c1c] hover:text-[#991b1b] inline-flex items-center gap-1"
                                  style={{ fontFamily: 'Inter, sans-serif' }}
                                >
                                  Continue Editing
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                  </svg>
                                </Link>
                                <button
                                  onClick={() => handleSubmit(app)}
                                  disabled={submittingId === app._id}
                                  className="text-sm font-semibold text-white bg-[#b91c1c] hover:bg-[#991b1b] px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                                  style={{ fontFamily: 'Inter, sans-serif' }}
                                >
                                  {submittingId === app._id ? 'Submitting…' : 'Submit'}
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => navigate(`/applicant/applications/${app._id}`)}
                                className="text-sm font-semibold text-[#b91c1c] hover:text-[#991b1b] inline-flex items-center gap-1"
                                style={{ fontFamily: 'Inter, sans-serif' }}
                              >
                                View Details
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                </svg>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination.pages > 1 && (
                <div className="px-6 py-4 border-t border-[#e2e8f0] flex items-center justify-between">
                  <p className="text-sm text-[#5b403d]" style={{ fontFamily: 'Inter, sans-serif' }}>
                    Showing <span className="font-medium text-[#131b2e]">{(page - 1) * pagination.limit + 1}</span> to{' '}
                    <span className="font-medium text-[#131b2e]">{Math.min(page * pagination.limit, pagination.total)}</span> of{' '}
                    <span className="font-medium text-[#131b2e]">{pagination.total}</span> applications
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="px-3 py-1.5 text-sm text-[#5b403d] hover:bg-[#f8fafc] rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      style={{ fontFamily: 'Inter, sans-serif' }}
                    >
                      Previous
                    </button>
                    {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((p) => (
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                          p === page ? 'font-semibold bg-[#b91c1c] text-white' : 'text-[#5b403d] hover:bg-[#f8fafc]'
                        }`}
                        style={{ fontFamily: 'Inter, sans-serif' }}
                      >
                        {p}
                      </button>
                    ))}
                    <button
                      onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
                      disabled={page === pagination.pages}
                      className="px-3 py-1.5 text-sm text-[#5b403d] hover:bg-[#f8fafc] rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      style={{ fontFamily: 'Inter, sans-serif' }}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-[#e2e8f0] mt-12">
        <div className="max-w-[1440px] mx-auto px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-[#5b403d]" style={{ fontFamily: 'Inter, sans-serif' }}>
              © 2025 Fire Department Inspection & NoC Management
            </p>
            <div className="flex items-center gap-6">
              <Link to="/compliance" className="text-sm text-[#5b403d] hover:text-[#131b2e] transition-colors" style={{ fontFamily: 'Inter, sans-serif' }}>Compliance</Link>
              <Link to="/help" className="text-sm text-[#5b403d] hover:text-[#131b2e] transition-colors" style={{ fontFamily: 'Inter, sans-serif' }}>Help Desk</Link>
              <Link to="/privacy" className="text-sm text-[#5b403d] hover:text-[#131b2e] transition-colors" style={{ fontFamily: 'Inter, sans-serif' }}>Privacy Policy</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default ApplicationListPage;
