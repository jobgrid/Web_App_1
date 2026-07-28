"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { JOB_CATEGORIES } from "@/lib/constants";
import { WORK_TYPE_LABELS } from "@/lib/format";

type Defaults = {
  q: string;
  location: string;
  type: string;
  category: string;
  remote: boolean;
};

export function JobFilters({ defaults }: { defaults: Defaults }) {
  const router = useRouter();
  const [q, setQ] = useState(defaults.q);
  const [location, setLocation] = useState(defaults.location);
  const [type, setType] = useState(defaults.type);
  const [category, setCategory] = useState(defaults.category);
  const [remote, setRemote] = useState(defaults.remote);

  function apply() {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (location) params.set("location", location);
    if (type !== "all") params.set("type", type);
    if (category !== "all") params.set("category", category);
    if (remote) params.set("remote", "true");
    router.push(`/jobs?${params.toString()}`);
  }

  return (
    <Card className="h-fit lg:sticky lg:top-20">
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="filter-q">Keywords</Label>
          <Input
            id="filter-q"
            placeholder="Title or skill"
            value={q}
            onChange={(event) => setQ(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && apply()}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="filter-location">Location</Label>
          <Input
            id="filter-location"
            placeholder="e.g. Sydney"
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && apply()}
          />
        </div>
        <div className="space-y-2">
          <Label>Work type</Label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {Object.entries(WORK_TYPE_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Category</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {JOB_CATEGORIES.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            id="filter-remote"
            checked={remote}
            onCheckedChange={(checked) => setRemote(checked === true)}
          />
          <Label htmlFor="filter-remote" className="font-normal">
            Remote only
          </Label>
        </div>
        <Button className="w-full" onClick={apply}>
          <Search className="size-4" /> Search
        </Button>
      </CardContent>
    </Card>
  );
}
