import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import LandingPage from './pages/LandingPage';
import SignUpPage from './pages/SignUpPage';
import SignInPage from './pages/SignInPage';
import ApplicantDashboard from './pages/ApplicantDashboard';
import InspectorDashboard from './pages/InspectorDashboard';
import InspectorReviewPage from './pages/InspectorReviewPage';
import { ApplyPage } from './pages/PlaceholderPages';
import ApplicationListPage from './pages/applications/ApplicationListPage';
import ApplicationFormPage from './pages/applications/ApplicationFormPage';
import ApplicationDetailPage from './pages/applications/ApplicationDetailPage';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/signup" element={<SignUpPage />} />
          <Route path="/signin" element={<SignInPage />} />
          <Route path="/apply" element={<ApplyPage />} />

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
            path="/inspector/applications/:id/review"
            element={
              <ProtectedRoute allowedRoles={['INSPECTOR']}>
                <InspectorReviewPage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;

