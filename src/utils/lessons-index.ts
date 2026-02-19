// Build a lessons index from lesson TSV files in public/lessons.

type FileGlob = Record<string, unknown>;

const globbed: FileGlob = import.meta.glob('../../public/lessons/*.tsv', { eager: true, query: '?url', import: 'default' });

export type ThemeSlug = string;
export type TopicSlug = string;

export const THEME_TOPIC_MAP: Record<ThemeSlug, TopicSlug[]> = {};
export const FILE_MAP: Record<ThemeSlug, Record<TopicSlug, string>> = {};

function parseThemeTopicFromPath(path: string): { theme: ThemeSlug; topic: TopicSlug; filename: string } | null {
  const noQuery = path.split('?')[0];
  const match = noQuery.match(/([^/]+)\.tsv$/);
  if (!match) return null;
  const filename = match[1]; // e.g., 'why-love'
  const parts = filename.split('-');
  if (parts.length < 2) return null; // need at least theme-topic
  const topic = parts.pop() as string;
  const theme = parts.join('-');
  return { theme, topic, filename: `${filename}.tsv` };
}

Object.keys(globbed).forEach((p) => {
  const parsed = parseThemeTopicFromPath(p);
  if (!parsed) return;
  const { theme, topic, filename } = parsed;
  if (!THEME_TOPIC_MAP[theme]) THEME_TOPIC_MAP[theme] = [];
  if (!FILE_MAP[theme]) FILE_MAP[theme] = {};
  if (!THEME_TOPIC_MAP[theme].includes(topic)) THEME_TOPIC_MAP[theme].push(topic);
  FILE_MAP[theme][topic] = `lessons/${filename}`; // path relative to extension root for browser.runtime.getURL
});

export const THEMES: ThemeSlug[] = Object.keys(THEME_TOPIC_MAP);

export function getLessonFile(theme: ThemeSlug, topic: TopicSlug): string | null {
  return FILE_MAP[theme]?.[topic] ?? null;
}
