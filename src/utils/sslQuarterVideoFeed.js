const RAW_SSL_LESSONS_BASE_URL =
  'https://raw.githubusercontent.com/Adventech/sabbath-school-lessons/stage/src';
const RAW_SSL_LESSONS_ARCHIVE_BASE_URL =
  'https://raw.githubusercontent.com/Adventech/sabbath-school-lessons-2016-2026/stage/src';
const CURRENT_REPO_START_QUARTER = '2026-02';

const cleanYamlValue = value =>
  String(value || '')
    .trim()
    .replace(/^['"]|['"]$/g, '');

export const normalizeQuarterVideoQuarterId = quarterId => {
  const match = String(quarterId || '').match(/\d{4}-\d{2}/);
  return match?.[0] || String(quarterId || '').slice(0, 7);
};

const isArchivedEnglishQuarter = ({language = 'en', quarterId}) =>
  language === 'en' &&
  typeof quarterId === 'string' &&
  quarterId < CURRENT_REPO_START_QUARTER;

export const buildQuarterVideoYamlUrl = ({
  language = 'en',
  quarterId,
  baseUrl,
}) => `${baseUrl}/${language}/${quarterId}/video.yml`;

export const getQuarterVideoYamlUrls = ({language = 'en', quarterId}) => {
  const normalizedQuarterId = normalizeQuarterVideoQuarterId(quarterId);
  const preferredBaseUrl = isArchivedEnglishQuarter({
    language,
    quarterId: normalizedQuarterId,
  })
    ? RAW_SSL_LESSONS_ARCHIVE_BASE_URL
    : RAW_SSL_LESSONS_BASE_URL;
  const fallbackBaseUrl =
    preferredBaseUrl === RAW_SSL_LESSONS_BASE_URL
      ? RAW_SSL_LESSONS_ARCHIVE_BASE_URL
      : RAW_SSL_LESSONS_BASE_URL;

  return [
    buildQuarterVideoYamlUrl({
      language,
      quarterId: normalizedQuarterId,
      baseUrl: preferredBaseUrl,
    }),
    buildQuarterVideoYamlUrl({
      language,
      quarterId: normalizedQuarterId,
      baseUrl: fallbackBaseUrl,
    }),
  ].filter((url, index, urls) => urls.indexOf(url) === index);
};

export const parseQuarterVideoYaml = yamlText => {
  const lines = String(yamlText || '').split(/\r?\n/);
  const artists = [];
  let currentArtist = null;
  let currentClip = null;

  lines.forEach(line => {
    const trimmedLine = line.trim();

    if (!trimmedLine || trimmedLine === '---' || trimmedLine === 'video:') {
      return;
    }

    if (trimmedLine.startsWith('- artist:')) {
      currentArtist = {
        artist: cleanYamlValue(trimmedLine.replace(/^- artist:\s*/, '')),
        clips: [],
      };
      artists.push(currentArtist);
      currentClip = null;
      return;
    }

    if (trimmedLine.startsWith('- src:')) {
      if (!currentArtist) {
        return;
      }

      currentClip = {
        src: cleanYamlValue(trimmedLine.replace(/^- src:\s*/, '')),
        target: '',
        thumbnail: '',
      };
      currentArtist.clips.push(currentClip);
      return;
    }

    if (trimmedLine.startsWith('target:') && currentClip) {
      currentClip.target = cleanYamlValue(
        trimmedLine.replace(/^target:\s*/, ''),
      );
      return;
    }

    if (trimmedLine.startsWith('thumbnail:') && currentClip) {
      currentClip.thumbnail = cleanYamlValue(
        trimmedLine.replace(/^thumbnail:\s*/, ''),
      );
    }
  });

  return artists;
};

export const mapQuarterVideoEntriesForLesson = ({
  yamlText,
  language = 'en',
  quarterId,
  lessonId,
}) => {
  const normalizedLessonId = String(lessonId || '').padStart(2, '0');
  const lessonTarget = `${language}/${quarterId}/${normalizedLessonId}`;

  return parseQuarterVideoYaml(yamlText)
    .flatMap(section =>
      (section.clips || []).map(clip => ({
        id: `${section.artist}-${clip.target}`,
        provider: section.artist,
        image: clip.thumbnail,
        mediaUrl: clip.src,
        playbackType: 'mp4',
        target: clip.target,
      })),
    )
    .filter(entry => entry.target === lessonTarget);
};

export const mapQuarterVideoSections = ({yamlText}) =>
  parseQuarterVideoYaml(yamlText).map(section => ({
    provider: section.artist,
    entries: [...(section.clips || [])].reverse().map((clip, index) => ({
      id: `${section.artist}-${clip.target}-${index}`,
      provider: section.artist,
      image: clip.thumbnail,
      mediaUrl: clip.src,
      playbackType: 'mp4',
      target: clip.target,
    })),
  }));

export const fetchQuarterVideoEntriesForLesson = async ({
  language = 'en',
  quarterId,
  lessonId,
}) => {
  const normalizedQuarterId = normalizeQuarterVideoQuarterId(quarterId);
  const urls = getQuarterVideoYamlUrls({
    language,
    quarterId: normalizedQuarterId,
  });
  let lastStatus = 'unknown';

  for (const url of urls) {
    const response = await fetch(url);
    lastStatus = response.status;

    if (!response.ok) {
      continue;
    }

    const yamlText = await response.text();
    return mapQuarterVideoEntriesForLesson({
      yamlText,
      language,
      quarterId: normalizedQuarterId,
      lessonId,
    });
  }

  throw new Error(`Quarter video feed request failed: ${lastStatus}`);
};

export const fetchQuarterVideoSections = async ({
  language = 'en',
  quarterId,
}) => {
  const normalizedQuarterId = normalizeQuarterVideoQuarterId(quarterId);
  const urls = getQuarterVideoYamlUrls({
    language,
    quarterId: normalizedQuarterId,
  });
  let lastStatus = 'unknown';

  for (const url of urls) {
    const response = await fetch(url);
    lastStatus = response.status;

    if (!response.ok) {
      continue;
    }

    const yamlText = await response.text();
    return mapQuarterVideoSections({yamlText});
  }

  throw new Error(`Quarter video feed request failed: ${lastStatus}`);
};
