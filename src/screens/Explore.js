import React, {useState, useCallback, useRef, useEffect, useMemo} from 'react';
import {
  View,
  Text,
  ScrollView,
  SafeAreaView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Animated,
  useWindowDimensions,
  FlatList,
} from 'react-native';
import {
  BookOpen,
  Sparkle,
  MagnifyingGlass,
  Download,
  FilePdf,
  Presentation,
  CaretRight,
} from 'phosphor-react-native';
import tw from './../../tailwind';
import {
  useGetExploreCategoriesQuery,
  useGetExploreItemsQuery,
} from '../redux/api-slices/apiSlice';
import {useNavigation} from '@react-navigation/native';
import {useSelector} from 'react-redux';
import ErrorScreen from '../components/ErrorScreen';
import NetInfo from '@react-native-community/netinfo';
import Toast from 'react-native-toast-message';
import LinearGradient from 'react-native-linear-gradient';
import RNFS from 'react-native-fs';
import AndroidStatusBarSpacer from '../components/AndroidStatusBarSpacer';
import {Platform, PermissionsAndroid} from 'react-native';
import {useCachedImage} from '../utils/imageCache';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {getFloatingTabScenePadding} from '../navigation/floatingTabBarStyles';

const fallbackExploreCards = [
  {
    key: 'courses',
    title: 'Biblical Courses',
    description: 'Study curated lessons and deeper Bible-based material.',
    image: require('../assets/bible.png'),
    accent: '#EA9215',
  },
  {
    key: 'devotionals',
    title: 'Daily Devotionals',
    description: 'Open short daily readings for reflection and prayer.',
    image: require('../assets/worship.jpeg'),
    accent: '#EA9215',
  },
  {
    key: 'ssls',
    title: 'Sabbath School',
    description: 'Browse quarterly Sabbath School lesson content.',
    image: require('../assets/church.png'),
    accent: '#EA9215',
  },
];

