export function generateExam(
  questions: import("@/types").Question[],
  config: import("@/types").ExamConfig
): import("@/types").Question[] {
  const pool = [...questions].sort(() => Math.random() - 0.5);
  const selected = pool.slice(0, Math.min(config.questionCount, pool.length));

  // Ensure mix of difficulties if available
  const easy = selected.filter((q) => q.difficulty === 1);
  const medium = selected.filter((q) => q.difficulty === 2);
  const hard = selected.filter((q) => q.difficulty === 3);

  // Interleave: easy → medium → hard pattern
  const result: import("@/types").Question[] = [];
  const maxLen = Math.max(easy.length, medium.length, hard.length);
  for (let i = 0; i < maxLen; i++) {
    if (i < easy.length) result.push(easy[i]);
    if (i < medium.length) result.push(medium[i]);
    if (i < hard.length) result.push(hard[i]);
  }

  return result;
}
