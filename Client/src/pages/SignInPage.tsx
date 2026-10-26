import { useState, type FormEvent, type ChangeEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface FormData {
  email: string;
  password: string;
  rememberMe: boolean;
}

interface FormErrors {
  email?: string;
  password?: string;
  general?: string;
}

type UserRole = 'APPLICANT' | 'INSPECTOR';

const SignInPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [selectedRole, setSelectedRole] = useState<UserRole>('APPLICANT');
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
    rememberMe: false,
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    // Clear error when user starts typing
    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'Email address is required';
    } else if (!/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(formData.email)) {
      newErrors.email = 'Please provide a valid email address';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.errors && Array.isArray(data.errors)) {
          const fieldErrors: FormErrors = {};
          data.errors.forEach((error: any) => {
            if (error.path) {
              fieldErrors[error.path as keyof FormErrors] = error.msg;
            }
          });
          setErrors(fieldErrors);
        } else {
          setErrors({ general: data.message || 'Login failed. Please try again.' });
        }
        return;
      }

      // Check if user role matches selected role
      if (data.data.user.role !== selectedRole) {
        setErrors({
          general: `This account is registered as ${data.data.user.role === 'APPLICANT' ? 'an Applicant' : 'an Inspector'}. Please select the correct role tab.`
        });
        return;
      }

      // Update auth context with token and user
      login(data.data.token, data.data.user);

      // Redirect based on role
      if (data.data.user.role === 'APPLICANT') {
        navigate('/applicant/dashboard');
      } else if (data.data.user.role === 'INSPECTOR') {
        navigate('/inspector/dashboard');
      }
    } catch (error) {
      console.error('Login error:', error);
      setErrors({ general: 'Network error. Please check your connection and try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#faf8ff] flex flex-col">
      {/* Navbar */}
      <header className="bg-white border-b border-[#e2e8f0] px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-10 h-10 bg-[#b91c1c] rounded-lg flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6 text-white" stroke="currentColor" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
            </div>
            <span className="font-bold text-lg text-[#131b2e]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
              Fire Dept. Inspection & NoC
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-6" style={{ fontFamily: 'Inter, sans-serif' }}>
            <Link to="/" className="text-sm text-[#5b403d] hover:text-[#131b2e] transition-colors">Home</Link>
            <Link to="/#features" className="text-sm text-[#5b403d] hover:text-[#131b2e] transition-colors">Features</Link>
            <Link to="/#about" className="text-sm text-[#5b403d] hover:text-[#131b2e] transition-colors">About</Link>
            <Link to="/signup" className="text-sm font-semibold text-white bg-[#b91c1c] px-4 py-2 rounded-lg hover:bg-[#991b1b] transition-colors">
              Register
            </Link>
            <Link to="/apply" className="text-sm font-semibold text-white bg-[#b91c1c] px-4 py-2 rounded-lg hover:bg-[#991b1b] transition-colors flex items-center gap-2">
              Apply for NOC
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {/* Card */}
          <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-[0_1px_3px_0_rgba(15,23,42,0.05),0_1px_2px_-1px_rgba(15,23,42,0.05)] p-8">
            {/* Logo */}
            <div className="flex justify-center mb-6">
              <div className="w-14 h-14 bg-[#b91c1c] rounded-xl flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7 text-white" stroke="currentColor" strokeWidth="1.8">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
              </div>
            </div>

            {/* Header */}
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-[#131b2e] mb-2" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                Sign in to Fire Department Inspection & NoC Management
              </h1>
              <p className="text-sm text-[#5b403d]" style={{ fontFamily: 'Inter, sans-serif' }}>
                Enter your credentials to access your clearances and inspections
              </p>
            </div>

            {/* Role Selector Tabs */}
            <div className="flex gap-2 mb-6">
              <button
                type="button"
                onClick={() => setSelectedRole('APPLICANT')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-all ${
                  selectedRole === 'APPLICANT'
                    ? 'bg-[#fef2f2] text-[#b91c1c] border-2 border-[#b91c1c]'
                    : 'bg-[#f8fafc] text-[#5b403d] border border-[#e2e8f0] hover:bg-[#f1f5f9]'
                }`}
                style={{ fontFamily: 'Inter, sans-serif' }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                Applicant / Citizen
              </button>
              <button
                type="button"
                onClick={() => setSelectedRole('INSPECTOR')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-all ${
                  selectedRole === 'INSPECTOR'
                    ? 'bg-[#fef2f2] text-[#b91c1c] border-2 border-[#b91c1c]'
                    : 'bg-[#f8fafc] text-[#5b403d] border border-[#e2e8f0] hover:bg-[#f1f5f9]'
                }`}
                style={{ fontFamily: 'Inter, sans-serif' }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
                Inspector / Official
              </button>
            </div>

            {/* General Error */}
            {errors.general && (
              <div className="mb-6 p-3 bg-[#fef2f2] border border-[#fecaca] rounded-lg text-sm text-[#b91c1c]" style={{ fontFamily: 'Inter, sans-serif' }}>
                {errors.general}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email Address */}
              <div>
                <label htmlFor="email" className="block text-xs font-semibold text-[#334155] mb-2 tracking-wide" style={{ fontFamily: 'Inter, sans-serif' }}>
                  Email Address <span className="text-[#b91c1c]">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="w-5 h-5 text-[#94a3b8]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="name@company.com"
                    className={`w-full h-11 pl-10 pr-4 text-sm text-[#0f172a] placeholder:text-[#94a3b8] bg-white border rounded-lg transition-all focus:outline-none focus:ring-3 ${
                      errors.email
                        ? 'border-[#b91c1c] focus:border-[#b91c1c] focus:ring-[#b91c1c]/12'
                        : 'border-[#cbd5e1] focus:border-[#b91c1c] focus:ring-[#b91c1c]/12'
                    }`}
                    style={{ fontFamily: 'Inter, sans-serif' }}
                  />
                </div>
                {errors.email && (
                  <p className="mt-1.5 text-xs text-[#b91c1c]" style={{ fontFamily: 'Inter, sans-serif' }}>
                    {errors.email}
                  </p>
                )}
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className="block text-xs font-semibold text-[#334155] mb-2 tracking-wide" style={{ fontFamily: 'Inter, sans-serif' }}>
                  Password <span className="text-[#b91c1c]">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="w-5 h-5 text-[#94a3b8]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="••••••••••••"
                    className={`w-full h-11 pl-10 pr-12 text-sm text-[#0f172a] placeholder:text-[#94a3b8] bg-white border rounded-lg transition-all focus:outline-none focus:ring-3 ${
                      errors.password
                        ? 'border-[#b91c1c] focus:border-[#b91c1c] focus:ring-[#b91c1c]/12'
                        : 'border-[#cbd5e1] focus:border-[#b91c1c] focus:ring-[#b91c1c]/12'
                    }`}
                    style={{ fontFamily: 'Inter, sans-serif' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#94a3b8] hover:text-[#64748b] transition-colors"
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1.5 text-xs text-[#b91c1c]" style={{ fontFamily: 'Inter, sans-serif' }}>
                    {errors.password}
                  </p>
                )}
              </div>

              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="rememberMe"
                    checked={formData.rememberMe}
                    onChange={handleChange}
                    className="w-4 h-4 text-[#b91c1c] bg-white border-[#cbd5e1] rounded focus:ring-2 focus:ring-[#b91c1c]/20"
                  />
                  <span className="text-sm text-[#5b403d]" style={{ fontFamily: 'Inter, sans-serif' }}>
                    Remember me
                  </span>
                </label>
                <Link
                  to="/forgot-password"
                  className="text-sm font-medium text-[#b91c1c] hover:underline"
                  style={{ fontFamily: 'Inter, sans-serif' }}
                >
                  Forgot password?
                </Link>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-11 bg-[#b91c1c] text-white text-sm font-semibold rounded-lg hover:bg-[#991b1b] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                style={{ fontFamily: 'Inter, sans-serif' }}
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Signing In...
                  </>
                ) : (
                  <>
                    Sign In
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </>
                )}
              </button>

              {/* Security Notice */}
              <div className="flex items-center justify-center gap-2 pt-2">
                <svg className="w-4 h-4 text-[#5b403d]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <p className="text-xs text-[#5b403d]" style={{ fontFamily: 'Inter, sans-serif' }}>
                  Encrypted End-to-End Civic Auth Protocol
                </p>
              </div>
            </form>

            {/* Sign Up Link */}
            <div className="mt-6 pt-6 border-t border-[#e2e8f0] text-center">
              <p className="text-sm text-[#5b403d]" style={{ fontFamily: 'Inter, sans-serif' }}>
                Don't have an account?{' '}
                <Link to="/signup" className="text-[#b91c1c] hover:underline font-semibold">
                  Sign up →
                </Link>
              </p>
            </div>
          </div>

          {/* Footer Info */}
          <div className="mt-6 flex items-center justify-center gap-4 text-xs text-[#5b403d]" style={{ fontFamily: 'Inter, sans-serif' }}>
            <span className="flex items-center gap-1.5">
              <div className="w-2 h-2 bg-[#0f766e] rounded-full"></div>
              National Building Code (NBC) Portal v4.2
            </span>
            <span>•</span>
            <span>Fire Safety Compliance Node 09-MH</span>
          </div>
        </div>
      </main>
    </div>
  );
};

export default SignInPage;
