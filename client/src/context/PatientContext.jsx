import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';

const PatientContext = createContext();

export function PatientProvider({ children }) {
  const [patient, setPatient] = useState(null);
  const [recordData, setRecordData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = useCallback((msg, type = 'success') => {
    setToastMessage({ msg, type });
    setTimeout(() => setToastMessage(null), 4000);
  }, []);

  const fetchRecord = useCallback(async (patientId) => {
    if (!patientId) return;
    try {
      const res = await fetch(`/api/record/patient/${patientId}`);
      if (!res.ok) throw new Error(`Server returned status ${res.status}`);
      const data = await res.json();
      setRecordData(data);
    } catch (err) {
      console.error('[PatientContext] Failed to load medical record:', err);
      setError('Failed to fetch structured medical record.');
    }
  }, []);

  const fetchCurrentPatient = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/patient/current');
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const data = await res.json();
      if (data.patient) {
        setPatient(data.patient);
        await fetchRecord(data.patient.id);
      }
    } catch (err) {
      console.error('[PatientContext] Error fetching current patient:', err);
      setError('Unable to connect to MedLens API server.');
    } finally {
      setLoading(false);
    }
  }, [fetchRecord]);

  const loadDemoPatient = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/patient/demo', { method: 'POST' });
      if (!res.ok) throw new Error('Failed to seed demo patient');
      const data = await res.json();
      setPatient(data.patient);
      await fetchRecord(data.patient.id);
      showToast('Synthetic Demo Patient (Alex J. Mercer) loaded successfully!', 'info');
    } catch (err) {
      console.error('[PatientContext] Load demo failed:', err);
      showToast('Failed to load demo patient data.', 'error');
    } finally {
      setLoading(false);
    }
  }, [fetchRecord, showToast]);

  const refreshRecord = useCallback(async () => {
    if (patient?.id) {
      await fetchRecord(patient.id);
    }
  }, [patient?.id, fetchRecord]);

  useEffect(() => {
    fetchCurrentPatient();
  }, [fetchCurrentPatient]);

  const contextValue = useMemo(() => ({
    patient,
    setPatient,
    recordData,
    loading,
    error,
    activeTab,
    setActiveTab,
    loadDemoPatient,
    refreshRecord,
    fetchCurrentPatient,
    showToast,
    toastMessage
  }), [
    patient,
    recordData,
    loading,
    error,
    activeTab,
    loadDemoPatient,
    refreshRecord,
    fetchCurrentPatient,
    showToast,
    toastMessage
  ]);

  return (
    <PatientContext.Provider value={contextValue}>
      {children}
    </PatientContext.Provider>
  );
}

export function usePatient() {
  const context = useContext(PatientContext);
  if (!context) throw new Error('usePatient must be used within PatientProvider');
  return context;
}
