import * as React from "react";
import { StyleSheet, Text as _Text, type TextProps } from "react-native";
import { appColors } from "../constants/colors";

export const Text = (props: TextProps) => {
  return <_Text {...props} style={[props.style, styles.text]} />;
};

const styles = StyleSheet.create({
  text: {
    color: appColors.text.light,
    $dark: {
      color: appColors.text.dark,
    },
  },
});
