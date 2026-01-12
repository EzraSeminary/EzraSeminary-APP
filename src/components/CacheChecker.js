import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import {
  X,
  TrashSimple,
  ArrowClockwise,
} from 'phosphor-react-native';
import tw from './../../tailwind';
import {
  getDevotionCache,
  getCacheStats,
  clearDevotionCache,
  cleanExpiredCache,
} from '../utils/devotionCache';
import {
  getSSLCache,
  getSSLCacheStats,
  clearSSLCache,
  cleanExpiredSSLCache,
} from '../utils/sslCache';
import {
  getHomeScreenCache,
  getHomeScreenCacheStats,
  clearHomeScreenCache,
  cleanExpiredHomeScreenCache,
} from '../utils/homeScreenCache';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CacheChecker = ({visible, onClose, darkMode}) => {
  const [cacheStats, setCacheStats] = useState(null);
  const [cachedDevotions, setCachedDevotions] = useState([]);
  const [sslCacheStats, setSslCacheStats] = useState(null);
  const [cachedSSLLessons, setCachedSSLLessons] = useState([]);
  const [homeScreenCacheStats, setHomeScreenCacheStats] = useState(null);
  const [homeCacheStats, setHomeCacheStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadCacheData = async () => {
    setLoading(true);
    try {
      // Get devotion cache stats
      const stats = await getCacheStats();
      setCacheStats(stats);

      // Get all cached devotions
      const cache = await getDevotionCache();
      const devotions = Object.values(cache || {});
      setCachedDevotions(devotions);

      // Get SSL cache stats
      const sslStats = await getSSLCacheStats();
      setSslCacheStats(sslStats);

      // Get all cached SSL lessons
      const sslCache = await getSSLCache();
      const sslLessons = Object.values(sslCache || {});
      setCachedSSLLessons(sslLessons);

      // Get home screen cache stats
      const homeScreenStats = await getHomeScreenCacheStats();
      setHomeScreenCacheStats(homeScreenStats);

      // Get home cache stats
      const homeCacheString = await AsyncStorage.getItem('home_data_cache');
      if (homeCacheString) {
        const homeCache = JSON.parse(homeCacheString);
        const homeDevotions = homeCache.devotions || [];
        const homeCacheSize = new Blob([homeCacheString]).size;
        setHomeCacheStats({
          devotionsCount: homeDevotions.length,
          coursesCount: (homeCache.courses || []).length,
          lastCacheTime: homeCache.lastCacheTime,
          size: (homeCacheSize / 1024).toFixed(2) + ' KB',
        });
      } else {
        setHomeCacheStats(null);
      }
    } catch (error) {
      console.error('Error loading cache data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      loadCacheData();
    }
  }, [visible]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadCacheData();
    setRefreshing(false);
  };

  const handleClearCache = async () => {
    try {
      await clearDevotionCache();
      await clearSSLCache();
      await clearHomeScreenCache();
      await loadCacheData();
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  };

  const handleCleanExpired = async () => {
    try {
      const cleanedDevotions = await cleanExpiredCache();
      const cleanedSSL = await cleanExpiredSSLCache();
      const cleanedHomeScreens = await cleanExpiredHomeScreenCache();
      await loadCacheData();
    } catch (error) {
      console.error('Error cleaning expired cache:', error);
    }
  };

  if (!visible) {
    return null;
  }

  return (
    <View
      style={[
        StyleSheet.absoluteFill,
        {
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 1000,
        },
      ]}>
      <View
        style={[
          tw`flex-1 m-4 rounded-4`,
          {
            backgroundColor: darkMode ? '#1F2937' : '#FFFFFF',
            marginTop: 60,
          },
        ]}>
        {/* Header */}
        <View
          style={[
            tw`flex-row items-center justify-between p-4 border-b`,
            darkMode ? tw`border-secondary-7` : tw`border-primary-4`,
          ]}>
          <Text
            style={[
              tw`font-nokia-bold text-2xl`,
              darkMode ? tw`text-primary-1` : tw`text-secondary-8`,
            ]}>
            Cache Status
          </Text>
          <TouchableOpacity onPress={onClose}>
            <X size={24} color={darkMode ? '#FFFFFF' : '#000000'} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={tw`flex-1 justify-center items-center`}>
            <ActivityIndicator size="large" color="#EA9215" />
            <Text
              style={[
                tw`font-nokia-bold text-lg mt-4`,
                darkMode ? tw`text-primary-3` : tw`text-secondary-6`,
              ]}>
              Loading cache data...
            </Text>
          </View>
        ) : (
          <ScrollView style={tw`flex-1`} showsVerticalScrollIndicator={false}>
            <View style={tw`p-4`}>
              {/* Devotion Cache Stats */}
              <View
                style={[
                  tw`p-4 rounded-4 mb-4`,
                  darkMode ? tw`bg-secondary-8` : tw`bg-primary-5`,
                ]}>
                <Text
                  style={[
                    tw`font-nokia-bold text-xl mb-3`,
                    darkMode ? tw`text-primary-1` : tw`text-secondary-8`,
                  ]}>
                  Individual Devotion Cache
                </Text>
                <View style={tw`gap-2`}>
                  <View style={tw`flex-row justify-between`}>
                    <Text
                      style={[
                        tw`font-nokia-bold`,
                        darkMode ? tw`text-primary-3` : tw`text-secondary-6`,
                      ]}>
                      Cached Devotions:
                    </Text>
                    <Text
                      style={[
                        tw`font-nokia-bold`,
                        darkMode ? tw`text-primary-1` : tw`text-secondary-8`,
                      ]}>
                      {cacheStats?.count || 0}
                    </Text>
                  </View>
                  <View style={tw`flex-row justify-between`}>
                    <Text
                      style={[
                        tw`font-nokia-bold`,
                        darkMode ? tw`text-primary-3` : tw`text-secondary-6`,
                      ]}>
                      Cache Size:
                    </Text>
                    <Text
                      style={[
                        tw`font-nokia-bold`,
                        darkMode ? tw`text-primary-1` : tw`text-secondary-8`,
                      ]}>
                      {cacheStats?.sizeFormatted || '0 KB'}
                    </Text>
                  </View>
                  {cacheStats?.oldest && (
                    <View style={tw`flex-row justify-between`}>
                      <Text
                        style={[
                          tw`font-nokia-bold`,
                          darkMode ? tw`text-primary-3` : tw`text-secondary-6`,
                        ]}>
                        Oldest Cache:
                      </Text>
                      <Text
                        style={[
                          tw`font-nokia-bold text-xs`,
                          darkMode ? tw`text-primary-3` : tw`text-secondary-6`,
                        ]}>
                        {new Date(cacheStats.oldest).toLocaleDateString()}
                      </Text>
                    </View>
                  )}
                  {cacheStats?.newest && (
                    <View style={tw`flex-row justify-between`}>
                      <Text
                        style={[
                          tw`font-nokia-bold`,
                          darkMode ? tw`text-primary-3` : tw`text-secondary-6`,
                        ]}>
                        Newest Cache:
                      </Text>
                      <Text
                        style={[
                          tw`font-nokia-bold text-xs`,
                          darkMode ? tw`text-primary-3` : tw`text-secondary-6`,
                        ]}>
                        {new Date(cacheStats.newest).toLocaleDateString()}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Home Cache Stats */}
              {homeCacheStats && (
                <View
                  style={[
                    tw`p-4 rounded-4 mb-4`,
                    darkMode ? tw`bg-secondary-8` : tw`bg-primary-5`,
                  ]}>
                  <Text
                    style={[
                      tw`font-nokia-bold text-xl mb-3`,
                      darkMode ? tw`text-primary-1` : tw`text-secondary-8`,
                    ]}>
                    Home Data Cache
                  </Text>
                  <View style={tw`gap-2`}>
                    <View style={tw`flex-row justify-between`}>
                      <Text
                        style={[
                          tw`font-nokia-bold`,
                          darkMode ? tw`text-primary-3` : tw`text-secondary-6`,
                        ]}>
                        Devotions:
                      </Text>
                      <Text
                        style={[
                          tw`font-nokia-bold`,
                          darkMode ? tw`text-primary-1` : tw`text-secondary-8`,
                        ]}>
                        {homeCacheStats.devotionsCount}
                      </Text>
                    </View>
                    <View style={tw`flex-row justify-between`}>
                      <Text
                        style={[
                          tw`font-nokia-bold`,
                          darkMode ? tw`text-primary-3` : tw`text-secondary-6`,
                        ]}>
                        Courses:
                      </Text>
                      <Text
                        style={[
                          tw`font-nokia-bold`,
                          darkMode ? tw`text-primary-1` : tw`text-secondary-8`,
                        ]}>
                        {homeCacheStats.coursesCount}
                      </Text>
                    </View>
                    <View style={tw`flex-row justify-between`}>
                      <Text
                        style={[
                          tw`font-nokia-bold`,
                          darkMode ? tw`text-primary-3` : tw`text-secondary-6`,
                        ]}>
                        Size:
                      </Text>
                      <Text
                        style={[
                          tw`font-nokia-bold`,
                          darkMode ? tw`text-primary-1` : tw`text-secondary-8`,
                        ]}>
                        {homeCacheStats.size}
                      </Text>
                    </View>
                    {homeCacheStats.lastCacheTime && (
                      <View style={tw`flex-row justify-between`}>
                        <Text
                          style={[
                            tw`font-nokia-bold`,
                            darkMode
                              ? tw`text-primary-3`
                              : tw`text-secondary-6`,
                          ]}>
                          Last Updated:
                        </Text>
                        <Text
                          style={[
                            tw`font-nokia-bold text-xs`,
                            darkMode
                              ? tw`text-primary-3`
                              : tw`text-secondary-6`,
                          ]}>
                          {new Date(
                            homeCacheStats.lastCacheTime,
                          ).toLocaleString()}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              )}

              {/* SSL Cache Stats */}
              {sslCacheStats && sslCacheStats.count > 0 && (
                <View
                  style={[
                    tw`p-4 rounded-4 mb-4`,
                    darkMode ? tw`bg-secondary-8` : tw`bg-primary-5`,
                  ]}>
                  <Text
                    style={[
                      tw`font-nokia-bold text-xl mb-3`,
                      darkMode ? tw`text-primary-1` : tw`text-secondary-8`,
                    ]}>
                    SSL Lesson Cache
                  </Text>
                  <View style={tw`gap-2`}>
                    <View style={tw`flex-row justify-between`}>
                      <Text
                        style={[
                          tw`font-nokia-bold`,
                          darkMode ? tw`text-primary-3` : tw`text-secondary-6`,
                        ]}>
                        Cached Lessons:
                      </Text>
                      <Text
                        style={[
                          tw`font-nokia-bold`,
                          darkMode ? tw`text-primary-1` : tw`text-secondary-8`,
                        ]}>
                        {sslCacheStats.count || 0}
                      </Text>
                    </View>
                    <View style={tw`flex-row justify-between`}>
                      <Text
                        style={[
                          tw`font-nokia-bold`,
                          darkMode ? tw`text-primary-3` : tw`text-secondary-6`,
                        ]}>
                        Cache Size:
                      </Text>
                      <Text
                        style={[
                          tw`font-nokia-bold`,
                          darkMode ? tw`text-primary-1` : tw`text-secondary-8`,
                        ]}>
                        {sslCacheStats.sizeFormatted || '0 KB'}
                      </Text>
                    </View>
                    {sslCacheStats.oldest && (
                      <View style={tw`flex-row justify-between`}>
                        <Text
                          style={[
                            tw`font-nokia-bold`,
                            darkMode ? tw`text-primary-3` : tw`text-secondary-6`,
                          ]}>
                          Oldest Cache:
                        </Text>
                        <Text
                          style={[
                            tw`font-nokia-bold text-xs`,
                            darkMode ? tw`text-primary-3` : tw`text-secondary-6`,
                          ]}>
                          {new Date(sslCacheStats.oldest).toLocaleDateString()}
                        </Text>
                      </View>
                    )}
                    {sslCacheStats.newest && (
                      <View style={tw`flex-row justify-between`}>
                        <Text
                          style={[
                            tw`font-nokia-bold`,
                            darkMode ? tw`text-primary-3` : tw`text-secondary-6`,
                          ]}>
                          Newest Cache:
                        </Text>
                        <Text
                          style={[
                            tw`font-nokia-bold text-xs`,
                            darkMode ? tw`text-primary-3` : tw`text-secondary-6`,
                          ]}>
                          {new Date(sslCacheStats.newest).toLocaleDateString()}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              )}

              {/* Cached Devotions List */}
              {cachedDevotions.length > 0 && (
                <View
                  style={[
                    tw`p-4 rounded-4 mb-4`,
                    darkMode ? tw`bg-secondary-8` : tw`bg-primary-5`,
                  ]}>
                  <Text
                    style={[
                      tw`font-nokia-bold text-lg mb-3`,
                      darkMode ? tw`text-primary-1` : tw`text-secondary-8`,
                    ]}>
                    Cached Devotions ({cachedDevotions.length})
                  </Text>
                  <ScrollView
                    style={tw`max-h-64`}
                    nestedScrollEnabled={true}>
                    {cachedDevotions.map((devotion, index) => (
                      <View
                        key={devotion._id || index}
                        style={[
                          tw`p-3 rounded-2 mb-2`,
                          darkMode ? tw`bg-secondary-7` : tw`bg-primary-4`,
                        ]}>
                        <Text
                          style={[
                            tw`font-nokia-bold text-sm mb-1`,
                            darkMode
                              ? tw`text-primary-1`
                              : tw`text-secondary-8`,
                          ]}
                          numberOfLines={1}>
                          {devotion.title || 'Untitled'}
                        </Text>
                        <Text
                          style={[
                            tw`font-nokia-bold text-xs`,
                            darkMode
                              ? tw`text-primary-3`
                              : tw`text-secondary-6`,
                          ]}>
                          Cached: {new Date(devotion.cachedAt).toLocaleString()}
                        </Text>
                      </View>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* Home Screen Cache Stats */}
              {homeScreenCacheStats && homeScreenCacheStats.count > 0 && (
                <View
                  style={[
                    tw`p-4 rounded-4 mb-4`,
                    darkMode ? tw`bg-secondary-8` : tw`bg-primary-5`,
                  ]}>
                  <Text
                    style={[
                      tw`font-nokia-bold text-xl mb-3`,
                      darkMode ? tw`text-primary-1` : tw`text-secondary-8`,
                    ]}>
                    Home Screen Cache
                  </Text>
                  <View style={tw`gap-2`}>
                    <View style={tw`flex-row justify-between`}>
                      <Text
                        style={[
                          tw`font-nokia-bold`,
                          darkMode ? tw`text-primary-3` : tw`text-secondary-6`,
                        ]}>
                        Cached Screens:
                      </Text>
                      <Text
                        style={[
                          tw`font-nokia-bold`,
                          darkMode ? tw`text-primary-1` : tw`text-secondary-8`,
                        ]}>
                        {homeScreenCacheStats.count || 0}
                      </Text>
                    </View>
                    <View style={tw`flex-row justify-between`}>
                      <Text
                        style={[
                          tw`font-nokia-bold`,
                          darkMode ? tw`text-primary-3` : tw`text-secondary-6`,
                        ]}>
                        Cache Size:
                      </Text>
                      <Text
                        style={[
                          tw`font-nokia-bold`,
                          darkMode ? tw`text-primary-1` : tw`text-secondary-8`,
                        ]}>
                        {homeScreenCacheStats.sizeFormatted || '0 KB'}
                      </Text>
                    </View>
                    {homeScreenCacheStats.oldest && (
                      <View style={tw`flex-row justify-between`}>
                        <Text
                          style={[
                            tw`font-nokia-bold`,
                            darkMode ? tw`text-primary-3` : tw`text-secondary-6`,
                          ]}>
                          Oldest Cache:
                        </Text>
                        <Text
                          style={[
                            tw`font-nokia-bold text-xs`,
                            darkMode ? tw`text-primary-3` : tw`text-secondary-6`,
                          ]}>
                          {new Date(homeScreenCacheStats.oldest).toLocaleDateString()}
                        </Text>
                      </View>
                    )}
                    {homeScreenCacheStats.newest && (
                      <View style={tw`flex-row justify-between`}>
                        <Text
                          style={[
                            tw`font-nokia-bold`,
                            darkMode ? tw`text-primary-3` : tw`text-secondary-6`,
                          ]}>
                          Newest Cache:
                        </Text>
                        <Text
                          style={[
                            tw`font-nokia-bold text-xs`,
                            darkMode ? tw`text-primary-3` : tw`text-secondary-6`,
                          ]}>
                          {new Date(homeScreenCacheStats.newest).toLocaleDateString()}
                        </Text>
                      </View>
                    )}
                    {homeScreenCacheStats.screenKeys &&
                      homeScreenCacheStats.screenKeys.length > 0 && (
                        <View style={tw`mt-2`}>
                          <Text
                            style={[
                              tw`font-nokia-bold text-sm mb-1`,
                              darkMode ? tw`text-primary-1` : tw`text-secondary-8`,
                            ]}>
                            Cached Screens:
                          </Text>
                          {homeScreenCacheStats.screenKeys.map((screen, index) => (
                            <Text
                              key={screen || index}
                              style={[
                                tw`font-nokia-bold text-xs`,
                                darkMode ? tw`text-primary-3` : tw`text-secondary-6`,
                              ]}>
                              • {screen}
                            </Text>
                          ))}
                        </View>
                      )}
                  </View>
                </View>
              )}

              {/* Action Buttons */}
              <View style={tw`flex-row gap-3 mb-4`}>
                <TouchableOpacity
                  style={[
                    tw`flex-1 flex-row items-center justify-center py-3 px-4 rounded-4`,
                    {backgroundColor: '#EA9215'},
                  ]}
                  onPress={handleRefresh}
                  disabled={refreshing}>
                  {refreshing ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <>
                      <ArrowClockwise size={20} color="#FFFFFF" weight="bold" />
                      <Text
                        style={tw`font-nokia-bold text-primary-1 text-base ml-2`}>
                        Refresh
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    tw`flex-1 flex-row items-center justify-center py-3 px-4 rounded-4`,
                    darkMode ? tw`bg-secondary-7` : tw`bg-primary-4`,
                  ]}
                  onPress={handleCleanExpired}>
                  <Text
                    style={[
                      tw`font-nokia-bold text-base`,
                      darkMode ? tw`text-primary-1` : tw`text-secondary-8`,
                    ]}>
                    Clean Expired
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[
                  tw`flex-row items-center justify-center py-3 px-4 rounded-4 mb-4`,
                  {backgroundColor: '#EF4444'},
                ]}
                onPress={handleClearCache}>
                <TrashSimple size={20} color="#FFFFFF" weight="bold" />
                <Text
                  style={tw`font-nokia-bold text-primary-1 text-base ml-2`}>
                  Clear All Cache
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}
      </View>
    </View>
  );
};

export default CacheChecker;
