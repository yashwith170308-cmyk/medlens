import React, { useMemo } from 'react';
import {
  LayoutDashboard,
  UserPlus,
  UploadCloud,
  Files,
  FileText,
  CheckCircle2,
  Edit3,
  ArrowLeftRight,
  AlertTriangle,
  HelpCircle,
  Eye,
  Clock,
  Download,
  ShieldCheck
} from 'lucide-react';
import { usePatient } from '../context/PatientContext';

export default function Sidebar() {
  const { activeTab, setActiveTab, recordData } = usePatient();

  const navItems = useMemo(() => {
    const unresolvedConflicts = recordData?.conflicts?.filter(c => c.status === 'Unresolved')?.length || 0;
    const pendingClarifications = recordData?.clarifications?.filter(c => !c.user_response)?.length || 0;
    const requiresVerification = recordData?.stats?.requiresVerificationCount || 0;
    const varianceCount = (recordData?.stats?.belowRangeCount || 0) + (recordData?.stats?.aboveRangeCount || 0);

    return [
      { id: 'dashboard', label: 'Dashboard & AI Summary', icon: LayoutDashboard },
      { id: 'intake', label: 'Patient Intake', icon: UserPlus },
      { id: 'upload', label: 'Report Upload & Paste', icon: UploadCloud },
      { id: 'reports', label: 'Reports & Categorization', icon: Files, badge: recordData?.reports?.length },
      { id: 'record', label: 'Structured Medical Record', icon: FileText },
      { id: 'ranges', label: 'Reference Range Analysis', icon: CheckCircle2, badge: varianceCount > 0 ? `${varianceCount} flags` : null, badgeColor: 'bg-amber-100 text-amber-800' },
      { id: 'review', label: 'Human Review Center', icon: Edit3, badge: requiresVerification ? `${requiresVerification} pending` : null, badgeColor: 'bg-clinical-100 text-clinical-800' },
      { id: 'compare', label: 'Longitudinal Comparison', icon: ArrowLeftRight },
      { id: 'conflicts', label: 'Conflict Detection', icon: AlertTriangle, badge: unresolvedConflicts > 0 ? `${unresolvedConflicts} alert` : null, badgeColor: 'bg-rose-100 text-rose-800' },
      { id: 'clarifications', label: 'Clarification Questions', icon: HelpCircle, badge: pendingClarifications > 0 ? `${pendingClarifications} new` : null, badgeColor: 'bg-indigo-100 text-indigo-800' },
      { id: 'evidence', label: 'Evidence Mode (3-Tier)', icon: Eye },
      { id: 'timeline', label: 'Medical Timeline', icon: Clock },
      { id: 'export', label: 'Export Center', icon: Download },
      { id: 'audit', label: 'Audit & Security', icon: ShieldCheck }
    ];
  }, [recordData]);

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col flex-shrink-0 min-h-[calc(100vh-4rem)] no-print">
      {/* Workflow Navigation Banner */}
      <div className="p-4 border-b border-slate-100 bg-slate-50/50">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Clinical Information Intelligence</p>
        <p className="text-xs text-slate-600 font-medium leading-relaxed">
          Structured &middot; Traceable &middot; Verified
        </p>
      </div>

      {/* Nav List */}
      <nav className="p-3 space-y-1 flex-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-clinical-600 text-white shadow-sm shadow-clinical-600/30'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && item.badge !== null && (
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                  isActive ? 'bg-white/20 text-white' : (item.badgeColor || 'bg-slate-200 text-slate-700')
                }`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-100 bg-slate-50/50 text-[11px] text-slate-500">
        <div className="flex items-center justify-between mb-1">
          <span className="font-semibold text-slate-700">Cost Constraint</span>
          <span className="text-emerald-700 font-bold">₹0 / $0 Free</span>
        </div>
        <p className="text-[10px] text-slate-400 leading-tight">
          Deterministic extraction &bull; Native SQLite &bull; No paid AI dependencies
        </p>
      </div>
    </aside>
  );
}
