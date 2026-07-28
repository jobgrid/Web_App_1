"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ShoppingCart } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { packDiscount } from "@/lib/constants";
import type { Tables } from "@/lib/database.types";
import { formatPrice } from "@/lib/format";
import { buyCredits } from "@/lib/actions/employer";

const QUANTITIES = [1, 3, 5, 10, 20];

export function BuyCreditsCard({ products }: { products: Tables<"ad_products">[] }) {
  const router = useRouter();
  const [productCode, setProductCode] = useState(products[0]?.code ?? "basic");
  const [quantity, setQuantity] = useState(1);
  const [pending, startTransition] = useTransition();

  const product = products.find((item) => item.code === productCode);
  const discount = packDiscount(quantity);
  const unitPrice = product ? Math.round(product.price_cents * (1 - discount)) : 0;
  const total = unitPrice * quantity;

  function submit() {
    startTransition(async () => {
      const result = await buyCredits(productCode, quantity);
      if (result.error) toast.error(result.error);
      else {
        toast.success(result.success);
        router.refresh();
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Buy credits</CardTitle>
        <CardDescription>
          Demo checkout — connect Stripe to take live payments.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap items-end gap-4">
        <div className="space-y-2">
          <Label>Ad type</Label>
          <Select value={productCode} onValueChange={setProductCode}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {products.map((item) => (
                <SelectItem key={item.code} value={item.code}>
                  {item.name} — {formatPrice(item.price_cents)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Quantity</Label>
          <Select value={String(quantity)} onValueChange={(value) => setQuantity(Number(value))}>
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {QUANTITIES.map((amount) => (
                <SelectItem key={amount} value={String(amount)}>
                  {amount}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-sm">
            <p className="text-muted-foreground">Total</p>
            <p className="font-mono text-xl font-bold">{formatPrice(total)}</p>
          </div>
          {discount > 0 && (
            <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/10">
              {Math.round(discount * 100)}% pack discount
            </Badge>
          )}
        </div>
        <Button onClick={submit} disabled={pending || !product}>
          <ShoppingCart className="size-4" />
          {pending ? "Processing…" : "Buy credits"}
        </Button>
      </CardContent>
    </Card>
  );
}
