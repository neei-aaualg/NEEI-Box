import { describe, it, expect } from 'vitest';
import {
  getFileExtension,
  getFileType,
  getFileTypeMeta,
  getFileNameFromWebUrl,
  sanitizeFileName,
  IMAGE_EXTENSIONS,
} from '@/lib/file-types';

describe('getFileExtension', () => {
  it('returns lowercase extension for a simple file name', () => {
    expect(getFileExtension('apontamentos.pdf')).toBe('pdf');
  });

  it('lowercases uppercase extensions', () => {
    expect(getFileExtension('apontamentos.PDF')).toBe('pdf');
    expect(getFileExtension('apontamentos.PdF')).toBe('pdf');
  });

  it('returns only the last extension for multi-part names', () => {
    expect(getFileExtension('archive.tar.gz')).toBe('gz');
    expect(getFileExtension('arquivo.backup.zip')).toBe('zip');
  });

  it('returns empty string when there is no extension', () => {
    expect(getFileExtension('apontamentos')).toBe('');
    expect(getFileExtension('')).toBe('');
  });

  it('returns empty string when the name ends with a dot', () => {
    expect(getFileExtension('file.')).toBe('');
  });

  it('trims surrounding whitespace before matching', () => {
    expect(getFileExtension('  file.txt  ')).toBe('txt');
  });

  it('returns extension for dotfiles', () => {
    expect(getFileExtension('.hidden')).toBe('hidden');
  });

  it('handles dots inside the name', () => {
    expect(getFileExtension('my.presentation.slides.pptx')).toBe('pptx');
  });

  it('does not accept extensions with special characters', () => {
    expect(getFileExtension('file.tar.gzz')).toBe('gzz');
    expect(getFileExtension('nome.png;')).toBe('');
  });
});

describe('getFileType', () => {
  it.each(['apontamentos.pdf', 'slides.PDF'])(
    'classifies %s as pdf',
    (name) => {
      expect(getFileType(name)).toBe('pdf');
    }
  );

  it.each(['doc', 'docx', 'odt', 'tex', 'md', 'txt'])(
    'classifies %s documents as doc',
    (ext) => {
      expect(getFileType(`file.${ext}`)).toBe('doc');
    }
  );

  it.each(['ppt', 'pptx', 'odp', 'key'])(
    'classifies %s presentations as ppt',
    (ext) => {
      expect(getFileType(`file.${ext}`)).toBe('ppt');
    }
  );

  it.each(['xls', 'xlsx', 'ods', 'csv'])(
    'classifies %s spreadsheets as xls',
    (ext) => {
      expect(getFileType(`file.${ext}`)).toBe('xls');
    }
  );

  it.each(['zip', 'rar', '7z', 'tar', 'gz', 'tgz', 'bz2'])(
    'classifies %s archives as archive',
    (ext) => {
      expect(getFileType(`file.${ext}`)).toBe('archive');
    }
  );

  it.each(IMAGE_EXTENSIONS)('classifies %s images as image', (ext) => {
    expect(getFileType(`file.${ext}`)).toBe('image');
  });

  it('classifies jpg/jpeg images as image', () => {
    expect(getFileType('foto.JPG')).toBe('image');
    expect(getFileType('foto.image')).toBe('other');
  });

  it.each(['mp4', 'mov', 'avi', 'mkv', 'webm'])(
    'classifies %s videos as video',
    (ext) => {
      expect(getFileType(`file.${ext}`)).toBe('video');
    }
  );

  it('classifies unknown or missing extensions as other', () => {
    expect(getFileType('executable')).toBe('other');
    expect(getFileType('file.exe')).toBe('other');
    expect(getFileType('file.')).toBe('other');
    expect(getFileType('')).toBe('other');
  });

  it('is case insensitive', () => {
    expect(getFileType('FILE.PDF')).toBe('pdf');
    expect(getFileType('FILE.PPTX')).toBe('ppt');
    expect(getFileType('FILE.PNG')).toBe('image');
  });

  it('Detects docx/pdf from real-world material names', () => {
    expect(getFileType('Exame de Programação I.docx')).toBe('doc');
    expect(getFileType('Resoluções 2023.pdf')).toBe('pdf');
  });
});

describe('getFileTypeMeta', () => {
  it('returns the correct label for each type', () => {
    expect(getFileTypeMeta('pdf').label).toBe('PDF');
    expect(getFileTypeMeta('doc').label).toBe('DOC');
    expect(getFileTypeMeta('ppt').label).toBe('PPT');
    expect(getFileTypeMeta('xls').label).toBe('XLS');
    expect(getFileTypeMeta('archive').label).toBe('ZIP');
    expect(getFileTypeMeta('image').label).toBe('IMG');
    expect(getFileTypeMeta('video').label).toBe('VID');
    expect(getFileTypeMeta('other').label).toBe('FILE');
  });

  it('returns a gradient class for every type', () => {
    const types = [
      'pdf',
      'doc',
      'ppt',
      'xls',
      'archive',
      'image',
      'video',
      'other',
    ] as const;
    for (const type of types) {
      expect(getFileTypeMeta(type).gradient).toMatch(/^from-.+ to-.+$/);
    }
  });

  it('returns consistent metadata for the same type', () => {
    const a = getFileTypeMeta('pdf');
    const b = getFileTypeMeta('pdf');
    expect(a).toEqual(b);
  });
});

