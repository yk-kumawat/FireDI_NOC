import { Link } from 'react-router-dom';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-slate-900 text-slate-400">
      {/* Main footer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand block */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 bg-red-700 rounded-lg flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-white" stroke="currentColor" strokeWidth="1.8">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
              </div>
              <span className="font-bold text-lg text-white" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                Fire Dept. Inspection & NoC
              </span>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed mb-5 max-w-xs" style={{ fontFamily: 'Inter, sans-serif' }}>
              Fire Department Inspection &amp; NoC Management System
            </p>
            <p className="text-xs text-slate-500 leading-relaxed max-w-xs">
              Intelligent digital platform for streamlining municipal fire inspections and
              NoC application workflows.
            </p>
          </div>

          {/* Platform links */}
          <div>
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest mb-4">
              Platform
            </h3>
            <ul className="space-y-3">
              {['Home', 'Features', 'How It Works', 'About'].map((item) => (
                <li key={item}>
                  <a
                    href={item === 'Home' ? '/' : `#${item.toLowerCase().replace(/ /g, '-')}`}
                    className="text-sm text-slate-400 hover:text-white transition-colors"
                    style={{ fontFamily: 'Inter, sans-serif' }}
                  >
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Account links */}
          <div>
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest mb-4">
              Account
            </h3>
            <ul className="space-y-3">
              <li>
                <Link
                  to="/signin"
                  className="text-sm text-slate-400 hover:text-white transition-colors"
                  style={{ fontFamily: 'Inter, sans-serif' }}
                >
                  Sign In
                </Link>
              </li>
              <li>
                <Link
                  to="/apply"
                  className="text-sm text-slate-400 hover:text-white transition-colors"
                  style={{ fontFamily: 'Inter, sans-serif' }}
                >
                  Apply for NOC
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-slate-500" style={{ fontFamily: 'Inter, sans-serif' }}>
              © {currentYear} Fire Department Inspection & NoC Management. All rights reserved.
            </p>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 bg-slate-800 border border-slate-700 text-slate-400 text-xs font-medium rounded-full" style={{ fontFamily: 'Inter, sans-serif' }}>
                Final Year Major Project
              </span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
