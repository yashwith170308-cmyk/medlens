import React from 'react';
import { AlertTriangle, ShieldCheck } from 'lucide-react';

export default function DisclaimerBanner() {
  return (
    <div className="bg-amber-50 border-t border-amber-200 py-2.5 px-4 text-xs text-amber-900 flex items-center justify-between no-print">
      <div className="flex items-center gap-2 max-w-5xl mx-auto text-center md:text-left">
        <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
        <span>
          <strong>Clinical Information Tool Notice:</strong> MedLens is an information organization and understanding tool. It does not provide medical diagnosis or treatment recommendations. Please consult a qualified healthcare professional for medical advice.
        </span>
      </div>
      <div className="hidden lg:flex items-center gap-1.5 text-emerald-700 bg-emerald-100/60 px-2.5 py-1 rounded text-[11px] font-medium border border-emerald-300">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
        <span>Deterministic Rule Safety Active (Cost: ₹0 / $0)</span>
      </div>
    </div>
  );
}
