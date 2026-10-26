import { Inline } from "./Inline";
import type { Block } from "@/content/blog";

/** The article text: headings, paragraphs, lists and tip boxes. */
export function PostBody({ blocks }: { blocks: readonly Block[] }) {
  return (
    <>
      {blocks.map((block, i) => {
        switch (block.t) {
          case "h2":
            return <h2 key={i}>{block.x}</h2>;
          case "h3":
            return <h3 key={i}>{block.x}</h3>;
          case "p":
            return (
              <p key={i}>
                <Inline text={block.x} />
              </p>
            );
          case "note":
            return (
              <p key={i} className="post__note" role="note">
                <Inline text={block.x} />
              </p>
            );
          case "ul":
            return (
              <ul key={i}>
                {block.x.map((item) => (
                  <li key={item}>
                    <Inline text={item} />
                  </li>
                ))}
              </ul>
            );
          case "ol":
            return (
              <ol key={i}>
                {block.x.map((item) => (
                  <li key={item}>
                    <Inline text={item} />
                  </li>
                ))}
              </ol>
            );
        }
      })}
    </>
  );
}
