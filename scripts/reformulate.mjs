/**
 * Normalize activity steps to single | multiple choice only.
 */
import { sanitizeText } from "./sanitize-text.mjs";

function isTrue(result) {
  return result === true || result === "true" || result === 1 || result === "1" || result === "True";
}

function optionId(i) {
  return String.fromCharCode(97 + (i % 26)) + (i >= 26 ? String(Math.floor(i / 26)) : "");
}

/**
 * @param {Array} rawSteps - Unity JSON steps
 * @returns {{ steps: Array, choiceType: 'single'|'multiple', needsReview: boolean, notes: string[] }}
 */
export function reformulateSteps(rawSteps, statement = "") {
  const notes = [];
  let needsReview = false;
  const steps = [];
  let anyMultiple = false;

  const list = Array.isArray(rawSteps) ? rawSteps : [];

  for (let si = 0; si < list.length; si++) {
    const st = list[si] || {};
    let options = Array.isArray(st.options) ? st.options : [];

    // Build normalized options
    let normalized = options.map((opt, i) => {
      const text = sanitizeText(
        opt.text != null && String(opt.text).trim() !== ""
          ? String(opt.text)
          : opt.img
            ? String(opt.img)
            : `Opção ${i + 1}`
      );
      return {
        id: optionId(i),
        text,
        image_url: opt.img && String(opt.img).trim() !== "" ? String(opt.img) : null,
        correct: isTrue(opt.result),
      };
    });

    // Drop empty-looking options that are pure noise
    normalized = normalized.filter((o) => o.text.length > 0);

    let correctCount = normalized.filter((o) => o.correct).length;

    // Cap at 6: keep all correct + first distractors
    if (normalized.length > 6) {
      const corrects = normalized.filter((o) => o.correct);
      const wrongs = normalized.filter((o) => !o.correct);
      normalized = [...corrects, ...wrongs].slice(0, Math.max(6, corrects.length));
      // re-id
      normalized = normalized.map((o, i) => ({ ...o, id: optionId(i) }));
      notes.push(`step ${si}: capped options to ${normalized.length}`);
      correctCount = normalized.filter((o) => o.correct).length;
    }

    if (normalized.length === 0 || correctCount === 0) {
      // Try reformulate from txt_ref
      const refs = Array.isArray(st.txt_ref) ? st.txt_ref.filter(Boolean) : [];
      if (refs.length >= 1 && statement) {
        normalized = [
          { id: "a", text: String(refs[0]).slice(0, 80), image_url: null, correct: true },
          { id: "b", text: "Não sei", image_url: null, correct: false },
          { id: "c", text: "Nenhuma das opções", image_url: null, correct: false },
        ];
        correctCount = 1;
        notes.push(`step ${si}: reformulated from txt_ref`);
      } else {
        needsReview = true;
        notes.push(`step ${si}: no correct options — placeholder`);
        normalized = [
          { id: "a", text: "Em revisão", image_url: null, correct: true },
          { id: "b", text: "—", image_url: null, correct: false },
          { id: "c", text: "—", image_url: null, correct: false },
        ];
        correctCount = 1;
      }
    }

    if (correctCount >= 2) anyMultiple = true;

    const prompt =
      Array.isArray(st.txt_ref) && st.txt_ref.length > 0
        ? st.txt_ref.filter(Boolean).join(" ")
        : null;

    steps.push({
      prompt: prompt || null,
      options: normalized.map(({ id, text, image_url, correct }) => ({
        id,
        text,
        image_url,
        correct,
      })),
    });
  }

  if (steps.length === 0) {
    needsReview = true;
    notes.push("no steps");
    steps.push({
      prompt: null,
      options: [
        { id: "a", text: "Em revisão", image_url: null, correct: true },
        { id: "b", text: "—", image_url: null, correct: false },
      ],
    });
  }

  return {
    steps,
    choiceType: anyMultiple ? "multiple" : "single",
    needsReview,
    notes,
  };
}
