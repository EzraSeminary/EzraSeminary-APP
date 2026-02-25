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
import {Platform, PermissionsAndroid} from 'react-native';
import {useCachedImage} from '../utils/imageCache';

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
    return <ErrorScreen refetch={refetch} darkMode={darkMode} />;
  }

  return (
    <View style={darkMode ? tw`bg-secondary-9` : null}>
      <SafeAreaView style={tw`flex mx-auto w-[100%] h-100%`}>
        <ScrollView
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
            {/* Categories List */}
            {categories && categories.length > 0 ? (
              categories.map((category, index) => (
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
              <Animated.View
                style={[
                  tw`items-center justify-center py-16 px-8`,
                  {
                    opacity: fadeAnim,
                    transform: [{translateY: slideAnim}],
                  },
                ]}>
                <View
                  style={[
                    tw`w-24 h-24 rounded-full items-center justify-center mb-6`,
                    {backgroundColor: darkMode ? '#374151' : '#F3F4F6'},
                  ]}>
                  <MagnifyingGlass size={40} color="#EA9215" weight="bold" />
                </View>
                <Text
                  style={[
                    tw`font-nokia-bold text-xl text-center mb-2`,
                    darkMode ? tw`text-primary-1` : tw`text-secondary-8`,
                  ]}>
                  No categories found
                </Text>
                <Text
                  style={[
                    tw`font-nokia-bold text-base text-center opacity-70`,
                    darkMode ? tw`text-primary-3` : tw`text-secondary-6`,
                  ]}>
                  Check back later for new content
                </Text>
              </Animated.View>
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
    <View style={tw`mb-6`}>
      {/* Category Header - No background, matching image style */}
      <View
        style={tw`flex-row justify-between items-center mb-3 border-b border-accent-6 py-2`}>
        <Text
          style={[
            tw`font-nokia-bold text-xl flex-1 `,
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
                  paddingHorizontal: 16,
                  paddingBottom: 16,
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
        tw`rounded-2xl overflow-hidden mr-3`,
        {
          width: itemWidth,
          backgroundColor: darkMode ? '#374151' : '#FFFFFF',
          shadowColor: darkMode ? '#000000' : '#EA9215',
          shadowOffset: {width: 0, height: 4},
          shadowOpacity: darkMode ? 0.3 : 0.15,
          shadowRadius: 8,
          elevation: 4,
        },
      ]}>
      {/* Image or Icon */}
      <View style={tw`h-48 relative`}>
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
          colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.8)']}
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
      <View style={tw`p-4`}>
        <Text
          style={[
            tw`font-nokia-bold text-lg mb-2`,
            darkMode ? tw`text-primary-1` : tw`text-secondary-8`,
          ]}
          numberOfLines={2}>
          {item.title}
        </Text>
        {item.description && (
          <Text
            style={[
              tw`font-nokia-bold text-sm opacity-70 mb-3`,
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

export default Explore;
