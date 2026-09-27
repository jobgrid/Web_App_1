import { useState } from "react";
import { View } from "react-native";
import { setRequirementMandatory, setSalaryCeiling } from "../domain/extractRequirements";
import { formatMoney } from "../domain/format";
import type { Requirement } from "../types";
import { AppText } from "./Text";
import { theme } from "./theme";

function MoneySlider({ value, onChange }: { value: number; onChange: (amount: number) => void }) {
  const min = 60000;
  const max = 120000;
  const width = { current: 1 };
  const setFromX = (x: number) => {
    const ratio = Math.min(1, Math.max(0, x / width.current));
    const next = Math.round((min + ratio * (max - min)) / 1000) * 1000;
    onChange(next);
  };

  return (
    <View style={{ gap: 8, marginTop: 8 }}>
      <AppText size={14} weight="600">
        {formatMoney(value)}
      </AppText>
      <View
        accessibilityLabel="Salary ceiling"
        onLayout={(event) => {
          width.current = event.nativeEvent.layout.width;
        }}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={(event) => setFromX(event.nativeEvent.locationX)}
        onResponderMove={(event) => setFromX(event.nativeEvent.locationX)}
        style={{ height: 36, justifyContent: "center" }}
      >
        <View style={{ height: 4, borderRadius: 2, backgroundColor: "rgba(26,25,22,0.12)" }} />
        <View
          style={{
            position: "absolute",
            left: `${((value - min) / (max - min)) * 100}%`,
            width: 22,
            height: 22,
            marginLeft: -11,
            borderRadius: 11,
            backgroundColor: theme.ink,
          }}
        />
      </View>
    </View>
  );
}

export function Requirements({
  requirements,
  onChange,
}: {
  requirements: Requirement[];
  onChange?: (requirements: Requirement[]) => void;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const must = requirements.filter((item) => item.mandatory && item.category !== "other");
  const nice = requirements.filter((item) => !item.mandatory && item.category !== "other");
  const role = requirements.find((item) => item.category === "other");

  const renderGroup = (title: string, items: Requirement[]) => {
    if (!items.length) return null;
    return (
      <View style={{ gap: 8 }}>
        <AppText size={13} weight="600" color={theme.faint}>
          {title}
        </AppText>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {items.map((item) => {
            const open = openId === item.id;
            return (
              <View key={item.id} style={{ maxWidth: "100%" }}>
                <AppText
                  onPress={
                    onChange
                      ? () => {
                          if (item.category === "salary") setOpenId(open ? null : item.id);
                          else onChange(setRequirementMandatory(requirements, item.id, !item.mandatory));
                        }
                      : undefined
                  }
                  accessibilityRole={onChange ? "button" : undefined}
                  accessibilityLabel={item.description}
                  size={15}
                  style={{
                    overflow: "hidden",
                    backgroundColor: "rgba(255,252,247,0.78)",
                    borderColor: theme.stroke,
                    borderWidth: 1,
                    borderRadius: 999,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                  }}
                >
                  {item.description}
                </AppText>
                {open && item.category === "salary" && item.value?.kind === "money" && onChange ? (
                  <MoneySlider value={item.value.amount} onChange={(amount) => onChange(setSalaryCeiling(requirements, amount))} />
                ) : null}
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <View style={{ gap: 12 }}>
      {role ? (
        <AppText size={16} weight="600">
          {role.description}
          {requirements.find((item) => item.category === "location")
            ? ` · ${requirements.find((item) => item.category === "location")?.description}`
            : ""}
        </AppText>
      ) : null}
      {renderGroup("Must have", must.filter((item) => item.category !== "location"))}
      {renderGroup("Nice to have", nice)}
      {onChange ? (
        <AppText size={13} color={theme.faint}>
          Tap a requirement to mark it must-have or nice. Tap salary to move the ceiling.
        </AppText>
      ) : null}
    </View>
  );
}
