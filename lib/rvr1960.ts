const BIBLE_SOURCE_PATH = "/bibles/rvr1960.json";

type BibleRawBook = {
  abbrev: string;
  name: string;
  chapters: string[][];
};

export type VerseRange = { start: number; end: number };

export type NormalizedPassage = {
  bookAbbrev: string;
  bookLabel: string;
  chapter: number;
  verses: VerseRange[] | null;
};

type BibleBook = BibleRawBook & {
  label: string;
};

let bibleDataPromise: Promise<Map<string, BibleBook>> | null = null;

const removeAccents = (value: string): string =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const normalizeAlias = (value: string): string =>
  removeAccents(value).replace(/[^a-z0-9]/g, "");

type BookDefinition = {
  abbrev: string;
  label: string;
  aliases: string[];
};

const BOOK_DEFINITIONS: BookDefinition[] = [
  { abbrev: "gn", label: "Génesis", aliases: ["genesis", "gn", "ge", "gen", "genes"] },
  { abbrev: "ex", label: "Éxodo", aliases: ["exodo", "exo", "ex"] },
  { abbrev: "lv", label: "Levítico", aliases: ["levitico", "lev", "lv"] },
  { abbrev: "nm", label: "Números", aliases: ["numeros", "num", "nm", "nums"] },
  { abbrev: "dt", label: "Deuteronomio", aliases: ["deuteronomio", "deuter", "deut", "dt", "deu"] },
  { abbrev: "js", label: "Josué", aliases: ["josue", "jos", "js"] },
  { abbrev: "jud", label: "Jueces", aliases: ["jueces", "jue", "jdg", "ju"] },
  { abbrev: "rt", label: "Rut", aliases: ["rut", "rt"] },
  { abbrev: "1sm", label: "1 Samuel", aliases: ["1samuel", "1sam", "1sa", "1s", "primerasamuel", "primeradesamuel"] },
  { abbrev: "2sm", label: "2 Samuel", aliases: ["2samuel", "2sam", "2sa", "2s", "segundasamuel", "segundadesamuel"] },
  { abbrev: "1kgs", label: "1 Reyes", aliases: ["1reyes", "1rey", "1re", "primerosreyes", "primeradesreyes"] },
  { abbrev: "2kgs", label: "2 Reyes", aliases: ["2reyes", "2rey", "2re", "segundosreyes", "segundadesreyes"] },
  { abbrev: "1ch", label: "1 Crónicas", aliases: ["1cronicas", "1cr", "1cro", "primerascronicas", "primeradecronicas"] },
  { abbrev: "2ch", label: "2 Crónicas", aliases: ["2cronicas", "2cr", "2cro", "segundascronicas", "segundadecronicas"] },
  { abbrev: "ezr", label: "Esdras", aliases: ["esdras", "ezr", "esd"] },
  { abbrev: "ne", label: "Nehemías", aliases: ["nehemias", "nehem", "ne"] },
  { abbrev: "et", label: "Ester", aliases: ["ester", "est", "et"] },
  { abbrev: "job", label: "Job", aliases: ["job", "jb"] },
  { abbrev: "ps", label: "Salmos", aliases: ["salmos", "salmo", "sal", "psalmos", "psalmo", "ps"] },
  { abbrev: "prv", label: "Proverbios", aliases: ["proverbios", "proverbio", "prov", "prv", "pr"] },
  { abbrev: "ec", label: "Eclesiastés", aliases: ["eclesiastes", "ecles", "ec", "qohelet"] },
  {
    abbrev: "so",
    label: "Cantares",
    aliases: ["cantares", "cantardeloscantares", "cantardelos", "cantico", "cantar", "cnt", "songofsongs"],
  },
  { abbrev: "is", label: "Isaías", aliases: ["isaias", "isa", "is"] },
  { abbrev: "jr", label: "Jeremías", aliases: ["jeremias", "jer", "jr"] },
  { abbrev: "lm", label: "Lamentaciones", aliases: ["lamentaciones", "lamentacion", "lam", "lm"] },
  { abbrev: "ez", label: "Ezequiel", aliases: ["ezequiel", "eze", "ez"] },
  { abbrev: "dn", label: "Daniel", aliases: ["daniel", "dan", "dn"] },
  { abbrev: "ho", label: "Oseas", aliases: ["oseas", "ose", "os", "ho"] },
  { abbrev: "jl", label: "Joel", aliases: ["joel", "jl"] },
  { abbrev: "am", label: "Amós", aliases: ["amos", "amo", "am"] },
  { abbrev: "ob", label: "Abdías", aliases: ["abdias", "abdi", "obadias", "ob"] },
  { abbrev: "jn", label: "Jonás", aliases: ["jonas", "jona", "jon"] },
  { abbrev: "mi", label: "Miqueas", aliases: ["miqueas", "miq", "mi"] },
  { abbrev: "na", label: "Nahúm", aliases: ["nahum", "nah", "na"] },
  { abbrev: "hk", label: "Habacuc", aliases: ["habacuc", "hab", "hk"] },
  { abbrev: "zp", label: "Sofonías", aliases: ["sofonias", "sofonia", "sofo", "zp"] },
  { abbrev: "hg", label: "Hageo", aliases: ["hageo", "hag", "hg"] },
  { abbrev: "zc", label: "Zacarías", aliases: ["zacarias", "zacar", "zac", "zc"] },
  { abbrev: "ml", label: "Malaquías", aliases: ["malaquias", "mal", "ml"] },
  { abbrev: "mt", label: "Mateo", aliases: ["mateo", "mat", "mt"] },
  { abbrev: "mk", label: "Marcos", aliases: ["marcos", "mar", "mr", "mk"] },
  { abbrev: "lk", label: "Lucas", aliases: ["lucas", "luc", "lc", "lk"] },
  { abbrev: "jo", label: "Juan", aliases: ["juan", "jn", "joh", "john", "sanjuan", "jo"] },
  { abbrev: "act", label: "Hechos", aliases: ["hechos", "hech", "hch", "acts", "act", "ac"] },
  { abbrev: "rm", label: "Romanos", aliases: ["romanos", "rom", "rm", "ro"] },
  { abbrev: "1co", label: "1 Corintios", aliases: ["1corintios", "1cor", "1co", "primeroscorintios", "primeradecorintios"] },
  { abbrev: "2co", label: "2 Corintios", aliases: ["2corintios", "2cor", "2co", "segundoscorintios", "segundadecorintios"] },
  { abbrev: "gl", label: "Gálatas", aliases: ["galatas", "gal", "gl"] },
  { abbrev: "eph", label: "Efesios", aliases: ["efesios", "ef", "eph"] },
  { abbrev: "ph", label: "Filipenses", aliases: ["filipenses", "flp", "phi", "ph"] },
  { abbrev: "cl", label: "Colosenses", aliases: ["colosenses", "col", "cl"] },
  { abbrev: "1ts", label: "1 Tesalonicenses", aliases: ["1tesalonicenses", "1tes", "1ts", "primerastesalonicenses", "primeradetesalonicenses"] },
  { abbrev: "2ts", label: "2 Tesalonicenses", aliases: ["2tesalonicenses", "2tes", "2ts", "segundastesalonicenses", "segundadetesalonicenses"] },
  { abbrev: "1tm", label: "1 Timoteo", aliases: ["1timoteo", "1tim", "1ti", "primeratimoteo", "primeradetimoteo"] },
  { abbrev: "2tm", label: "2 Timoteo", aliases: ["2timoteo", "2tim", "2ti", "segundatimoteo", "segundadetimoteo"] },
  { abbrev: "tt", label: "Tito", aliases: ["tito", "tit", "tt"] },
  { abbrev: "phm", label: "Filemón", aliases: ["filemon", "flm", "phm"] },
  { abbrev: "hb", label: "Hebreos", aliases: ["hebreos", "heb", "hb"] },
  { abbrev: "jm", label: "Santiago", aliases: ["santiago", "stg", "stiago", "jm", "jacobo", "jac"] },
  { abbrev: "1pe", label: "1 Pedro", aliases: ["1pedro", "1pe", "1pd", "primerapedro", "primeradepedro"] },
  { abbrev: "2pe", label: "2 Pedro", aliases: ["2pedro", "2pe", "2pd", "segundapedro", "segundadepedro"] },
  { abbrev: "1jo", label: "1 Juan", aliases: ["1juan", "1jn", "primerajuan", "primeradejuan", "1jo"] },
  { abbrev: "2jo", label: "2 Juan", aliases: ["2juan", "2jn", "segundajuan", "segundadejuan", "2jo"] },
  { abbrev: "3jo", label: "3 Juan", aliases: ["3juan", "3jn", "tercerajuan", "terceradejuan", "3jo"] },
  { abbrev: "jd", label: "Judas", aliases: ["judas", "jud", "jd"] },
  { abbrev: "re", label: "Apocalipsis", aliases: ["apocalipsis", "apoc", "ap", "revelacion", "revelaciones", "re"] },
];

