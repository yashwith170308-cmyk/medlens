import React from 'react';
import { Activity, Shield, ShieldOff, Database, UserCheck, AlertCircle } from 'lucide-react';
import { usePrivacy } from '../context/PrivacyContext';
import { usePatient } from '../context/PatientContext';

export default function Navbar() {
  const { privacyMode, togglePrivacyMode, maskName } = usePrivacy();
  const { patient, loadDemoPatient, loading, toastMessage } = usePatient();

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm no-print">
      {/* Toast Alert */}
      {toastMessage && (
        <div className={`text-center py-1.5 px-4 text-xs font-medium text-white transition-all ${
          toastMessage.type === 'error' ? 'bg-rose-600' : 'bg-emerald-600'
        }`}>
          {toastMessage.msg}
        </div>
      )}

      {/* Demo Patient Banner if active */}
      {patient?.is_demo === 1 && (
        <div className="bg-amber-500 text-slate-950 text-xs font-bold py-1 px-4 text-center tracking-wide flex items-center justify-center gap-2">
          <AlertCircle className="w-3.5 h-3.5 text-slate-950" />
          <span>DEMO DATA — NOT A REAL PATIENT (SYNTHETIC CLINICAL RECORD FOR SYSTEM EVALUATION)</span>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-clinical-700 to-clinical-500 flex items-center justify-center text-white shadow-md shadow-clinical-500/20">
            <Activity className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-extrabold tracking-tight text-slate-900">MedLens</span>
              <span className="text-[11px] font-semibold uppercase tracking-wider bg-clinical-100 text-clinical-800 px-2 py-0.5 rounded border border-clinical-200">
                v1.0 Clinical
              </span>
            </div>
            <p className="text-xs text-slate-500 hidden sm:block">Clinical Information Intelligence & Intake</p>
          </div>
        </div>

        {/* Patient Status / Actions */}
        <div className="flex items-center gap-3">
          {/* Active Patient Indicator */}
          {patient && (
            <div className="hidden md:flex items-center gap-2.5 px-3 py-1.5 bg-slate-100 rounded-lg border border-slate-200 text-xs">
              <span className="text-slate-500">Active Record:</span>
              <span className="font-semibold text-slate-900">{maskName(patient.name)}</span>
              <span className="text-slate-400">|</span>
              <span className="text-slate-600">{patient.age}y {patient.sex}</span>
            </div>
          )}

          {/* Load Demo Patient Button */}
          <button
            onClick={loadDemoPatient}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-clinical-50 hover:bg-clinical-100 text-clinical-700 border border-clinical-200 rounded-lg text-xs font-semibold shadow-sm transition-colors focus:ring-2 focus:ring-clinical-500/40"
            title="Load fully populated synthetic demo patient with all test scenarios"
          >
            <Database className="w-3.5 h-3.5 text-clinical-600" />
            <span>Load Demo Patient</span>
          </button>

          {/* Privacy Mode Toggle */}
          <button
            onClick={togglePrivacyMode}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              privacyMode
                ? 'bg-indigo-50 border-indigo-300 text-indigo-700 shadow-sm ring-1 ring-indigo-300'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
            title="Privacy Mode: Anonymizes and hides sensitive identifying patient information"
          >
            {privacyMode ? (
              <>
                <Shield className="w-3.5 h-3.5 text-indigo-600 fill-indigo-100" />
                <span className="font-semibold">Privacy Mode: ON</span>
              </>
            ) : (
              <>
                <ShieldOff className="w-3.5 h-3.5 text-slate-400" />
                <span>Privacy Mode: OFF</span>
              </>
            )}
          </button>

          {/* Clinician Profile */}
          <div className="hidden lg:flex items-center gap-2 pl-2 border-l border-slate-200 text-xs">
            <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold">
              Dr
            </div>
            <div className="text-left leading-tight">
              <span className="font-medium text-slate-800 block">Clinician Portal</span>
              <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
                Authorized
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
