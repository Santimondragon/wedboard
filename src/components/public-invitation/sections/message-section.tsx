import { Section } from "./section"

interface MessageSectionProps {
  /** Optional headline; section renders without one when omitted. */
  headline?: string
  message?: string
}

export function MessageSection({ headline, message }: MessageSectionProps) {
  return (
    <Section heading={headline}>
      <p className="text-lg leading-relaxed text-zinc-600">
        {message ??
          "We are so happy to share this special day with you. Your presence means the world to us, and we cannot wait to celebrate together."}
      </p>
    </Section>
  )
}