const BOOK_ALIAS_MAP: Map<string, { abbrev: string; label: string }> = new Map();
const BOOK_LABELS: Map<string, string> = new Map();

for (const book of BOOK_DEFINITIONS) {
  BOOK_LABELS.set(book.abbrev, book.label);
  for (const alias of book.aliases) {
    const normalized = normalizeAlias(alias);
    if (!BOOK_ALIAS_MAP.has(normalized)) {
      BOOK_ALIAS_MAP.set(normalized, { abbrev: book.abbrev, label: book.label });
    }
  }
}

const normalizeRomanPrefixes = (value: string): string =>
  value.replace(/^([i]{1,3})\b/gi, match => {
    const lower = match.toLowerCase();
    if (lower === "iii") return "3";
    if (lower === "ii") return "2";
    return "1";
  });

const splitSegments = (input: string): string[] =>
  input
    .split(/[\n;]+/)
    .map(item => item.trim())
    .filter(Boolean);

const resolveBook = (rawBook: string): { abbrev: string; label: string } | null => {
  const normalized = normalizeAlias(normalizeRomanPrefixes(rawBook));
  return BOOK_ALIAS_MAP.get(normalized) ?? null;
};

const parseVerses = (part: string): VerseRange[] => {
  const clean = part.replace(/\s+/g, "");
  if (!clean) return [];

  return clean.split(",").map(segment => {
    const [startStr, endStr] = segment.split(/[-–]/, 2);
    const start = Number.parseInt(startStr, 10);
    if (Number.isNaN(start)) {
      throw new Error(`No se reconoce el versículo “${segment}”.`);
    }
    const end = endStr ? Number.parseInt(endStr, 10) : start;
    return { start, end: Number.isNaN(end) ? start : end };
  });
};

