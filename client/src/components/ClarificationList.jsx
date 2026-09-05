import React, { useState } from 'react';
import { HelpCircle, CheckCircle2, Send } from 'lucide-react';
import { usePatient } from '../context/PatientContext';

export default function ClarificationList() {
  const { recordData, refreshRecord, showToast } = usePatient();
  const clarifications = recordData?.clarifications || [];

  const [responses, setResponses] = useState({});
  const [savingId, setSavingId] = useState(null);

  const handleTextChange = (id, val) => {
    setResponses(prev => ({ ...prev, [id]: val }));
  };

  const handleSubmitResponse = async (id) => {
    const textToSave = responses[id] !== undefined ? responses[id] : '';
    setSavingId(id);

    try {
      const res = await fetch(`/api/record/clarifications/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response: textToSave.trim() })
      });

      if (!res.ok) throw new Error('Failed to update clarification response');

      showToast('Clarification response recorded.', 'success');
      await refreshRecord();
    } catch (err) {
      console.error(err);
      showToast('Error saving response.', 'error');
    } finally {
      setSavingId(null);
    }
  };

  const answeredCount = clarifications.filter(c => c.user_response).length;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">Clarification & Missing Information Inquiry</h1>
            <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded bg-indigo-100 text-indigo-800 border border-indigo-200">
              {clarifications.length} Inquiry Items
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Targeted clinical inquiries generated strictly to resolve incomplete disclosures without providing medical advice.
          </p>
        </div>

        <div className="text-xs text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
          Progress: <strong>{answeredCount}</strong> of <strong>{clarifications.length}</strong> Answered
        </div>
      </div>

      {/* Safety Notice */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3.5 text-xs text-indigo-900 flex items-start gap-2.5">
        <HelpCircle className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" />
        <p className="leading-relaxed text-[11px]">
          <strong>Notice:</strong> These questions are structured factual inquiries designed to clarify gaps in patient intake or uncalibrated lab parameters. They do not constitute or replace medical counsel or diagnosis.
        </p>
      </div>

      {/* Questions List */}
      <div className="space-y-4">
        {clarifications.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500 text-xs">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
            <p className="font-bold text-slate-700">No Ambiguities Flagged</p>
            <p className="text-slate-400 mt-1">Sufficient baseline information has been provided.</p>
          </div>
        ) : (
          clarifications.map((item, idx) => {
            const hasAnswer = Boolean(item.user_response);
            const currentVal = responses[item.id] !== undefined ? responses[item.id] : (item.user_response || '');

            return (
              <div
                key={item.id}
                className={`bg-white rounded-xl border p-5 shadow-sm space-y-3 transition-all ${
                  hasAnswer ? 'border-slate-200 bg-slate-50/40' : 'border-indigo-200 ring-1 ring-indigo-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-800 text-[11px] font-black flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                      Context: {item.context_field}
                    </span>
                  </div>
                  {hasAnswer && (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Answered
                    </span>
                  )}
                </div>

                <p className="text-xs font-semibold text-slate-800 leading-relaxed">
                  {item.question}
                </p>

                {/* Response Input */}
                <div className="space-y-2 pt-1">
                  <textarea
                    rows="2"
                    value={currentVal}
                    onChange={(e) => handleTextChange(item.id, e.target.value)}
                    placeholder="Enter factual response or clarifying clinical details..."
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-clinical-500 focus:outline-none leading-relaxed bg-white"
                  ></textarea>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      disabled={savingId === item.id}
                      onClick={() => handleSubmitResponse(item.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                    >
                      <Send className="w-3 h-3" />
                      <span>{savingId === item.id ? 'Saving...' : 'Submit Clarification'}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
