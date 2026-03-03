import AsyncStorage from '@react-native-async-storage/async-storage';

const COURSE_LIST_CACHE_KEY = 'course_list_cache';
const COURSE_CACHE_PREFIX = 'course_cache_';
const CACHE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

const isExpired = cachedAt => {
  if (!cachedAt) return true;
  return Date.now() - new Date(cachedAt).getTime() > CACHE_EXPIRY_MS;
};

const compactCourse = course => {
  if (!course) return course;
  return {
    _id: course._id,
    title: course.title,
    description: course.description,
    image: course.image,
    category: course.category,
    published: course.published,
    chapterCount: course.chapterCount,
    chapters: Array.isArray(course.chapters)
      ? course.chapters.map(chapter => ({
          _id: chapter._id,
          chapter: chapter.chapter,
          description: chapter.description,
          slides: chapter.slides,
        }))
      : [],
  };
};

export const saveCourseListToCache = async courses => {
  try {
    if (!Array.isArray(courses)) return;
    const payload = {
      data: courses.map(compactCourse),
      cachedAt: new Date().toISOString(),
    };
    await AsyncStorage.setItem(COURSE_LIST_CACHE_KEY, JSON.stringify(payload));
  } catch (error) {
    console.error('Error saving course list cache:', error);
  }
};

export const getCachedCourseList = async () => {
  try {
    const raw = await AsyncStorage.getItem(COURSE_LIST_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!parsed?.data || isExpired(parsed.cachedAt)) {
      return [];
    }
    return parsed.data;
  } catch (error) {
    console.error('Error reading course list cache:', error);
    return [];
  }
};

export const saveCourseToCache = async (courseId, course) => {
  try {
    if (!courseId || !course) return;
    const payload = {
      data: compactCourse(course),
      cachedAt: new Date().toISOString(),
    };
    await AsyncStorage.setItem(
      `${COURSE_CACHE_PREFIX}${courseId}`,
      JSON.stringify(payload),
    );
  } catch (error) {
    console.error('Error saving course cache:', error);
  }
};

export const getCachedCourseById = async courseId => {
  try {
    if (!courseId) return null;
    const raw = await AsyncStorage.getItem(`${COURSE_CACHE_PREFIX}${courseId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.data || isExpired(parsed.cachedAt)) {
      return null;
    }
    return parsed.data;
  } catch (error) {
    console.error('Error reading course cache:', error);
    return null;
  }
};
