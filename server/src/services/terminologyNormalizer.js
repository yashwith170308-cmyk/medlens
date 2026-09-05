// Clinical Terminology Normalizer & Canonical Synonym Dictionary

const SYNONYM_MAP = {
  // Hematology
  'hemoglobin': 'Hemoglobin',
  'hb': 'Hemoglobin',
  'hgb': 'Hemoglobin',
  'total hemoglobin': 'Hemoglobin',

  'wbc': 'White Blood Cell Count',
  'wbc count': 'White Blood Cell Count',
  'white blood cells': 'White Blood Cell Count',
  'white blood cell count': 'White Blood Cell Count',
  'total leucocyte count': 'White Blood Cell Count',
  'tlc': 'White Blood Cell Count',
  'leukocytes': 'White Blood Cell Count',

  'rbc': 'Red Blood Cell Count',
  'rbc count': 'Red Blood Cell Count',
  'red blood cells': 'Red Blood Cell Count',
  'total erythrocyte count': 'Red Blood Cell Count',
  'erythrocytes': 'Red Blood Cell Count',

  'platelet': 'Platelet Count',
  'platelets': 'Platelet Count',
  'platelet count': 'Platelet Count',
  'plt': 'Platelet Count',
  'thrombocytes': 'Platelet Count',

  'hematocrit': 'Hematocrit',
  'hct': 'Hematocrit',
  'packed cell volume': 'Hematocrit',
  'pcv': 'Hematocrit',

  'mcv': 'Mean Corpuscular Volume',
  'mean corpuscular volume': 'Mean Corpuscular Volume',

  'mch': 'Mean Corpuscular Hemoglobin',
  'mean corpuscular hemoglobin': 'Mean Corpuscular Hemoglobin',

  'mchc': 'Mean Corpuscular Hemoglobin Concentration',
  'mean corpuscular hemoglobin concentration': 'Mean Corpuscular Hemoglobin Concentration',

  'esr': 'Erythrocyte Sedimentation Rate',
  'erythrocyte sedimentation rate': 'Erythrocyte Sedimentation Rate',

  // Biochemistry / Metabolic
  'fasting blood sugar': 'Fasting Blood Glucose',
  'fbs': 'Fasting Blood Glucose',
  'fasting glucose': 'Fasting Blood Glucose',
  'blood sugar fasting': 'Fasting Blood Glucose',
  'glucose fasting': 'Fasting Blood Glucose',
  'blood glucose': 'Blood Glucose',
  'glucose': 'Blood Glucose',

  'post prandial blood sugar': 'Postprandial Blood Glucose',
  'ppbs': 'Postprandial Blood Glucose',
  'glucose pp': 'Postprandial Blood Glucose',

  'hba1c': 'HbA1c',
  'glycated hemoglobin': 'HbA1c',
  'glycosylated hemoglobin': 'HbA1c',

  'creatinine': 'Serum Creatinine',
  's. creatinine': 'Serum Creatinine',
  'serum creatinine': 'Serum Creatinine',

  'blood urea': 'Blood Urea',
  'urea': 'Blood Urea',
  'blood urea nitrogen': 'Blood Urea Nitrogen',
  'bun': 'Blood Urea Nitrogen',

  'uric acid': 'Serum Uric Acid',
  'serum uric acid': 'Serum Uric Acid',

  // Lipid Profile
  'cholesterol': 'Total Cholesterol',
  'total cholesterol': 'Total Cholesterol',
  'serum cholesterol': 'Total Cholesterol',

  'triglycerides': 'Triglycerides',
  'serum triglycerides': 'Triglycerides',
  'tg': 'Triglycerides',

  'hdl': 'HDL Cholesterol',
  'hdl cholesterol': 'HDL Cholesterol',
  'high density lipoprotein': 'HDL Cholesterol',

  'ldl': 'LDL Cholesterol',
  'ldl cholesterol': 'LDL Cholesterol',
  'low density lipoprotein': 'LDL Cholesterol',

  'vldl': 'VLDL Cholesterol',
  'vldl cholesterol': 'VLDL Cholesterol',

  // Liver Function
  'sgot': 'Aspartate Aminotransferase (AST/SGOT)',
  'ast': 'Aspartate Aminotransferase (AST/SGOT)',
  'aspartate aminotransferase': 'Aspartate Aminotransferase (AST/SGOT)',

  'sgpt': 'Alanine Aminotransferase (ALT/SGPT)',
  'alt': 'Alanine Aminotransferase (ALT/SGPT)',
  'alanine aminotransferase': 'Alanine Aminotransferase (ALT/SGPT)',

  'alkaline phosphatase': 'Alkaline Phosphatase',
  'alp': 'Alkaline Phosphatase',

  'total bilirubin': 'Total Bilirubin',
  'bilirubin total': 'Total Bilirubin',

  'total protein': 'Total Protein',
  'serum total protein': 'Total Protein',

  'albumin': 'Serum Albumin',
  'serum albumin': 'Serum Albumin',

  // Electrolytes
  'sodium': 'Serum Sodium',
  'serum sodium': 'Serum Sodium',
  'na+': 'Serum Sodium',
  'na': 'Serum Sodium',

  'potassium': 'Serum Potassium',
  'serum potassium': 'Serum Potassium',
  'k+': 'Serum Potassium',
  'k': 'Serum Potassium',

  // Thyroid
  'tsh': 'Thyroid Stimulating Hormone (TSH)',
  'thyroid stimulating hormone': 'Thyroid Stimulating Hormone (TSH)',
  'ultra tsh': 'Thyroid Stimulating Hormone (TSH)',

  'free t3': 'Free T3',
  'ft3': 'Free T3',

  'free t4': 'Free T4',
  'ft4': 'Free T4'
};

const SYNONYM_ENTRIES = Object.entries(SYNONYM_MAP);

/**
 * Normalizes a raw medical test name to its canonical standard name.
 * @param {string} rawName 
 * @returns {{ canonicalName: string, isStandardized: boolean }}
 */
export function normalizeTestName(rawName) {
  if (!rawName || typeof rawName !== 'string') {
    return { canonicalName: 'Unknown Parameter', isStandardized: false };
  }

  const cleaned = rawName
    .toLowerCase()
    .replace(/[^\w\s\+\-\/\.]/g, '')
    .trim();

  if (SYNONYM_MAP[cleaned]) {
    return { canonicalName: SYNONYM_MAP[cleaned], isStandardized: true };
  }

  // Check prefix or contains matches for common clinical terms
  for (let i = 0; i < SYNONYM_ENTRIES.length; i++) {
    const [synonym, canonical] = SYNONYM_ENTRIES[i];
    if (cleaned === synonym || cleaned.startsWith(synonym + ' ') || cleaned.endsWith(' ' + synonym)) {
      return { canonicalName: canonical, isStandardized: true };
    }
  }

  // Title case the raw name if no canonical alias matched
  const titleCased = rawName
    .trim()
    .split(/\s+/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');

  return { canonicalName: titleCased, isStandardized: false };
}
