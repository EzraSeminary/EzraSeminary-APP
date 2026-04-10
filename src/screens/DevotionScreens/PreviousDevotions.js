import React, {useMemo} from 'react';
import {View, TouchableOpacity, ImageBackground, Text} from 'react-native';
import {useCachedImage} from '../../utils/imageCache';
import {useNavigation} from '@react-navigation/native';
import {ArrowSquareUpRight} from 'phosphor-react-native';
import tw from './../../../tailwind';
import {toEthiopian} from 'ethiopian-date';
import {
  ETHIOPIAN_MONTHS,
  normalizeEthiopianMonth,
} from '../../utils/ethiopianCalendar';

const PreviousDevotions = ({devotions, darkMode, currentYear}) => {
  const navigation = useNavigation();

  const previousDevotions = useMemo(() => {
    if (!devotions || devotions.length === 0) return [];

    const today = new Date();
    const [, month, day] = toEthiopian(
      today.getFullYear(),
      today.getMonth() + 1,
      today.getDate(),
    );
    const ethiopianMonth = normalizeEthiopianMonth(ETHIOPIAN_MONTHS[month]);
    const monthIndex = ETHIOPIAN_MONTHS.indexOf(ethiopianMonth);

    // Get devotions from the current month (before today) and previous months
    // This ensures we always have some devotions to show
    const filtered = devotions.filter(devotion => {
      const devotionMonth = normalizeEthiopianMonth(devotion.month);
      const devMonthIndex = ETHIOPIAN_MONTHS.indexOf(devotionMonth);
      const devDay = Number(devotion.day);

      // Skip today's devotion
      if (devotionMonth === ethiopianMonth && devDay === day) {
        return false;
      }

      // Include previous months and earlier days in current month
      if (devMonthIndex < monthIndex) {
        return true;
      }
      if (devMonthIndex === monthIndex && devDay < day) {
        return true;
      }
      return false;
    });

    // Sort by month (desc) then by day (desc) to get most recent first
    return filtered
      .sort((a, b) => {
        const normalizedAMonth = normalizeEthiopianMonth(a.month);
        const normalizedBMonth = normalizeEthiopianMonth(b.month);
        const aMonthIdx = ETHIOPIAN_MONTHS.indexOf(normalizedAMonth);
        const bMonthIndex = ETHIOPIAN_MONTHS.indexOf(normalizedBMonth);
        if (aMonthIdx !== bMonthIndex) {
          return bMonthIndex - aMonthIdx;
        }
        return Number(b.day) - Number(a.day);
      })
      .slice(0, 6); // Show 6 cards (3 rows of 2 columns)
  }, [devotions]);

  const CachedImageBg = ({uri, children}) => {
    const cached = useCachedImage(uri);
    return (
      <ImageBackground
        source={{uri: cached}}
        style={tw`w-full h-full justify-end`}
        imageStyle={tw`rounded-lg`}>
        {children}
      </ImageBackground>
    );
  };

  return (
    <View style={tw`flex flex-row flex-wrap justify-between mt-4`}>
      {previousDevotions.map((item, index) => (
        <TouchableOpacity
          key={index}
          style={tw`w-[47.5%] h-35 mb-4 rounded-2 overflow-hidden`}
          onPress={() =>
            navigation.navigate('Devotional', {
              screen: 'SelectedDevotional',
              params: {devotionalId: item._id, year: currentYear},
            })
          }>
          <CachedImageBg uri={`${item.image}`}>
            <View
              style={[
                tw`absolute inset-0 bg-accent-10 bg-opacity-60 rounded-lg`,
                darkMode ? tw`bg-accent-11 bg-opacity-70` : null,
              ]}>
              <ArrowSquareUpRight
                size={32}
                weight="fill"
                style={tw`text-white self-end m-2`}
                color="#F8F8F8"
              />
              <View style={tw`flex absolute bottom-0 left-0 my-2`}>
                <Text style={tw`font-nokia-bold text-white text-lg mx-2`}>
                  {item.title}
                </Text>
                <Text
                  style={tw`font-nokia-bold text-white text-sm mx-2 text-accent-2`}>
                  {item.month} {item.day}
                </Text>
              </View>
            </View>
          </CachedImageBg>
        </TouchableOpacity>
      ))}
    </View>
  );
};

export default PreviousDevotions;
