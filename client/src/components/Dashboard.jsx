import React from 'react';
import {
  User,
  FileText,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Activity,
  ArrowRight,
  ShieldAlert,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  ClipboardList
} from 'lucide-react';
import { usePatient } from '../context/PatientContext';
import { usePrivacy } from '../context/PrivacyContext';

export default function Dashboard({ onNavigate, onOpenEvidence, onOpenReview }) {
  const { patient, recordData, loading } = usePatient();
  const { maskName, maskIdentifier } = usePrivacy();

  if (loading && !recordData) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-3">
          <Activity className="w-8 h-8 text-clinical-600 animate-pulse" />
          <p className="text-sm font-medium text-slate-600">Loading clinical intelligence record...</p>
        </div>
      </div>
    );
  }

  const stats = recordData?.stats || {
    totalTests: 0,
    withinRangeCount: 0,
    belowRangeCount: 0,
    aboveRangeCount: 0,
    notDeterminedCount: 0,
    verifiedCount: 0,
    requiresVerificationCount: 0,
    unresolvedConflictsCount: 0
  };

  const currentLabs = recordData?.currentResults || [];
  const conflicts = recordData?.conflicts || [];
  const reports = recordData?.reports || [];
  const aiSummary = recordData?.aiSummary;

  return (
    <div className="space-y-6">
      {/* Visual Clinical Pipeline Banner */}
      <div className="bg-gradient-to-r from-clinical-900 via-slate-900 to-clinical-950 text-white rounded-2xl p-5 shadow-lg shadow-slate-900/10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-widest text-clinical-300">MedLens Intelligence Engine</span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-mono border border-emerald-500/30">Cost: ₹0 / $0</span>
            </div>
            <h1 className="text-xl font-extrabold tracking-tight">Clinical Information Intelligence Dashboard</h1>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl">
              Transforming fragmented medical data into structured, traceable, and human-reviewable clinical records.
            </p>
          </div>
          {/* Pipeline stages */}
          <div className="flex items-center gap-1.5 overflow-x-auto text-[11px] py-1 bg-white/5 px-3 rounded-xl border border-white/10">
            {['Input', 'Extraction', 'Validation', 'Normalization', 'Analysis', 'Insight', 'Human Review'].map((stage, idx, arr) => (
              <React.Fragment key={stage}>
                <span className="px-2 py-0.5 rounded bg-clinical-500/20 text-clinical-200 font-semibold whitespace-nowrap">
                  {stage}
                </span>
                {idx < arr.length - 1 && <span className="text-slate-500">&rarr;</span>}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {/* Active Conflict Warning Banner if conflicts exist */}
      {conflicts.some(c => c.status === 'Unresolved') && (
        <div className="bg-rose-50 border-l-4 border-rose-600 p-4 rounded-xl shadow-sm flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wide text-rose-900">
                Potential Conflict Detected — Requires Clarification
              </h3>
              <p className="text-xs text-rose-800 mt-0.5">
                {conflicts.find(c => c.status === 'Unresolved')?.description}
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('conflicts')}
            className="text-xs font-bold text-rose-700 hover:text-rose-900 underline whitespace-nowrap flex items-center gap-1"
          >
            <span>Resolve Conflict</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Top Overview Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Patient Intake Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-clinical-50 text-clinical-600 flex items-center justify-center font-bold">
                <User className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Patient Overview</h2>
                <p className="text-[11px] text-slate-500">ID: {maskIdentifier(patient?.id || 'PT-9021')}</p>
              </div>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
              User-provided
            </span>
          </div>

          <div className="space-y-2.5 text-xs">
            <div>
              <span className="text-slate-500 block text-[11px]">Full Name</span>
              <span className="font-semibold text-slate-900 text-sm">{maskName(patient?.name || 'No patient loaded')}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-slate-500 block text-[11px]">Age & Sex</span>
                <span className="font-medium text-slate-800">{patient?.age || '--'} yrs &bull; {patient?.sex || '--'}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Reported Allergies</span>
                <span className="font-medium text-slate-800 truncate block" title={patient?.allergies}>
                  {patient?.allergies || 'None reported'}
                </span>
              </div>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">Current Concerns / Symptoms</span>
              <p className="font-medium text-slate-800 bg-slate-50 p-2 rounded border border-slate-100 text-[11px] leading-relaxed">
                {patient?.symptoms || 'None recorded'}
              </p>
            </div>
          </div>

          <button
            onClick={() => onNavigate('intake')}
            className="w-full text-center py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold transition-colors border border-slate-200"
          >
            Edit Patient Intake &rarr;
          </button>
        </div>

        {/* Reference Range Status Breakdown Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <Activity className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Reference Range Status</h2>
                <p className="text-[11px] text-slate-500">Deterministic Range Evaluation</p>
              </div>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
              Deterministic
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-emerald-50/60 border border-emerald-200 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-emerald-800">Within Range</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <span className="text-2xl font-black text-emerald-900 block mt-1">{stats.withinRangeCount}</span>
            </div>

            <div className="bg-amber-50/60 border border-amber-200 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-amber-800">Below Range</span>
                <ArrowDownRight className="w-4 h-4 text-amber-600" />
              </div>
              <span className="text-2xl font-black text-amber-900 block mt-1">{stats.belowRangeCount}</span>
            </div>

            <div className="bg-rose-50/60 border border-rose-200 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-rose-800">Above Range</span>
                <ArrowUpRight className="w-4 h-4 text-rose-600" />
              </div>
              <span className="text-2xl font-black text-rose-900 block mt-1">{stats.aboveRangeCount}</span>
            </div>

            <div className="bg-purple-50/60 border border-purple-200 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-purple-800">Not Determined</span>
                <HelpCircle className="w-4 h-4 text-purple-600" />
              </div>
              <span className="text-2xl font-black text-purple-900 block mt-1">{stats.notDeterminedCount}</span>
            </div>
          </div>

          <p className="text-[10px] text-slate-500 italic text-center">
            *Missing ranges are marked "Not determined". Reference ranges are never invented.
          </p>
        </div>

        {/* Verification Status & Quality Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                <ClipboardList className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Human Verification</h2>
                <p className="text-[11px] text-slate-500">Human-in-the-Loop Governance</p>
              </div>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
              Governance
            </span>
          </div>

          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs mb-1 font-semibold">
                <span className="text-slate-700">Verification Rate</span>
                <span className="text-indigo-600">
                  {stats.totalTests > 0 ? Math.round((stats.verifiedCount / stats.totalTests) * 100) : 0}%
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div
                  className="bg-indigo-600 h-2 rounded-full transition-all"
                  style={{ width: `${stats.totalTests > 0 ? (stats.verifiedCount / stats.totalTests) * 100 : 0}%` }}
                ></div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-900 border border-emerald-200">
                <span className="text-[11px] text-emerald-700 block font-medium">Human Verified</span>
                <span className="text-lg font-bold">{stats.verifiedCount}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-amber-50 text-amber-900 border border-amber-200">
                <span className="text-[11px] text-amber-700 block font-medium">Requires Verification</span>
                <span className="text-lg font-bold">{stats.requiresVerificationCount}</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500">
              AI-extracted parameters are never automatically treated as verified.
            </p>

            <button
              onClick={() => onNavigate('record')}
              className="w-full py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-semibold transition-colors border border-indigo-200"
            >
              Open Review Center &rarr;
            </button>
          </div>
        </div>
      </div>

      {/* AI Summary Section */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-clinical-600" />
            <h2 className="text-sm font-bold text-slate-900">AI-Generated Clinical Summary</h2>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-clinical-50 text-clinical-700 border border-clinical-200">
              AI-generated
            </span>
          </div>
          <button
            onClick={() => onNavigate('evidence')}
            className="text-xs font-semibold text-clinical-600 hover:text-clinical-800 flex items-center gap-1"
          >
            <span>View Evidence Mappings</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="prose-sm text-xs text-slate-700 space-y-2.5 leading-relaxed bg-slate-50/60 p-4 rounded-xl border border-slate-100">
          {aiSummary?.summaryText?.split('\n\n').map((para, i) => (
            <p key={i}>{para}</p>
          )) || <p>No summary generated yet.</p>}
        </div>

        {/* Uncertainty Notes if present */}
        {aiSummary?.uncertaintyNotes?.length > 0 && (
          <div className="mt-3 p-3 bg-indigo-50/60 border border-indigo-100 rounded-lg text-xs text-indigo-900">
            <span className="font-bold flex items-center gap-1 text-[11px] uppercase tracking-wider mb-1">
              <AlertCircle className="w-3.5 h-3.5 text-indigo-600" /> Communicated Uncertainties
            </span>
            <ul className="list-disc list-inside space-y-0.5 text-slate-700 text-[11px]">
              {aiSummary.uncertaintyNotes.map((note, idx) => (
                <li key={idx}>{note}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Latest Laboratory Results Table Preview */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-clinical-600" />
            <h2 className="text-sm font-bold text-slate-900">Latest Laboratory Results ({currentLabs.length})</h2>
          </div>
          <button
            onClick={() => onNavigate('record')}
            className="text-xs font-semibold text-clinical-600 hover:text-clinical-800 flex items-center gap-1"
          >
            <span>View Complete Medical Record</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-4">Test / Parameter</th>
                <th className="py-2.5 px-3">Result</th>
                <th className="py-2.5 px-3">Unit</th>
                <th className="py-2.5 px-3">Reported Range</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Source</th>
                <th className="py-2.5 px-3">Verification</th>
                <th className="py-2.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {currentLabs.slice(0, 6).map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-2.5 px-4 font-medium text-slate-900">{item.canonical_name}</td>
                  <td className="py-2.5 px-3 font-mono font-bold text-slate-800">{item.value_text}</td>
                  <td className="py-2.5 px-3 text-slate-500">{item.unit || '--'}</td>
                  <td className="py-2.5 px-3 text-slate-600 font-mono text-[11px]">{item.reference_range_raw || 'None reported'}</td>
                  <td className="py-2.5 px-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                      item.status === 'Within reported range'
                        ? 'bg-emerald-100 text-emerald-800'
                        : item.status === 'Below reported range'
                        ? 'bg-amber-100 text-amber-800'
                        : item.status === 'Above reported range'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-purple-100 text-purple-800'
                    }`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-medium">
                      {item.source_type}
                    </span>
                  </td>
                  <td className="py-2.5 px-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      item.verification_status === 'Human-verified'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}>
                      {item.verification_status}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-right space-x-2">
                    <button
                      onClick={() => onOpenEvidence(item)}
                      className="text-clinical-600 hover:text-clinical-800 text-[11px] font-semibold underline"
                    >
                      Show Source
                    </button>
                    <button
                      onClick={() => onOpenReview(item)}
                      className="text-slate-600 hover:text-slate-800 text-[11px] font-semibold"
                    >
                      Review
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
