/**
 * Voice Transcription (Whisper) & Constrained Option Mapping Service
 * 
 * STRICT PRD RULE (Section 12.8 & 14):
 * The LLM's ONLY job is mapping a transcribed answer to the current question node's 
 * valid options in JSON mode. It NEVER selects the next question, never routes departments,
 * and never diagnoses.
 */

/**
 * Constrained Option Mapper
 * @param {string} transcript - Speech-to-text string
 * @param {Array} validOptions - [{ id, label: { en, hi } }]
 * @param {string} language - 'en' | 'hi'
 */
async function mapTranscriptToOption(transcript, validOptions = [], language = 'en') {
  if (!transcript || validOptions.length === 0) {
    return { matched_option_id: null, confidence: 0, raw_transcript: transcript };
  }

  const cleanText = transcript.trim().toLowerCase();

  // 1. Fast deterministic keyword/exact match check
  for (const opt of validOptions) {
    const enLabel = (opt.label?.en || '').toLowerCase();
    const hiLabel = opt.label?.hi || '';

    if (cleanText.includes(enLabel) || cleanText.includes(opt.id.toLowerCase()) || cleanText.includes(hiLabel)) {
      return {
        matched_option_id: opt.id,
        confidence: 0.95,
        option_label: opt.label,
        raw_transcript: transcript
      };
    }
  }

  // 2. Semantic fuzzy keyword mapper for Indic & English colloquial clinical answers
  // (e.g. "3 days", "severe morning pain", "chest heaviness", "chills and fever")
  const keywordsMap = {
    'chest': 'opt_chest',
    'fever': 'opt_fever',
    'bukhar': 'opt_fever',
    'joint': 'opt_joint',
    'dard': 'opt_joint',
    'cough': 'opt_cough',
    'khansi': 'opt_cough',
    'stomach': 'opt_stomach',
    'pet': 'opt_stomach',
    'gas': 'opt_stomach',
    'acidity': 'opt_acidity',
    'headache': 'opt_headache',
    'sir dard': 'opt_headache',
    '1': 'opt_fever_1_2',
    '2': 'opt_fever_1_2',
    '3': 'opt_fever_3_5',
    '4': 'opt_fever_3_5',
    '5': 'opt_fever_3_5',
    'week': 'opt_fever_week',
    'left arm': 'opt_chest_radiating',
    'sweat': 'opt_chest_radiating',
    'radiating': 'opt_chest_radiating',
    'vata': 'opt_vata',
    'pitta': 'opt_pitta',
    'kapha': 'opt_kapha'
  };

  for (const [kw, optId] of Object.entries(keywordsMap)) {
    if (cleanText.includes(kw)) {
      const matched = validOptions.find(o => o.id === optId);
      if (matched) {
        return {
          matched_option_id: matched.id,
          confidence: 0.88,
          option_label: matched.label,
          raw_transcript: transcript
        };
      }
    }
  }

  // If match confidence is ambiguous/low, signal fallback to touch selection per PRD 6.8
  return {
    matched_option_id: null,
    confidence: 0.3,
    raw_transcript: transcript,
    fallback_to_touch: true,
    message: 'Could not confidently match spoken answer to options. Please tap your choice.'
  };
}

module.exports = {
  mapTranscriptToOption
};
