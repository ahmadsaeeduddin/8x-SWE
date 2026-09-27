export const MAX_AUDIO_FILE_BYTES = 50_000_000;
export const AUDIO_FILE_ACCEPT = ".mp3,.m4a,.wav,.webm,.ogg,audio/mpeg,audio/mp4,audio/wav,audio/webm,audio/ogg";
export const AUDIO_DURATION_TOLERANCE_SECONDS = 2;

const AUDIO_TYPES_BY_EXTENSION: Record<string, readonly string[]> = {
  mp3: ["audio/mpeg", "audio/mp3"],
  m4a: ["audio/mp4", "audio/x-m4a"],
  wav: ["audio/wav", "audio/x-wav"],
  webm: ["audio/webm"],
  ogg: ["audio/ogg", "application/ogg"],
};

export type AudioFileInfo = {
  name: string;
  size: number;
  type: string;
};

export function getAudioExtension(fileName: string) {
  return fileName.toLocaleLowerCase().split(".").pop() ?? "";
}

export function getAudioMimeType(file: AudioFileInfo) {
  const extension = getAudioExtension(file.name);
  return file.type || AUDIO_TYPES_BY_EXTENSION[extension]?.[0] || "application/octet-stream";
}

export function validateAudioFile(file: AudioFileInfo): string | null {
  if (file.size === 0) return "The selected audio file is empty.";
  if (file.size > MAX_AUDIO_FILE_BYTES) return "The audio file must be 50 MB or smaller.";

  const extension = getAudioExtension(file.name);
  const allowedTypes = AUDIO_TYPES_BY_EXTENSION[extension];
  if (!allowedTypes) return "Audio must be an MP3, M4A, WAV, WebM, or OGG file.";

  if (file.type && !allowedTypes.includes(file.type.toLocaleLowerCase())) {
    return `The ${extension.toUpperCase()} file has an unsupported audio type.`;
  }

  return null;
}

export function validateTranscriptAgainstAudio(
  transcriptDurationSeconds: number,
  audioDurationSeconds: number,
) {
  if (!Number.isFinite(audioDurationSeconds) || audioDurationSeconds <= 0) {
    return "The audio duration could not be read.";
  }

  if (
    transcriptDurationSeconds >
    audioDurationSeconds + AUDIO_DURATION_TOLERANCE_SECONDS
  ) {
    return `The transcript reaches ${Math.round(transcriptDurationSeconds)}s, but the audio is only ${Math.round(audioDurationSeconds)}s long.`;
  }

  return null;
}
