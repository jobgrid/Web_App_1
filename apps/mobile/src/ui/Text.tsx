import { Text as RNText, type TextProps, type TextStyle } from "react-native";
import { theme } from "./theme";

export function AppText({
  children,
  size = 17,
  color = theme.ink,
  weight = "400",
  style,
  ...rest
}: TextProps & {
  size?: number;
  color?: string;
  weight?: TextStyle["fontWeight"];
}) {
  return (
    <RNText
      {...rest}
      style={[
        {
          color,
          fontSize: size,
          lineHeight: Math.round(size * 1.35),
          fontWeight: weight,
          letterSpacing: size >= 28 ? -0.6 : -0.2,
        },
        style,
      ]}
    >
      {children}
    </RNText>
  );
}
