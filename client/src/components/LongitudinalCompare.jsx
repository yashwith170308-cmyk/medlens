import React, { useMemo } from 'react';
import { ArrowUpRight, ArrowDownRight, Minus, Info } from 'lucide-react';
import { usePatient } from '../context/PatientContext';

export default function LongitudinalCompare() {
  const { recordData } = usePatient();
  const comparison = recordData?.comparison || [];
  const reports = recordData?.reports || [];

  const previousReport = reports.find(r => r.is_previous);
  const currentReport = reports.find(r => !r.is_previous);

  const { matchedItems, increasedCount, decreasedCount, stableCount } = useMemo(() => {
    const matched = [];
    let inc = 0;
    let dec = 0;
    let st = 0;
    for (let i = 0; i < comparison.length; i++) {
      const c = comparison[i];
      if (c.previous && c.current) {
        matched.push(c);
        if (c.direction === 'up') inc++;
        else if (c.direction === 'down') dec++;
        else if (c.direction === 'stable') st++;
      }
    }
    return { matchedItems: matched, increasedCount: inc, decreasedCount: dec, stableCount: st };
  }, [comparison]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-200 gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">Longitudinal Report Comparison</h1>
            <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded bg-clinical-100 text-clinical-800 border border-clinical-200">
              Structured Delta Analysis
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Tracking structured parameter changes over time without making unsupported medical conclusions.
          </p>
        </div>

        {/* Reports Metadata */}
        <div className="flex items-center gap-3 text-xs">
          <div className="bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
            <span className="text-slate-500 block text-[10px]">Baseline Report:</span>
            <span className="font-semibold text-slate-800">{previousReport?.filename || 'Baseline Report (March)'}</span>
          </div>
          <span className="text-slate-400 font-bold">&rarr;</span>
          <div className="bg-clinical-50 px-3 py-1.5 rounded-lg border border-clinical-200">
            <span className="text-clinical-700 block text-[10px]">Current Report:</span>
            <span className="font-semibold text-clinical-900">{currentReport?.filename || 'Current Report (Sept)'}</span>
          </div>
        </div>
      </div>

      {/* Non-speculation Banner */}
      <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-900 flex items-start gap-2.5">
        <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
        <p className="leading-relaxed text-[11px]">
          <strong>Clinical Objective Rule:</strong> Comparison is calculated mathematically from structured data points. MedLens explicitly does not make unsupported medical conclusions, diagnoses, or disease progression claims from these delta calculations.
        </p>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-slate-500 text-[11px] block">Parameters Compared</span>
          <span className="text-2xl font-black text-slate-900 mt-1 block">{matchedItems.length}</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-rose-700">
            <span className="text-[11px]">Increased (&uarr;)</span>
            <ArrowUpRight className="w-4 h-4" />
          </div>
          <span className="text-2xl font-black text-rose-900 mt-1 block">{increasedCount}</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-amber-700">
            <span className="text-[11px]">Decreased (&darr;)</span>
            <ArrowDownRight className="w-4 h-4" />
          </div>
          <span className="text-2xl font-black text-amber-900 mt-1 block">{decreasedCount}</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-600">
            <span className="text-[11px]">Unchanged</span>
            <Minus className="w-4 h-4" />
          </div>
          <span className="text-2xl font-black text-slate-800 mt-1 block">{stableCount}</span>
        </div>
      </div>

      {/* Comparison Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Parameter</th>
                <th className="py-3 px-3">
                  Previous Baseline
                  <span className="block text-[10px] text-slate-400 font-normal">
                    {previousReport?.report_date || 'Previous Report'}
                  </span>
                </th>
                <th className="py-3 px-3">
                  Current Result
                  <span className="block text-[10px] text-slate-400 font-normal">
                    {currentReport?.report_date || 'Current Report'}
                  </span>
                </th>
                <th className="py-3 px-3">
                  Numerical Delta & Direction
                  <span className="block text-[10px] text-slate-400 font-normal">Current - Previous</span>
                </th>
                <th className="py-3 px-4">Factual Observation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {comparison.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-8 text-center text-slate-500">
                    No longitudinal comparison data available. Upload at least one baseline report marked as previous.
                  </td>
                </tr>
              ) : (
                comparison.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{item.parameter}</div>
                      <div className="text-[10px] text-slate-400">{item.unit || 'Standard Unit'}</div>
                    </td>

                    {/* Previous Column */}
                    <td className="py-3 px-3 font-mono">
                      {item.previous ? (
                        <div>
                          <span className="font-bold text-slate-800">{item.previous.value} {item.unit}</span>
                          <span className="block text-[10px] text-slate-500">
                            Range: {item.previous.range}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">Not documented</span>
                      )}
                    </td>

                    {/* Current Column */}
                    <td className="py-3 px-3 font-mono">
                      {item.current ? (
                        <div>
                          <span className="font-bold text-slate-900 text-sm">{item.current.value} {item.unit}</span>
                          <span className={`block text-[10px] font-semibold ${
                            item.current.status === 'Within reported range'
                              ? 'text-emerald-700'
                              : item.current.status === 'Not determined'
                              ? 'text-purple-700'
                              : 'text-amber-700'
                          }`}>
                            {item.current.status}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">Omitted</span>
                      )}
                    </td>

                    {/* Change / Delta Column */}
                    <td className="py-3 px-3">
                      {item.previous && item.current ? (
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold font-mono ${
                          item.direction === 'up'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : item.direction === 'down'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}>
                          {item.direction === 'up' && <ArrowUpRight className="w-3.5 h-3.5" />}
                          {item.direction === 'down' && <ArrowDownRight className="w-3.5 h-3.5" />}
                          {item.direction === 'stable' && <Minus className="w-3.5 h-3.5" />}
                          <span>{item.changeText}</span>
                          {item.percentChange !== null && (
                            <span className="text-[10px] opacity-75">
                              ({item.percentChange > 0 ? `+${item.percentChange}%` : `${item.percentChange}%`})
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">{item.changeText}</span>
                      )}
                    </td>

                    {/* Factual Observation */}
                    <td className="py-3 px-4 text-xs text-slate-600">
                      {item.observation}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
