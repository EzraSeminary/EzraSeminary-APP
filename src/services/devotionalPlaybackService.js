import TrackPlayer, {Event} from 'react-native-track-player';

const devotionalPlaybackService = async () => {
  TrackPlayer.addEventListener(Event.RemotePlay, () => TrackPlayer.play());
  TrackPlayer.addEventListener(Event.RemotePause, () => TrackPlayer.pause());
  TrackPlayer.addEventListener(Event.RemoteStop, () => TrackPlayer.stop());
  TrackPlayer.addEventListener(Event.RemoteSeek, event => {
    TrackPlayer.seekTo(event.position);
  });
  TrackPlayer.addEventListener(Event.RemoteJumpForward, event => {
    TrackPlayer.seekBy(event.interval || 15);
  });
  TrackPlayer.addEventListener(Event.RemoteJumpBackward, event => {
    TrackPlayer.seekBy(-(event.interval || 15));
  });
};

export default devotionalPlaybackService;
