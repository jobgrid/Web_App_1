import { useState } from "react";
import { View } from "react-native";
import type { ActivityEvent } from "../types";
import { PressableScale } from "./PressableScale";
import { AppText } from "./Text";
import { theme } from "./theme";

export function ActivityList({ items }: { items: ActivityEvent[] }) {
  const [open, setOpen] = useState(false);
  const shown = open ? items : items.slice(-1);
  return (
    <View style={{ gap: 10 }}>
      <PressableScale label={open ? "Hide activity" : "Show activity"} onPress={() => setOpen((value) => !value)}>
        <AppText size={13} weight="600" color={theme.faint}>
          {open ? "Hide activity" : "Activity"}
        </AppText>
      </PressableScale>
      {shown.map((item) => (
        <View key={item.id} style={{ flexDirection: "row", gap: 10 }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: theme.faint, marginTop: 8 }} />
          <AppText size={15} color={theme.soft} style={{ flex: 1 }}>
            {item.text}
          </AppText>
        </View>
      ))}
    </View>
  );
}