describe('getFileNameFromWebUrl', () => {
  it('extracts the file name from a simple URL', () => {
    expect(getFileNameFromWebUrl('https://example.com/file.pdf')).toBe(
      'file.pdf'
    );
  });

  it('strips query strings', () => {
    expect(
      getFileNameFromWebUrl('https://example.com/file.pdf?download=1')
    ).toBe('file.pdf');
  });

  it('extracts the file= query parameter when present', () => {
    expect(
      getFileNameFromWebUrl(
        'https://sharepoint.example/site?file=Apontamentos.pdf&cid=x'
      )
    ).toBe('Apontamentos.pdf');
  });

  it('returns material for Doc.aspx legacy links', () => {
    expect(getFileNameFromWebUrl('https://sharepoint.example/Doc.aspx')).toBe(
      'material'
    );
  });

  it('returns material for an empty Web URL', () => {
    expect(getFileNameFromWebUrl('')).toBe('material');
  });

  it('falls back to the last path segment when no file query is present', () => {
    expect(
      getFileNameFromWebUrl('https://example.com/relatorios/aula2.pdf')
    ).toBe('aula2.pdf');
  });

  it('returns material when there is no usable segment at all', () => {
    expect(getFileNameFromWebUrl('https://example.com/')).toBe('material');
    expect(getFileNameFromWebUrl('https://example.com/?page=1')).toBe(
      'material'
    );
  });

  it('uses the host as the fallback name for a bare domain', () => {
    expect(getFileNameFromWebUrl('https://example.com')).toBe('example.com');
  });

  it('decodes percent-encoded file names', () => {
    expect(getFileNameFromWebUrl('https://example.com/my%20file.pdf')).toBe(
      'my file.pdf'
    );
  });

  it('decodes UTF-8 percent-encoded file names', () => {
    expect(getFileNameFromWebUrl('https://example.com/%E2%82%AC.png')).toBe(
      '€.png'
    );
  });

  it('does NOT throw on malformed percent-encoding', () => {
    expect(() =>
      getFileNameFromWebUrl('https://example.com/100%zz')
    ).not.toThrow();
  });

  it('handles malformed percent-encoding gracefully', () => {
    const result = getFileNameFromWebUrl('https://example.com/100%zz');
    expect(result).toBeTruthy();
    expect(typeof result).toBe('string');
  });

  it('extracts material name from OneDrive-style sharing links', () => {
    const result = getFileNameFromWebUrl('https://1drv.ms/u/s!ABC123');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('handles a URL whose file param is malformed', () => {
    expect(() =>
      getFileNameFromWebUrl('https://example.com/?file=100%zz')
    ).not.toThrow();
  });
});

describe('sanitizeFileName', () => {
  it('keeps a simple clean file name', () => {
    expect(sanitizeFileName('apontamentos.pdf')).toBe('apontamentos.pdf');
  });

  it('replaces spaces with underscores', () => {
    expect(sanitizeFileName('Aula 1 Intro.pdf')).toBe('Aula_1_Intro.pdf');
  });

  it('removes accents from file names', () => {
    expect(sanitizeFileName('Ações Lógica Matemática.pdf')).toBe(
      'Acoes_Logica_Matematica.pdf'
    );
  });

  it('collapses runs of invalid characters into a single underscore', () => {
    expect(sanitizeFileName('file<>:"/\\|?.pdf')).toBe('file_.pdf');
  });

  it('trims leading and trailing underscores', () => {
    expect(sanitizeFileName('_file.pdf_')).toBe('file.pdf');
    expect(sanitizeFileName('____file.pdf')).toBe('file.pdf');
  });

  it('trims surrounding whitespace', () => {
    expect(sanitizeFileName('  file.txt  ')).toBe('file.txt');
  });

  it('returns a fallback name when the result would be empty', () => {
    expect(sanitizeFileName('!!!')).toBe('ficheiro');
    expect(sanitizeFileName('')).toBe('ficheiro');
    expect(sanitizeFileName('   ')).toBe('ficheiro');
  });

  it('returns a fallback name when only dots remain', () => {
    expect(sanitizeFileName('.')).toBe('ficheiro');
    expect(sanitizeFileName('...')).toBe('ficheiro');
    expect(sanitizeFileName('..')).toBe('ficheiro');
  });

  it('truncates long file names while preserving the extension', () => {
    const longName = `${'a'.repeat(100)}.pdf`;
    const result = sanitizeFileName(longName);
    expect(result.length).toBe(80);
    expect(result.endsWith('.pdf')).toBe(true);
    expect(result).toBe(`${'a'.repeat(76)}.pdf`);
  });

  it('keeps names at exactly 80 characters unchanged', () => {
    const exactly80 = `${'b'.repeat(76)}.zip`;
    expect(exactly80.length).toBe(80);
    expect(sanitizeFileName(exactly80)).toBe(exactly80);
  });

  it('truncates long names without an extension to 80 characters', () => {
    const result = sanitizeFileName('c'.repeat(200));
    expect(result).toBe('c'.repeat(80));
  });

  it('truncates long multi-part extensions correctly', () => {
    const long = `${'d'.repeat(100)}.docx`;
    const result = sanitizeFileName(long);
    expect(result.length).toBe(80);
    expect(result.endsWith('.docx')).toBe(true);
  });

  it('preserves dots and dashes in file names', () => {
    expect(sanitizeFileName('apontamentos-col.2023.pdf')).toBe(
      'apontamentos-col.2023.pdf'
    );
  });

  it('handles names that consist of only an extension-like string', () => {
    expect(sanitizeFileName('.hidden')).toBe('.hidden');
  });
});
