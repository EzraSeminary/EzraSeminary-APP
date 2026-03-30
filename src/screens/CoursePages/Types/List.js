import React from 'react';
import {FlatList, Text, View} from 'react-native';
import tw from '../../../../tailwind';

const List = ({value}) => (
  <FlatList
    data={value}
    keyExtractor={(item, index) => `${item}-${index}`}
    renderItem={({item}) => (
      <View style={tw`flex-row items-start mb-2 pr-2`}>
        <Text style={[tw`font-nokia-bold text-primary-1`, {width: 20}]}>
          {'\u2022'}
        </Text>
        <Text style={[tw`font-nokia-bold text-sm text-primary-1 flex-1`]}>
          {item}
        </Text>
      </View>
    )}
    scrollEnabled={false}
    removeClippedSubviews
    initialNumToRender={8}
    maxToRenderPerBatch={8}
    windowSize={7}
  />
);

export default List;
