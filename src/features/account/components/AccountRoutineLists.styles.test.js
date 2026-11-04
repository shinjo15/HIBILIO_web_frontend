import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(resolve(globalThis.process.cwd(), 'src/features/account/components/AccountRoutineLists.tsx'), 'utf8');

describe('AccountRoutineLists styles', () => {
  it('共通RoutineCardの構造とTypographyスタイルを両方読み込む', () => {
    expect(source).toContain("import '../../routineFeed/routineFeed.css';");
    expect(source).toContain("import '../../routineFeed/routineFeedTypography.css';");
  });
});
