import React from "react";

/**
 * Parses text and converts URLs (starting with http://, https://, or www.) into blue clickable links.
 */
export function renderBioWithLinks(text: string) {
  if (!text) return null;

  // Match http/https URLs, www. URLs, and general domain patterns (e.g. google.com, github.com/test)
  const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\/[^\s]*)?)/gi;

  const parts = text.split(urlRegex);
  if (parts.length === 1) {
    return <span>{text}</span>;
  }

  return (
    <span>
      {parts.map((part, index) => {
        if (part.match(urlRegex)) {
          // Clean up any trailing punctuation commonly typed at the end of a sentence
          let cleanPart = part;
          let trailingPunctuation = "";
          const trailingMatch = part.match(/([.,!?;:)]+)$/);
          if (trailingMatch) {
            cleanPart = part.substring(0, part.length - trailingMatch[0].length);
            trailingPunctuation = trailingMatch[0];
          }

          const href = cleanPart.toLowerCase().startsWith("http")
            ? cleanPart
            : `https://${cleanPart}`;

          return (
            <React.Fragment key={index}>
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 hover:underline font-medium break-all"
                onClick={(e) => e.stopPropagation()}
              >
                {cleanPart}
              </a>
              {trailingPunctuation}
            </React.Fragment>
          );
        }
        return part;
      })}
    </span>
  );
}
