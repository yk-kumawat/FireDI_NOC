import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { listInspectorApplications } from '../services/inspectorReviewApi';
import type { Application, ApplicationStatus, PaginationMeta } from '../types/application';

const InspectorDashboard = () => {
  const { user, token, logout } = useAuth();

  const [applications, setApplications] = useState<Application[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    SUBMITTED: 0,
    UNDER_REVIEW: 0,
    DRAFT: 0,
  });
  const [pagination, setPagination] = useState<PaginationMeta>({
    total: 0,
    page: 1,
    limit: 10,
    pages: 0,
  });
  const [activeTab, setActiveTab] = useState<'all' | 'SUBMITTED' | 'UNDER_REVIEW' | 'DRAFT'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchApplications = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    setError('');
    try {
      const data = await listInspectorApplications(token, {
        page,
        limit: 10,
        status: activeTab === 'all' ? undefined : activeTab,
        search: searchTerm.trim() || undefined,
      });
      setApplications(data.applications || []);
      setPagination(data.pagination);
      if (data.stats) {
        setStats(data.stats);
      }
    } catch (err: unknown) {
      console.error('Failed to load inspector applications:', err);
      setError((err as Error).message || 'Failed to load applications');
    } finally {
      setIsLoading(false);
    }
  }, [token, page, activeTab, searchTerm]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  const handleTabChange = (tab: 'all' | 'SUBMITTED' | 'UNDER_REVIEW' | 'DRAFT') => {
    setActiveTab(tab);
    setPage(1);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchApplications();
  };

  const getStatusBadge = (status: ApplicationStatus) => {
    switch (status) {
      case 'UNDER_REVIEW':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full border bg-[#fff7ed] text-[#c2410c] border-[#fed7aa]" style={{ fontFamily: 'Inter, sans-serif' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-[#c2410c]"></span>
            Under Review
          </span>
        );
      case 'SUBMITTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full border bg-[#eff6ff] text-[#1d4ed8] border-[#bfdbfe]" style={{ fontFamily: 'Inter, sans-serif' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-[#1d4ed8]"></span>
            Pending Review
          </span>
        );
      case 'DRAFT':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full border bg-[#f1f5f9] text-[#475569] border-[#e2e8f0]" style={{ fontFamily: 'Inter, sans-serif' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-[#475569]"></span>
            Draft
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#faf8ff]">
      {/* Header */}
      <header className="bg-white border-b border-[#e2e8f0] px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 bg-[#b91c1c] rounded-lg flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6 text-white" stroke="currentColor" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
            </div>
            <div>
              <span className="font-bold text-lg text-[#131b2e] leading-tight block" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                Fire Dept. Inspection & NoC
              </span>
              <span className="text-[11px] font-semibold tracking-wider text-[#b91c1c] uppercase" style={{ fontFamily: 'Inter, sans-serif' }}>
                Inspector Review Portal
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:block text-right">
              <p className="text-sm font-semibold text-[#131b2e]" style={{ fontFamily: 'Inter, sans-serif' }}>
                {user?.name}
              </p>
              <p className="text-xs text-[#5b403d]" style={{ fontFamily: 'Inter, sans-serif' }}>
                Fire Safety Inspector
              </p>
            </div>
            <button
              onClick={logout}
              className="px-4 py-2 text-sm font-semibold text-[#b91c1c] border border-[#b91c1c] rounded-lg hover:bg-[#fef2f2] transition-colors"
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[#131b2e] tracking-tight mb-1" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
              Inspector Dashboard
            </h1>
            <p className="text-sm text-[#5b403d]" style={{ fontFamily: 'Inter, sans-serif' }}>
              Welcome back, <span className="font-semibold text-[#131b2e]">{user?.name}</span>. Review applications, inspect uploaded fire safety drawings, and manage validation findings.
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-[#e2e8f0] p-5 shadow-[0_1px_3px_0_rgba(15,23,42,0.05)]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-[#5b403d] uppercase tracking-wider" style={{ fontFamily: 'Inter, sans-serif' }}>Total Queue</span>
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
              </div>
            </div>
            <p className="text-3xl font-bold text-[#131b2e]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{stats.total}</p>
            <p className="text-xs text-slate-500 mt-1" style={{ fontFamily: 'Inter, sans-serif' }}>All filed applications</p>
          </div>

          <div className="bg-white rounded-xl border border-[#e2e8f0] p-5 shadow-[0_1px_3px_0_rgba(15,23,42,0.05)]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-blue-700 uppercase tracking-wider" style={{ fontFamily: 'Inter, sans-serif' }}>Pending Review</span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-700">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
            </div>
            <p className="text-3xl font-bold text-blue-700" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{stats.SUBMITTED}</p>
            <p className="text-xs text-slate-500 mt-1" style={{ fontFamily: 'Inter, sans-serif' }}>Ready for inspection review</p>
          </div>

          <div className="bg-white rounded-xl border border-[#e2e8f0] p-5 shadow-[0_1px_3px_0_rgba(15,23,42,0.05)]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-amber-700 uppercase tracking-wider" style={{ fontFamily: 'Inter, sans-serif' }}>Under Review</span>
              <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-700">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
              </div>
            </div>
            <p className="text-3xl font-bold text-amber-700" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{stats.UNDER_REVIEW}</p>
            <p className="text-xs text-slate-500 mt-1" style={{ fontFamily: 'Inter, sans-serif' }}>Verification in progress</p>
          </div>

          <div className="bg-white rounded-xl border border-[#e2e8f0] p-5 shadow-[0_1px_3px_0_rgba(15,23,42,0.05)]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider" style={{ fontFamily: 'Inter, sans-serif' }}>Drafts</span>
              <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-600">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
              </div>
            </div>
            <p className="text-3xl font-bold text-slate-700" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{stats.DRAFT}</p>
            <p className="text-xs text-slate-500 mt-1" style={{ fontFamily: 'Inter, sans-serif' }}>Unsubmitted applicant drafts</p>
          </div>
        </div>

        {/* Applications List Section */}
        <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-[0_1px_3px_0_rgba(15,23,42,0.05)] overflow-hidden">
          {/* Controls Bar: Tabs & Search */}
          <div className="p-4 sm:p-6 border-b border-[#e2e8f0] flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Tabs */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
              <button
                onClick={() => handleTabChange('all')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                  activeTab === 'all' ? 'bg-white text-[#131b2e] shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
                style={{ fontFamily: 'Inter, sans-serif' }}
              >
                All Applications
              </button>
              <button
                onClick={() => handleTabChange('SUBMITTED')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                  activeTab === 'SUBMITTED' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
                style={{ fontFamily: 'Inter, sans-serif' }}
              >
                Pending Review
              </button>
              <button
                onClick={() => handleTabChange('UNDER_REVIEW')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                  activeTab === 'UNDER_REVIEW' ? 'bg-white text-amber-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
                style={{ fontFamily: 'Inter, sans-serif' }}
              >
                Under Review
              </button>
              <button
                onClick={() => handleTabChange('DRAFT')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                  activeTab === 'DRAFT' ? 'bg-white text-slate-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
                style={{ fontFamily: 'Inter, sans-serif' }}
              >
                Drafts
              </button>
            </div>

            {/* Search Input */}
            <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
              <input
                type="text"
                placeholder="Search by ID, building, or name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#b91c1c] focus:border-transparent"
                style={{ fontFamily: 'Inter, sans-serif' }}
              />
              <svg className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </form>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-50 border-b border-red-200 text-red-700 text-xs flex items-center justify-between">
              <span>{error}</span>
              <button onClick={() => fetchApplications()} className="font-semibold underline">Retry</button>
            </div>
          )}

          {/* Loading Indicator */}
          {isLoading && (
            <div className="p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#b91c1c]"></div>
              <p className="text-xs text-slate-500 mt-2" style={{ fontFamily: 'Inter, sans-serif' }}>Loading applications...</p>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && applications.length === 0 && (
            <div className="p-12 text-center">
              <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-400">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              </div>
              <h3 className="text-base font-bold text-[#131b2e] mb-1" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>No applications found</h3>
              <p className="text-xs text-slate-500" style={{ fontFamily: 'Inter, sans-serif' }}>
                {searchTerm ? 'Try adjusting your search criteria.' : 'There are currently no applications matching this filter.'}
              </p>
            </div>
          )}

          {/* Applications Table */}
          {!isLoading && applications.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-[#e2e8f0] text-[11px] font-semibold text-slate-500 uppercase tracking-wider" style={{ fontFamily: 'Inter, sans-serif' }}>
                    <th className="py-3 px-6">Application ID</th>
                    <th className="py-3 px-6">Building Details</th>
                    <th className="py-3 px-6">Applicant</th>
                    <th className="py-3 px-6">Status</th>
                    <th className="py-3 px-6">Date</th>
                    <th className="py-3 px-6 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {applications.map((app) => (
                    <tr key={app._id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-4 px-6">
                        <span className="font-semibold text-xs text-[#131b2e] block" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                          {app.applicationId}
                        </span>
                        <span className="text-[11px] text-slate-400" style={{ fontFamily: 'Inter, sans-serif' }}>
                          ID: {app._id.slice(-6)}
                        </span>
                      </td>

                      <td className="py-4 px-6">
                        <p className="text-xs font-semibold text-[#131b2e]" style={{ fontFamily: 'Inter, sans-serif' }}>
                          {app.buildingDetails?.buildingName || 'Untitled Building'}
                        </p>
                        <p className="text-[11px] text-[#5b403d]" style={{ fontFamily: 'Inter, sans-serif' }}>
                          {app.buildingDetails?.buildingType || 'Type N/A'} • {app.buildingDetails?.occupancyCategory || 'Occupancy N/A'}
                        </p>
                      </td>

                      <td className="py-4 px-6">
                        <p className="text-xs font-medium text-[#131b2e]" style={{ fontFamily: 'Inter, sans-serif' }}>
                          {app.applicantDetails?.name || 'Applicant'}
                        </p>
                        <p className="text-[11px] text-slate-400" style={{ fontFamily: 'Inter, sans-serif' }}>
                          {app.applicantDetails?.email || app.applicantDetails?.phone}
                        </p>
                      </td>

                      <td className="py-4 px-6">
                        {getStatusBadge(app.status)}
                      </td>

                      <td className="py-4 px-6 text-xs text-slate-500" style={{ fontFamily: 'Inter, sans-serif' }}>
                        {app.submittedAt
                          ? new Date(app.submittedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                          : new Date(app.updatedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>

                      <td className="py-4 px-6 text-right">
                        <Link
                          to={`/inspector/applications/${app._id}/review`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#b91c1c] text-white text-xs font-semibold rounded-lg hover:bg-[#991b1b] transition-colors shadow-sm"
                          style={{ fontFamily: 'Inter, sans-serif' }}
                        >
                          <span>Review</span>
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {!isLoading && pagination.pages > 1 && (
            <div className="p-4 border-t border-[#e2e8f0] flex items-center justify-between">
              <span className="text-xs text-slate-500" style={{ fontFamily: 'Inter, sans-serif' }}>
                Showing page {pagination.page} of {pagination.pages} ({pagination.total} total)
              </span>
              <div className="flex gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1 text-xs font-medium border border-slate-300 rounded-md disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
                  style={{ fontFamily: 'Inter, sans-serif' }}
                >
                  Previous
                </button>
                <button
                  disabled={page >= pagination.pages}
                  onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
                  className="px-3 py-1 text-xs font-medium border border-slate-300 rounded-md disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
                  style={{ fontFamily: 'Inter, sans-serif' }}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default InspectorDashboard;
