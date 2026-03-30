import RNFS from 'react-native-fs';

const CACHE_DIR = `${RNFS.CachesDirectoryPath}/image-cache`;

const ensureCacheDir = async () => {
  try {
    const exists = await RNFS.exists(CACHE_DIR);
    if (!exists) {
      await RNFS.mkdir(CACHE_DIR);
    }
  } catch {}
};

const simpleHash = input => {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString();
};

const getExtension = url => {
  const match = url.match(/\.([a-zA-Z0-9]+)(?:\?|#|$)/);
  if (match && match[1]) return `.${match[1].toLowerCase()}`;
  return '.img';
};

export const getOptimizedImageUrl = (
  url,
  {width = 600, height, quality = 80} = {},
) => {
  if (!url) return url;

  if (url.includes('ik.imagekit.io')) {
    const separator = url.includes('?') ? '&' : '?';
    const transforms = [`w-${width}`, `q-${quality}`];
    if (height) {
      transforms.push(`h-${height}`);
    }
    return `${url}${separator}tr=${transforms.join(',')}`;
  }

  return url;
};

export const getCachedImagePath = async url => {
  await ensureCacheDir();
  const filename = `${simpleHash(url)}${getExtension(url)}`;
  const path = `${CACHE_DIR}/${filename}`;
  const exists = await RNFS.exists(path);
  return exists ? `file://${path}` : null;
};

export const ensureImageCached = async url => {
  if (!url) return url;
  try {
    const existing = await getCachedImagePath(url);
    if (existing) return existing;
    await ensureCacheDir();
    const filename = `${simpleHash(url)}${getExtension(url)}`;
    const path = `${CACHE_DIR}/${filename}`;
    await RNFS.downloadFile({fromUrl: url, toFile: path}).promise;
    return `file://${path}`;
  } catch (e) {
    return url;
  }
};

export const prefetchImages = async urls => {
  const unique = Array.from(new Set((urls || []).filter(Boolean)));
  await ensureCacheDir();
  await Promise.all(unique.map(u => ensureImageCached(u).catch(() => {})));
};

import {useEffect, useState} from 'react';
export const useCachedImage = url => {
  const [uri, setUri] = useState(url);
  useEffect(() => {
    let mounted = true;
    ensureImageCached(url)
      .then(local => {
        if (mounted && local) setUri(local);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [url]);
  return uri;
};
