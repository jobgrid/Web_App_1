import { SymbolView, type SymbolViewProps } from "expo-symbols";
import { Platform } from "react-native";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import type { SFSymbol } from "sf-symbols-typescript";
import { theme } from "./theme";

type IconName = "home" | "missions" | "inbox" | "you" | "mic" | "send" | "attach" | "back" | "close" | "check" | "wave";

const ICONS: Record<IconName, { ios: SFSymbol; android: string; web: string }> = {
  home: { ios: "house.fill", android: "home", web: "home" },
  missions: { ios: "flag.fill", android: "flag", web: "flag" },
  inbox: { ios: "tray.fill", android: "inbox", web: "inbox" },
  you: { ios: "person.fill", android: "person", web: "person" },
  mic: { ios: "mic.fill", android: "mic", web: "mic" },
  send: { ios: "arrow.up", android: "arrow_upward", web: "arrow_upward" },
  attach: { ios: "paperclip", android: "attach_file", web: "attach_file" },
  back: { ios: "chevron.left", android: "chevron_left", web: "chevron_left" },
  close: { ios: "xmark", android: "close", web: "close" },
  check: { ios: "checkmark", android: "check", web: "check" },
  wave: { ios: "waveform", android: "graphic_eq", web: "graphic_eq" },
};

export function Icon({ name, size = 22, color = theme.ink }: { name: IconName; size?: number; color?: string }) {
  if (Platform.OS === "ios") {
    const spec = ICONS[name];
    return (
      <SymbolView
        name={{ ios: spec.ios, android: spec.android, web: spec.web } as SymbolViewProps["name"]}
        size={size}
        tintColor={color}
        fallback={<SvgIcon name={name} size={size} color={color} />}
      />
    );
  }
  return <SvgIcon name={name} size={size} color={color} />;
}

function SvgIcon({ name, size, color }: { name: IconName; size: number; color: string }) {
  const stroke = { fill: "none" as const, stroke: color, strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {name === "home" ? <Path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1Z" {...stroke} /> : null}
      {name === "missions" ? <Path d="M6 21V4h9l-1.2 3.2L15 10H6" {...stroke} /> : null}
      {name === "inbox" ? <Path d="M4 13h4.2a2.2 2.2 0 0 0 2.1 1.5h3.4A2.2 2.2 0 0 0 15.8 13H20v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1Zm0 0 1.6-7.2A1 1 0 0 1 6.6 5h10.8a1 1 0 0 1 1 .8L20 13" {...stroke} /> : null}
      {name === "you" ? (
        <>
          <Circle cx="12" cy="8" r="3.2" {...stroke} />
          <Path d="M5.5 19.2a6.5 6.5 0 0 1 13 0" {...stroke} />
        </>
      ) : null}
      {name === "mic" ? (
        <>
          <Rect x="9" y="3.5" width="6" height="10" rx="3" {...stroke} />
          <Path d="M6.5 11a5.5 5.5 0 0 0 11 0M12 16.5V20" {...stroke} />
        </>
      ) : null}
      {name === "send" ? <Path d="M12 19V6M6.5 11 12 5.5 17.5 11" {...stroke} /> : null}
      {name === "attach" ? <Path d="M8 12.5 14.2 6.3a3 3 0 0 1 4.2 4.2l-7.4 7.4a4.2 4.2 0 0 1-6-6L12 5" {...stroke} /> : null}
      {name === "back" ? <Path d="M14.5 5.5 8 12l6.5 6.5" {...stroke} /> : null}
      {name === "close" ? <Path d="M7 7l10 10M17 7 7 17" {...stroke} /> : null}
      {name === "check" ? <Path d="M5 12.5 9.5 17 19 7.5" {...stroke} /> : null}
      {name === "wave" ? <Path d="M4 12h1.2M7 8v8M10.2 5.5v13M13.4 8.5v7M16.6 6v12M19.8 10v4" {...stroke} /> : null}
    </Svg>
  );
}
