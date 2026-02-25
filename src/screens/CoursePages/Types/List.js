import React from 'react';
import {FlatList, Text} from 'react-native';
import tw from '../../../../tailwind';

const List = ({value}) => (
  <FlatList
    data={value}
    keyExtractor={(item, index) => `${item}-${index}`}
    renderItem={({item}) => (
      <Text style={tw`font-nokia-bold text-sm text-primary-1`}>
        {'\u2022 '}
        {item}
      </Text>
    )}
    scrollEnabled={false}
    removeClippedSubviews
    initialNumToRender={8}
    maxToRenderPerBatch={8}
    windowSize={7}
  />
);

export default List;
