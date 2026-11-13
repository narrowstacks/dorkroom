import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  consumeSearchLink,
  getConsumedSearchSeq,
  getSearchLinkSnapshot,
  noteInitialUrl,
  pushSearchLink,
  resetSearchLinks,
  subscribeSearchLink,
} from './search-link-store';

afterEach(resetSearchLinks);

describe('search link store', () => {
  it('starts with no event', () => {
    expect(getSearchLinkSnapshot()).toEqual({ query: '', seq: 0 });
  });

  it('records an event and counts it', () => {
    expect(pushSearchLink('hp5 at 800')).toBe(true);
    expect(getSearchLinkSnapshot()).toEqual({ query: 'hp5 at 800', seq: 1 });
  });

  it('counts the same query twice as two events', () => {
    pushSearchLink('fp4');
    const first = getSearchLinkSnapshot();
    pushSearchLink('fp4');
    const second = getSearchLinkSnapshot();
    expect(second.query).toBe('fp4');
    expect(second.seq).toBe(first.seq + 1);
    expect(second).not.toBe(first);
  });

  it('normalises the query, and an empty one is no event', () => {
    pushSearchLink('  hp5  ');
    expect(getSearchLinkSnapshot().query).toBe('hp5');
    pushSearchLink('a'.repeat(500));
    expect(getSearchLinkSnapshot().query).toHaveLength(200);
    const before = getSearchLinkSnapshot();
    for (const empty of ['', '   ']) {
      expect(pushSearchLink(empty)).toBe(false);
    }
    expect(getSearchLinkSnapshot()).toBe(before);
  });

  it('notifies subscribers after the current task, once per event, until they unsubscribe', async () => {
    const listener = vi.fn();
    const off = subscribeSearchLink(listener);
    pushSearchLink('a');
    // Not inline: a push during another component's render must not update a Home.
    expect(listener).not.toHaveBeenCalled();
    pushSearchLink('a');
    pushSearchLink('');
    await Promise.resolve();
    expect(listener).toHaveBeenCalledTimes(2);
    off();
    pushSearchLink('b');
    await Promise.resolve();
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('keeps the snapshot stable between events', () => {
    pushSearchLink('a');
    expect(getSearchLinkSnapshot()).toBe(getSearchLinkSnapshot());
  });
});

/** What a Home does: start from the consumed seq, apply when seq differs, consume. */
function mountHome() {
  let seen = getConsumedSearchSeq();
  const applied: string[] = [];
  return {
    render() {
      const { seq, query } = getSearchLinkSnapshot();
      if (seq !== seen) {
        seen = seq;
        consumeSearchLink(seq);
        applied.push(query);
      }
      return applied;
    },
  };
}

describe('consumed-once events', () => {
  it('cold: an event recorded before any Home exists is applied by the first Home', () => {
    pushSearchLink('hp5');
    const home = mountHome();
    expect(home.render()).toEqual(['hp5']);
    expect(home.render()).toEqual(['hp5']);
  });

  it('warm: the mounted Home applies it, and a Home that mounts later does not replay it', () => {
    const first = mountHome();
    pushSearchLink('fp4');
    expect(first.render()).toEqual(['fp4']);
    const later = mountHome();
    expect(later.render()).toEqual([]);
  });

  it('two Homes mounted together both apply an event', () => {
    const a = mountHome();
    const b = mountHome();
    pushSearchLink('fp4');
    expect(a.render()).toEqual(['fp4']);
    expect(b.render()).toEqual(['fp4']);
  });

  it('two events in a row apply twice, even with the same query', () => {
    const home = mountHome();
    pushSearchLink('fp4');
    expect(home.render()).toEqual(['fp4']);
    pushSearchLink('fp4');
    expect(home.render()).toEqual(['fp4', 'fp4']);
  });

  it('consuming is idempotent and never goes back', () => {
    pushSearchLink('a');
    pushSearchLink('b');
    consumeSearchLink(2);
    consumeSearchLink(2);
    consumeSearchLink(1);
    expect(getConsumedSearchSeq()).toBe(2);
  });
});

describe('noteInitialUrl', () => {
  it('records the launch link once per session, later calls are no-ops', () => {
    expect(noteInitialUrl('hp5')).toBe(true);
    expect(noteInitialUrl('hp5')).toBe(false);
    expect(noteInitialUrl('fp4')).toBe(false);
    expect(getSearchLinkSnapshot()).toEqual({ query: 'hp5', seq: 1 });
  });

  it('the first call uses up the flag even with an empty query', () => {
    expect(noteInitialUrl('  ')).toBe(false);
    expect(noteInitialUrl('hp5')).toBe(false);
    expect(getSearchLinkSnapshot().seq).toBe(0);
  });

  it('launch with a non-search URL, then a later initial call with a search URL, records nothing', () => {
    expect(noteInitialUrl(null)).toBe(false);
    expect(noteInitialUrl('hp5')).toBe(false);
    expect(getSearchLinkSnapshot().seq).toBe(0);
  });

  it('does not stop ordinary events', () => {
    noteInitialUrl('hp5');
    expect(pushSearchLink('fp4')).toBe(true);
    expect(getSearchLinkSnapshot().seq).toBe(2);
  });
});
