import { Link } from 'react-router-dom';

interface PlaceholderPageProps {
  title: string;
  description: string;
  icon: React.ReactNode;
}

const PlaceholderPage = ({ title, description, icon }: PlaceholderPageProps) => (
  <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
    <div className="text-center max-w-md">
      <div className="inline-flex items-center justify-center w-16 h-16 bg-red-50 border border-red-100 rounded-2xl mb-6">
        {icon}
      </div>
      <h1
        className="text-2xl font-bold text-slate-900 mb-3"
        style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
      >
        {title}
      </h1>
      <p className="text-sm text-slate-500 leading-relaxed mb-8" style={{ fontFamily: 'Inter, sans-serif' }}>
        {description}
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-red-700 rounded-lg hover:bg-red-800 transition-all shadow-sm"
        >
          ← Back to Home
        </Link>
      </div>
      <p className="mt-6 text-xs text-slate-400">
        This page will be implemented in a future development phase.
      </p>
    </div>
  </div>
);

export const SignInPage = () => (
  <PlaceholderPage
    title="Sign In"
    description="The authentication portal for Fire Department Inspection & NoC Management. Officials, inspectors, and applicants will sign in here to access their dashboards."
    icon={
      <svg className="w-8 h-8 text-red-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
      </svg>
    }
  />
);

export const ApplyPage = () => (
  <PlaceholderPage
    title="Apply for NOC"
    description="The NoC application portal for building owners and architects. Submit your fire safety documents and track your application status."
    icon={
      <svg className="w-8 h-8 text-red-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
    }
  />
);
