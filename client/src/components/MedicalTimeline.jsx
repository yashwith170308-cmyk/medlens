import React, { useState, useEffect } from 'react';
import { Calendar, CheckCircle2, AlertTriangle, FileText, UserPlus } from 'lucide-react';
import { usePatient } from '../context/PatientContext';

export default function MedicalTimeline() {
  const { patient } = usePatient();
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!patient?.id) return;
    const fetchTimeline = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/record/timeline/${patient.id}`);
        if (!res.ok) throw new Error('Failed to fetch timeline');
        const data = await res.json();
        setTimeline(data.timeline || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchTimeline();
  }, [patient?.id]);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="pb-4 border-b border-slate-200">
        <h1 className="text-xl font-bold text-slate-900">Patient Medical Timeline</h1>
        <p className="text-xs text-slate-500 mt-1">
          Chronological record of patient intake, report uploads, diagnostic variance events, and human verifications.
        </p>
      </div>

      {loading ? (
        <div className="py-12 text-center text-xs text-slate-500">Loading chronological stream...</div>
      ) : timeline.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500 text-xs">
          No timeline events recorded yet.
        </div>
      ) : (
        <div className="relative pl-6 border-l-2 border-slate-200 space-y-6">
          {timeline.map((event) => {
            let Icon = FileText;
            let iconBg = 'bg-slate-100 text-slate-700';

            if (event.category === 'Intake') {
              Icon = UserPlus;
              iconBg = 'bg-blue-100 text-blue-700';
            } else if (event.category === 'Laboratory Finding') {
              Icon = AlertTriangle;
              iconBg = 'bg-amber-100 text-amber-800';
            } else if (event.category === 'Human Verification') {
              Icon = CheckCircle2;
              iconBg = 'bg-emerald-100 text-emerald-800';
            }

            return (
              <div key={event.id} className="relative group">
                {/* Node icon */}
                <div className={`absolute -left-[35px] top-0 w-8 h-8 rounded-full border-2 border-white flex items-center justify-center shadow-xs ${iconBg}`}>
                  <Icon className="w-4 h-4" />
                </div>

                {/* Card */}
                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs ml-2 space-y-1.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <span className="text-xs font-bold text-slate-900">{event.title}</span>
                    <span className="text-[10px] text-slate-500 flex items-center gap-1 font-mono">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      {new Date(event.date).toLocaleDateString()} {new Date(event.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    {event.description}
                  </p>

                  <div className="pt-1 flex items-center gap-2">
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                      Category: {event.category}
                    </span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-clinical-50 text-clinical-700 border border-clinical-200">
                      Provenance: {event.sourceType}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
