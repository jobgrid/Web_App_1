"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { FileText, UploadCloud } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { uploadCv } from "@/lib/actions/candidate";
import { timeAgo } from "@/lib/format";

type CvUploadCardProps = {
  cvFilename: string | null;
  updatedAt: string | null;
};

export function CvUploadCard({ cvFilename, updatedAt }: CvUploadCardProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleUpload(file: File) {
    setFileName(file.name);
    const formData = new FormData();
    formData.set("cv", file);
    startTransition(async () => {
      const result = await uploadCv(formData);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(result.success);
        router.refresh();
      }
      setFileName(null);
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Your CV</CardTitle>
        <CardDescription>
          PDF or plain text, up to 10&nbsp;MB. We parse it with AI to build your
          skill profile.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {cvFilename && (
          <div className="flex items-center gap-3 rounded-lg border bg-muted/40 p-3 text-sm">
            <FileText className="size-5 text-primary" />
            <div>
              <p className="font-medium">{cvFilename}</p>
              {updatedAt && (
                <p className="text-xs text-muted-foreground">Updated {timeAgo(updatedAt)}</p>
              )}
            </div>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.txt,.md,text/plain,application/pdf"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) handleUpload(file);
            event.target.value = "";
          }}
        />
        <Button
          onClick={() => inputRef.current?.click()}
          disabled={pending}
          variant={cvFilename ? "outline" : "default"}
          className="w-full"
          size="lg"
        >
          <UploadCloud className="size-4" />
          {pending
            ? `Parsing ${fileName ?? "CV"}…`
            : cvFilename
              ? "Replace CV"
              : "Upload CV"}
        </Button>
      </CardContent>
    </Card>
  );
}