const Explore = () => {
  const {
    data: categories,
    error,
    isLoading,
    refetch,
  } = useGetExploreCategoriesQuery();
  // All categories expanded by default
  const [expandedCategories, setExpandedCategories] = useState(new Set());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const darkMode = useSelector(state => state.ui.darkMode);
  const navigation = useNavigation();
  const {width: screenWidth} = useWindowDimensions();
  const itemWidth = useMemo(() => screenWidth * 0.4, [screenWidth]);
  const insets = useSafeAreaInsets();
  const scrollContentStyle = useMemo(
    () => ({paddingBottom: getFloatingTabScenePadding(insets)}),
    [insets],
  );

  // Expand all categories when data loads
  useEffect(() => {
    if (categories && categories.length > 0) {
      const allCategoryIds = new Set(categories.map(cat => cat._id));
      setExpandedCategories(allCategoryIds);
    }
  }, [categories]);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const sparkleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isLoading) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start();

      const sparkleAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(sparkleAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(sparkleAnim, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: true,
          }),
        ]),
      );
      sparkleAnimation.start();

      return () => sparkleAnimation.stop();
    }
  }, [isLoading, fadeAnim, slideAnim, scaleAnim, sparkleAnim]);

  const onRefresh = useCallback(async () => {
    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected) {
      Toast.show({
        type: 'info',
        text1: 'Internet Connection Required',
        text2: 'Please connect to the internet to reload data.',
      });
      setIsRefreshing(false);
      return;
    }
    try {
      setIsRefreshing(true);
      await refetch();
    } finally {
      setIsRefreshing(false);
    }
  }, [refetch]);

  const handleItemPress = item => {
    navigation.navigate('ExploreItemViewer', {item});
  };

  const handleCategoryPress = category => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(category._id)) {
        newSet.delete(category._id);
      } else {
        newSet.add(category._id);
      }
      return newSet;
    });
  };

  if (isLoading) {
    return (
      <SafeAreaView style={darkMode ? tw`bg-secondary-9 h-100%` : null}>
        <ActivityIndicator size="large" color="#EA9215" style={tw`mt-20`} />
        <Text style={tw`font-nokia-bold text-lg text-accent-6 text-center`}>
          Loading
        </Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <View style={[tw`flex-1`, darkMode && tw`bg-secondary-9`]}>
        <SafeAreaView style={tw`flex-1 w-full`}>
          <AndroidStatusBarSpacer minHeight={4} />
          <ScrollView
            style={tw`flex-1`}
            contentContainerStyle={[
              scrollContentStyle,
              {paddingBottom: getFloatingTabScenePadding(insets) + 160},
            ]}
            showsVerticalScrollIndicator={false}>
            <ExploreFallbackHero darkMode={darkMode} />
            <ExploreFallbackCards darkMode={darkMode} />
            <ErrorScreen refetch={refetch} darkMode={darkMode} />
          </ScrollView>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={[tw`flex-1`, darkMode && tw`bg-secondary-9`]}>
      <SafeAreaView style={tw`flex-1 w-full`}>
        <AndroidStatusBarSpacer minHeight={4} />
        <ScrollView
          style={tw`flex-1`}
          contentContainerStyle={[
            scrollContentStyle,
            {paddingBottom: getFloatingTabScenePadding(insets) + 160},
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              colors={['#EA9215']}
              tintColor="#EA9215"
            />
          }>
          <Animated.View
            style={{
              opacity: fadeAnim,
              transform: [{translateY: slideAnim}],
            }}>
            <ExploreFallbackHero darkMode={darkMode} />
            {/* Categories List */}
            {categories && categories.length > 0 ? (
              categories.map(category => (
                <CategorySection
                  key={category._id}
                  category={category}
                  darkMode={darkMode}
                  onItemPress={handleItemPress}
                  isExpanded={expandedCategories.has(category._id)}
                  onToggle={() => handleCategoryPress(category)}
                  itemWidth={itemWidth}
                />
              ))
            ) : (
              <ExploreFallbackCards darkMode={darkMode} />
            )}
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

const CategorySection = ({
  category,
  darkMode,
  onItemPress,
  isExpanded,
  onToggle,
  itemWidth,
}) => {
  const {
    data: items,
    isLoading: itemsLoading,
    error: itemsError,
  } = useGetExploreItemsQuery(category._id, {
    skip: !isExpanded,
  });

  const [visibleItems, setVisibleItems] = useState(3);
  const shouldShowSeeMore = items && items.length > visibleItems;

  const handleSeeMore = () => {
    setVisibleItems(items.length);
  };

  const displayedItems = items ? items.slice(0, visibleItems) : [];

  return (
    <View style={tw`mb-5`}>
      <View
        style={tw`flex-row justify-between items-center mb-2 border-b border-accent-6 pb-2`}>
        <Text
          style={[
            tw`font-nokia-bold text-lg flex-1`,
            darkMode ? tw`text-primary-1` : tw`text-secondary-8 `,
          ]}>
          {category.title}
        </Text>
        <View style={tw`flex-row items-center`}>
          {/* {items && (
            <Text
              style={[
                tw`font-nokia-bold text-sm mr-3`,
                darkMode ? tw`text-primary-3` : tw`text-secondary-6`,
              ]}>
              {items.length}
            </Text>
          )} */}
          <TouchableOpacity onPress={onToggle}>
            <CaretRight
              size={24}
              color={darkMode ? '#FFFFFF' : '#374151'}
              weight="bold"
              style={{
                transform: [{rotate: isExpanded ? '90deg' : '0deg'}],
              }}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Items List */}
      {isExpanded && (
        <View>
          {itemsLoading ? (
            <View style={tw`py-8 items-center`}>
              <ActivityIndicator size="large" color="#EA9215" />
            </View>
          ) : itemsError ? (
            <View style={tw`py-8 items-center`}>
              <Text
                style={[
                  tw`font-nokia-bold text-base`,
                  darkMode ? tw`text-primary-3` : tw`text-secondary-6`,
                ]}>
                Failed to load items
              </Text>
            </View>
          ) : displayedItems && displayedItems.length > 0 ? (
            <>
              <FlatList
                data={displayedItems}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={item => item._id}
                contentContainerStyle={{
                  paddingHorizontal: 4,
                  paddingBottom: 8,
                }}
                renderItem={({item}) => (
                  <ExploreItemCard
                    item={item}
                    darkMode={darkMode}
                    onPress={() => onItemPress(item)}
                    itemWidth={itemWidth}
                  />
                )}
                removeClippedSubviews
                initialNumToRender={4}
                maxToRenderPerBatch={4}
                windowSize={5}
              />
              {shouldShowSeeMore && (
                <TouchableOpacity
                  onPress={handleSeeMore}
                  style={[
                    tw`self-center mt-4 px-6 py-3 rounded-full`,
                    {
                      backgroundColor: darkMode ? '#4B5563' : '#F3F4F6',
                    },
                  ]}>
                  <Text
                    style={[
                      tw`font-nokia-bold text-base`,
                      darkMode ? tw`text-primary-1` : tw`text-secondary-8`,
                    ]}>
                    See More
                  </Text>
                </TouchableOpacity>
              )}
            </>
          ) : (
            <View style={tw`py-8 items-center`}>
              <Text
                style={[
                  tw`font-nokia-bold text-base`,
                  darkMode ? tw`text-primary-3` : tw`text-secondary-6`,
                ]}>
                No items in this category
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
};

const ExploreItemCard = React.memo(({item, darkMode, onPress, itemWidth}) => {
  const cachedImage = useCachedImage(item.imageUrl);
  const getFileIcon = () => {
    if (item.fileType === 'pdf') {
      return <FilePdf size={32} color="#EA9215" weight="bold" />;
    } else if (item.fileType === 'ppt' || item.fileType === 'pptx') {
      return <Presentation size={32} color="#EA9215" weight="bold" />;
    }
    return <FilePdf size={32} color="#EA9215" weight="bold" />;
  };

  const truncateDescription = (text, maxLength = 60) => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        tw`rounded-3xl overflow-hidden mr-3`,
        {
          width: itemWidth,
          backgroundColor: darkMode ? '#262C39' : '#FFFFFF',
          shadowColor: '#000000',
          shadowOffset: {width: 0, height: 6},
          shadowOpacity: darkMode ? 0.28 : 0.12,
          shadowRadius: 12,
          elevation: 5,
        },
      ]}>
      {/* Image or Icon */}
      <View style={tw`h-40 relative`}>
        {item.imageUrl ? (
          <Image
            source={{uri: cachedImage}}
            style={tw`w-full h-full`}
            resizeMode="cover"
          />
        ) : (
          <View
            style={[
              tw`w-full h-full items-center justify-center`,
              {backgroundColor: darkMode ? '#4B5563' : '#F3F4F6'},
            ]}>
            {getFileIcon()}
          </View>
        )}
        <LinearGradient
          colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.72)']}
          style={tw`absolute inset-0`}
        />
        {/* File Type Badge */}
        <View style={tw`absolute top-2 right-2`}>
          <View
            style={[
              tw`px-2 py-1 rounded-full`,
              {backgroundColor: 'rgba(234, 146, 21, 0.9)'},
            ]}>
            <Text style={tw`text-white font-nokia-bold text-xs`}>
              {item.fileType?.toUpperCase() || 'FILE'}
            </Text>
          </View>
        </View>
      </View>

      {/* Content */}
      <View style={tw`px-3 py-3`}>
        <Text
          style={[
            tw`font-nokia-bold text-base leading-5 mb-1`,
            darkMode ? tw`text-primary-1` : tw`text-secondary-8`,
          ]}
          numberOfLines={2}>
          {item.title}
        </Text>
        {item.description && (
          <Text
            style={[
              tw`font-nokia-bold text-xs leading-4 opacity-75`,
              darkMode ? tw`text-primary-3` : tw`text-secondary-6`,
            ]}
            numberOfLines={2}>
            {truncateDescription(item.description)}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
});

const ExploreFallbackHero = ({darkMode}) => (
  <View
    style={[
      tw`mb-5 px-4 py-4 rounded-3xl`,
      {backgroundColor: darkMode ? '#262C39' : '#F8FAFC'},
    ]}>
    <Text
      style={[
        tw`font-nokia-bold text-2xl mb-1`,
        darkMode ? tw`text-primary-1` : tw`text-secondary-8`,
      ]}>
      Explore
    </Text>
    <Text
      style={[
        tw`font-nokia-bold text-sm opacity-80`,
        darkMode ? tw`text-primary-3` : tw`text-secondary-6`,
      ]}>
      Books, devotionals, and Sabbath School resources
    </Text>
  </View>
);

const ExploreFallbackCards = ({darkMode}) => (
  <View style={tw`mb-6`}>
    {fallbackExploreCards.map(card => (
      <View
        key={card.key}
        style={[
          tw`mb-4 rounded-3xl overflow-hidden`,
          {
            backgroundColor: darkMode ? '#262C39' : '#FFFFFF',
            shadowColor: '#000',
            shadowOffset: {width: 0, height: 6},
            shadowOpacity: darkMode ? 0.24 : 0.12,
            shadowRadius: 12,
            elevation: 4,
          },
        ]}>
        <Image source={card.image} style={tw`w-full h-44`} resizeMode="cover" />
        <View style={tw`px-4 py-4`}>
          <Text
            style={[
              tw`font-nokia-bold text-xl mb-2`,
              darkMode ? tw`text-primary-1` : tw`text-secondary-8`,
            ]}>
            {card.title}
          </Text>
          <Text
            style={[
              tw`font-nokia-bold text-sm mb-4`,
              darkMode ? tw`text-primary-3` : tw`text-secondary-6`,
            ]}>
            {card.description}
          </Text>
          <TouchableOpacity
            activeOpacity={0.85}
            style={[
              tw`self-start px-4 py-3 rounded-full`,
              {backgroundColor: card.accent},
            ]}>
            <Text style={tw`font-nokia-bold text-white`}>Open Explore</Text>
          </TouchableOpacity>
        </View>
      </View>
    ))}
  </View>
);

export default Explore;
