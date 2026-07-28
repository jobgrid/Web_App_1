"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Check, Sparkles } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { JOB_CATEGORIES } from "@/lib/constants";
import type { Tables } from "@/lib/database.types";
import { WORK_TYPE_LABELS, formatPrice } from "@/lib/format";
import { publishJob } from "@/lib/actions/employer";
import { cn } from "@/lib/utils";

type PostJobFormProps = {
  products: Tables<"ad_products">[];
  credits: Record<string, number>;
  firstAdFree: boolean;
};

export function PostJobForm({ products, credits, firstAdFree }: PostJobFormProps) {
  const [tier, setTier] = useState<string>("basic");
  const [state, formAction, pending] = useActionState(publishJob, {});
  const selectedProduct = products.find((product) => product.tier === tier);
  const showHighlights = tier !== "basic";

  return (
    <form action={formAction} className="space-y-6">
      {/* Ad tier selection */}
      <div className="grid gap-3 sm:grid-cols-3">
        {products.map((product) => {
          const available = credits[product.code] ?? 0;
          const selected = tier === product.tier;
          const freeBadge = product.tier === "basic" && firstAdFree && available === 0;
          return (
            <button
              key={product.code}
              type="button"
              onClick={() => setTier(product.tier)}
              className={cn(
                "rounded-xl border p-4 text-left transition-colors",
                selected ? "border-primary bg-accent/50 ring-1 ring-primary" : "hover:bg-muted"
              )}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold">{product.name}</span>
                {selected && <Check className="size-4 text-primary" />}
              </div>
              <p className="mt-1 text-2xl font-bold">
                {freeBadge ? "Free" : formatPrice(product.price_cents)}
              </p>
              <p className="text-xs text-muted-foreground">
                Live {product.duration_days} days
              </p>
              <div className="mt-2">
                {freeBadge ? (
                  <Badge className="gap-1 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/10">
                    <Sparkles className="size-3" /> First ad free
                  </Badge>
                ) : available > 0 ? (
                  <Badge variant="secondary">{available} credit{available === 1 ? "" : "s"}</Badge>
                ) : (
                  <Badge variant="outline">No credits</Badge>
                )}
              </div>
            </button>
          );
        })}
      </div>
      <input type="hidden" name="tier" value={tier} />
      <p className="text-xs text-muted-foreground">
        Need more credits?{" "}
        <Link href="/employer/billing" className="text-primary hover:underline">
          Buy packs in Billing
        </Link>{" "}
        — packs of 5 save 15%, packs of 10 save 25%.
      </p>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Job details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Job title</Label>
            <Input id="title" name="title" placeholder="Senior Machine Learning Engineer" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              rows={8}
              placeholder="What the role involves, who you're looking for, what you offer…"
              required
            />
          </div>

          {showHighlights && (
            <div className="space-y-2 rounded-lg border border-primary/20 bg-accent/40 p-4">
              <Label>Key selling points (shown on your branded card)</Label>
              {[1, 2, 3].map((index) => (
                <Input
                  key={index}
                  name={`highlight_${index}`}
                  placeholder={
                    index === 1
                      ? "e.g. Flexible hours & 4-day week option"
                      : index === 2
                        ? "e.g. Equity package + annual bonus"
                        : "e.g. World-class AI research team"
                  }
                />
              ))}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input id="location" name="location" placeholder="Sydney, NSW" />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select name="category" defaultValue="Engineering">
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {JOB_CATEGORIES.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Work type</Label>
              <Select name="work_type" defaultValue="full_time">
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(WORK_TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-2 pb-2">
              <Checkbox id="is_remote" name="is_remote" />
              <Label htmlFor="is_remote" className="font-normal">
                Remote friendly
              </Label>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="salary_min">Salary min</Label>
              <Input id="salary_min" name="salary_min" type="number" min={0} placeholder="120000" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="salary_max">Salary max</Label>
              <Input id="salary_max" name="salary_max" type="number" min={0} placeholder="160000" />
            </div>
            <div className="space-y-2">
              <Label>Per</Label>
              <Select name="salary_period" defaultValue="year">
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="year">Year</SelectItem>
                  <SelectItem value="day">Day</SelectItem>
                  <SelectItem value="hour">Hour</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="skills">Skills (comma-separated — powers AI matching)</Label>
            <Input
              id="skills"
              name="skills"
              placeholder="Python, PyTorch, LLM, RAG"
            />
          </div>
        </CardContent>
      </Card>

      {state.error && (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending
          ? "Publishing…"
          : `Publish ${selectedProduct?.name ?? "ad"} — live for ${selectedProduct?.duration_days ?? 30} days`}
      </Button>
    </form>
  );
}
