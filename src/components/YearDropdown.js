import React, {useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  StyleSheet,
} from 'react-native';
import {CaretDown, CaretUp} from 'phosphor-react-native';
import tw from './../../tailwind';

const YearDropdown = ({
  selectedYear,
  onYearSelect,
  availableYears,
  darkMode,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleYearSelect = year => {
    onYearSelect(year);
    setIsOpen(false);
  };

  const getCurrentEthiopianYear = () => {
    // For now, we'll use 2018 as the current Ethiopian year
    // This should be updated based on the actual current Ethiopian year
    return 2018;
  };

  const currentEthiopianYear = getCurrentEthiopianYear();

  return (
    <View style={tw`relative`}>
      <TouchableOpacity
        style={[
          tw`flex flex-row items-center justify-between px-4 py-3 border border-accent-6 rounded-4`,
          darkMode ? tw`bg-secondary-8` : tw`bg-primary-1`,
          disabled && tw`opacity-50`,
        ]}
        onPress={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}>
        <Text
          style={[
            tw`font-nokia-bold text-base`,
            darkMode ? tw`text-primary-1` : tw`text-secondary-6`,
          ]}>
          {selectedYear ? `ዓ.ም ${selectedYear}` : `ዓ.ም ${currentEthiopianYear}`}
        </Text>
        {isOpen ? (
          <CaretUp size={20} weight="bold" color="#EA9215" />
        ) : (
          <CaretDown size={20} weight="bold" color="#EA9215" />
        )}
      </TouchableOpacity>

      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsOpen(false)}>
          <View
            style={[
              styles.dropdownContainer,
              darkMode ? tw`bg-secondary-8` : tw`bg-primary-1`,
            ]}>
            <FlatList
              data={availableYears}
              keyExtractor={item => item.toString()}
              renderItem={({item}) => (
                <TouchableOpacity
                  style={[
                    styles.dropdownItem,
                    selectedYear === item && tw`bg-accent-6`,
                  ]}
                  onPress={() => handleYearSelect(item)}>
                  <Text
                    style={[
                      tw`font-nokia-bold text-base`,
                      darkMode ? tw`text-primary-1` : tw`text-secondary-6`,
                      selectedYear === item && tw`text-primary-1`,
                    ]}>
                    ዓ.ም {item}
                  </Text>
                </TouchableOpacity>
              )}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownContainer: {
    maxHeight: 200,
    minWidth: 150,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EA9215',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  dropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(234, 146, 21, 0.2)',
  },
});

export default YearDropdown;