const parseSegment = (segment: string): NormalizedPassage[] => {
  const normalizedRoman = normalizeRomanPrefixes(segment.trim());
  const match = normalizedRoman.match(
    /^((?:[1-3])?\s*(?:[a-záéíóúüñ]+\.?\s*)+?)(\d+(?:\s*[-–]\s*\d+)?(?::[\d,\s\-–]+)?)$/i,
  );

  if (!match) {
    throw new Error(`No se reconoce el formato de “${segment.trim()}”.`);
  }

  const rawBook = match[1].trim();
  const book = resolveBook(rawBook);

  if (!book) {
    throw new Error(`No se reconoce el libro bíblico “${rawBook}”.`);
  }

  const referencePart = match[2].trim();
  const chapterAndVerses = referencePart.split(":");
  const chapterRangePart = chapterAndVerses[0];
  const [chapterStartStr, chapterEndStr] = chapterRangePart
    .split(/[-–]/)
    .map(value => value.trim())
    .filter(Boolean);

  const chapterStart = Number.parseInt(chapterStartStr, 10);
  const chapterEnd = chapterEndStr ? Number.parseInt(chapterEndStr, 10) : chapterStart;

  if (Number.isNaN(chapterStart) || Number.isNaN(chapterEnd)) {
    throw new Error(`No se reconoce el capítulo en “${segment.trim()}”.`);
  }

  const versePart = chapterAndVerses[1];
  const verses = versePart ? parseVerses(versePart) : null;

  const passages: NormalizedPassage[] = [];
  for (let chapter = chapterStart; chapter <= chapterEnd; chapter += 1) {
    passages.push({
      bookAbbrev: book.abbrev,
      bookLabel: book.label,
      chapter,
      verses,
    });
  }

  return passages;
};

