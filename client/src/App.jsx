import React, { useState } from 'react';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import DisclaimerBanner from './components/DisclaimerBanner';
import Dashboard from './components/Dashboard';
import PatientIntake from './components/PatientIntake';
import UploadReport from './components/UploadReport';
import ReportsList from './components/ReportsList';
import MedicalRecordView from './components/MedicalRecordView';
import LongitudinalCompare from './components/LongitudinalCompare';
import ConflictCenter from './components/ConflictCenter';
import ClarificationList from './components/ClarificationList';
import EvidenceModeView from './components/EvidenceModeView';
import MedicalTimeline from './components/MedicalTimeline';
import ExportCenter from './components/ExportCenter';
import AuditSecurityView from './components/AuditSecurityView';
import HumanReviewModal from './components/HumanReviewModal';
import SourceEvidenceModal from './components/SourceEvidenceModal';
import { PatientProvider, usePatient } from './context/PatientContext';
import { PrivacyProvider } from './context/PrivacyContext';

function AppContent() {
  const { activeTab, setActiveTab } = usePatient();
  const [reviewItem, setReviewItem] = useState(null);
  const [evidenceItem, setEvidenceItem] = useState(null);

  const renderActiveView = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <Dashboard
            onNavigate={setActiveTab}
            onOpenEvidence={setEvidenceItem}
            onOpenReview={setReviewItem}
          />
        );
      case 'intake':
        return <PatientIntake />;
      case 'upload':
        return <UploadReport onNavigate={setActiveTab} />;
      case 'reports':
        return <ReportsList onNavigate={setActiveTab} />;
      case 'record':
        return (
          <MedicalRecordView
            mode="record"
            onOpenEvidence={setEvidenceItem}
            onOpenReview={setReviewItem}
          />
        );
      case 'ranges':
        return (
          <MedicalRecordView
            mode="ranges"
            onOpenEvidence={setEvidenceItem}
            onOpenReview={setReviewItem}
          />
        );
      case 'review':
        return (
          <MedicalRecordView
            mode="review"
            onOpenEvidence={setEvidenceItem}
            onOpenReview={setReviewItem}
          />
        );
      case 'compare':
        return <LongitudinalCompare />;
      case 'conflicts':
        return <ConflictCenter />;
      case 'clarifications':
        return <ClarificationList />;
      case 'evidence':
        return <EvidenceModeView />;
      case 'timeline':
        return <MedicalTimeline />;
      case 'export':
        return <ExportCenter />;
      case 'audit':
        return <AuditSecurityView />;
      default:
        return (
          <Dashboard
            onNavigate={setActiveTab}
            onOpenEvidence={setEvidenceItem}
            onOpenReview={setReviewItem}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Navbar />

      <div className="flex flex-1">
        <Sidebar />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto max-w-7xl mx-auto w-full">
          {renderActiveView()}
        </main>
      </div>

      <DisclaimerBanner />

      {/* Human Review Modal */}
      {reviewItem && (
        <HumanReviewModal
          item={reviewItem}
          onClose={() => setReviewItem(null)}
        />
      )}

      {/* Source Evidence Modal */}
      {evidenceItem && (
        <SourceEvidenceModal
          item={evidenceItem}
          onClose={() => setEvidenceItem(null)}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <PrivacyProvider>
      <PatientProvider>
        <AppContent />
      </PatientProvider>
    </PrivacyProvider>
  );
}
