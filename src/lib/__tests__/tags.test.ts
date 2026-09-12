import { describe, it, expect } from 'vitest';
import { parseTags, tagKey, materialHasTag } from '@/lib/tags';

describe('parseTags', () => {
  it.each([null, undefined, ''])('returns [] for empty input %s', (value) => {
    expect(parseTags(value)).toEqual([]);
  });

  it('returns [] for whitespace-only input', () => {
    expect(parseTags('   ')).toEqual([]);
    expect(parseTags('\t\n ')).toEqual([]);
  });

  it('returns a single tag', () => {
    expect(parseTags('apontamentos')).toEqual(['apontamentos']);
  });

  it('splits tags by commas', () => {
    expect(parseTags('apontamentos,exames')).toEqual([
      'apontamentos',
      'exames',
    ]);
  });

  it('splits tags by slashes', () => {
    expect(parseTags('apontamentos/exames/sebentas')).toEqual([
      'apontamentos',
      'exames',
      'sebentas',
    ]);
  });

  it('splits tags by semicolons', () => {
    expect(parseTags('apontamentos;exames')).toEqual([
      'apontamentos',
      'exames',
    ]);
  });

  it('splits on mixed separators', () => {
    expect(parseTags('a,b;c/d')).toEqual(['a', 'b', 'c', 'd']);
  });

  it('handles adjacent separators', () => {
    expect(parseTags('a,,b')).toEqual(['a', 'b']);
    expect(parseTags('a/;b')).toEqual(['a', 'b']);
    expect(parseTags('a;;;b')).toEqual(['a', 'b']);
  });

  it('trims surrounding whitespace from each tag', () => {
    expect(parseTags('  apontamentos  ,  exames ')).toEqual([
      'apontamentos',
      'exames',
    ]);
  });

  it('skips empty parts caused by extra separators', () => {
    expect(parseTags('a,, ,,b')).toEqual(['a', 'b']);
    expect(parseTags(' a, ')).toEqual(['a']);
  });

  it('deduplicates exact duplicates', () => {
    expect(parseTags('exames,exames')).toEqual(['exames']);
  });

  it('deduplicates case-insensitively', () => {
    expect(parseTags('Exames,exames,EXAMES')).toEqual(['Exames']);
  });

  it('deduplicates diacritic-insensitively', () => {
    expect(parseTags('óculos,oculos')).toEqual(['óculos']);
  });

  it('deduplicates case and diacritic insensitive equivalents', () => {
    expect(parseTags('Óculos,oculos,OCULOS')).toEqual(['Óculos']);
  });

  it('keeps the first occurrence when deduplicating', () => {
    expect(parseTags('Primeiro,primeiro')).toEqual(['Primeiro']);
  });

  it('handles multi-word tags with internal spaces', () => {
    expect(parseTags('exame final, revisões')).toEqual([
      'exame final',
      'revisões',
    ]);
  });

  it('combines everything in one realistic description', () => {
    expect(
      parseTags('Lógica Matemática, matematica; Cálculo / calculo')
    ).toEqual(['Lógica Matemática', 'matematica', 'Cálculo']);
  });
});

describe('tagKey', () => {
  it('lowercases the tag', () => {
    expect(tagKey('Exames')).toBe('exames');
  });

  it('removes diacritics', () => {
    expect(tagKey('Óculos')).toBe('oculos');
    expect(tagKey('Matemática')).toBe('matematica');
    expect(tagKey('àçãõéê')).toBe('acaoee');
  });

  it('combines lowercasing and diacritic removal', () => {
    expect(tagKey('LÓGICA')).toBe('logica');
  });
});

describe('materialHasTag', () => {
  it('returns true for a matching tag', () => {
    const material = { description: 'apontamentos, exames' };
    expect(materialHasTag(material, 'exames')).toBe(true);
  });

  it('matches ignoring case differences', () => {
    const material = { description: 'Exames,  Finais' };
    expect(materialHasTag(material, 'exames')).toBe(true);
    expect(materialHasTag(material, 'EXAMES')).toBe(true);
  });

  it('matches a whole tag ignoring case differences', () => {
    const material = { description: 'Exames Finais' };
    expect(materialHasTag(material, 'exames finais')).toBe(true);
  });

  it('matches ignoring diacritics', () => {
    const material = { description: 'Lógica Matemática' };
    expect(materialHasTag(material, 'logica matematica')).toBe(true);
  });

  it('matches a single-tag description ignoring diacritics', () => {
    const material = { description: 'Lógica' };
    expect(materialHasTag(material, 'logica')).toBe(true);
    const material2 = { description: 'matemática, algebra' };
    expect(materialHasTag(material2, 'matematica')).toBe(true);
  });

  it('returns false when there is no match', () => {
    const material = { description: 'apontamentos' };
    expect(materialHasTag(material, 'sebentas')).toBe(false);
  });

  it('returns false for null descriptions', () => {
    const material = { description: null };
    expect(materialHasTag(material, 'qualquer')).toBe(false);
  });

  it('matches a tag that is a substring only when separated', () => {
    const material = { description: 'exames' };
    expect(materialHasTag(material, 'exame')).toBe(false);
    expect(materialHasTag(material, 'exames')).toBe(true);
  });
});
