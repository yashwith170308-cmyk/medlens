/**
 * Clarification Engine
 * 
 * Generates 3-5 structured clinical clarification questions based strictly
 * on incomplete or ambiguous information provided in patient intake and reports.
 * 
 * CRITICAL REQUIREMENTS:
 * - Clarification inquiry only.
 * - MUST NOT provide medical advice or recommendations.
 */

export function generateClarificationQuestions(patient, labResults = []) {
  const questions = [];
  if (!patient) return questions;

  const symptoms = (patient.symptoms || '').trim();
  const medications = (patient.medications || '').trim();
  const conditions = (patient.conditions || '').trim();
  const allergies = (patient.allergies || '').trim();

  // 1. Symptom Clarification
  if (symptoms) {
    // Check if onset is mentioned
    if (!/(since|ago|started|began|yesterday|days|weeks|months|years|acute|chronic)/i.test(symptoms)) {
      questions.push({
        id: `clarify-symptom-onset-${Date.now()}`,
        question: `Regarding the reported symptom ("${symptoms}"): Approximately when did this symptom first begin, and has its severity changed recently?`,
        contextField: 'Symptoms / Concerns',
        userResponse: ''
      });
    }

    // Check frequency/pattern
    if (!/(constant|intermittent|daily|weekly|occasional|frequent|morning|night)/i.test(symptoms)) {
      questions.push({
        id: `clarify-symptom-frequency-${Date.now() + 1}`,
        question: `Does the symptom ("${symptoms}") occur continuously or in intermittent episodes, and are there specific activities that trigger or alleviate it?`,
        contextField: 'Symptoms / Concerns',
        userResponse: ''
      });
    }
  } else {
    questions.push({
      id: `clarify-symptoms-missing-${Date.now()}`,
      question: `No primary symptoms or health concerns were entered. What is the primary clinical reason for this intake or report review?`,
      contextField: 'Symptoms / Concerns',
      userResponse: ''
    });
  }

  // 2. Medication Clarification (dosages / timing)
  if (medications && !/(none|no|nil|n\/a)/i.test(medications)) {
    if (!/(mg|mcg|ml|daily|bid|tid|od|twice|once|dose)/i.test(medications)) {
      questions.push({
        id: `clarify-med-dosage-${Date.now() + 2}`,
        question: `For the listed medication(s) ("${medications}"): What are the current prescribed dosages and daily frequencies?`,
        contextField: 'Current Medications',
        userResponse: ''
      });
    }
  }

  // 3. Lab Results with Missing Reference Range
  const uncalibrated = labResults.filter(r => r.status === 'Not determined');
  if (uncalibrated.length > 0) {
    const names = uncalibrated.map(r => r.canonical_name).slice(0, 2).join(', ');
    questions.push({
      id: `clarify-missing-range-${Date.now() + 3}`,
      question: `The report provided parameter(s) [${names}] without reference ranges. Can the laboratory or performing facility provide the reference range sheet for accurate comparison?`,
      contextField: 'Laboratory Results',
      userResponse: ''
    });
  }

  // 4. Allergy Detail Clarification
  if (allergies && !/^(none|nil|no|nkda|no known allergies)$/i.test(allergies)) {
    if (!/(rash|anaphylaxis|hives|swelling|mild|severe|reaction)/i.test(allergies)) {
      questions.push({
        id: `clarify-allergy-reaction-${Date.now() + 4}`,
        question: `For the documented allergy ("${allergies}"): What specific reaction or symptoms occurred during prior exposure?`,
        contextField: 'Known Allergies',
        userResponse: ''
      });
    }
  }

  // Ensure 3 to 5 questions
  if (questions.length < 3) {
    questions.push({
      id: `clarify-baseline-${Date.now() + 5}`,
      question: `Have there been any recent changes in diet, physical activity, or newly started supplements prior to this laboratory testing?`,
      contextField: 'Additional Notes',
      userResponse: ''
    });
  }

  return questions.slice(0, 5);
}