export const parseReference = (input: string): NormalizedPassage[] => {
  const segments = splitSegments(input);
  if (segments.length === 0) {
    throw new Error("Ingresa al menos una cita bíblica.");
  }

  const passages: NormalizedPassage[] = [];
  for (const segment of segments) {
    passages.push(...parseSegment(segment));
  }
  return passages;
};

const loadBibleData = async (): Promise<Map<string, BibleBook>> => {
  if (!bibleDataPromise) {
    bibleDataPromise = fetch(BIBLE_SOURCE_PATH)
      .then(async response => {
        if (!response.ok) throw new Error("No se pudo leer la Biblia local.");
        const rawText = await response.text();
        const cleaned = rawText.replace(/^\uFEFF/, "");
        const parsed = JSON.parse(cleaned) as BibleRawBook[];
        const map = new Map<string, BibleBook>();

        for (const book of parsed) {
          const label = BOOK_LABELS.get(book.abbrev) ?? book.name;
          map.set(book.abbrev, { ...book, label });
        }

        return map;
      })
      .catch(error => {
        bibleDataPromise = null;
        throw error;
      });
  }

  return bibleDataPromise;
};

const formatPassages = (passages: NormalizedPassage[], bibleBooks: Map<string, BibleBook>): string => {
  const lines: string[] = [];

  for (const passage of passages) {
    const book = bibleBooks.get(passage.bookAbbrev);
    if (!book) {
      throw new Error(`El libro ${passage.bookLabel} no está disponible en la Biblia local.`);
    }

    const chapterIndex = passage.chapter - 1;
    const chapter = book.chapters[chapterIndex];
    if (!chapter) {
      throw new Error(`El capítulo ${passage.chapter} no existe en ${passage.bookLabel}.`);
    }

    if (!passage.verses || passage.verses.length === 0) {
      chapter.forEach((verseText, index) => {
        lines.push(`${passage.bookLabel} ${passage.chapter}:${index + 1} ${verseText}`);
      });
      continue;
    }

    for (const range of passage.verses) {
      for (let verse = range.start; verse <= range.end; verse += 1) {
        const verseText = chapter[verse - 1];
        if (!verseText) {
          throw new Error(`El versículo ${passage.bookLabel} ${passage.chapter}:${verse} no existe.`);
        }
        lines.push(`${passage.bookLabel} ${passage.chapter}:${verse} ${verseText}`);
      }
    }
  }

  return lines.join("\n");
};

export const getLocalBiblePassage = async (
  reference: string,
): Promise<{ ok: true; content: string } | { ok: false; error: string }> => {
  try {
    const passages = parseReference(reference);
    const bibleBooks = await loadBibleData();
    const content = formatPassages(passages, bibleBooks);
    return { ok: true, content };
  } catch (error) {
    if (error instanceof Error) {
      return { ok: false, error: error.message };
    }
    return { ok: false, error: "No se pudo procesar la referencia solicitada." };
  }
};

export type BibleBookSummary = {
  abbrev: string;
  label: string;
  chapters: number;
};

export const getBibleBooksMetadata = async (): Promise<BibleBookSummary[]> => {
  const bibleBooks = await loadBibleData();
  return Array.from(bibleBooks.values()).map(book => ({
    abbrev: book.abbrev,
    label: book.label,
    chapters: book.chapters.length,
  }));
};

export const getBibleChapterContent = async (
  bookAbbrev: string,
  chapter: number,
): Promise<{ bookAbbrev: string; bookLabel: string; chapter: number; totalChapters: number; verses: string[] }> => {
  const bibleBooks = await loadBibleData();
  const book = bibleBooks.get(bookAbbrev);
  if (!book) {
    throw new Error(`El libro solicitado no está disponible en la Biblia local.`);
  }

  const chapterIndex = chapter - 1;
  if (chapterIndex < 0 || chapterIndex >= book.chapters.length) {
    throw new Error(`El capítulo ${chapter} no existe en ${book.label}.`);
  }

  const verses = book.chapters[chapterIndex];
  return {
    bookAbbrev,
    bookLabel: book.label,
    chapter,
    totalChapters: book.chapters.length,
    verses,
  };
};
