/**
 * AI Summary Engine with Strict Clinical Guardrails & Evidence Mode Mapping
 * 
 * CRITICAL REQUIREMENTS:
 * - Patient-friendly, concise summary of extracted findings.
 * - Mentions out-of-range values, inconsistencies, clarification points.
 * - MUST NOT diagnose, prescribe, recommend dosage changes, or claim certainty.
 * - Explicitly communicates uncertainty.
 * - Mandatory Disclaimer included verbatim.
 * - Direct evidence mapping: AI statement -> supporting data -> source.
 * - Works 100% offline / ₹0 cost, with optional free Gemini API support.
 */

export const MANDATORY_DISCLAIMER = 
  "MedLens is an information organization and understanding tool. It does not provide medical diagnosis or treatment recommendations. Please consult a qualified healthcare professional for medical advice.";

/**
 * Generates structured clinical summary with evidence mode bindings.
 * 
 * @param {object} patient - Patient intake data
 * @param {Array<object>} labResults - Extracted laboratory results
 * @param {Array<object>} conflicts - Detected conflicts
 * @param {Array<object>} reports - Uploaded reports metadata
 * @returns {Promise<{
 *   summaryText: string,
 *   evidenceStatements: Array<{ statement: string, supportingData: string, source: string }>,
 *   outOfRangeHighlights: Array<object>,
 *   uncertaintyNotes: Array<string>,
 *   disclaimer: string,
 *   generatedAt: string
 * }>}
 */
export async function generateClinicalSummary(patient, labResults = [], conflicts = [], reports = []) {
  const belowRange = labResults.filter(r => r.status === 'Below reported range');
  const aboveRange = labResults.filter(r => r.status === 'Above reported range');
  const uncalibrated = labResults.filter(r => r.status === 'Not determined');
  const withinRange = labResults.filter(r => r.status === 'Within reported range');

  const evidenceStatements = [];
  const uncertaintyNotes = [];

  // If Gemini API Key is available in environment, we could call Gemini, 
  // but we provide a pristine deterministic clinical summary engine that guarantees 100% adherence to all rules.
  let apiKey = process.env.GEMINI_API_KEY;

  if (apiKey) {
    try {
      const prompt = `You are a clinical information intelligence assistant for MedLens.
Transform the following patient data and lab findings into a clear, concise, patient-friendly summary.
STRICT SAFETY RULES:
1. DO NOT diagnose diseases or conditions.
2. DO NOT prescribe medication or suggest dosage changes.
3. DO NOT claim certainty about any health status.
4. When information is missing or uncertain, explicitly communicate uncertainty.
5. Emphasize values outside stated reported ranges.
6. Mention detected documentation conflicts.
7. Include the exact disclaimer: "${MANDATORY_DISCLAIMER}"

Patient: Age ${patient?.age}, Sex ${patient?.sex}, Symptoms: ${patient?.symptoms || 'None reported'}, Conditions: ${patient?.conditions || 'None reported'}.
Lab Results:
${labResults.map(r => `- ${r.canonical_name}: ${r.value_text} ${r.unit} (Ref Range: ${r.reference_range_raw}, Status: ${r.status})`).join('\n')}
Active Conflicts: ${conflicts.map(c => c.title + ': ' + c.description).join('; ')}
`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });

      if (response.ok) {
        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          // Construct evidence list
          populateEvidence(evidenceStatements, labResults, conflicts, reports);
          return {
            summaryText: text,
            evidenceStatements,
            outOfRangeHighlights: [...belowRange, ...aboveRange],
            uncertaintyNotes,
            disclaimer: MANDATORY_DISCLAIMER,
            generatedAt: new Date().toISOString()
          };
        }
      }
    } catch (err) {
      console.warn('[AI Summary] Gemini API call skipped or failed, using deterministic clinical engine:', err.message);
    }
  }

  // Pure Deterministic Clinical Intelligence Summary Generator (₹0 Cost, 100% Reliable)
  const paragraphs = [];

  // Section 1: Overview
  const patientDesc = patient?.name ? `for ${patient.name} (${patient.age || 'Age unrecorded'}, ${patient.sex || 'Sex unrecorded'})` : 'for the active record';
  paragraphs.push(`This medical summary organizes clinical data ${patientDesc} across ${reports.length} documented report(s) comprising ${labResults.length} extracted laboratory parameter(s).`);

  // Section 2: Out of Range Findings
  if (belowRange.length > 0 || aboveRange.length > 0) {
    const abnormalPhrases = [];
    if (belowRange.length > 0) {
      const belowText = belowRange.map(r => `${r.canonical_name} (${r.value_text} ${r.unit}, below stated range of ${r.reference_range_raw})`).join(', ');
      abnormalPhrases.push(`Result(s) reported below reference bounds include: ${belowText}.`);
    }
    if (aboveRange.length > 0) {
      const aboveText = aboveRange.map(r => `${r.canonical_name} (${r.value_text} ${r.unit}, above stated range of ${r.reference_range_raw})`).join(', ');
      abnormalPhrases.push(`Result(s) reported above reference bounds include: ${aboveText}.`);
    }
    paragraphs.push(abnormalPhrases.join(' '));
  } else if (labResults.length > 0) {
    paragraphs.push(`All ${withinRange.length} evaluated laboratory parameter(s) with stated reference bounds fall within their respective reported intervals.`);
  }

  // Section 3: Missing Reference Ranges & Uncertainty Communication
  if (uncalibrated.length > 0) {
    const uncalText = uncalibrated.map(r => `${r.canonical_name} (${r.value_text} ${r.unit})`).join(', ');
    paragraphs.push(`Notice of Uncertainty: ${uncalibrated.length} test parameter(s) [${uncalText}] were reported without laboratory reference ranges. In compliance with safety standards, no normative status has been inferred for these parameters.`);
    uncertaintyNotes.push(`${uncalibrated.length} parameter(s) lack reference ranges from the source laboratory.`);
  }

  // Section 4: Conflict / Discrepancy Alert
  if (conflicts.length > 0) {
    paragraphs.push(`Potential Documentation Conflicts: ${conflicts.length} cross-source discrepancy was detected (e.g. ${conflicts[0].title}). Clinical review is recommended to clarify the accurate history.`);
  }

  // Section 5: Clarification Need
  if (patient?.symptoms) {
    paragraphs.push(`Clarification regarding reported symptoms ("${patient.symptoms}") concerning duration and episodic patterns will enhance record completeness.`);
  }

  populateEvidence(evidenceStatements, labResults, conflicts, reports);

  return {
    summaryText: paragraphs.join('\n\n'),
    evidenceStatements,
    outOfRangeHighlights: [...belowRange, ...aboveRange],
    uncertaintyNotes,
    disclaimer: MANDATORY_DISCLAIMER,
    generatedAt: new Date().toISOString()
  };
}

