# @4meta5/semantic-matcher

Hybrid keyword + embedding semantic matcher with RRF (Reciprocal Rank Fusion) scoring.

## Installation

```bash
npm install @4meta5/semantic-matcher
```

For embedding support, also install the peer dependency:

```bash
npm install @xenova/transformers
```

## Usage

### Basic matching

```typescript
import { createMatcher } from '@4meta5/semantic-matcher';

const matcher = await createMatcher({
  keywordWeight: 0.3,    // 30% keyword score
  embeddingWeight: 0.7,  // 70% embedding score
});

const candidates = [
  {
    id: 'tdd',
    text: 'Test-driven development workflow',
    keywords: ['tdd', 'test-driven', 'testing']
  },
  {
    id: 'code-review',
    text: 'Code review guidelines',
    keywords: ['review', 'pr', 'pull request']
  }
];

const result = await matcher.match('write tests first', candidates);

console.log(result.matches[0].candidate.id); // 'tdd'
console.log(result.matches[0].score);        // 0.85
console.log(result.matches[0].mode);         // 'immediate' | 'suggestion' | 'none'
```

### With pre-computed embeddings

```typescript
const candidates = [
  {
    id: 'skill-1',
    text: 'Test-driven development',
    embedding: [0.1, 0.2, ...], // 384-dim vector
    keywords: ['tdd']
  }
];

const result = await matcher.match(query, candidates);
```

### Custom thresholds

```typescript
const matcher = await createMatcher({
  immediateThreshold: 0.90,   // Score >= 0.90 → immediate mode
  suggestionThreshold: 0.75,  // Score >= 0.75 → suggestion mode
  maxMatches: 5,              // Return top 5 matches
});
```

### Direct embedding generation

```typescript
const embedding = await matcher.embed('some text');
// Returns 384-dimensional normalized vector
```

## API

### createMatcher(options?)

Creates a matcher instance.

**Options:**
| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `embeddingModel` | string | `'Xenova/all-MiniLM-L6-v2'` | Model for embeddings |
| `keywordWeight` | number | `0.3` | Weight for keyword score (0-1) |
| `embeddingWeight` | number | `0.7` | Weight for embedding score (0-1) |
| `immediateThreshold` | number | `0.85` | Score threshold for immediate mode |
| `suggestionThreshold` | number | `0.70` | Score threshold for suggestion mode |
| `cacheEmbeddings` | boolean | `true` | Cache computed embeddings |
| `maxMatches` | number | `10` | Maximum matches to return |

### Matcher.match(query, candidates)

Match a query against candidates.

**Returns:** `MatchResult`
```typescript
interface MatchResult {
  query: string;
  matches: Match[];
  signals: MatchSignal[];
  processingTimeMs: number;
}

interface Match {
  candidate: Candidate;
  score: number;           // Combined score (0-1)
  keywordScore: number;    // Keyword match score
  embeddingScore: number;  // Embedding similarity
  matchedKeywords: string[];
  mode: 'immediate' | 'suggestion' | 'none';
  confidence: 'high' | 'medium' | 'low';
}
```

### Candidate interface

```typescript
interface Candidate<T = unknown> {
  id: string;              // Unique identifier
  text: string;            // Text for embedding
  keywords?: string[];     // Keywords for fast matching
  embedding?: number[];    // Pre-computed embedding
  metadata?: T;            // Optional metadata
}
```

## Vector Operations

Utility functions for working with embeddings:

```typescript
import {
  cosineSimilarity,
  dotProduct,
  normalize,
  magnitude,
  euclideanDistance,
  manhattanDistance
} from '@4meta5/semantic-matcher';

const similarity = cosineSimilarity(embedding1, embedding2);
```

## Keyword Matching

Standalone keyword matching utilities:

```typescript
import {
  buildKeywordPatterns,
  matchKeywords,
  extractQueryTerms,
  keywordOverlapScore
} from '@4meta5/semantic-matcher';

const patterns = buildKeywordPatterns([
  { id: 'skill-1', keywords: ['test', 'tdd'] }
]);

const matches = matchKeywords('run the tests', patterns);
```

## How It Works

1. **Keyword Matching**: Fast regex-based matching against candidate keywords
2. **Embedding Similarity**: Cosine similarity between query and candidate embeddings
3. **RRF Fusion**: Combines scores with configurable weights (default: 30% keyword, 70% embedding)
4. **Threshold-Based Activation**: Determines mode based on combined score

## Fallback Mode

If `@xenova/transformers` is not installed, the matcher uses a simple hash-based fallback for embeddings. This is suitable for testing but not recommended for production.

## License

MIT
