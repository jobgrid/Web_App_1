import type { Metadata } from "next";

import { BuyCreditsCard } from "@/components/employer/buy-credits-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatPrice, timeAgo } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Billing" };

export default async function BillingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: company } = await supabase
    .from("companies")
    .select("id")
    .eq("owner_id", user!.id)
    .single();

  const [{ data: products }, { data: purchases }] = await Promise.all([
    supabase.from("ad_products").select("*").order("sort"),
    supabase
      .from("purchases")
      .select("*, ad_products(name)")
      .eq("company_id", company!.id)
      .order("created_at", { ascending: false }),
  ]);

  const credits: Record<string, number> = {};
  for (const purchase of purchases ?? []) {
    credits[purchase.product_code] =
      (credits[purchase.product_code] ?? 0) + purchase.credits_remaining;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Billing & credits</h1>
        <p className="text-sm text-muted-foreground">
          Buy ad credits one at a time or in discounted packs. Credits never
          expire — the ad clock starts when you publish.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {(products ?? []).map((product) => (
          <Card key={product.code} className="gap-2 py-4">
            <CardContent className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{product.name} credits</p>
                <p className="font-mono text-3xl font-bold">{credits[product.code] ?? 0}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <BuyCreditsCard products={products ?? []} />

      <Card className="py-0">
        <CardHeader className="pt-6">
          <CardTitle className="text-base">Purchase history</CardTitle>
        </CardHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">Unit price</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">When</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(purchases ?? []).map((purchase) => (
              <TableRow key={purchase.id}>
                <TableCell className="font-medium">{purchase.ad_products?.name}</TableCell>
                <TableCell className="text-right font-mono">{purchase.quantity}</TableCell>
                <TableCell className="text-right font-mono">
                  {formatPrice(purchase.unit_price_cents)}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {formatPrice(purchase.total_cents)}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{purchase.status}</Badge>
                </TableCell>
                <TableCell className="text-right text-sm text-muted-foreground">
                  {timeAgo(purchase.created_at)}
                </TableCell>
              </TableRow>
            ))}
            {(purchases ?? []).length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                  No purchases yet — your first Basic ad is free.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
