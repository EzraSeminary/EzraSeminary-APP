import {useCallback, useEffect, useState} from 'react';
import {AppState} from 'react-native';

const useCurrentDate = (refreshIntervalMs = 30000) => {
  const [currentDate, setCurrentDate] = useState(() => new Date());

  const refreshDate = useCallback(() => {
    setCurrentDate(new Date());
  }, []);

  useEffect(() => {
    const intervalId = setInterval(refreshDate, refreshIntervalMs);
    const subscription = AppState.addEventListener('change', appState => {
      if (appState === 'active') {
        refreshDate();
      }
    });

    return () => {
      clearInterval(intervalId);
      subscription.remove();
    };
  }, [refreshDate, refreshIntervalMs]);

  return currentDate;
};

export default useCurrentDate;
