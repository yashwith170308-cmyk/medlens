/**
 * Longitudinal Comparison Service
 * 
 * Compares structured laboratory parameters between a previous report and the current report.
 * 
 * CRITICAL REQUIREMENTS:
 * - Deterministic delta calculations.
 * - Does NOT make unsupported medical conclusions from changes.
 */

export function compareLabResults(currentResults = [], previousResults = []) {
  const comparison = [];

  // Index previous results by canonical name
  const prevMap = new Map();
  for (const prev of previousResults) {
    if (prev.canonical_name) {
      prevMap.set(prev.canonical_name.toLowerCase(), prev);
    }
  }

  // Compare with current results
  for (const curr of currentResults) {
    if (!curr.canonical_name) continue;
    const key = curr.canonical_name.toLowerCase();
    const prev = prevMap.get(key);

    if (prev) {
      const currVal = curr.observed_value;
      const prevVal = prev.observed_value;

      let delta = null;
      let changeText = 'N/A';
      let direction = 'stable';
      let percentChange = null;

      if (typeof currVal === 'number' && typeof prevVal === 'number') {
        delta = parseFloat((currVal - prevVal).toFixed(2));
        
        if (delta > 0) {
          direction = 'up';
          changeText = `↑ ${delta} ${curr.unit || ''}`.trim();
        } else if (delta < 0) {
          direction = 'down';
          changeText = `↓ ${Math.abs(delta)} ${curr.unit || ''}`.trim();
        } else {
          direction = 'stable';
          changeText = `No change (0 ${curr.unit || ''})`.trim();
        }

        if (prevVal !== 0) {
          percentChange = parseFloat(((delta / prevVal) * 100).toFixed(1));
        }
      }

      comparison.push({
        parameter: curr.canonical_name,
        unit: curr.unit || prev.unit || '',
        previous: {
          value: prev.observed_value !== null ? prev.observed_value : prev.value_text,
          range: prev.reference_range_raw || 'Not reported',
          status: prev.status,
          date: prev.report_date || 'Previous Report',
          sourceSnippet: prev.source_snippet
        },
        current: {
          value: curr.observed_value !== null ? curr.observed_value : curr.value_text,
          range: curr.reference_range_raw || 'Not reported',
          status: curr.status,
          date: curr.report_date || 'Current Report',
          sourceSnippet: curr.source_snippet
        },
        delta,
        percentChange,
        direction,
        changeText,
        // Factual note without medical speculation
        observation: `${curr.canonical_name} changed from ${prev.observed_value !== null ? prev.observed_value : prev.value_text} to ${curr.observed_value !== null ? curr.observed_value : curr.value_text} (${changeText}).`
      });

      prevMap.delete(key);
    } else {
      // New parameter in current report only
      comparison.push({
        parameter: curr.canonical_name,
        unit: curr.unit || '',
        previous: null,
        current: {
          value: curr.observed_value !== null ? curr.observed_value : curr.value_text,
          range: curr.reference_range_raw || 'Not reported',
          status: curr.status,
          date: curr.report_date || 'Current Report',
          sourceSnippet: curr.source_snippet
        },
        delta: null,
        percentChange: null,
        direction: 'new',
        changeText: 'First recorded test',
        observation: `Recorded for the first time in current report.`
      });
    }
  }

  // Remaining parameters from previous report not in current
  for (const [key, prev] of prevMap.entries()) {
    comparison.push({
      parameter: prev.canonical_name,
      unit: prev.unit || '',
      previous: {
        value: prev.observed_value !== null ? prev.observed_value : prev.value_text,
        range: prev.reference_range_raw || 'Not reported',
        status: prev.status,
        date: prev.report_date || 'Previous Report',
        sourceSnippet: prev.source_snippet
      },
      current: null,
      delta: null,
      percentChange: null,
      direction: 'omitted',
      changeText: 'Not tested in current',
      observation: `Not re-evaluated in the current report.`
    });
  }

  return comparison;
}
