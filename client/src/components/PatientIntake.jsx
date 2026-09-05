import React, { useState, useEffect } from 'react';
import { User, Save, PlusCircle, CheckCircle } from 'lucide-react';
import { usePatient } from '../context/PatientContext';
import { usePrivacy } from '../context/PrivacyContext';

export default function PatientIntake() {
  const { patient, fetchCurrentPatient, showToast } = usePatient();
  const { maskName } = usePrivacy();

  const [formData, setFormData] = useState({
    name: '',
    age: '',
    sex: 'Male',
    symptoms: '',
    conditions: '',
    allergies: '',
    medications: '',
    notes: ''
  });
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (patient) {
      setFormData({
        name: patient.name || '',
        age: patient.age || '',
        sex: patient.sex || 'Male',
        symptoms: patient.symptoms || '',
        conditions: patient.conditions || '',
        allergies: patient.allergies || '',
        medications: patient.medications || '',
        notes: patient.notes || ''
      });
    }
  }, [patient]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);

    try {
      const res = await fetch('/api/patient', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: patient?.id,
          ...formData
        })
      });

      if (!res.ok) throw new Error('Failed to save patient intake data.');

      const data = await res.json();
      setSaveSuccess(true);
      showToast('Patient intake information saved successfully!', 'success');
      await fetchCurrentPatient();
    } catch (err) {
      console.error(err);
      showToast('Failed to save patient information.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateNew = () => {
    setFormData({
      name: '',
      age: '',
      sex: 'Male',
      symptoms: '',
      conditions: '',
      allergies: '',
      medications: '',
      notes: ''
    });
    setSaveSuccess(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">Patient Intake Form</h1>
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-200">
              User-provided
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Capture primary baseline clinical information entered directly by the patient or clinician.
          </p>
        </div>
        <button
          onClick={handleCreateNew}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors border border-slate-300"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          <span>New Intake Form</span>
        </button>
      </div>

      {saveSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>Patient intake details updated successfully. Information is tagged as <strong>User-provided</strong> throughout the structured record.</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-6">
        {/* Section 1: Demographics */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600">
              1. Demographics & Identifier
            </h2>
            <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
              Source: User-provided
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-1">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Patient Name / Identifier <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g. Alex J. Mercer"
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-clinical-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Age (Years) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                name="age"
                required
                min="0"
                max="125"
                value={formData.age}
                onChange={handleChange}
                placeholder="e.g. 48"
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-clinical-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Biological Sex <span className="text-rose-500">*</span>
              </label>
              <select
                name="sex"
                value={formData.sex}
                onChange={handleChange}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-clinical-500 focus:outline-none bg-white"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other / Unspecified</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 2: Clinical Concerns */}
        <div className="border-t border-slate-100 pt-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600">
              2. Symptoms & Presenting Concerns
            </h2>
            <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
              Source: User-provided
            </span>
          </div>
          <div>
            <textarea
              name="symptoms"
              rows="3"
              value={formData.symptoms}
              onChange={handleChange}
              placeholder="Describe current symptoms, concerns, duration, or onset (e.g., Persistent fatigue, exertional shortness of breath for past 3 weeks)..."
              className="w-full text-xs p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-clinical-500 focus:outline-none leading-relaxed"
            ></textarea>
          </div>
        </div>

        {/* Section 3: History, Allergies, Medications */}
        <div className="border-t border-slate-100 pt-5 space-y-4">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600">
              3. Conditions, Allergies & Medications
            </h2>
            <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
              Source: User-provided
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Existing Medical Conditions / History
            </label>
            <input
              type="text"
              name="conditions"
              value={formData.conditions}
              onChange={handleChange}
              placeholder="e.g. Essential Hypertension (mild), Type 2 Diabetes, Asthma, or None"
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-clinical-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Known Drug / Environmental Allergies
              </label>
              <input
                type="text"
                name="allergies"
                value={formData.allergies}
                onChange={handleChange}
                placeholder="e.g. No known drug allergies (NKDA) or Penicillin, Sulfa"
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-clinical-500 focus:outline-none"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                *Used by conflict detection engine to compare against laboratory notes and medications.
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Current Medications & Dosages
              </label>
              <input
                type="text"
                name="medications"
                value={formData.medications}
                onChange={handleChange}
                placeholder="e.g. Amlodipine 5 mg once daily, Metformin 500 mg"
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-clinical-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Section 4: Notes */}
        <div className="border-t border-slate-100 pt-5">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600">
              4. Additional Notes / Clinical Context
            </h2>
            <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
              Source: User-provided
            </span>
          </div>
          <textarea
            name="notes"
            rows="2"
            value={formData.notes}
            onChange={handleChange}
            placeholder="Any additional instructions, fasting state, family history, or doctor referral information..."
            className="w-full text-xs p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-clinical-500 focus:outline-none leading-relaxed"
          ></textarea>
        </div>

        {/* Action Button */}
        <div className="flex justify-end pt-4 border-t border-slate-100">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-clinical-600 hover:bg-clinical-700 text-white rounded-lg text-xs font-bold shadow-md shadow-clinical-600/20 transition-all focus:ring-2 focus:ring-clinical-500 focus:outline-none"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving Intake Record...' : 'Save Patient Intake'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
