import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const PENDING_COURSE_PROGRESS_KEY = 'pending_course_progress';

const mergeProgressEntry = (progress = [], entry) => {
  const existing = Array.isArray(progress) ? [...progress] : [];
  const index = existing.findIndex(item => item.courseId === entry.courseId);

  if (index >= 0) {
    existing[index] = {
      ...existing[index],
      currentChapter: entry.currentChapter,
      currentSlide: entry.currentSlide,
    };
    return existing;
  }

  return [
    ...existing,
    {
      courseId: entry.courseId,
      currentChapter: entry.currentChapter,
      currentSlide: entry.currentSlide,
    },
  ];
};

const readPendingProgressMap = async () => {
  try {
    const raw = await AsyncStorage.getItem(PENDING_COURSE_PROGRESS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (error) {
    console.error('Error reading pending course progress:', error);
    return {};
  }
};

const writePendingProgressMap = async map => {
  try {
    await AsyncStorage.setItem(PENDING_COURSE_PROGRESS_KEY, JSON.stringify(map));
  } catch (error) {
    console.error('Error writing pending course progress:', error);
  }
};

export const persistProgressToUserCache = async progressEntry => {
  try {
    const rawUser = await AsyncStorage.getItem('user');
    if (!rawUser) {
      return null;
    }

    const parsedUser = JSON.parse(rawUser);
    const nextUser = {
      ...parsedUser,
      progress: mergeProgressEntry(parsedUser?.progress, progressEntry),
    };

    await AsyncStorage.setItem('user', JSON.stringify(nextUser));
    return nextUser;
  } catch (error) {
    console.error('Error persisting user progress cache:', error);
    return null;
  }
};

export const queuePendingCourseProgress = async progressEntry => {
  const pendingMap = await readPendingProgressMap();
  pendingMap[progressEntry.courseId] = {
    ...progressEntry,
    updatedAt: new Date().toISOString(),
  };
  await writePendingProgressMap(pendingMap);
};

export const saveProgressForLaterSync = async progressEntry => {
  await persistProgressToUserCache(progressEntry);
  await queuePendingCourseProgress(progressEntry);
};

export const getPendingCourseProgress = async courseId => {
  const pendingMap = await readPendingProgressMap();
  if (courseId) {
    return pendingMap[courseId] || null;
  }
  return pendingMap;
};

export const clearPendingCourseProgress = async courseId => {
  const pendingMap = await readPendingProgressMap();
  if (!pendingMap[courseId]) {
    return;
  }
  delete pendingMap[courseId];
  await writePendingProgressMap(pendingMap);
};

export const syncPendingCourseProgressForCourse = async ({
  courseId,
  userId,
  token,
}) => {
  try {
    if (!courseId || !userId || !token) {
      return {synced: false};
    }

    const pending = await getPendingCourseProgress(courseId);
    if (!pending) {
      return {synced: false};
    }

    const rawUser = await AsyncStorage.getItem('user');
    const parsedUser = rawUser ? JSON.parse(rawUser) : null;
    if (!parsedUser) {
      return {synced: false};
    }

    const nextUser = {
      ...parsedUser,
      progress: mergeProgressEntry(parsedUser?.progress, pending),
    };

    await axios.put(
      `https://ezrabackend.online/users/profile/${userId}`,
      {
        userId,
        progress: nextUser.progress,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      },
    );

    await AsyncStorage.setItem('user', JSON.stringify(nextUser));
    await clearPendingCourseProgress(courseId);

    return {synced: true, user: nextUser};
  } catch (error) {
    console.error('Error syncing pending course progress:', error);
    return {synced: false};
  }
};

