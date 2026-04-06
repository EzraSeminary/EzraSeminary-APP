import React, {useState} from 'react';
import {Text, TouchableOpacity, View} from 'react-native';
import tw from '../../../../tailwind';
import Toast from 'react-native-toast-message';

const correctFeedback = {
  borderColor: '#16a34a',
  backgroundColor: '#dcfce7',
  color: '#166534',
};

const incorrectFeedback = {
  borderColor: '#dc2626',
  backgroundColor: '#fee2e2',
  color: '#991b1b',
};

const Quiz = ({value, setIsAnswerChecked}) => {
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [isAnswerChecked, setLocalIsAnswerChecked] = useState(false);

  const isChoiceCorrect = choice => choice.text === value.correctAnswer;

  const handleAnswerSelection = answer => {
    setSelectedAnswer(answer);
    if (isAnswerChecked) {
      setLocalIsAnswerChecked(false);
      setIsAnswerChecked(false);
    }
  };

  const checkAnswer = () => {
    if (selectedAnswer) {
      setLocalIsAnswerChecked(true);
      setIsAnswerChecked(true); // This updates the parent component's state

      if (selectedAnswer.text === value.correctAnswer) {
        return Toast.show({
          type: 'success',
          text1: 'በትክክል መልሰዋል!',
        });
      } else {
        return Toast.show({
          type: 'error',
          text1: 'የመረጡት መልስ የተሳሳተ ነው!',
        });
      }
    }
  };

  const choiceWrapperStyle = choice => {
    if (!isAnswerChecked) {
      return [
        tw`mb-2 rounded-lg`,
        selectedAnswer === choice ? tw`bg-primary-2` : null,
      ];
    }
    if (isChoiceCorrect(choice)) {
      return [
        tw`mb-2 rounded-lg`,
        {
          borderWidth: 2,
          borderColor: correctFeedback.borderColor,
          backgroundColor: correctFeedback.backgroundColor,
        },
      ];
    }
    if (selectedAnswer === choice) {
      return [
        tw`mb-2 rounded-lg`,
        {
          borderWidth: 2,
          borderColor: incorrectFeedback.borderColor,
          backgroundColor: incorrectFeedback.backgroundColor,
        },
      ];
    }
    return [tw`mb-2 rounded-lg`, tw`opacity-55`];
  };

  const choiceTextStyle = choice => {
    const base = tw`font-nokia-bold text-sm p-2`;
    if (!isAnswerChecked) {
      return [
        base,
        tw`text-primary-1 border border-primary-1 rounded-lg`,
        selectedAnswer === choice ? tw`text-secondary-6` : null,
      ];
    }
    if (isChoiceCorrect(choice)) {
      return [base, {color: correctFeedback.color}];
    }
    if (selectedAnswer === choice) {
      return [base, {color: incorrectFeedback.color}];
    }
    return [base, tw`text-primary-1`];
  };

  return (
    <View style={tw`items-center justify-center`}>
      <Text style={tw`font-nokia-bold text-lg text-primary-1 mb-4`}>
        {value.question}
      </Text>
      <View style={tw`flex flex-row justify-center flex-wrap gap-4`}>
        {value.choices.map((choice, index) => (
          <TouchableOpacity
            key={index}
            onPress={() => handleAnswerSelection(choice)}
            style={choiceWrapperStyle(choice)}
            disabled={isAnswerChecked && selectedAnswer === choice}>
            <Text style={choiceTextStyle(choice)}>{choice.text}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <TouchableOpacity
        onPress={checkAnswer}
        style={[
          tw`mt-4 px-4 py-2 rounded-lg`,
          isAnswerChecked ? tw`bg-accent-6` : tw`bg-primary-2`,
        ]}
        disabled={!selectedAnswer}>
        <Text
          style={
            isAnswerChecked
              ? tw`font-nokia-bold text-primary-1`
              : tw`font-nokia-bold text-secondary-6`
          }>
          {isAnswerChecked ? 'Answer Checked' : 'Check Answer'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

export default Quiz;
