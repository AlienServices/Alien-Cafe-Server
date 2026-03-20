import MarkdownIt from "markdown-it";
import sanitizeHtml from "sanitize-html";

const md = new MarkdownIt({ html: true, linkify: true, breaks: false });

const ALLOWED_TAGS = [
  "p",
  "br",
  "a",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "ul",
  "ol",
  "li",
  "img",
  "video",
  "source",
];

const ALLOWED_ATTR = {
  a: ["href", "target", "rel"],
  img: ["src", "alt"],
  video: ["src", "controls"],
  source: ["src", "type"],
} as Record<string, string[]>;

export function renderSanitizedContent(
  rawHtml?: string | null,
  contentMarkdown?: string | null,
) {
  const htmlFromMarkdown = contentMarkdown
    ? md.render(contentMarkdown)
    : undefined;
  const raw = htmlFromMarkdown ?? rawHtml ?? "";

  const sanitizedHtml = sanitizeHtml(raw, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: ALLOWED_ATTR,
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", {
        rel: "noopener noreferrer",
        target: "_blank",
      }),
    },
  });

  const textOnly = sanitizeHtml(sanitizedHtml, {
    allowedTags: [],
    allowedAttributes: {},
  }).trim();

  return { sanitizedHtml, textOnly, htmlFromMarkdown };
}

export default renderSanitizedContent;
