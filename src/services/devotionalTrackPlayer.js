import TrackPlayer, {
  AppKilledPlaybackBehavior,
  Capability,
} from 'react-native-track-player';

let setupPromise;

export const setupDevotionalTrackPlayer = async () => {
  if (!setupPromise) {
    setupPromise = TrackPlayer.setupPlayer().catch(error => {
      if (!String(error?.message || '').includes('already been initialized')) {
        setupPromise = null;
        throw error;
      }
    });
  }

  await setupPromise;
  await TrackPlayer.updateOptions({
    android: {
      appKilledPlaybackBehavior: AppKilledPlaybackBehavior.ContinuePlayback,
    },
    capabilities: [
      Capability.Play,
      Capability.Pause,
      Capability.Stop,
      Capability.SeekTo,
      Capability.JumpBackward,
      Capability.JumpForward,
    ],
    notificationCapabilities: [
      Capability.Play,
      Capability.Pause,
      Capability.Stop,
      Capability.JumpBackward,
      Capability.JumpForward,
    ],
    compactCapabilities: [Capability.Play, Capability.Pause],
    progressUpdateEventInterval: 1,
    forwardJumpInterval: 15,
    backwardJumpInterval: 15,
  });
};

export const loadDevotionalTrack = async ({id, url, title, artwork}) => {
  await setupDevotionalTrackPlayer();
  await TrackPlayer.load({
    id: id || url,
    url,
    title: title || 'Devotional audio',
    artist: 'Ezra Seminary',
    artwork,
  });
};
