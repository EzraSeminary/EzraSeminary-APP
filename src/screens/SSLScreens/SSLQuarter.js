import React, {useState, useCallback} from 'react';
import {
  View,
  Text,
  ScrollView,
  SafeAreaView,
  ImageBackground,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
} from 'react-native';
import {
  ArrowSquareLeft,
  Warning,
  XCircle,
  ArrowClockwise,
  CloudSlash,
} from 'phosphor-react-native';
import DateConverter from './DateConverter';
import tw from './../../../tailwind';
import {useNavigation} from '@react-navigation/native';
import {useSelector} from 'react-redux';
import {useGetSSLOfQuarterQuery} from '../../services/SabbathSchoolApi';
import LinearGradient from 'react-native-linear-gradient';
import ErrorScreen from '../../components/ErrorScreen';

const SSLQuarter = ({route}) => {
  const {sslId} = route.params;
  const language = useSelector(state => state.language.language);
  const {
    data: sslQuarter,
    error,
    isLoading,
    refetch,
  } = useGetSSLOfQuarterQuery(sslId);
  const navigation = useNavigation();
  const darkMode = useSelector(state => state.ui.darkMode);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const textStyle = 'font-nokia-bold text-sm text-secondary-4';
  const [showModal, setShowModal] = useState(false);
  const [fullDescription, setFullDescription] = useState('');

  const handleMorePress = () => {
    setFullDescription(sslQuarter.quarterly.introduction);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
  };

  const onRefresh = useCallback(async () => {
    try {
      setIsRefreshing(true);
      await refetch();
    } finally {
      setIsRefreshing(false);
    }
  }, [refetch]);

  if (isLoading) {
    return (
      <SafeAreaView style={darkMode ? tw`bg-secondary-9 h-100%` : null}>
        <View style={tw`flex-1`}>
          {/* Compact Header */}
          <View style={tw`flex-row items-center justify-between p-4`}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <ArrowSquareLeft size={36} weight="fill" color={'#EA9215'} />
            </TouchableOpacity>
            <Text
              style={[
                tw`font-nokia-bold text-lg`,
                darkMode ? tw`text-primary-1` : tw`text-secondary-8`,
              ]}>
              Sabbath School
            </Text>
            <View style={tw`w-9`} />
          </View>

          {/* Compact Loading Card */}
          <View
            style={[
              tw`mx-4 p-4 rounded-3 border`,
              {
                backgroundColor: darkMode ? '#374151' : '#F8FAFC',
                borderColor: '#E2E8F0',
              },
            ]}>
            <View style={tw`flex-row items-center`}>
              <ActivityIndicator
                size="large"
                color="#EA9215"
                style={tw`mr-3`}
              />
              <View style={tw`flex-1`}>
                <Text
                  style={[
                    tw`font-nokia-bold text-base mb-1`,
                    darkMode ? tw`text-primary-1` : tw`text-secondary-8`,
                  ]}>
                  Loading Quarter...
                </Text>
                <Text
                  style={[
                    tw`font-nokia-bold text-sm opacity-70`,
                    darkMode ? tw`text-primary-3` : tw`text-secondary-6`,
                  ]}>
                  Please wait while we fetch the lessons
                </Text>
              </View>
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={darkMode ? tw`bg-secondary-9 h-100%` : null}>
        <View style={tw`flex-1`}>
          {/* Compact Header */}
          <View style={tw`flex-row items-center justify-between p-4`}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <ArrowSquareLeft size={36} weight="fill" color={'#EA9215'} />
            </TouchableOpacity>
            <Text
              style={[
                tw`font-nokia-bold text-lg`,
                darkMode ? tw`text-primary-1` : tw`text-secondary-8`,
              ]}>
              Sabbath School
            </Text>
            <View style={tw`w-9`} />
          </View>

          {/* Compact Error Card */}
          <View
            style={[
              tw`mx-4 p-4 rounded-3 border`,
              {
                backgroundColor: darkMode ? '#374151' : '#FEF2F2',
                borderColor: '#EF4444',
              },
            ]}>
            <View style={tw`flex-row items-center justify-between`}>
              <View style={tw`flex-row items-center flex-1`}>
                <CloudSlash
                  size={24}
                  color="#EF4444"
                  weight="bold"
                  style={tw`mr-3`}
                />
                <View style={tw`flex-1`}>
                  <Text
                    style={[
                      tw`font-nokia-bold text-base mb-1`,
                      darkMode ? tw`text-primary-1` : tw`text-secondary-8`,
                    ]}>
                    Quarterly Update Pending
                  </Text>
                  <Text
                    style={[
                      tw`font-nokia-bold text-sm opacity-70`,
                      darkMode ? tw`text-primary-3` : tw`text-secondary-6`,
                    ]}>
                    New lessons are being prepared
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={[
                  tw`p-2 rounded-full`,
                  {backgroundColor: '#EF4444'},
                  isRefreshing && tw`opacity-70`,
                ]}
                onPress={onRefresh}
                disabled={isRefreshing}>
                {isRefreshing ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <ArrowClockwise size={16} color="#FFFFFF" weight="bold" />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const handleButtonPress = (ssl, weekId) => {
    navigation.navigate('SSLWeek', {ssl, weekId});
  };

  const gradientColor = darkMode
    ? sslQuarter.quarterly.color_primary_dark
    : sslQuarter.quarterly.color_primary;

  return (
    <View style={darkMode ? tw`bg-secondary-9 h-full` : null}>
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
        <View style={tw`flex-1 h-130`}>
          <ImageBackground
            source={{uri: sslQuarter.quarterly.splash}}
            style={tw`flex-5 justify-between py-6 px-4`}>
            <LinearGradient
              colors={[gradientColor, `${gradientColor}30`]}
              style={tw`absolute inset-0`}
              start={{x: 0.5, y: 1}}
              end={{x: 0.5, y: 0.2}}
            />
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <ArrowSquareLeft
                size={36}
                weight="fill"
                color={'#EA9215'}
                style={tw`mt-8`}
              />
            </TouchableOpacity>
            <View>
              <Text
                style={tw`font-nokia-bold text-3xl text-primary-1 text-center`}>
                {sslQuarter.quarterly.title}
              </Text>
              <Text
                style={tw`font-nokia-bold text-sm text-primary-3 text-center`}>
                {sslQuarter.quarterly.human_date}
              </Text>
              <View style={tw`mt-4`}>
                <Text
                  style={tw`font-nokia-bold text-sm text-primary-1 text-justify`}
                  numberOfLines={3}>
                  {sslQuarter.quarterly.description}{' '}
                </Text>
                <TouchableOpacity onPress={handleMorePress}>
                  <Text
                    style={tw`font-nokia-bold text-primary-3 border border-primary-3 px-2 w-24 text-center mt-2 rounded py-1`}>
                    ተጨማሪ
                  </Text>
                </TouchableOpacity>
              </View>
              <Modal visible={showModal} transparent animationType="fade">
                <View
                  style={tw`flex-1 justify-center items-center bg-secondary-10 bg-opacity-50`}>
                  <View
                    style={[
                      tw`bg-primary-1 rounded-lg w-90% my-20 rounded`,
                      darkMode ? tw`bg-secondary-6` : null,
                    ]}>
                    <View style={tw`p-4`}>
                      <View
                        style={tw`flex-row justify-between items-center mb-4`}>
                        <Text
                          style={[
                            tw`font-nokia-bold text-lg text-secondary-6`,
                            darkMode ? tw`text-primary-1` : null,
                          ]}>
                          Quarter Information
                        </Text>
                        <TouchableOpacity onPress={closeModal}>
                          <XCircle
                            size={24}
                            weight="bold"
                            color={darkMode ? '#EA9215' : '#6B7280'}
                          />
                        </TouchableOpacity>
                      </View>
                      <ScrollView style={tw`max-h-100`}>
                        <Text
                          style={[
                            tw`font-nokia-bold text-sm text-secondary-6 text-justify`,
                            darkMode ? tw`text-primary-1` : null,
                          ]}>
                          {fullDescription}
                        </Text>
                      </ScrollView>
                    </View>
                  </View>
                </View>
              </Modal>
            </View>
          </ImageBackground>
        </View>
        <SafeAreaView style={tw`flex`}>
          {sslQuarter.lessons?.map((item, index) => (
            <TouchableOpacity
              key={item.id}
              style={tw`flex flex-row items-center gap-6 border-t border-secondary-3 w-full py-3 px-6`}
              onPress={() => handleButtonPress(sslId, item.id)}>
              <Text
                style={[
                  tw`font-nokia-bold text-3xl text-secondary-3`,
                  darkMode ? tw`text-primary-7` : null,
                ]}>
                {index + 1}
              </Text>
              <View style={tw`flex flex-col`}>
                <Text
                  style={[
                    tw`font-nokia-bold text-xl leading-tight text-secondary-6`,
                    darkMode ? tw`text-primary-1` : null,
                  ]}>
                  {item.title}
                </Text>
                <View style={tw`flex flex-row`}>
                  <DateConverter
                    gregorianDate={item.start_date}
                    textStyle={textStyle}
                  />
                  <Text style={tw`font-nokia-bold text-secondary-3`}> - </Text>
                  <DateConverter
                    gregorianDate={item.end_date}
                    textStyle={textStyle}
                  />
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </SafeAreaView>
      </ScrollView>
    </View>
  );
};

export default SSLQuarter;
