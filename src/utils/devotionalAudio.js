export const getDevotionalAudioUrl = devotion => {
  if (!devotion) {
    return '';
  }

  return (
    devotion.audioUrl ||
    devotion.audioURL ||
    devotion.audio ||
    devotion.audioFile ||
    devotion.audioFileUrl ||
    devotion.audio_url ||
    devotion.media?.audioUrl ||
    ''
  );
};
