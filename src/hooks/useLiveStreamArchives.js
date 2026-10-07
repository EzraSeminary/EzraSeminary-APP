import {useCallback, useEffect, useState} from 'react';
import {useFocusEffect} from '@react-navigation/native';
import {syncLiveStreamArchives} from '../utils/liveStreamArchives';

const useLiveStreamArchives = liveStream => {
  const [archives, setArchives] = useState([]);
  const [isLoadingArchives, setIsLoadingArchives] = useState(true);

  const refreshArchives = useCallback(async () => {
    const nextArchives = await syncLiveStreamArchives(liveStream);
    setArchives(nextArchives);
    setIsLoadingArchives(false);
    return nextArchives;
  }, [liveStream]);

  useEffect(() => {
    let isMounted = true;

    const syncArchives = async () => {
      setIsLoadingArchives(true);
      const nextArchives = await syncLiveStreamArchives(liveStream);
      if (isMounted) {
        setArchives(nextArchives);
        setIsLoadingArchives(false);
      }
    };

    syncArchives();

    return () => {
      isMounted = false;
    };
  }, [liveStream]);

  useFocusEffect(
    useCallback(() => {
      refreshArchives();
    }, [refreshArchives]),
  );

  return {archives, isLoadingArchives, refreshArchives};
};

export default useLiveStreamArchives;
