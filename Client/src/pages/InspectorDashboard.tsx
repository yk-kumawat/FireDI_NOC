import { useAuth } from '../context/AuthContext';

const InspectorDashboard = () => {
  const { user, logout } = useAuth();

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
            <span className="font-bold text-lg text-[#131b2e]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
              Fire Dept. Inspection & NoC
            </span>
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
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-[#fef2f2] rounded-2xl mb-6">
            <svg className="w-10 h-10 text-[#b91c1c]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
          </div>

          <h1 className="text-4xl font-bold text-[#131b2e] mb-4" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', letterSpacing: '-0.025em' }}>
            Inspector Dashboard
          </h1>

          <p className="text-lg text-[#5b403d] mb-8 max-w-2xl mx-auto" style={{ fontFamily: 'Inter, sans-serif' }}>
            Welcome back, <span className="font-semibold text-[#131b2e]">{user?.name}</span>! This is your official inspector dashboard where you'll be able to review applications, schedule field inspections, record findings, and issue NOC certificates.
          </p>

          <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-[0_1px_3px_0_rgba(15,23,42,0.05),0_1px_2px_-1px_rgba(15,23,42,0.05)] p-8 max-w-2xl mx-auto">
            <div className="flex items-start gap-4 mb-6">
              <div className="flex-shrink-0">
                <svg className="w-6 h-6 text-[#ea580c]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="text-left">
                <h3 className="text-lg font-bold text-[#131b2e] mb-2" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                  Dashboard Under Development
                </h3>
                <p className="text-sm text-[#5b403d] leading-relaxed" style={{ fontFamily: 'Inter, sans-serif' }}>
                  The complete inspector dashboard with application queue management, inspection scheduling, digital checklists, photo documentation, and NOC issuance workflow is currently being developed. Stay tuned for updates!
                </p>
              </div>
            </div>

            <div className="pt-6 border-t border-[#e2e8f0]">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-[#f0fdf4] rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-[#15803d]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-[#131b2e]" style={{ fontFamily: 'Inter, sans-serif' }}>Authentication Active</p>
                    <p className="text-xs text-[#5b403d]" style={{ fontFamily: 'Inter, sans-serif' }}>Role-based access working</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-[#f0fdf4] rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-[#15803d]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-[#131b2e]" style={{ fontFamily: 'Inter, sans-serif' }}>Protected Routes</p>
                    <p className="text-xs text-[#5b403d]" style={{ fontFamily: 'Inter, sans-serif' }}>Authorization middleware live</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 flex items-center justify-center gap-4">
            <div className="px-4 py-2 bg-[#f1f5f9] rounded-lg">
              <p className="text-xs text-[#5b403d]" style={{ fontFamily: 'Inter, sans-serif' }}>
                Email: <span className="font-medium text-[#131b2e]">{user?.email}</span>
              </p>
            </div>
            <div className="px-4 py-2 bg-[#f1f5f9] rounded-lg">
              <p className="text-xs text-[#5b403d]" style={{ fontFamily: 'Inter, sans-serif' }}>
                Phone: <span className="font-medium text-[#131b2e]">{user?.phone}</span>
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default InspectorDashboard;
