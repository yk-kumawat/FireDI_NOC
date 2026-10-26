import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { listApplications } from '../services/applicationApi';
import type { Application } from '../types/application';

const ApplicantDashboard = () => {
  const { user, token, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'all' | 'under-review' | 'draft' | 'submitted'>('all');
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;
    setIsLoading(true);
    setError('');
    listApplications(token, { limit: 50 })
      .then((data) => {
        setApplications(data.applications || []);
      })
      .catch((err) => {
        console.error('Failed to load dashboard applications:', err);
        setError(err.message || 'Failed to load applications');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [token]);

  // Real statistics derived from actual data
  const totalCount = applications.length;
  const draftCount = applications.filter((a) => a.status === 'DRAFT').length;
  const submittedCount = applications.filter((a) => a.status === 'SUBMITTED').length;
  const underReviewCount = applications.filter((a) => a.status === 'UNDER_REVIEW').length;

  // Filtered applications according to active tab
  const filteredApplications = applications.filter((app) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'under-review') return app.status === 'UNDER_REVIEW';
    if (activeTab === 'draft') return app.status === 'DRAFT';
    if (activeTab === 'submitted') return app.status === 'SUBMITTED';
    return true;
  });

  const getStatusBadge = (status: string) => {
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
            Submitted
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
    <div className="min-h-screen bg-[#f8fafc]">
      {/* Header */}
      <header className="bg-white border-b border-[#e2e8f0]">
        <div className="max-w-[1440px] mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
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

            {/* Navigation */}
            <nav className="hidden md:flex items-center gap-1" style={{ fontFamily: 'Inter, sans-serif' }}>
              <Link to="/applicant/dashboard" className="px-4 py-2 text-sm font-medium text-[#b91c1c] bg-[#fef2f2] rounded-lg">
                Dashboard
              </Link>
              <Link to="/applicant/applications" className="px-4 py-2 text-sm font-medium text-[#5b403d] hover:bg-[#f8fafc] rounded-lg transition-colors">
                My Applications
              </Link>
              <Link to="/applicant/schedule" className="px-4 py-2 text-sm font-medium text-[#5b403d] hover:bg-[#f8fafc] rounded-lg transition-colors">
                Inspection Schedule
              </Link>
              <Link to="/applicant/certificates" className="px-4 py-2 text-sm font-medium text-[#5b403d] hover:bg-[#f8fafc] rounded-lg transition-colors">
                Verification & Certificates
              </Link>
              <Link to="/applicant/support" className="px-4 py-2 text-sm font-medium text-[#5b403d] hover:bg-[#f8fafc] rounded-lg transition-colors">
                Support
              </Link>
            </nav>

            {/* Right Actions */}
            <div className="flex items-center gap-4">
              <button className="p-2 text-[#5b403d] hover:bg-[#f8fafc] rounded-lg transition-colors relative">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <span className="absolute top-1 right-1 w-2 h-2 bg-[#b91c1c] rounded-full"></span>
              </button>

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

      {/* Main Content */}
      <main className="max-w-[1440px] mx-auto px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[#131b2e] mb-1" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', letterSpacing: '-0.025em' }}>
              Applicant Dashboard
            </h1>
            <p className="text-sm text-[#5b403d]" style={{ fontFamily: 'Inter, sans-serif' }}>
              Welcome back, {user?.name.split(' ')[0]}.
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
            Create New Application
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          {/* Total Applications */}
          <div className="bg-white rounded-xl border border-[#e2e8f0] p-6 shadow-[0_1px_3px_0_rgba(15,23,42,0.05)]">
            <div className="flex items-start justify-between mb-3">
              <span className="text-sm font-medium text-[#5b403d]" style={{ fontFamily: 'Inter, sans-serif' }}>
                Total Applications
              </span>
              <div className="w-8 h-8 bg-[#f1f5f9] rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-[#475569]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-bold text-[#131b2e]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                {totalCount}
              </span>
              <span className="text-xs text-[#94a3b8] mb-1" style={{ fontFamily: 'Inter, sans-serif' }}>all time</span>
            </div>
          </div>

          {/* Drafts */}
          <div className="bg-white rounded-xl border border-[#e2e8f0] p-6 shadow-[0_1px_3px_0_rgba(15,23,42,0.05)]">
            <div className="flex items-start justify-between mb-3">
              <span className="text-sm font-medium text-[#5b403d]" style={{ fontFamily: 'Inter, sans-serif' }}>
                Drafts
              </span>
              <div className="w-8 h-8 bg-[#f1f5f9] rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-[#475569]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
            </div>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-bold text-[#131b2e]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                {draftCount}
              </span>
              <span className="text-xs text-[#94a3b8] mb-1" style={{ fontFamily: 'Inter, sans-serif' }}>in progress</span>
            </div>
          </div>

          {/* Submitted */}
          <div className="bg-white rounded-xl border border-[#e2e8f0] p-6 shadow-[0_1px_3px_0_rgba(15,23,42,0.05)]">
            <div className="flex items-start justify-between mb-3">
              <span className="text-sm font-medium text-[#5b403d]" style={{ fontFamily: 'Inter, sans-serif' }}>
                Submitted
              </span>
              <div className="w-8 h-8 bg-[#f1f5f9] rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-[#475569]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-bold text-[#131b2e]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                {submittedCount}
              </span>
              <span className="text-xs text-[#94a3b8] mb-1" style={{ fontFamily: 'Inter, sans-serif' }}>awaiting review</span>
            </div>
          </div>

          {/* Under Review */}
          <div className="bg-white rounded-xl border border-[#e2e8f0] p-6 shadow-[0_1px_3px_0_rgba(15,23,42,0.05)]">
            <div className="flex items-start justify-between mb-3">
              <span className="text-sm font-medium text-[#5b403d]" style={{ fontFamily: 'Inter, sans-serif' }}>
                Under Review
              </span>
              <div className="w-8 h-8 bg-[#fff7ed] rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-[#c2410c]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
              </div>
            </div>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-bold text-[#b91c1c]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                {underReviewCount}
              </span>
              <span className="text-xs text-[#94a3b8] mb-1" style={{ fontFamily: 'Inter, sans-serif' }}>active inspection</span>
            </div>
          </div>
        </div>

        {/* Recent Applications Section */}
        <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-[0_1px_3px_0_rgba(15,23,42,0.05)]">
          {/* Section Header */}
          <div className="px-6 py-5 border-b border-[#e2e8f0] flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-[#131b2e] mb-1" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                Recent Applications
              </h2>
              <p className="text-sm text-[#5b403d]" style={{ fontFamily: 'Inter, sans-serif' }}>
                Manage fire clearances and monitor scrutiny
              </p>
            </div>
            <Link
              to="/applicant/applications"
              className="text-xs font-semibold text-[#b91c1c] hover:underline"
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              View All ({totalCount}) &rarr;
            </Link>
          </div>

          {/* Filter Tabs */}
          <div className="px-6 py-4 border-b border-[#e2e8f0] flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                activeTab === 'all'
                  ? 'bg-[#b91c1c] text-white'
                  : 'text-[#5b403d] hover:bg-[#f8fafc]'
              }`}
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              All ({totalCount})
            </button>
            <button
              onClick={() => setActiveTab('under-review')}
              className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                activeTab === 'under-review'
                  ? 'bg-[#b91c1c] text-white'
                  : 'text-[#5b403d] hover:bg-[#f8fafc]'
              }`}
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              Under Review ({underReviewCount})
            </button>
            <button
              onClick={() => setActiveTab('draft')}
              className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                activeTab === 'draft'
                  ? 'bg-[#b91c1c] text-white'
                  : 'text-[#5b403d] hover:bg-[#f8fafc]'
              }`}
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              Draft ({draftCount})
            </button>
            <button
              onClick={() => setActiveTab('submitted')}
              className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                activeTab === 'submitted'
                  ? 'bg-[#b91c1c] text-white'
                  : 'text-[#5b403d] hover:bg-[#f8fafc]'
              }`}
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              Submitted ({submittedCount})
            </button>
          </div>

          {/* Table / Content */}
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-4 border-[#b91c1c] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : error ? (
            <div className="py-12 text-center text-sm text-red-600">
              {error}
            </div>
          ) : filteredApplications.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-12 h-12 bg-[#f1f5f9] text-[#94a3b8] rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-[#131b2e] mb-1" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                No applications found
              </p>
              <p className="text-xs text-[#5b403d] mb-4" style={{ fontFamily: 'Inter, sans-serif' }}>
                {activeTab === 'all'
                  ? "You haven't created any Fire NOC applications yet."
                  : `No applications currently in '${activeTab}' status.`}
              </p>
              {activeTab === 'all' && (
                <Link
                  to="/applicant/applications/new"
                  className="px-4 py-2 bg-[#b91c1c] text-white text-xs font-semibold rounded-lg hover:bg-[#991b1b] transition-colors inline-block"
                  style={{ fontFamily: 'Inter, sans-serif' }}
                >
                  Create Your First Application
                </Link>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#f8fafc]">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[#475569] uppercase tracking-wider border-b border-[#e2e8f0]" style={{ fontFamily: 'Inter, sans-serif' }}>
                      Application ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[#475569] uppercase tracking-wider border-b border-[#e2e8f0]" style={{ fontFamily: 'Inter, sans-serif' }}>
                      Building Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[#475569] uppercase tracking-wider border-b border-[#e2e8f0]" style={{ fontFamily: 'Inter, sans-serif' }}>
                      Clearance Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[#475569] uppercase tracking-wider border-b border-[#e2e8f0]" style={{ fontFamily: 'Inter, sans-serif' }}>
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[#475569] uppercase tracking-wider border-b border-[#e2e8f0]" style={{ fontFamily: 'Inter, sans-serif' }}>
                      Last Updated
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-[#475569] uppercase tracking-wider border-b border-[#e2e8f0]" style={{ fontFamily: 'Inter, sans-serif' }}>
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-[#f1f5f9]">
                  {filteredApplications.map((app) => (
                    <tr key={app._id} className="hover:bg-[#fbfcfd] transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link
                          to={`/applicant/applications/${app._id}`}
                          className="text-sm font-semibold text-[#b91c1c] hover:underline"
                          style={{ fontFamily: 'Inter, sans-serif' }}
                        >
                          {app.applicationId}
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-[#131b2e]" style={{ fontFamily: 'Inter, sans-serif' }}>
                          {app.buildingDetails?.buildingName || <span className="text-[#94a3b8] italic">—</span>}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-[#5b403d]" style={{ fontFamily: 'Inter, sans-serif' }}>
                          {app.buildingDetails?.occupancyCategory
                            ? `${app.buildingDetails.occupancyCategory.charAt(0) + app.buildingDetails.occupancyCategory.slice(1).toLowerCase()} NOC`
                            : 'Fire Safety NOC'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(app.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-[#5b403d]" style={{ fontFamily: 'Inter, sans-serif' }}>
                          {new Date(app.updatedAt).toLocaleDateString('en-IN')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        {app.status === 'DRAFT' ? (
                          <Link
                            to={`/applicant/applications/${app._id}/edit`}
                            className="text-sm font-semibold text-[#b91c1c] hover:text-[#991b1b] inline-flex items-center gap-1"
                            style={{ fontFamily: 'Inter, sans-serif' }}
                          >
                            Edit
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>
                          </Link>
                        ) : (
                          <Link
                            to={`/applicant/applications/${app._id}`}
                            className="text-sm font-semibold text-[#b91c1c] hover:text-[#991b1b] inline-flex items-center gap-1"
                            style={{ fontFamily: 'Inter, sans-serif' }}
                          >
                            View
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>
                          </Link>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Footer note */}
          <div className="px-6 py-4 border-t border-[#e2e8f0] flex items-center justify-between text-xs text-[#5b403d]">
            <span>
              Showing {filteredApplications.length} of {totalCount} applications
            </span>
            <Link
              to="/applicant/applications"
              className="text-[#b91c1c] font-medium hover:underline"
            >
              Go to Full Applications List &rarr;
            </Link>
          </div>
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
              <Link to="/compliance" className="text-sm text-[#5b403d] hover:text-[#131b2e] transition-colors" style={{ fontFamily: 'Inter, sans-serif' }}>
                Compliance
              </Link>
              <Link to="/help" className="text-sm text-[#5b403d] hover:text-[#131b2e] transition-colors" style={{ fontFamily: 'Inter, sans-serif' }}>
                Help Desk
              </Link>
              <Link to="/privacy" className="text-sm text-[#5b403d] hover:text-[#131b2e] transition-colors" style={{ fontFamily: 'Inter, sans-serif' }}>
                Privacy Policy
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default ApplicantDashboard;
