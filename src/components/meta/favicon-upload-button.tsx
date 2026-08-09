"use client";

import { useRef, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import { Id } from "convex/_generated/dataModel";
import { toast } from "sonner";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FAVICON_MIME_TYPES } from "convex/lib/meta";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB — mirrors convex/media.ts

/** Some browsers report an empty mime type for .ico files. */
function resolveMimeType(file: File): string {
  if (file.type) return file.type;
  if (file.name.toLowerCase().endsWith(".ico")) return "image/x-icon";
  return "";
}

interface FaviconUploadButtonProps {
  eventId: Id<"events">;
  onUploaded: (mediaId: Id<"media">) => void;
}

/** Uploads an .ico/.svg/.png favicon into the event media library. */
export function FaviconUploadButton({
  eventId,
  onUploaded,
}: FaviconUploadButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const generateUploadUrl = useMutation(api.media.generateUploadUrl);
  const registerMedia = useMutation(api.media.register);

  async function handleFile(file: File) {
    const mimeType = resolveMimeType(file);
    if (!FAVICON_MIME_TYPES.includes(mimeType)) {
      toast.error("Favicon must be an .ico, .svg, or .png file");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error("Favicon must be smaller than 5MB");
      return;
    }

    setUploading(true);
    try {
      const uploadUrl = await generateUploadUrl({ eventId });
      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": mimeType },
        body: file,
      });
      if (!response.ok) throw new Error("Upload failed");
      const { storageId } = (await response.json()) as {
        storageId: Id<"_storage">;
      };
      const mediaId = await registerMedia({
        eventId,
        storageId,
        name: file.name,
        mimeType,
        size: file.size,
      });
      toast.success("Favicon uploaded");
      onUploaded(mediaId);
    } catch {
      toast.error("Failed to upload favicon");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".ico,.svg,.png,image/x-icon,image/vnd.microsoft.icon,image/svg+xml,image/png"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
      <Button
        size="sm"
        variant="outline"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
      >
        <Upload className="mr-1 size-4" />
        {uploading ? "Uploading…" : "Upload favicon"}
      </Button>
    </>
  );
}
