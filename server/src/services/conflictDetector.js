/**
 * Conflict & Inconsistency Detection Service
 * 
 * Compares Patient Intake data against extracted Medical Report findings
 * and previous reports to identify clinically significant contradictions.
 * 
 * CRITICAL REQUIREMENTS:
 * - Flags "Potential conflict — requires clarification"
 * - Does NOT auto-decide which source is correct
 * - Allows human to acknowledge or resolve with notes
 */

/**
 * Checks for conflicts between intake and reports.
 * 
 * @param {object} patient - Patient intake record
 * @param {Array<object>} reports - List of reports with raw text
 * @param {Array<object>} labResults - Extracted laboratory results
 * @returns {Array<object>} List of detected conflicts
 */
export function detectConflicts(patient, reports = [], labResults = []) {
  const conflicts = [];
  if (!patient) return conflicts;

  const intakeAllergies = (patient.allergies || '').toLowerCase();
  const intakeConditions = (patient.conditions || '').toLowerCase();
  const intakeMeds = (patient.medications || '').toLowerCase();

  // 1. Allergy Conflict Check
  // Case A: Intake claims no allergies ("none", "nkda", "no known allergies", "no known drug allergies (nkda)", etc.)
  const claimsNoAllergies = /(?:^|\b)(none|no|nil|no known allergies|nkda|no known drug allergies|n\/a|denies)(?:\s*\(nkda\))?(?:$|\b)/i.test(intakeAllergies.trim());

  for (const report of reports) {
    const rawLower = (report.raw_text || '').toLowerCase();

    // Check if report mentions allergies or allergic reactions
    const allergyMatch = rawLower.match(/(?:allergy|allergies|allergic(?:\s+[a-z]+)?\s+to|sensitive\s+to|reaction\s+to)\s*[:\-]?\s*([a-zA-Z0-9\s,\/\-]+?)(?:\.|\n|$)/i);
    
    // Also check explicit mention of common drug allergies if intake claims none
    let detectedAllergy = null;
    if (allergyMatch && allergyMatch[1]) {
      detectedAllergy = allergyMatch[1].trim();
    } else {
      const explicitDrugMatch = rawLower.match(/(?:allergic|allergy|adverse\s+reaction)[^\.\n]*?\b(penicillin|amoxicillin|sulfa|aspirin|ibuprofen|latex|codeine)\b/i);
      if (explicitDrugMatch && explicitDrugMatch[1]) {
        detectedAllergy = `${explicitDrugMatch[1]} reaction`;
      }
    }

    if (claimsNoAllergies && detectedAllergy) {
      if (!/^(none|nil|no|nkda|denies|not documented)/i.test(detectedAllergy)) {
        conflicts.push({
          id: `conflict-allergy-${report.id || Date.now()}`,
          title: 'Allergy Documentation Discrepancy',
          description: `Patient intake indicates "No known allergies", but medical report "${report.filename || 'Recent Report'}" documents: "${detectedAllergy}".`,
          sourceA: `Patient Intake: "${patient.allergies || 'No known allergies'}"`,
          sourceB: `Report (${report.filename}): "${detectedAllergy}"`,
          status: 'Unresolved'
        });
      }
    }

    // Case B: Intake lists an allergy, but report prescribes or mentions administration of that drug
    const commonAllergens = ['penicillin', 'amoxicillin', 'sulfa', 'aspirin', 'ibuprofen', 'latex', 'codeine'];
    for (const allergen of commonAllergens) {
      if (intakeAllergies.includes(allergen)) {
        if (rawLower.includes(allergen) && (rawLower.includes('prescribed') || rawLower.includes('rx') || rawLower.includes('administered') || rawLower.includes('tab') || rawLower.includes('capsule'))) {
          conflicts.push({
            id: `conflict-prescribed-allergen-${allergen}-${report.id || Date.now()}`,
            title: `Potential Contraindication / Allergy Conflict: ${allergen.toUpperCase()}`,
            description: `Patient intake records an allergy to "${allergen}", however report "${report.filename}" references active prescription or administration of this agent.`,
            sourceA: `Patient Intake Allergy: "${patient.allergies}"`,
            sourceB: `Report (${report.filename}): References ${allergen}`,
            status: 'Unresolved'
          });
        }
      }
    }
  }

  // 2. Condition vs Diagnostic Finding Conflict Check
  // e.g. Patient denies diabetes or chronic conditions, but Fasting Glucose > 126 or HbA1c > 6.5%
  const deniesChronicConditions = /^(none|no|nil|healthy|no chronic conditions|n\/a)$/i.test(intakeConditions.trim());

  if (deniesChronicConditions) {
    const fbsResult = labResults.find(r => r.canonical_name === 'Fasting Blood Glucose' || r.canonical_name === 'Blood Glucose');
    if (fbsResult && fbsResult.observed_value >= 140) {
      conflicts.push({
        id: `conflict-condition-glucose-${fbsResult.id || Date.now()}`,
        title: 'Diagnostic Finding vs Stated History Discrepancy',
        description: `Patient intake reports "No chronic conditions", but current laboratory findings indicate markedly elevated Fasting Blood Glucose (${fbsResult.observed_value} ${fbsResult.unit || 'mg/dL'}).`,
        sourceA: `Patient Intake Conditions: "${patient.conditions || 'None'}"`,
        sourceB: `Laboratory Finding: ${fbsResult.canonical_name} = ${fbsResult.observed_value} ${fbsResult.unit || ''} (${fbsResult.status})`,
        status: 'Unresolved'
      });
    }

    const hba1cResult = labResults.find(r => r.canonical_name === 'HbA1c');
    if (hba1cResult && hba1cResult.observed_value >= 7.0) {
      conflicts.push({
        id: `conflict-condition-hba1c-${hba1cResult.id || Date.now()}`,
        title: 'Diagnostic Indicator vs Stated History Discrepancy',
        description: `Patient intake reports "No chronic conditions", but HbA1c is reported at ${hba1cResult.observed_value}%, exceeding standard diabetic thresholds.`,
        sourceA: `Patient Intake Conditions: "${patient.conditions || 'None'}"`,
        sourceB: `Laboratory Finding: HbA1c = ${hba1cResult.observed_value}% (${hba1cResult.status})`,
        status: 'Unresolved'
      });
    }
  }

  return conflicts;
}
