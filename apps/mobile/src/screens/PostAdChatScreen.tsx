import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { GradientButton, Pill } from "../components/Glass";
import { toast } from "../components/Toast";
import { getCredits, publishAd, type NewAd } from "../lib/data";
import { parseSalaryRange, workTypeLabel } from "../lib/format";
import type { Company } from "../lib/supabase";
import { colors, gradients, radius, tierColors } from "../theme";

type Bubble = { id: string; from: "bot" | "me"; text: string };

type Step =
  | "title"
  | "category"
  | "location"
  | "remote"
  | "workType"
  | "salary"
  | "skills"
  | "description"
  | "tier"
  | "confirm"
  | "done";

const CATEGORIES = ["Engineering", "Healthcare", "Sales", "Design", "Marketing", "Other"];
const WORK_TYPES = ["full_time", "part_time", "contract", "casual", "internship"];

const PROMPTS: Record<Step, (ad: Partial<NewAd>, company: Company) => string> = {
  title: () => "Hi! I'm Gridi 🤖 Let's get your ad live in under a minute. What role are you hiring for?",
  category: (ad) => `“${ad.title}” — nice. Which category fits best?`,
  location: () => "Where is the role based?",
  remote: () => "Is it remote-friendly?",
  workType: () => "What's the work type?",
  salary: () => "What's the yearly salary range? (e.g. “150k – 185k”, or tap Skip)",
  skills: () => "List the key skills, separated by commas — I'll use them for AI matching.",
  description: () => "Now describe the role in a couple of sentences. Sell it!",
  tier: () => "Last step — pick an ad tier.",
  confirm: () => "Here's your ad. Ready to publish?",
  done: (ad) => `🎉 “${ad.title}” is live! Matched candidates are seeing it right now, and auto-apply is already working for you.`,
};

let bubbleCounter = 0;
function nextId() {
  bubbleCounter += 1;
  return `bubble-${bubbleCounter}`;
}

