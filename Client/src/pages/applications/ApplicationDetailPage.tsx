import { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getApplication, submitApplication } from '../../services/applicationApi';
import type { Application, ApplicationStatus } from '../../types/application';
import { ChecklistSection } from '../../components/Checklist/ChecklistSection';

// ─── Header ───────────────────────────────────────────────────────────────────
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
            <Link to="/applicant/dashboard" className="px-4 py-2 text-sm font-medium text-[#5b403d] hover:bg-[#f8fafc] rounded-lg transition-colors">Dashboard</Link>
            <Link to="/applicant/applications" className="px-4 py-2 text-sm font-medium text-[#b91c1c] bg-[#fef2f2] rounded-lg">My Applications</Link>
          </nav>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 pl-4 border-l border-[#e2e8f0]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-[#b91c1c] rounded-full flex items-center justify-center text-white text-sm font-semibold">
                  {user?.name.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm font-semibold text-[#131b2e]" style={{ fontFamily: 'Inter, sans-serif' }}>{user?.name}</span>
              </div>
              <button onClick={logout} className="p-2 text-[#5b403d] hover:bg-[#f8fafc] rounded-lg transition-colors" title="Logout">
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
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-full border border-[#e2e8f0] ${c.bg} ${c.text}`} style={{ fontFamily: 'Inter, sans-serif' }}>
      <span className={`w-2 h-2 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
};

// ─── Info Row ─────────────────────────────────────────────────────────────────
const InfoRow = ({ label, value }: { label: string; value?: string | number | boolean | null }) => {
  if (value == null || value === '' || value === undefined) return null;
  const display = typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value);
  return (
    <div className="flex items-start gap-2 py-2 border-b border-[#f8fafc] last:border-0">
      <span className="text-sm text-[#5b403d] min-w-[180px] shrink-0" style={{ fontFamily: 'Inter, sans-serif' }}>{label}</span>
      <span className="text-sm font-medium text-[#131b2e]" style={{ fontFamily: 'Inter, sans-serif' }}>{display}</span>
    </div>
  );
};

// ─── Section Card ─────────────────────────────────────────────────────────────
const SectionCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-[0_1px_3px_0_rgba(15,23,42,0.05)] p-6 mb-5">
    <h2 className="text-base font-bold text-[#131b2e] mb-4 pb-3 border-b border-[#f1f5f9]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      {title}
    </h2>
    <div>{children}</div>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
const ApplicationDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const navigate = useNavigate();

  const [application, setApplication] = useState<Application | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<{ message: string; status?: number } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const fetchApp = async () => {
    if (!token || !id) return;
    setIsLoading(true);
    try {
      const data = await getApplication(token, id);
      setApplication(data.application);
    } catch (err: any) {
      setError({ message: err.message || 'Failed to load application' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchApp(); }, [id, token]);

  const handleSubmit = async () => {
    if (!token || !application) return;
    if (!window.confirm('Submit this application? You will not be able to edit it after submission.')) return;
    setIsSubmitting(true);
    setSubmitError('');
    try {
      await submitApplication(token, application._id);
      navigate('/applicant/applications', { state: { successMessage: 'Application submitted successfully!' } });
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to submit');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── States ───────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#b91c1c] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#f8fafc]">
        <AppHeader />
        <main className="max-w-[900px] mx-auto px-6 lg:px-8 py-16 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3m0 3h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-[#131b2e] mb-2" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
            {error.message.includes('not found') ? 'Application Not Found' : error.message.includes('Access denied') ? 'Access Denied' : 'Error Loading Application'}
          </h2>
          <p className="text-sm text-[#5b403d] mb-6" style={{ fontFamily: 'Inter, sans-serif' }}>{error.message}</p>
          <Link to="/applicant/applications" className="text-sm font-semibold text-[#b91c1c] hover:underline" style={{ fontFamily: 'Inter, sans-serif' }}>
            ← Back to My Applications
          </Link>
        </main>
      </div>
    );
  }

  if (!application) return null;

  const { applicantDetails: ad, buildingDetails: bd, architectDetails: arc } = application;

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <AppHeader />

      <main className="max-w-[900px] mx-auto px-6 lg:px-8 py-8">
        {/* Breadcrumb & Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Link to="/applicant/applications" className="text-sm text-[#5b403d] hover:text-[#b91c1c] transition-colors" style={{ fontFamily: 'Inter, sans-serif' }}>
              My Applications
            </Link>
            <svg className="w-4 h-4 text-[#94a3b8]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-sm text-[#131b2e] font-medium" style={{ fontFamily: 'Inter, sans-serif' }}>
              {application.applicationId}
            </span>
          </div>

          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold text-[#131b2e]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', letterSpacing: '-0.025em' }}>
                  {application.applicationId}
                </h1>
                <StatusBadge status={application.status} />
              </div>
              <p className="text-sm text-[#5b403d]" style={{ fontFamily: 'Inter, sans-serif' }}>
                {bd?.buildingName || 'Building name not provided'}
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              {application.status === 'DRAFT' ? (
                <>
                  <Link
                    to={`/applicant/applications/${application._id}/edit`}
                    className="px-4 py-2 text-sm font-semibold text-[#b91c1c] border border-[#b91c1c] rounded-lg hover:bg-[#fef2f2] transition-colors"
                    style={{ fontFamily: 'Inter, sans-serif' }}
                  >
                    Edit Application
                  </Link>
                  <button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="px-4 py-2 text-sm font-semibold text-white bg-[#b91c1c] rounded-lg hover:bg-[#991b1b] transition-colors disabled:opacity-50"
                    style={{ fontFamily: 'Inter, sans-serif' }}
                  >
                    {isSubmitting ? 'Submitting…' : 'Submit Application'}
                  </button>
                </>
              ) : (
                <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-100 rounded-lg">
                  <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm text-blue-700 font-medium" style={{ fontFamily: 'Inter, sans-serif' }}>
                    This application is read-only
                  </span>
                </div>
              )}
            </div>
          </div>

          {submitError && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700" style={{ fontFamily: 'Inter, sans-serif' }}>
              {submitError}
            </div>
          )}
        </div>

        {/* Timestamps */}
        <div className="bg-white rounded-xl border border-[#e2e8f0] p-4 mb-5 flex flex-wrap gap-6" style={{ fontFamily: 'Inter, sans-serif' }}>
          <div>
            <span className="text-xs text-[#94a3b8] uppercase tracking-wider">Created</span>
            <p className="text-sm font-medium text-[#131b2e] mt-0.5">{new Date(application.createdAt).toLocaleDateString('en-IN')}</p>
          </div>
          <div>
            <span className="text-xs text-[#94a3b8] uppercase tracking-wider">Last Updated</span>
            <p className="text-sm font-medium text-[#131b2e] mt-0.5">{new Date(application.updatedAt).toLocaleDateString('en-IN')}</p>
          </div>
          {application.submittedAt && (
            <div>
              <span className="text-xs text-[#94a3b8] uppercase tracking-wider">Submitted</span>
              <p className="text-sm font-medium text-[#131b2e] mt-0.5">{new Date(application.submittedAt).toLocaleDateString('en-IN')}</p>
            </div>
          )}
        </div>

        {/* ── Dynamic Checklist Engine ──────────────────────────────────────── */}
        <ChecklistSection
          applicationId={application._id}
          isApplicationDraft={application.status === 'DRAFT'}
        />

        {/* ── Sections ─────────────────────────────────────────────────────── */}
        <SectionCard title="Applicant Information">
          <InfoRow label="Full Name" value={ad?.name} />
          <InfoRow label="Email Address" value={ad?.email} />
          <InfoRow label="Phone Number" value={ad?.phone} />
        </SectionCard>

        <SectionCard title="Building & Project Information">
          <InfoRow label="Building Name" value={bd?.buildingName} />
          <InfoRow label="Building Type" value={bd?.buildingType} />
          <InfoRow label="Building Status" value={bd?.buildingStatus === 'NEW' ? 'New Construction' : bd?.buildingStatus === 'EXISTING' ? 'Existing Building' : bd?.buildingStatus} />
          <InfoRow label="Occupancy Category" value={bd?.occupancyCategory ? bd.occupancyCategory.charAt(0) + bd.occupancyCategory.slice(1).toLowerCase() : undefined} />
        </SectionCard>

        <SectionCard title="Building Location">
          <InfoRow label="Street Address" value={bd?.location?.address} />
          <InfoRow label="State" value={bd?.location?.state} />
          <InfoRow label="District" value={bd?.location?.district} />
          <InfoRow label="Pincode" value={bd?.location?.pincode} />
        </SectionCard>

        <SectionCard title="Building Classification">
          <InfoRow label="Number of Floors" value={bd?.numberOfFloors} />
          <InfoRow label="Built-up Area" value={bd?.builtUpArea != null ? `${bd.builtUpArea} ${bd.builtUpAreaUnit ?? ''}` : undefined} />
        </SectionCard>

        <SectionCard title="Building Safety Information">
          <InfoRow label="High-Rise Building" value={bd?.isHighRise} />
          {bd?.isHighRise && <InfoRow label="Building Height" value={bd?.buildingHeight != null ? `${bd.buildingHeight} m` : undefined} />}
          <InfoRow label="Hazardous Materials" value={bd?.hasHazardousMaterials} />
          {bd?.hasHazardousMaterials && <InfoRow label="Hazardous Materials Description" value={bd?.hazardousMaterialsDescription} />}
        </SectionCard>

        <SectionCard title="Architect Details">
          <InfoRow label="Architect Name" value={arc?.name} />
          <InfoRow label="Registration Number" value={arc?.registrationNumber} />
          <InfoRow label="Email Address" value={arc?.email} />
          <InfoRow label="Phone Number" value={arc?.phone} />
        </SectionCard>

        {/* Back link */}
        <div className="pb-8">
          <Link
            to="/applicant/applications"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#5b403d] hover:text-[#b91c1c] transition-colors"
            style={{ fontFamily: 'Inter, sans-serif' }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to My Applications
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-[#e2e8f0]">
        <div className="max-w-[1440px] mx-auto px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-[#5b403d]" style={{ fontFamily: 'Inter, sans-serif' }}>© 2025 Fire Department Inspection & NoC Management</p>
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

export default ApplicationDetailPage;
