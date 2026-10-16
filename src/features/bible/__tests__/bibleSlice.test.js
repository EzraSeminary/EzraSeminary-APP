import reducer, {
  clearPendingBibleAction,
  setPendingBibleAction,
  updateBibleSettings,
} from '../bibleSlice';

describe('Bible reader state', () => {
  test('persists reader preferences independently', () => {
    const state = reducer(undefined, updateBibleSettings({fontSize: 28}));
    expect(state.settings.fontSize).toBe(28);
    expect(state.settings.lineSpacing).toBe(1.15);
  });

  test('retains and clears an authentication-gated draft', () => {
    const pending = {type: 'note', text: 'Do not discard this draft'};
    const state = reducer(undefined, setPendingBibleAction(pending));
    expect(state.pendingAction).toEqual(pending);
    expect(reducer(state, clearPendingBibleAction()).pendingAction).toBeNull();
  });
});
