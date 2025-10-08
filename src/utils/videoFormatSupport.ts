/**
 * Utility functions for detecting video format support
 */

export interface VideoFormatSupport {
  mp4: boolean;
  webm: boolean;
  preferredFormat: string;
  fallbackFormat: string;
}

/**
 * Check which video formats are supported by the current browser
 */
export function getVideoFormatSupport(): VideoFormatSupport {
  const formats = {
    mp4: {
      h264: MediaRecorder.isTypeSupported("video/mp4;codecs=h264,aac"),
      basic: MediaRecorder.isTypeSupported("video/mp4"),
    },
    webm: {
      vp9: MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus"),
      vp8: MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus"),
      basic: MediaRecorder.isTypeSupported("video/webm"),
    },
  };

  // Determine preferred format based on support
  let preferredFormat = "";
  let fallbackFormat = "";

  if (formats.mp4.h264) {
    preferredFormat = "video/mp4;codecs=h264,aac";
    fallbackFormat = formats.mp4.basic
      ? "video/mp4"
      : formats.webm.vp9
      ? "video/webm;codecs=vp9,opus"
      : formats.webm.vp8
      ? "video/webm;codecs=vp8,opus"
      : formats.webm.basic
      ? "video/webm"
      : "";
  } else if (formats.mp4.basic) {
    preferredFormat = "video/mp4";
    fallbackFormat = formats.webm.vp9
      ? "video/webm;codecs=vp9,opus"
      : formats.webm.vp8
      ? "video/webm;codecs=vp8,opus"
      : formats.webm.basic
      ? "video/webm"
      : "";
  } else if (formats.webm.vp9) {
    preferredFormat = "video/webm;codecs=vp9,opus";
    fallbackFormat = formats.webm.vp8
      ? "video/webm;codecs=vp8,opus"
      : formats.webm.basic
      ? "video/webm"
      : "";
  } else if (formats.webm.vp8) {
    preferredFormat = "video/webm;codecs=vp8,opus";
    fallbackFormat = formats.webm.basic ? "video/webm" : "";
  } else if (formats.webm.basic) {
    preferredFormat = "video/webm";
    fallbackFormat = "";
  }

  return {
    mp4: formats.mp4.h264 || formats.mp4.basic,
    webm: formats.webm.vp9 || formats.webm.vp8 || formats.webm.basic,
    preferredFormat,
    fallbackFormat,
  };
}

/**
 * Get the best MIME type for recording based on browser support
 */
export function getBestRecordingFormat(): string {
  const support = getVideoFormatSupport();
  return support.preferredFormat || support.fallbackFormat || "video/webm";
}

/**
 * Check if the current browser supports MP4 recording
 */
export function supportsMP4Recording(): boolean {
  return getVideoFormatSupport().mp4;
}

/**
 * Get user-friendly format name
 */
export function getFormatDisplayName(mimeType: string): string {
  if (mimeType.includes("mp4")) {
    return "MP4";
  } else if (mimeType.includes("webm")) {
    return "WebM";
  }
  return "Video";
}

/**
 * Get file extension for a MIME type
 */
export function getFileExtension(mimeType: string): string {
  if (mimeType.includes("mp4")) {
    return "mp4";
  } else if (mimeType.includes("webm")) {
    return "webm";
  }
  return "video";
}

/**
 * Check if a video format is MP4 (including H.264 codec detection)
 */
export function isMP4Format(format: string): boolean {
  if (!format) return false;

  return (
    format.includes("mp4") ||
    format.includes("avc1") ||
    format.includes("h264") ||
    format.includes("codecs=avc1") ||
    format.includes("codecs=h264")
  );
}

/**
 * Get the actual video format from metadata or blob type
 */
export function getActualVideoFormat(
  metadataFormat?: string,
  blobType?: string
): string {
  // If we have a blob type, use that as it's more accurate
  if (blobType) {
    return blobType;
  }

  // Fallback to metadata format
  if (metadataFormat) {
    return metadataFormat;
  }

  // Default fallback
  return "video/webm";
}
