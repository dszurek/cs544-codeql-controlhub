import type { GradeAssignment, GradeCategory, GradeClass } from '@prisma/client';

export interface CategorySummary {
  categoryId: string;
  name: string;
  weight: number;
  earned: number;
  possible: number;
  percent: number | null; // null if no graded assignments
}

export interface ClassSummary {
  classId: string;
  name: string;
  code: string | null;
  creditHours: number;
  currentPercent: number | null;
  letterGrade: string | null;
  categorySummaries: CategorySummary[];
  uncategorizedPercent: number | null;
  uncategorizedWeight: number;
}

export function letterGradeFor(pct: number): string {
  if (pct >= 93) return 'A';
  if (pct >= 90) return 'A-';
  if (pct >= 87) return 'B+';
  if (pct >= 83) return 'B';
  if (pct >= 80) return 'B-';
  if (pct >= 77) return 'C+';
  if (pct >= 73) return 'C';
  if (pct >= 70) return 'C-';
  if (pct >= 67) return 'D+';
  if (pct >= 63) return 'D';
  if (pct >= 60) return 'D-';
  return 'F';
}

export function gpaFor(pct: number): number {
  if (pct >= 93) return 4.0;
  if (pct >= 90) return 3.7;
  if (pct >= 87) return 3.3;
  if (pct >= 83) return 3.0;
  if (pct >= 80) return 2.7;
  if (pct >= 77) return 2.3;
  if (pct >= 73) return 2.0;
  if (pct >= 70) return 1.7;
  if (pct >= 67) return 1.3;
  if (pct >= 63) return 1.0;
  if (pct >= 60) return 0.7;
  return 0.0;
}

export function summarizeClass(
  klass: GradeClass,
  categories: GradeCategory[],
  assignments: GradeAssignment[],
): ClassSummary {
  const graded = assignments.filter(
    (a) => !a.isUpcoming && a.pointsEarned != null && a.pointsPossible > 0,
  );

  const categorySummaries: CategorySummary[] = categories.map((cat) => {
    const inCat = graded.filter((a) => a.categoryId === cat.id);
    const earned = inCat.reduce((s, a) => s + (a.pointsEarned ?? 0), 0);
    const possible = inCat.reduce((s, a) => s + a.pointsPossible, 0);
    const percent = possible > 0 ? (earned / possible) * 100 : null;
    return {
      categoryId: cat.id,
      name: cat.name,
      weight: cat.weight,
      earned,
      possible,
      percent,
    };
  });

  const uncategorized = graded.filter((a) => !a.categoryId);
  const uncatEarned = uncategorized.reduce((s, a) => s + (a.pointsEarned ?? 0), 0);
  const uncatPossible = uncategorized.reduce((s, a) => s + a.pointsPossible, 0);
  const uncategorizedPercent = uncatPossible > 0 ? (uncatEarned / uncatPossible) * 100 : null;
  const sumCatWeights = categories.reduce((s, c) => s + c.weight, 0);
  const uncategorizedWeight = Math.max(0, 100 - sumCatWeights);

  let weightedSum = 0;
  let weightTotal = 0;

  for (const cs of categorySummaries) {
    if (cs.percent != null && cs.weight > 0) {
      weightedSum += cs.percent * cs.weight;
      weightTotal += cs.weight;
    }
  }
  if (uncategorizedPercent != null && uncategorizedWeight > 0) {
    weightedSum += uncategorizedPercent * uncategorizedWeight;
    weightTotal += uncategorizedWeight;
  }

  const currentPercent = weightTotal > 0 ? weightedSum / weightTotal : null;
  const letterGrade = currentPercent != null ? letterGradeFor(currentPercent) : null;

  return {
    classId: klass.id,
    name: klass.name,
    code: klass.code,
    creditHours: klass.creditHours,
    currentPercent,
    letterGrade,
    categorySummaries,
    uncategorizedPercent,
    uncategorizedWeight,
  };
}

export function overallGpa(summaries: ClassSummary[]): number | null {
  let qp = 0;
  let credits = 0;
  for (const s of summaries) {
    if (s.currentPercent != null) {
      qp += gpaFor(s.currentPercent) * s.creditHours;
      credits += s.creditHours;
    }
  }
  return credits > 0 ? qp / credits : null;
}
