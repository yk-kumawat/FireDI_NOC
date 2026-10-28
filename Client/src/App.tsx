import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import LandingPage from './pages/LandingPage';
import SignUpPage from './pages/SignUpPage';
import SignInPage from './pages/SignInPage';
import ApplicantDashboard from './pages/ApplicantDashboard';
import InspectorDashboard from './pages/InspectorDashboard';
import InspectorReviewPage from './pages/InspectorReviewPage';
import {
  ApplyPage,
  InspectionSchedulePage,
  CertificatesPage,
  SupportPage,
  CompliancePage,
  NotFoundPage,
} from './pages/PlaceholderPages';
import ApplicationListPage from './pages/applications/ApplicationListPage';
import ApplicationFormPage from './pages/applications/ApplicationFormPage';
import ApplicationDetailPage from './pages/applications/ApplicationDetailPage';

const ApplyRoute = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#faf8ff]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#b91c1c]" />
      </div>
    );
  }
  if (!isAuthenticated) {
    return <ApplyPage />;
  }
  if (user?.role === 'INSPECTOR') {
    return <Navigate to="/inspector/dashboard" replace />;
  }
  return <Navigate to="/applicant/applications/new" replace />;
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/signup" element={<SignUpPage />} />
          <Route path="/signin" element={<SignInPage />} />
          <Route path="/apply" element={<ApplyRoute />} />
          <Route path="/compliance" element={<CompliancePage />} />
          <Route path="/help" element={<SupportPage />} />
          <Route path="/privacy" element={<CompliancePage />} />

          {/* Protected Routes - Applicant */}
          <Route
            path="/applicant/dashboard"
            element={
              <ProtectedRoute allowedRoles={['APPLICANT']}>
                <ApplicantDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/applicant/applications"
            element={
              <ProtectedRoute allowedRoles={['APPLICANT']}>
                <ApplicationListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/applicant/applications/new"
            element={
              <ProtectedRoute allowedRoles={['APPLICANT']}>
                <ApplicationFormPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/applicant/applications/:id"
            element={
              <ProtectedRoute allowedRoles={['APPLICANT']}>
                <ApplicationDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/applicant/applications/:id/edit"
            element={
              <ProtectedRoute allowedRoles={['APPLICANT']}>
                <ApplicationFormPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/applicant/schedule"
            element={
              <ProtectedRoute allowedRoles={['APPLICANT']}>
                <InspectionSchedulePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/applicant/certificates"
            element={
              <ProtectedRoute allowedRoles={['APPLICANT']}>
                <CertificatesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/applicant/support"
            element={
              <ProtectedRoute allowedRoles={['APPLICANT']}>
                <SupportPage />
              </ProtectedRoute>
            }
          />

          {/* Protected Routes - Inspector */}
          <Route
            path="/inspector/dashboard"
            element={
              <ProtectedRoute allowedRoles={['INSPECTOR']}>
                <InspectorDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/inspector/applications"
            element={
              <ProtectedRoute allowedRoles={['INSPECTOR']}>
                <InspectorDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/inspector/applications/:id/review"
            element={
              <ProtectedRoute allowedRoles={['INSPECTOR']}>
                <InspectorReviewPage />
              </ProtectedRoute>
            }
          />

          {/* Catch-all 404 Route */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
