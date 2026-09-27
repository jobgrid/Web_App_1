import { Platform, TextInput, View } from "react-native";
import { Glass } from "./Glass";
import { Icon } from "./Icon";
import { PressableScale } from "./PressableScale";
import { theme } from "./theme";

export function Composer({
  value,
  onChangeText,
  onSend,
  placeholder,
  onVoice,
  onAttach,
}: {
  value: string;
  onChangeText: (value: string) => void;
  onSend: () => void;
  placeholder: string;
  onVoice?: () => void;
  onAttach?: () => void;
}) {
  const canSend = value.trim().length > 0;
  return (
    <Glass radius={30} style={{ minHeight: 58, paddingLeft: 8, paddingRight: 8, paddingVertical: 6 }}>
      <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 6 }}>
        {onAttach ? (
          <PressableScale label="Attach a description" onPress={onAttach} style={iconButton}>
            <Icon name="attach" size={18} color={theme.soft} />
          </PressableScale>
        ) : null}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.faint}
          multiline
          accessibilityLabel={placeholder}
          style={{
            flex: 1,
            maxHeight: 120,
            minHeight: 40,
            fontSize: 17,
            lineHeight: 22,
            color: theme.ink,
            paddingTop: 10,
            paddingBottom: 10,
            ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as object) : null),
          }}
        />
        {canSend ? (
          <PressableScale label="Send" onPress={onSend} style={[iconButton, { backgroundColor: theme.ink }]}>
            <Icon name="send" size={18} color={theme.white} />
          </PressableScale>
        ) : onVoice ? (
          <PressableScale label="Speak" onPress={onVoice} style={iconButton}>
            <Icon name="mic" size={18} color={theme.ink} />
          </PressableScale>
        ) : null}
      </View>
    </Glass>
  );
}

const iconButton = {
  width: 40,
  height: 40,
  borderRadius: 20,
  alignItems: "center" as const,
  justifyContent: "center" as const,
};
