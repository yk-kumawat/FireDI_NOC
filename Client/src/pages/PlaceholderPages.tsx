import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface PlaceholderPageProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  backTo?: string;
  backText?: string;
}

export const PlaceholderPage = ({
  title,
  description,
  icon,
  backTo = '/',
  backText = '← Back to Home',
}: PlaceholderPageProps) => (
  <div className="min-h-screen bg-[#faf8ff] flex items-center justify-center px-4 py-12">
    <div className="text-center max-w-md bg-white p-8 rounded-2xl border border-[#e2e8f0] shadow-sm">
      <div className="inline-flex items-center justify-center w-16 h-16 bg-[#fef2f2] border border-[#fed7aa] rounded-2xl mb-6">
        {icon}
      </div>
      <h1
        className="text-2xl font-bold text-[#131b2e] mb-3"
        style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
      >
        {title}
      </h1>
      <p className="text-sm text-[#5b403d] leading-relaxed mb-6" style={{ fontFamily: 'Inter, sans-serif' }}>
        {description}
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link
          to={backTo}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#b91c1c] rounded-lg hover:bg-[#991b1b] transition-all shadow-sm"
          style={{ fontFamily: 'Inter, sans-serif' }}
        >
          {backText}
        </Link>
      </div>
      <p className="mt-6 text-xs text-slate-400">
        This feature is scheduled for Phase 4 (Field Inspection & Issuance).
      </p>
    </div>
  </div>
);

export const ApplyPage = () => {
  const { isAuthenticated, user } = useAuth();

  return (
    <div className="min-h-screen bg-[#faf8ff] flex items-center justify-center px-4 py-12">
      <div className="text-center max-w-lg bg-white p-8 rounded-2xl border border-[#e2e8f0] shadow-sm">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-[#fef2f2] border border-[#fecaca] rounded-2xl mb-6">
          <svg className="w-8 h-8 text-[#b91c1c]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
        </div>
        <h1
          className="text-2xl font-bold text-[#131b2e] mb-3"
          style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
        >
          Fire NOC Application Portal
        </h1>
        <p className="text-sm text-[#5b403d] leading-relaxed mb-6" style={{ fontFamily: 'Inter, sans-serif' }}>
          Apply for Provisional or Final Fire Safety NOC, upload architectural and fire safety drawings, and track automated rule-based compliance verification.
        </p>

        {isAuthenticated ? (
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to={user?.role === 'INSPECTOR' ? '/inspector/dashboard' : '/applicant/applications/new'}
              className="w-full sm:w-auto px-6 py-2.5 text-sm font-semibold text-white bg-[#b91c1c] rounded-lg hover:bg-[#991b1b] transition-all shadow-sm"
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              {user?.role === 'INSPECTOR' ? 'Go to Inspector Dashboard' : 'Start New Application →'}
            </Link>
            <Link
              to="/applicant/dashboard"
              className="w-full sm:w-auto px-5 py-2.5 text-sm font-semibold text-[#5b403d] border border-[#e2e8f0] rounded-lg hover:bg-slate-50 transition-all"
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              My Dashboard
            </Link>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/signin?redirect=/applicant/applications/new"
              className="w-full sm:w-auto px-6 py-2.5 text-sm font-semibold text-white bg-[#b91c1c] rounded-lg hover:bg-[#991b1b] transition-all shadow-sm"
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              Sign In to Apply
            </Link>
            <Link
              to="/signup"
              className="w-full sm:w-auto px-5 py-2.5 text-sm font-semibold text-[#5b403d] border border-[#e2e8f0] rounded-lg hover:bg-slate-50 transition-all"
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              Create Applicant Account
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export const InspectionSchedulePage = () => (
  <PlaceholderPage
    title="Inspection Schedule"
    description="The field inspection scheduling calendar allows applicants to view scheduled inspection dates and coordinate with designated fire safety inspectors."
    icon={
      <svg className="w-8 h-8 text-[#b91c1c]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    }
    backTo="/applicant/dashboard"
    backText="← Back to Dashboard"
  />
);

export const CertificatesPage = () => (
  <PlaceholderPage
    title="Verification & Certificates"
    description="Download digitally signed Provisional NOC (P-NOC) and Final NOC certificates, verify QR codes, and review certificate validity."
    icon={
      <svg className="w-8 h-8 text-[#b91c1c]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    }
    backTo="/applicant/dashboard"
    backText="← Back to Dashboard"
  />
);

export const SupportPage = () => (
  <PlaceholderPage
    title="Support & Helpdesk"
    description="Contact municipal fire safety support, file technical inquiries regarding document classification, or report inspection scheduling issues."
    icon={
      <svg className="w-8 h-8 text-[#b91c1c]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    }
    backTo="/applicant/dashboard"
    backText="← Back to Dashboard"
  />
);

export const CompliancePage = () => (
  <PlaceholderPage
    title="Regulatory Fire Safety Compliance"
    description="Reference guide for National Building Code (NBC) Part IV fire safety provisions, setbacks, hydrant network standards, and occupancy guidelines."
    icon={
      <svg className="w-8 h-8 text-[#b91c1c]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    }
  />
);

export const NotFoundPage = () => (
  <div className="min-h-screen bg-[#faf8ff] flex items-center justify-center px-4 py-12">
    <div className="text-center max-w-md bg-white p-8 rounded-2xl border border-[#e2e8f0] shadow-sm">
      <div className="inline-flex items-center justify-center w-16 h-16 bg-[#fef2f2] text-[#b91c1c] rounded-2xl mb-4 font-bold text-2xl" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
        404
      </div>
      <h1 className="text-2xl font-bold text-[#131b2e] mb-2" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
        Page Not Found
      </h1>
      <p className="text-sm text-[#5b403d] mb-6" style={{ fontFamily: 'Inter, sans-serif' }}>
        The page you are looking for does not exist or has been moved.
      </p>
      <Link
        to="/"
        className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#b91c1c] rounded-lg hover:bg-[#991b1b] transition-all shadow-sm"
        style={{ fontFamily: 'Inter, sans-serif' }}
      >
        ← Back to Home
      </Link>
    </div>
  </div>
);
