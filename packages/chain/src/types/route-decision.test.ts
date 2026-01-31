import { describe, it, expect } from 'vitest';
import {
  ActivationMode,
  ProfileMatch,
  RouteDecision,
  ActivationResult,
} from './route-decision.js';

describe('ActivationMode', () => {
  it('accepts valid modes', () => {
    expect(ActivationMode.parse('immediate')).toBe('immediate');
    expect(ActivationMode.parse('suggestion')).toBe('suggestion');
    expect(ActivationMode.parse('chat')).toBe('chat');
  });

  it('rejects invalid modes', () => {
    expect(() => ActivationMode.parse('invalid')).toThrow();
    expect(() => ActivationMode.parse('')).toThrow();
  });
});

describe('ProfileMatch', () => {
  it('parses valid profile match', () => {
    const match = ProfileMatch.parse({
      name: 'bug-fix',
      score: 0.85,
      matched_patterns: ['fix', 'bug'],
    });

    expect(match.name).toBe('bug-fix');
    expect(match.score).toBe(0.85);
    expect(match.matched_patterns).toEqual(['fix', 'bug']);
  });

  it('uses default empty array for matched_patterns', () => {
    const match = ProfileMatch.parse({
      name: 'test',
      score: 0.5,
    });

    expect(match.matched_patterns).toEqual([]);
  });

  it('requires name and score', () => {
    expect(() => ProfileMatch.parse({})).toThrow();
    expect(() => ProfileMatch.parse({ name: 'test' })).toThrow();
    expect(() => ProfileMatch.parse({ score: 0.5 })).toThrow();
  });
});

describe('RouteDecision', () => {
  const validDecision = {
    request_id: 'req-123',
    query: 'fix the login bug',
    mode: 'immediate',
    candidates: [
      { name: 'bug-fix', score: 0.9, matched_patterns: ['fix', 'bug'] },
    ],
    selected_profile: 'bug-fix',
  };

  it('parses valid route decision', () => {
    const decision = RouteDecision.parse(validDecision);

    expect(decision.request_id).toBe('req-123');
    expect(decision.query).toBe('fix the login bug');
    expect(decision.mode).toBe('immediate');
    expect(decision.candidates).toHaveLength(1);
    expect(decision.selected_profile).toBe('bug-fix');
  });

  it('allows optional fields', () => {
    const minimal = RouteDecision.parse({
      request_id: 'req-456',
      query: 'hello',
      mode: 'chat',
    });

    expect(minimal.session_id).toBeUndefined();
    expect(minimal.candidates).toEqual([]);
    expect(minimal.selected_profile).toBeUndefined();
    expect(minimal.routing_time_ms).toBeUndefined();
    expect(minimal.decided_at).toBeUndefined();
  });

  it('requires request_id, query, and mode', () => {
    expect(() => RouteDecision.parse({})).toThrow();
    expect(() =>
      RouteDecision.parse({ request_id: 'x', query: 'y' })
    ).toThrow();
  });

  it('accepts all optional fields', () => {
    const full = RouteDecision.parse({
      request_id: 'req-789',
      session_id: 'sess-001',
      query: 'implement new feature',
      mode: 'suggestion',
      candidates: [
        { name: 'new-feature', score: 0.75 },
        { name: 'refactor', score: 0.65 },
      ],
      selected_profile: 'new-feature',
      routing_time_ms: 42,
      decided_at: '2026-01-31T12:00:00Z',
    });

    expect(full.session_id).toBe('sess-001');
    expect(full.candidates).toHaveLength(2);
    expect(full.routing_time_ms).toBe(42);
    expect(full.decided_at).toBe('2026-01-31T12:00:00Z');
  });
});

describe('ActivationResult', () => {
  it('parses successful activation', () => {
    const result = ActivationResult.parse({
      activated: true,
      session_id: 'sess-001',
      is_new: true,
      profile_id: 'bug-fix',
      chain: ['tdd', 'doc-maintenance'],
      blocked_intents: { write_impl: 'Write test first' },
    });

    expect(result.activated).toBe(true);
    expect(result.session_id).toBe('sess-001');
    expect(result.is_new).toBe(true);
    expect(result.profile_id).toBe('bug-fix');
    expect(result.chain).toEqual(['tdd', 'doc-maintenance']);
    expect(result.blocked_intents).toEqual({ write_impl: 'Write test first' });
  });

  it('parses failed activation', () => {
    const result = ActivationResult.parse({
      activated: false,
      session_id: '',
      is_new: false,
      error: 'No matching profile found',
    });

    expect(result.activated).toBe(false);
    expect(result.error).toBe('No matching profile found');
  });

  it('parses idempotent return', () => {
    const result = ActivationResult.parse({
      activated: true,
      session_id: 'sess-001',
      is_new: false,
      idempotent: true,
      profile_id: 'bug-fix',
    });

    expect(result.idempotent).toBe(true);
    expect(result.is_new).toBe(false);
  });

  it('uses defaults for optional arrays/records', () => {
    const result = ActivationResult.parse({
      activated: true,
      session_id: 'sess-001',
      is_new: true,
    });

    expect(result.chain).toEqual([]);
    expect(result.blocked_intents).toEqual({});
    expect(result.idempotent).toBe(false);
  });
});
