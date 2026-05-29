import { describe, it, expect } from 'vitest';
import {
  matchCommentRule,
  normalizeForMatch,
  type CommentAutoReplyRule,
} from '@/supabase/functions/messaging-webhook-meta/comment-matcher';

describe('normalizeForMatch', () => {
  it('lowercases, strips accents and wraps in spaces', () => {
    expect(normalizeForMatch('Informações')).toBe(' informacoes ');
  });

  it('replaces punctuation with spaces', () => {
    expect(normalizeForMatch('LINK!!!')).toBe(' link ');
  });

  it('collapses repeated separators', () => {
    expect(normalizeForMatch('eu   quero,, o link')).toBe(' eu quero o link ');
  });
});

describe('matchCommentRule', () => {
  const rule = (over: Partial<CommentAutoReplyRule> = {}): CommentAutoReplyRule => ({
    keywords: ['LINK'],
    dmMessage: 'Mandei no direct!',
    ...over,
  });

  it('matches keyword case-insensitively', () => {
    expect(matchCommentRule('quero o LINK', [rule()])).not.toBeNull();
    expect(matchCommentRule('quero o link', [rule()])).not.toBeNull();
  });

  it('matches keyword with adjacent punctuation', () => {
    expect(matchCommentRule('Quero o LINK!!!', [rule()])).not.toBeNull();
  });

  it('matches accent-insensitively in both directions', () => {
    const r = rule({ keywords: ['informacoes'] });
    expect(matchCommentRule('Me manda as informações', [r])).not.toBeNull();

    const r2 = rule({ keywords: ['informações'] });
    expect(matchCommentRule('quero informacoes', [r2])).not.toBeNull();
  });

  it('respects word boundaries (does not match substrings)', () => {
    expect(matchCommentRule('vi seu linkedin', [rule()])).toBeNull();
  });

  it('matches multi-word keywords', () => {
    const r = rule({ keywords: ['eu quero'] });
    expect(matchCommentRule('eu quero muito esse curso', [r])).not.toBeNull();
    expect(matchCommentRule('quero muito', [r])).toBeNull();
  });

  it('filters by mediaId when the rule scopes a post', () => {
    const r = rule({ mediaId: 'post-111' });
    expect(matchCommentRule('quero o link', [r], 'post-111')).not.toBeNull();
    expect(matchCommentRule('quero o link', [r], 'post-222')).toBeNull();
  });

  it('ignores rules without a dmMessage', () => {
    const broken = { keywords: ['link'], dmMessage: '' } as CommentAutoReplyRule;
    expect(matchCommentRule('quero o link', [broken])).toBeNull();
  });

  it('returns the first matching rule when several are configured', () => {
    const first = rule({ keywords: ['curso'], dmMessage: 'A' });
    const second = rule({ keywords: ['link'], dmMessage: 'B' });
    const matched = matchCommentRule('quero o link do curso', [first, second]);
    expect(matched?.dmMessage).toBe('A');
  });

  it('returns null for empty text, no rules, or blank keywords', () => {
    expect(matchCommentRule('', [rule()])).toBeNull();
    expect(matchCommentRule('quero o link', [])).toBeNull();
    expect(matchCommentRule('quero o link', undefined)).toBeNull();
    expect(matchCommentRule('quero o link', [rule({ keywords: ['', '  '] })])).toBeNull();
  });
});
