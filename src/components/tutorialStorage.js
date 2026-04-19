// Tutorial localStorage helpers — kept separate so Fast Refresh works correctly
export const TUT_KEY = 'craftcv_tutorial_done_v1';

export function hasDoneTutorial() {
  try { return !!localStorage.getItem(TUT_KEY); } catch { return false; }
}
export function markTutorialDone() {
  try { localStorage.setItem(TUT_KEY, '1'); } catch {}
}
