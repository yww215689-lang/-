import { SRSData } from "../types";

// Grades:
// 0: Blackout (Wrong) -> Reset
// 3: Hard -> Interval * 1.2
// 4: Good -> Interval * 2.5
// 5: Easy -> Interval * 3.5+

export const INITIAL_SRS_DATA: SRSData = {
  easeFactor: 2.5,
  interval: 0,
  repetitions: 0,
  dueDate: Date.now(),
};

export const calculateSRS = (current: SRSData | undefined, grade: number): SRSData => {
  let { easeFactor, interval, repetitions } = current || { ...INITIAL_SRS_DATA };

  // If wrong (grade < 3), reset repetitions and interval
  if (grade < 3) {
    repetitions = 0;
    interval = 1; // Review again tomorrow (or essentially "soon")
  } else {
    // Correct
    if (repetitions === 0) {
      interval = 1;
    } else if (repetitions === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * easeFactor);
    }
    repetitions++;
  }

  // Update Ease Factor (Standard SM-2 formula)
  // EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
  // q is grade. We map UI buttons to grades: Hard=3, Good=4, Easy=5
  const q = grade;
  easeFactor = easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  if (easeFactor < 1.3) easeFactor = 1.3;

  // Calculate new due date (Interval is in days)
  const oneDay = 24 * 60 * 60 * 1000;
  const dueDate = Date.now() + (interval * oneDay);

  return {
    easeFactor,
    interval,
    repetitions,
    dueDate,
  };
};

export const getReviewStatusLabel = (interval: number) => {
    if (interval <= 1) return "1天后";
    return `${interval}天后`;
};