export function PostAdChatScreen({
  company,
  userId,
  onClose,
  onPublished,
}: {
  company: Company;
  userId: string;
  onClose: () => void;
  onPublished: () => void;
}) {
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [step, setStep] = useState<Step>("title");
  const [ad, setAd] = useState<Partial<NewAd>>({});
  const [input, setInput] = useState("");
  const [credits, setCredits] = useState<Record<string, number>>({});
  const [publishing, setPublishing] = useState(false);
  const listRef = useRef<FlatList<Bubble>>(null);

  useEffect(() => {
    getCredits(company.id).then(setCredits);
    setBubbles([{ id: nextId(), from: "bot", text: PROMPTS.title({}, company) }]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function pushBot(text: string) {
    setBubbles((previous) => [...previous, { id: nextId(), from: "bot", text }]);
  }

  function advance(nextStep: Step, updated: Partial<NewAd>, echo: string) {
    setBubbles((previous) => [...previous, { id: nextId(), from: "me", text: echo }]);
    setAd(updated);
    setStep(nextStep);
    setTimeout(() => pushBot(PROMPTS[nextStep](updated, company)), 350);
  }

  function submitText() {
    const value = input.trim();
    if (!value) return;
    setInput("");
    if (step === "title") advance("category", { ...ad, title: value }, value);
    else if (step === "location") advance("remote", { ...ad, location: value }, value);
    else if (step === "salary") {
      const { min, max } = parseSalaryRange(value);
      advance("skills", { ...ad, salaryMin: min, salaryMax: max }, value);
    } else if (step === "skills") {
      const skills = value
        .split(",")
        .map((skill) => skill.trim())
        .filter(Boolean);
      advance("description", { ...ad, skills }, skills.join(", "));
    } else if (step === "description") {
      advance("tier", { ...ad, description: value }, value);
    }
  }

  async function publish() {
    setPublishing(true);
    const finalAd: NewAd = {
      title: ad.title ?? "Untitled role",
      category: ad.category ?? "Other",
      location: ad.location ?? "",
      isRemote: ad.isRemote ?? false,
      workType: ad.workType ?? "full_time",
      salaryMin: ad.salaryMin ?? null,
      salaryMax: ad.salaryMax ?? null,
      skills: ad.skills ?? [],
      description: ad.description ?? "",
      tier: (ad.tier as NewAd["tier"]) ?? "basic",
    };
    const { error } = await publishAd(company, userId, finalAd);
    setPublishing(false);
    if (error) {
      toast(error, "error");
      pushBot(`Hmm, that didn't work: ${error}`);
      return;
    }
    setStep("done");
    pushBot(PROMPTS.done(ad, company));
    onPublished();
  }

  const showTextInput = ["title", "location", "salary", "skills", "description"].includes(step);

  const chips: { label: string; onPress: () => void }[] =
    step === "category"
      ? CATEGORIES.map((category) => ({
          label: category,
          onPress: () => advance("location", { ...ad, category }, category),
        }))
      : step === "remote"
        ? [
            { label: "Yes, remote-friendly", onPress: () => advance("workType", { ...ad, isRemote: true }, "Remote-friendly") },
            { label: "On-site", onPress: () => advance("workType", { ...ad, isRemote: false }, "On-site") },
          ]
        : step === "workType"
          ? WORK_TYPES.map((type) => ({
              label: workTypeLabel(type),
              onPress: () => advance("salary", { ...ad, workType: type }, workTypeLabel(type)),
            }))
          : step === "salary"
            ? [{ label: "Skip", onPress: () => advance("skills", { ...ad, salaryMin: null, salaryMax: null }, "Skip salary") }]
            : step === "tier"
              ? (["basic", "branded", "premium"] as const).map((tier) => ({
                  label: `${tierColors[tier]!.label} · ${credits[tier] ?? 0} credit${(credits[tier] ?? 0) === 1 ? "" : "s"}`,
                  onPress: () => advance("confirm", { ...ad, tier }, `${tierColors[tier]!.label} ad`),
                }))
              : [];

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <BlurView intensity={45} tint="light" style={styles.header}>
        <Pressable onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close" size={20} color={colors.text} />
        </Pressable>
        <View style={styles.headerCenter}>
          <LinearGradient
            colors={gradients.primary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.botAvatar}
          >
            <Ionicons name="sparkles" size={16} color="#fff" />
          </LinearGradient>
          <View>
            <Text style={styles.headerTitle}>New ad</Text>
            <Text style={styles.headerSub}>with Gridi, your hiring copilot</Text>
          </View>
        </View>
        <View style={{ width: 36 }} />
      </BlurView>

      <FlatList
        ref={listRef}
        data={bubbles}
        keyExtractor={(bubble) => bubble.id}
        contentContainerStyle={styles.list}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        renderItem={({ item: bubble }) =>
          bubble.from === "bot" ? (
            <View style={styles.botRow}>
              <View style={[styles.bubble, styles.botBubble]}>
                <Text style={styles.botText}>{bubble.text}</Text>
              </View>
            </View>
          ) : (
            <View style={styles.meRow}>
              <LinearGradient
                colors={gradients.bubble}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.bubble, styles.meBubble]}
              >
                <Text style={styles.meText}>{bubble.text}</Text>
              </LinearGradient>
            </View>
          )
        }
        ListFooterComponent={
          step === "confirm" ? (
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>{ad.title}</Text>
              <View style={styles.summaryPills}>
                <Pill
                  label={tierColors[ad.tier ?? "basic"]!.label}
                  fg={tierColors[ad.tier ?? "basic"]!.fg}
                  bg={tierColors[ad.tier ?? "basic"]!.bg}
                />
                <Pill label={ad.category ?? "Other"} fg={colors.muted} bg="rgba(18,20,43,0.06)" />
                <Pill
                  label={ad.isRemote ? "Remote" : ad.location ?? ""}
                  fg={colors.muted}
                  bg="rgba(18,20,43,0.06)"
                />
                <Pill
                  label={workTypeLabel(ad.workType ?? "full_time")}
                  fg={colors.muted}
                  bg="rgba(18,20,43,0.06)"
                />
                {ad.salaryMin != null && (
                  <Pill
                    label={`$${Math.round((ad.salaryMin ?? 0) / 1000)}k–$${Math.round((ad.salaryMax ?? 0) / 1000)}k`}
                    fg="#047857"
                    bg={colors.successSoft}
                  />
                )}
              </View>
              {(ad.skills ?? []).length > 0 && (
                <View style={styles.summaryPills}>
                  {(ad.skills ?? []).map((skill) => (
                    <Pill key={skill} label={skill} fg={colors.primary} bg={colors.primarySoft} />
                  ))}
                </View>
              )}
              <Text style={styles.summaryDescription} numberOfLines={4}>
                {ad.description}
              </Text>
              <GradientButton
                label={publishing ? "Publishing…" : "Publish ad 🚀"}
                onPress={publish}
                loading={publishing}
              />
            </View>
          ) : step === "done" ? (
            <GradientButton
              label="Back to dashboard"
              onPress={onClose}
              colors={gradients.success}
              style={{ marginTop: 12 }}
            />
          ) : null
        }
      />

      {(showTextInput || chips.length > 0) && step !== "confirm" && step !== "done" && (
        <BlurView intensity={45} tint="light" style={styles.inputBar}>
          {chips.length > 0 && (
            <View style={styles.chipRow}>
              {chips.map((chip) => (
                <Pressable
                  key={chip.label}
                  onPress={chip.onPress}
                  style={({ pressed }) => [styles.chip, pressed && { opacity: 0.7 }]}
                >
                  <Text style={styles.chipText}>{chip.label}</Text>
                </Pressable>
              ))}
            </View>
          )}
          {showTextInput && (
            <View style={styles.textRow}>
              <TextInput
                style={styles.input}
                value={input}
                onChangeText={setInput}
                placeholder={
                  step === "title"
                    ? "e.g. Senior Product Designer"
                    : step === "location"
                      ? "e.g. Sydney, NSW"
                      : step === "salary"
                        ? "e.g. 150k – 185k"
                        : step === "skills"
                          ? "e.g. Figma, Prototyping, Design systems"
                          : "Describe the role…"
                }
                placeholderTextColor={colors.faint}
                multiline={step === "description"}
                onSubmitEditing={step === "description" ? undefined : submitText}
                returnKeyType="send"
              />
              <Pressable onPress={submitText} style={({ pressed }) => pressed && { opacity: 0.7 }}>
                <LinearGradient
                  colors={gradients.primary}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.sendButton}
                >
                  <Ionicons name="arrow-up" size={20} color="#fff" />
                </LinearGradient>
              </Pressable>
            </View>
          )}
        </BlurView>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 14,
    paddingBottom: 10,
    paddingHorizontal: 12,
    backgroundColor: "rgba(255,255,255,0.55)",
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorder,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.75)",
  },
  headerCenter: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
  },
  botAvatar: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 15, fontWeight: "800", color: colors.text },
  headerSub: { fontSize: 11, color: colors.muted, fontWeight: "600" },
  list: { padding: 16, gap: 8, paddingBottom: 24 },
  botRow: { flexDirection: "row" },
  meRow: { flexDirection: "row", justifyContent: "flex-end" },
  bubble: { maxWidth: "84%", borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10 },
  botBubble: {
    backgroundColor: "rgba(255,255,255,0.88)",
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderBottomLeftRadius: 6,
  },
  meBubble: { borderBottomRightRadius: 6 },
  botText: { fontSize: 14.5, color: colors.text, lineHeight: 21 },
  meText: { fontSize: 14.5, color: "#fff", lineHeight: 21 },
  summaryCard: {
    backgroundColor: "rgba(255,255,255,0.92)",
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: radius.lg,
    padding: 16,
    gap: 10,
    marginTop: 8,
  },
  summaryTitle: { fontSize: 17, fontWeight: "900", color: colors.text },
  summaryPills: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  summaryDescription: { fontSize: 13, color: colors.muted, lineHeight: 19 },
  inputBar: {
    padding: 12,
    paddingBottom: 22,
    gap: 10,
    backgroundColor: "rgba(255,255,255,0.55)",
    borderTopWidth: 1,
    borderTopColor: colors.glassBorder,
  },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: "rgba(99,102,241,0.22)",
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  chipText: { fontSize: 13, fontWeight: "700", color: colors.primary },
  textRow: { flexDirection: "row", alignItems: "flex-end", gap: 9 },
  input: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.9)",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 15,
    paddingVertical: 11,
    fontSize: 14.5,
    color: colors.text,
    maxHeight: 110,
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
});