function populateEvidence(evidenceStatements, labResults, conflicts, reports) {
  const currentReportName = reports.find(r => !r.is_previous)?.filename || 'Current Report';
  
  // Abnormal lab evidence
  for (const item of labResults) {
    if (item.status === 'Below reported range') {
      evidenceStatements.push({
        statement: `Observed value for ${item.canonical_name} is below its reported laboratory reference range.`,
        supportingData: `${item.canonical_name} = ${item.value_text} ${item.unit} | Stated Reference = ${item.reference_range_raw}`,
        source: `${currentReportName}, Page ${item.source_page || 1} (Snippet: "${item.source_snippet}")`
      });
    } else if (item.status === 'Above reported range') {
      evidenceStatements.push({
        statement: `Observed value for ${item.canonical_name} is above its reported laboratory reference range.`,
        supportingData: `${item.canonical_name} = ${item.value_text} ${item.unit} | Stated Reference = ${item.reference_range_raw}`,
        source: `${currentReportName}, Page ${item.source_page || 1} (Snippet: "${item.source_snippet}")`
      });
    } else if (item.status === 'Not determined') {
      evidenceStatements.push({
        statement: `No reference range was provided in the report for ${item.canonical_name}; normative status remains uncalculated.`,
        supportingData: `${item.canonical_name} = ${item.value_text} ${item.unit} | Reference Range = None reported`,
        source: `${currentReportName}, Page ${item.source_page || 1} (Snippet: "${item.source_snippet}")`
      });
    }
  }

  // Conflict evidence
  for (const conflict of conflicts) {
    const srcA = conflict.sourceA || conflict.source_a || 'Intake Record';
    const srcB = conflict.sourceB || conflict.source_b || 'Document Finding';
    evidenceStatements.push({
      statement: `Documentation conflict flagged: ${conflict.title}.`,
      supportingData: `Source A: ${srcA} vs Source B: ${srcB}`,
      source: `Cross-source reconciliation engine`
    });
  }
}
