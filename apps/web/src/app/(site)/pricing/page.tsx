import Link from "next/link";
import type { Metadata } from "next";
import { Check, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PACK_DISCOUNTS } from "@/lib/constants";
import { formatPrice } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Pricing" };

export default async function PricingPage() {
  const supabase = await createClient();
  const { data: products } = await supabase
    .from("ad_products")
    .select("*")
    .order("sort");

  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
          Simple pricing. No surprises.
        </h1>
        <p className="mt-3 text-muted-foreground">
          Every ad runs until its expiry date, comes with AI candidate matching,
          real-time chat and full analytics. Up to 85% cheaper than the big boards.
        </p>
      </div>

      <div className="mt-12 grid gap-6 md:grid-cols-3">
        {products?.map((product) => {
          const features = (product.features as string[]) ?? [];
          const highlight = product.tier === "branded";
          return (
            <Card
              key={product.code}
              className={cn("relative flex flex-col", highlight && "border-primary shadow-lg")}
            >
              {highlight && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 gap-1">
                  <Sparkles className="size-3" /> Most popular
                </Badge>
              )}
              <CardHeader>
                <CardTitle>{product.name}</CardTitle>
                <CardDescription>{product.description}</CardDescription>
                <div className="mt-4 flex items-baseline gap-2">
                  <span className="text-4xl font-bold tracking-tight">
                    {formatPrice(product.price_cents)}
                  </span>
                  <span className="text-sm text-muted-foreground">/ ad</span>
                </div>
                {product.compare_at_cents && (
                  <p className="text-sm text-muted-foreground">
                    <span className="line-through">{formatPrice(product.compare_at_cents)}</span>{" "}
                    on legacy boards
                  </p>
                )}
                <p className="text-sm font-medium text-primary">
                  Live for {product.duration_days} days
                </p>
              </CardHeader>
              <CardContent className="flex-1">
                <ul className="space-y-2.5">
                  {features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm">
                      <Check className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button asChild className="w-full" variant={highlight ? "default" : "outline"}>
                  <Link href="/signup?role=employer">Get started</Link>
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>

      <div className="mx-auto mt-12 max-w-2xl rounded-xl border bg-muted/30 p-6 text-center">
        <h2 className="font-semibold">Buying in bulk?</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Credits never expire until used — each ad&apos;s clock starts when you publish.
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-3">
          {PACK_DISCOUNTS.map((pack) => (
            <Badge key={pack.minQuantity} variant="secondary" className="px-3 py-1.5 text-sm">
              {pack.label}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}
