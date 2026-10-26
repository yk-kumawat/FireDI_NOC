import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  createApplication,
  getApplication,
  updateApplication,
  submitApplication,
} from '../../services/applicationApi';
import type {
  ApplicantDetails,
  BuildingDetails,
  ArchitectDetails,
  BuildingStatus,
  OccupancyCategory,
} from '../../types/application';

// ─── Header (shared) ──────────────────────────────────────────────────────────
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

// ─── Section Wrapper ──────────────────────────────────────────────────────────
const Section = ({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) => (
  <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-[0_1px_3px_0_rgba(15,23,42,0.05)] p-6 mb-6">
    <div className="mb-5 pb-4 border-b border-[#f1f5f9]">
      <h2 className="text-base font-bold text-[#131b2e]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{title}</h2>
      {description && <p className="text-sm text-[#5b403d] mt-0.5" style={{ fontFamily: 'Inter, sans-serif' }}>{description}</p>}
    </div>
    {children}
  </div>
);

// ─── Field Components ─────────────────────────────────────────────────────────
const FieldError = ({ errors, field }: { errors: Record<string, string>; field: string }) =>
  errors[field] ? (
    <p className="mt-1 text-xs text-red-600" style={{ fontFamily: 'Inter, sans-serif' }}>{errors[field]}</p>
  ) : null;

const inputClass = 'w-full px-3 py-2 text-sm border border-[#e2e8f0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#b91c1c] focus:border-transparent transition-all bg-white text-[#131b2e]';
const labelClass = 'block text-sm font-medium text-[#131b2e] mb-1';
const gridClass = 'grid grid-cols-1 sm:grid-cols-2 gap-4';

// ─── Form Data Shape ──────────────────────────────────────────────────────────
interface FormData {
  applicantDetails: Partial<ApplicantDetails>;
  buildingDetails: BuildingDetails;
  architectDetails: Partial<ArchitectDetails>;
}

const defaultFormData = (): FormData => ({
  applicantDetails: { name: '', email: '', phone: '' },
  buildingDetails: {
    buildingName: '',
    buildingType: '',
    buildingStatus: undefined,
    occupancyCategory: undefined,
    location: { address: '', state: '', district: '', pincode: '' },
    isHighRise: false,
    buildingHeight: undefined,
    numberOfFloors: undefined,
    builtUpArea: undefined,
    builtUpAreaUnit: 'sq.m',
    hasHazardousMaterials: false,
    hazardousMaterialsDescription: '',
  },
  architectDetails: { name: '', registrationNumber: '', email: '', phone: '' },
});

// ─── Client-side Validation ───────────────────────────────────────────────────
function validateForm(data: FormData): Record<string, string> {
  const errs: Record<string, string> = {};
  const { applicantDetails: ad, buildingDetails: bd, architectDetails: arc } = data;

  if (!ad.name?.trim()) errs['applicantDetails.name'] = 'Applicant name is required';
  if (!ad.email?.trim()) errs['applicantDetails.email'] = 'Email is required';
  if (!ad.phone?.trim()) errs['applicantDetails.phone'] = 'Phone is required';

  if (!bd.buildingName?.trim()) errs['buildingDetails.buildingName'] = 'Building name is required';
  if (!bd.buildingType?.trim()) errs['buildingDetails.buildingType'] = 'Building type is required';
  if (!bd.buildingStatus) errs['buildingDetails.buildingStatus'] = 'Building status is required';
  if (!bd.occupancyCategory) errs['buildingDetails.occupancyCategory'] = 'Occupancy category is required';

  if (!bd.location?.address?.trim()) errs['buildingDetails.location.address'] = 'Address is required';
  if (!bd.location?.state?.trim()) errs['buildingDetails.location.state'] = 'State is required';
  if (!bd.location?.district?.trim()) errs['buildingDetails.location.district'] = 'District is required';
  if (!bd.location?.pincode?.trim()) errs['buildingDetails.location.pincode'] = 'Pincode is required';

  if (bd.numberOfFloors == null || bd.numberOfFloors === undefined) {
    errs['buildingDetails.numberOfFloors'] = 'Number of floors is required';
  } else if (Number(bd.numberOfFloors) < 1) {
    errs['buildingDetails.numberOfFloors'] = 'Must be at least 1';
  }

  if (bd.builtUpArea == null || bd.builtUpArea === undefined) {
    errs['buildingDetails.builtUpArea'] = 'Built-up area is required';
  } else if (Number(bd.builtUpArea) <= 0) {
    errs['buildingDetails.builtUpArea'] = 'Must be greater than 0';
  }

  if (!bd.builtUpAreaUnit) errs['buildingDetails.builtUpAreaUnit'] = 'Unit is required';

  if (bd.isHighRise === true) {
    if (bd.buildingHeight == null) {
      errs['buildingDetails.buildingHeight'] = 'Building height is required for high-rise';
    } else if (Number(bd.buildingHeight) <= 0) {
      errs['buildingDetails.buildingHeight'] = 'Must be greater than 0';
    }
  }

  if (bd.hasHazardousMaterials === true && !bd.hazardousMaterialsDescription?.trim()) {
    errs['buildingDetails.hazardousMaterialsDescription'] = 'Description is required';
  }

  if (!arc.name?.trim()) errs['architectDetails.name'] = 'Architect name is required';
  if (!arc.email?.trim()) errs['architectDetails.email'] = 'Architect email is required';
  if (!arc.phone?.trim()) errs['architectDetails.phone'] = 'Architect phone is required';

  return errs;
}

// ─── Main Component ───────────────────────────────────────────────────────────
const ApplicationFormPage = () => {
  const { id } = useParams<{ id?: string }>();
  const { token, user } = useAuth();
  const navigate = useNavigate();

  const isEditing = !!id;
  const [formData, setFormData] = useState<FormData>(defaultFormData());
  const [applicationId, setApplicationId] = useState<string | null>(null); // _id after create
  const [appRefId, setAppRefId] = useState<string>(''); // human-readable FNO-xxx
  const [isDirty, setIsDirty] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(isEditing);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [globalError, setGlobalError] = useState('');

  // Track unsaved changes for navigation warning
  const isDirtyRef = useRef(isDirty);
  useEffect(() => {
    isDirtyRef.current = isDirty;
  }, [isDirty]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // ── Load existing application ───────────────────────────────────────────────
  useEffect(() => {
    if (!isEditing || !token || !id) return;
    (async () => {
      setIsLoading(true);
      try {
        const data = await getApplication(token, id);
        const app = data.application;

        // Redirect if not a draft
        if (app.status !== 'DRAFT') {
          navigate(`/applicant/applications/${id}`, { replace: true });
          return;
        }

        setApplicationId(app._id);
        setAppRefId(app.applicationId);
        setFormData({
          applicantDetails: app.applicantDetails ?? { name: '', email: '', phone: '' },
          buildingDetails: {
            buildingName: app.buildingDetails?.buildingName ?? '',
            buildingType: app.buildingDetails?.buildingType ?? '',
            buildingStatus: app.buildingDetails?.buildingStatus,
            occupancyCategory: app.buildingDetails?.occupancyCategory,
            location: {
              address: app.buildingDetails?.location?.address ?? '',
              state: app.buildingDetails?.location?.state ?? '',
              district: app.buildingDetails?.location?.district ?? '',
              pincode: app.buildingDetails?.location?.pincode ?? '',
            },
            isHighRise: app.buildingDetails?.isHighRise ?? false,
            buildingHeight: app.buildingDetails?.buildingHeight,
            numberOfFloors: app.buildingDetails?.numberOfFloors,
            builtUpArea: app.buildingDetails?.builtUpArea,
            builtUpAreaUnit: app.buildingDetails?.builtUpAreaUnit ?? 'sq.m',
            hasHazardousMaterials: app.buildingDetails?.hasHazardousMaterials ?? false,
            hazardousMaterialsDescription: app.buildingDetails?.hazardousMaterialsDescription ?? '',
          },
          architectDetails: app.architectDetails ?? { name: '', registrationNumber: '', email: '', phone: '' },
        });
      } catch (err: unknown) {
        setGlobalError((err as Error).message || 'Failed to load application');
      } finally {
        setIsLoading(false);
      }
    })();
  }, [id, isEditing, token, navigate]);

  // Pre-fill from user on new
  useEffect(() => {
    if (!isEditing && user) {
      setFormData((prev) => ({
        ...prev,
        applicantDetails: {
          name: user.name ?? '',
          email: user.email ?? '',
          phone: user.phone ?? '',
        },
      }));
    }
  }, [isEditing, user]);

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const updateApplicant = (field: keyof ApplicantDetails, value: string) => {
    setIsDirty(true);
    setFormData((prev) => ({
      ...prev,
      applicantDetails: { ...prev.applicantDetails, [field]: value },
    }));
  };

  const updateBuilding = (field: keyof BuildingDetails, value: unknown) => {
    setIsDirty(true);
    setFormData((prev) => ({
      ...prev,
      buildingDetails: { ...prev.buildingDetails, [field]: value },
    }));
  };

  const updateLocation = (field: string, value: string) => {
    setIsDirty(true);
    setFormData((prev) => ({
      ...prev,
      buildingDetails: {
        ...prev.buildingDetails,
        location: { ...prev.buildingDetails.location, [field]: value },
      },
    }));
  };

  const updateArchitect = (field: keyof ArchitectDetails, value: string) => {
    setIsDirty(true);
    setFormData((prev) => ({
      ...prev,
      architectDetails: { ...prev.architectDetails, [field]: value },
    }));
  };

  // ── Save Draft ───────────────────────────────────────────────────────────────
  const handleSaveDraft = async () => {
    if (!token) return;
    setIsSaving(true);
    setSaveMessage('');
    setGlobalError('');
    try {
      let appId = applicationId;

      if (!appId) {
        // Create new application first
        const created = await createApplication(token);
        appId = created.application._id;
        setApplicationId(appId);
        setAppRefId(created.application.applicationId);
      }

      // Update with current form data
      await updateApplication(token, appId, {
        applicantDetails: formData.applicantDetails as ApplicantDetails,
        buildingDetails: formData.buildingDetails,
        architectDetails: formData.architectDetails as ArchitectDetails,
      });

      setIsDirty(false);
      setSaveMessage('Draft saved successfully');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (err: unknown) {
      setGlobalError((err as Error).message || 'Failed to save draft');
    } finally {
      setIsSaving(false);
    }
  };

  // ── Submit Application ────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!token) return;

    // Client-side validation
    const clientErrors = validateForm(formData);
    if (Object.keys(clientErrors).length > 0) {
      setFieldErrors(clientErrors);
      // Scroll to top to see errors
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setFieldErrors({});

    setIsSubmitting(true);
    setGlobalError('');

    try {
      let appId = applicationId;

      // Save draft first if needed
      if (!appId) {
        const created = await createApplication(token);
        appId = created.application._id;
        setApplicationId(appId);
        setAppRefId(created.application.applicationId);
      }

      // Push latest form data
      await updateApplication(token, appId, {
        applicantDetails: formData.applicantDetails as ApplicantDetails,
        buildingDetails: formData.buildingDetails,
        architectDetails: formData.architectDetails as ArchitectDetails,
      });

      // Submit
      await submitApplication(token, appId);
      setIsDirty(false);
      navigate('/applicant/applications', { state: { successMessage: 'Application submitted successfully!' } });
    } catch (err: unknown) {
      const typedErr = err as Error & { errors?: { field: string; message: string }[] };
      if (typedErr.errors) {
        // Map server field errors
        const mapped: Record<string, string> = {};
        typedErr.errors.forEach(({ field, message }) => {
          mapped[field] = message;
        });
        setFieldErrors(mapped);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        setGlobalError(typedErr.message || 'Failed to submit application');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#b91c1c] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const bd = formData.buildingDetails;
  const ad = formData.applicantDetails;
  const arc = formData.architectDetails;

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <AppHeader />

      <main className="max-w-[900px] mx-auto px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <Link
              to="/applicant/applications"
              onClick={(e) => {
                if (isDirty && !window.confirm('You have unsaved changes. Are you sure you want to leave?')) {
                  e.preventDefault();
                }
              }}
              className="text-sm text-[#5b403d] hover:text-[#b91c1c] transition-colors"
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              My Applications
            </Link>
            <svg className="w-4 h-4 text-[#94a3b8]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-sm text-[#131b2e] font-medium" style={{ fontFamily: 'Inter, sans-serif' }}>
              {isEditing ? appRefId || 'Edit Application' : 'New Application'}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-[#131b2e]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', letterSpacing: '-0.025em' }}>
            {isEditing ? 'Edit Application' : 'New Fire NOC Application'}
          </h1>
          <p className="text-sm text-[#5b403d] mt-1" style={{ fontFamily: 'Inter, sans-serif' }}>
            Fill in all sections below. Use "Save Draft" at any time to save your progress.
          </p>
        </div>

        {/* Global Error */}
        {globalError && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700" style={{ fontFamily: 'Inter, sans-serif' }}>
            {globalError}
          </div>
        )}

        {/* Field errors summary */}
        {Object.keys(fieldErrors).length > 0 && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg" style={{ fontFamily: 'Inter, sans-serif' }}>
            <p className="text-sm font-semibold text-red-700 mb-2">Please fix the following errors before submitting:</p>
            <ul className="list-disc list-inside space-y-1">
              {Object.values(fieldErrors).map((msg, i) => (
                <li key={i} className="text-xs text-red-600">{msg}</li>
              ))}
            </ul>
          </div>
        )}

        {/* ── Section 1: Applicant Information ─────────────────────────────── */}
        <Section title="1. Applicant Information" description="Your personal contact details">
          <div className={gridClass}>
            <div>
              <label className={labelClass} style={{ fontFamily: 'Inter, sans-serif' }}>Full Name *</label>
              <input
                type="text"
                className={inputClass}
                value={ad.name ?? ''}
                onChange={(e) => updateApplicant('name', e.target.value)}
                style={{ fontFamily: 'Inter, sans-serif' }}
              />
              <FieldError errors={fieldErrors} field="applicantDetails.name" />
            </div>
            <div>
              <label className={labelClass} style={{ fontFamily: 'Inter, sans-serif' }}>Email Address *</label>
              <input
                type="email"
                className={inputClass}
                value={ad.email ?? ''}
                onChange={(e) => updateApplicant('email', e.target.value)}
                style={{ fontFamily: 'Inter, sans-serif' }}
              />
              <FieldError errors={fieldErrors} field="applicantDetails.email" />
            </div>
            <div>
              <label className={labelClass} style={{ fontFamily: 'Inter, sans-serif' }}>Phone Number *</label>
              <input
                type="tel"
                className={inputClass}
                value={ad.phone ?? ''}
                onChange={(e) => updateApplicant('phone', e.target.value)}
                style={{ fontFamily: 'Inter, sans-serif' }}
              />
              <FieldError errors={fieldErrors} field="applicantDetails.phone" />
            </div>
          </div>
        </Section>

        {/* ── Section 2: Building & Project Information ─────────────────────── */}
        <Section title="2. Building & Project Information" description="Details about the building for which NOC is required">
          <div className={gridClass}>
            <div>
              <label className={labelClass} style={{ fontFamily: 'Inter, sans-serif' }}>Building Name *</label>
              <input
                type="text"
                className={inputClass}
                value={bd.buildingName ?? ''}
                onChange={(e) => updateBuilding('buildingName', e.target.value)}
                style={{ fontFamily: 'Inter, sans-serif' }}
              />
              <FieldError errors={fieldErrors} field="buildingDetails.buildingName" />
            </div>
            <div>
              <label className={labelClass} style={{ fontFamily: 'Inter, sans-serif' }}>Building Type *</label>
              <input
                type="text"
                className={inputClass}
                placeholder="e.g. Office Tower, Apartment, Warehouse"
                value={bd.buildingType ?? ''}
                onChange={(e) => updateBuilding('buildingType', e.target.value)}
                style={{ fontFamily: 'Inter, sans-serif' }}
              />
              <FieldError errors={fieldErrors} field="buildingDetails.buildingType" />
            </div>
            <div>
              <label className={labelClass} style={{ fontFamily: 'Inter, sans-serif' }}>Building Status *</label>
              <select
                className={inputClass}
                value={bd.buildingStatus ?? ''}
                onChange={(e) => updateBuilding('buildingStatus', e.target.value as BuildingStatus || undefined)}
                style={{ fontFamily: 'Inter, sans-serif' }}
              >
                <option value="">Select status</option>
                <option value="NEW">New Construction</option>
                <option value="EXISTING">Existing Building</option>
              </select>
              <FieldError errors={fieldErrors} field="buildingDetails.buildingStatus" />
            </div>
            <div>
              <label className={labelClass} style={{ fontFamily: 'Inter, sans-serif' }}>Occupancy Category *</label>
              <select
                className={inputClass}
                value={bd.occupancyCategory ?? ''}
                onChange={(e) => updateBuilding('occupancyCategory', e.target.value as OccupancyCategory || undefined)}
                style={{ fontFamily: 'Inter, sans-serif' }}
              >
                <option value="">Select category</option>
                <option value="RESIDENTIAL">Residential</option>
                <option value="COMMERCIAL">Commercial</option>
                <option value="INDUSTRIAL">Industrial</option>
              </select>
              <FieldError errors={fieldErrors} field="buildingDetails.occupancyCategory" />
            </div>
          </div>
        </Section>

        {/* ── Section 3: Building Location ─────────────────────────────────── */}
        <Section title="3. Building Location" description="Physical location of the building">
          <div className="mb-4">
            <label className={labelClass} style={{ fontFamily: 'Inter, sans-serif' }}>Street Address *</label>
            <textarea
              className={`${inputClass} min-h-[80px] resize-y`}
              value={bd.location?.address ?? ''}
              onChange={(e) => updateLocation('address', e.target.value)}
              style={{ fontFamily: 'Inter, sans-serif' }}
            />
            <FieldError errors={fieldErrors} field="buildingDetails.location.address" />
          </div>
          <div className={gridClass}>
            <div>
              <label className={labelClass} style={{ fontFamily: 'Inter, sans-serif' }}>State *</label>
              <input type="text" className={inputClass} value={bd.location?.state ?? ''} onChange={(e) => updateLocation('state', e.target.value)} style={{ fontFamily: 'Inter, sans-serif' }} />
              <FieldError errors={fieldErrors} field="buildingDetails.location.state" />
            </div>
            <div>
              <label className={labelClass} style={{ fontFamily: 'Inter, sans-serif' }}>District *</label>
              <input type="text" className={inputClass} value={bd.location?.district ?? ''} onChange={(e) => updateLocation('district', e.target.value)} style={{ fontFamily: 'Inter, sans-serif' }} />
              <FieldError errors={fieldErrors} field="buildingDetails.location.district" />
            </div>
            <div>
              <label className={labelClass} style={{ fontFamily: 'Inter, sans-serif' }}>Pincode *</label>
              <input type="text" className={inputClass} maxLength={6} value={bd.location?.pincode ?? ''} onChange={(e) => updateLocation('pincode', e.target.value)} style={{ fontFamily: 'Inter, sans-serif' }} />
              <FieldError errors={fieldErrors} field="buildingDetails.location.pincode" />
            </div>
          </div>
        </Section>

        {/* ── Section 4: Building Classification ───────────────────────────── */}
        <Section title="4. Building Classification" description="Physical dimensions and floor count">
          <div className={gridClass}>
            <div>
              <label className={labelClass} style={{ fontFamily: 'Inter, sans-serif' }}>Number of Floors *</label>
              <input
                type="number"
                min={1}
                className={inputClass}
                value={bd.numberOfFloors ?? ''}
                onChange={(e) => updateBuilding('numberOfFloors', e.target.value ? Number(e.target.value) : undefined)}
                style={{ fontFamily: 'Inter, sans-serif' }}
              />
              <FieldError errors={fieldErrors} field="buildingDetails.numberOfFloors" />
            </div>
            <div>
              <label className={labelClass} style={{ fontFamily: 'Inter, sans-serif' }}>Built-up Area *</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min={0.01}
                  step="0.01"
                  className={`${inputClass} flex-1`}
                  value={bd.builtUpArea ?? ''}
                  onChange={(e) => updateBuilding('builtUpArea', e.target.value ? Number(e.target.value) : undefined)}
                  style={{ fontFamily: 'Inter, sans-serif' }}
                />
                <select
                  className="px-3 py-2 text-sm border border-[#e2e8f0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#b91c1c] bg-white text-[#131b2e]"
                  value={bd.builtUpAreaUnit ?? 'sq.m'}
                  onChange={(e) => updateBuilding('builtUpAreaUnit', e.target.value)}
                  style={{ fontFamily: 'Inter, sans-serif' }}
                >
                  <option value="sq.m">sq.m</option>
                  <option value="sq.ft">sq.ft</option>
                </select>
              </div>
              <FieldError errors={fieldErrors} field="buildingDetails.builtUpArea" />
            </div>
          </div>
        </Section>

        {/* ── Section 5: Building Safety Information ────────────────────────── */}
        <Section title="5. Building Safety Information" description="Classification for safety assessment">
          <div className="space-y-5">
            {/* isHighRise */}
            <div>
              <label className={labelClass} style={{ fontFamily: 'Inter, sans-serif' }}>Is this a High-Rise Building? *</label>
              <div className="flex gap-4 mt-2">
                {[true, false].map((val) => (
                  <label key={String(val)} className="flex items-center gap-2 cursor-pointer" style={{ fontFamily: 'Inter, sans-serif' }}>
                    <input
                      type="radio"
                      name="isHighRise"
                      checked={bd.isHighRise === val}
                      onChange={() => updateBuilding('isHighRise', val)}
                      className="accent-[#b91c1c]"
                    />
                    <span className="text-sm text-[#131b2e]">{val ? 'Yes' : 'No'}</span>
                  </label>
                ))}
              </div>
              {bd.isHighRise && (
                <div className="mt-3">
                  <label className={labelClass} style={{ fontFamily: 'Inter, sans-serif' }}>Building Height (m) *</label>
                  <input
                    type="number"
                    min={0.01}
                    step="0.01"
                    className={`${inputClass} max-w-[200px]`}
                    value={bd.buildingHeight ?? ''}
                    onChange={(e) => updateBuilding('buildingHeight', e.target.value ? Number(e.target.value) : undefined)}
                    style={{ fontFamily: 'Inter, sans-serif' }}
                  />
                  <FieldError errors={fieldErrors} field="buildingDetails.buildingHeight" />
                </div>
              )}
            </div>

            {/* hasHazardousMaterials */}
            <div>
              <label className={labelClass} style={{ fontFamily: 'Inter, sans-serif' }}>Does the building store or use hazardous materials? *</label>
              <div className="flex gap-4 mt-2">
                {[true, false].map((val) => (
                  <label key={String(val)} className="flex items-center gap-2 cursor-pointer" style={{ fontFamily: 'Inter, sans-serif' }}>
                    <input
                      type="radio"
                      name="hasHazardousMaterials"
                      checked={bd.hasHazardousMaterials === val}
                      onChange={() => updateBuilding('hasHazardousMaterials', val)}
                      className="accent-[#b91c1c]"
                    />
                    <span className="text-sm text-[#131b2e]">{val ? 'Yes' : 'No'}</span>
                  </label>
                ))}
              </div>
              {bd.hasHazardousMaterials && (
                <div className="mt-3">
                  <label className={labelClass} style={{ fontFamily: 'Inter, sans-serif' }}>Description of Hazardous Materials *</label>
                  <textarea
                    className={`${inputClass} min-h-[80px] resize-y`}
                    value={bd.hazardousMaterialsDescription ?? ''}
                    onChange={(e) => updateBuilding('hazardousMaterialsDescription', e.target.value)}
                    placeholder="Describe the hazardous materials and storage details"
                    style={{ fontFamily: 'Inter, sans-serif' }}
                  />
                  <FieldError errors={fieldErrors} field="buildingDetails.hazardousMaterialsDescription" />
                </div>
              )}
            </div>
          </div>
        </Section>

        {/* ── Section 6: Architect Details ─────────────────────────────────── */}
        <Section title="6. Architect Details" description="Details of the licensed architect associated with this project">
          <div className={gridClass}>
            <div>
              <label className={labelClass} style={{ fontFamily: 'Inter, sans-serif' }}>Architect Name *</label>
              <input type="text" className={inputClass} value={arc.name ?? ''} onChange={(e) => updateArchitect('name', e.target.value)} style={{ fontFamily: 'Inter, sans-serif' }} />
              <FieldError errors={fieldErrors} field="architectDetails.name" />
            </div>
            <div>
              <label className={labelClass} style={{ fontFamily: 'Inter, sans-serif' }}>Registration Number <span className="text-[#94a3b8] font-normal">(optional)</span></label>
              <input type="text" className={inputClass} value={arc.registrationNumber ?? ''} onChange={(e) => updateArchitect('registrationNumber', e.target.value)} style={{ fontFamily: 'Inter, sans-serif' }} />
            </div>
            <div>
              <label className={labelClass} style={{ fontFamily: 'Inter, sans-serif' }}>Email *</label>
              <input type="email" className={inputClass} value={arc.email ?? ''} onChange={(e) => updateArchitect('email', e.target.value)} style={{ fontFamily: 'Inter, sans-serif' }} />
              <FieldError errors={fieldErrors} field="architectDetails.email" />
            </div>
            <div>
              <label className={labelClass} style={{ fontFamily: 'Inter, sans-serif' }}>Phone *</label>
              <input type="tel" className={inputClass} value={arc.phone ?? ''} onChange={(e) => updateArchitect('phone', e.target.value)} style={{ fontFamily: 'Inter, sans-serif' }} />
              <FieldError errors={fieldErrors} field="architectDetails.phone" />
            </div>
          </div>
        </Section>

        {/* ── Section 7: Review and Submit ─────────────────────────────────── */}
        <Section title="7. Review and Submit" description="Verify entered information before final submission">
          <div className="bg-[#f8fafc] rounded-lg p-4 border border-[#e2e8f0] text-sm space-y-2" style={{ fontFamily: 'Inter, sans-serif' }}>
            <div className="flex justify-between py-1 border-b border-[#e2e8f0]">
              <span className="text-[#5b403d]">Applicant:</span>
              <span className="font-medium text-[#131b2e]">{ad.name || <span className="text-gray-400 italic">Not set</span>}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#e2e8f0]">
              <span className="text-[#5b403d]">Building Name:</span>
              <span className="font-medium text-[#131b2e]">{bd.buildingName || <span className="text-gray-400 italic">Not set</span>}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#e2e8f0]">
              <span className="text-[#5b403d]">Occupancy:</span>
              <span className="font-medium text-[#131b2e]">{bd.occupancyCategory || <span className="text-gray-400 italic">Not set</span>}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#e2e8f0]">
              <span className="text-[#5b403d]">Location:</span>
              <span className="font-medium text-[#131b2e]">{bd.location?.district && bd.location?.state ? `${bd.location.district}, ${bd.location.state}` : <span className="text-gray-400 italic">Not set</span>}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#e2e8f0]">
              <span className="text-[#5b403d]">Floors &amp; Area:</span>
              <span className="font-medium text-[#131b2e]">{bd.numberOfFloors ? `${bd.numberOfFloors} floors, ${bd.builtUpArea ?? 0} ${bd.builtUpAreaUnit ?? 'sq.m'}` : <span className="text-gray-400 italic">Not set</span>}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-[#5b403d]">Architect:</span>
              <span className="font-medium text-[#131b2e]">{arc.name || <span className="text-gray-400 italic">Not set</span>}</span>
            </div>
          </div>
          <p className="text-xs text-[#5b403d] mt-3" style={{ fontFamily: 'Inter, sans-serif' }}>
            <strong>Note:</strong> Once submitted, the application transitions to <em>SUBMITTED</em> status and cannot be edited. You can always use <strong>Save Draft</strong> to save incomplete details.
          </p>
          <div className="mt-3 p-3 bg-red-50/50 border border-red-100 rounded-lg text-xs text-[#5b403d]" style={{ fontFamily: 'Inter, sans-serif' }}>
            <p className="font-semibold text-[#131b2e] mb-1 flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-[#b91c1c]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Dynamic Rule-Based Checklist Engine
            </p>
            <p>
              Upon saving your application, the backend rule engine evaluates your building classification, occupancy, and hazard parameters to generate tailored document and information requirements (such as industrial raw material inventory and existing fire protection certificates).
            </p>
          </div>
        </Section>

        {/* ── Action Buttons ────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between pt-2 pb-8">
          <Link
            to="/applicant/applications"
            onClick={(e) => {
              if (isDirty && !window.confirm('You have unsaved changes. Are you sure you want to leave?')) {
                e.preventDefault();
              }
            }}
            className="px-5 py-2.5 text-sm font-semibold text-[#5b403d] hover:bg-[#f1f5f9] rounded-lg transition-colors border border-[#e2e8f0]"
            style={{ fontFamily: 'Inter, sans-serif' }}
          >
            ← Back to List
          </Link>
          <div className="flex items-center gap-3">
            {saveMessage && (
              <span className="text-sm text-green-600 font-medium" style={{ fontFamily: 'Inter, sans-serif' }}>{saveMessage}</span>
            )}
            <button
              onClick={handleSaveDraft}
              disabled={isSaving || isSubmitting}
              className="px-5 py-2.5 text-sm font-semibold text-[#b91c1c] border border-[#b91c1c] rounded-lg hover:bg-[#fef2f2] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              {isSaving ? 'Saving…' : 'Save Draft'}
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSaving || isSubmitting}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-[#b91c1c] rounded-lg hover:bg-[#991b1b] transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              {isSubmitting ? 'Submitting…' : 'Submit Application'}
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-[#e2e8f0]">
        <div className="max-w-[1440px] mx-auto px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-[#5b403d]" style={{ fontFamily: 'Inter, sans-serif' }}>
              © 2025 Fire Department Inspection & NoC Management
            </p>
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

export default ApplicationFormPage;
