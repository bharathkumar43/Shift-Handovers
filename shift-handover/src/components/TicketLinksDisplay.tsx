import { splitTicketInput, ticketTokenHref } from "@/lib/ticket-link-tokens";

type Props = {
  text: string | null | undefined;
  /** One link per row (tables, handover submitted view) */
  variant?: "stacked" | "inline";
  className?: string;
  emptyLabel?: string;
};

export default function TicketLinksDisplay({
  text,
  variant = "stacked",
  className = "",
  emptyLabel = "—",
}: Props) {
  if (!text?.trim()) {
    return <span className="text-gray-400">{emptyLabel}</span>;
  }

  const tokens = splitTicketInput(text);
  if (tokens.length === 0) {
    return <span className="text-gray-400">{emptyLabel}</span>;
  }

  const linkClass =
    "text-indigo-600 hover:text-indigo-800 hover:underline break-all font-medium";

  const nodes = tokens.map((token, i) => {
    const href = ticketTokenHref(token);
    const inner = href ? (
      <a href={href} target="_blank" rel="noopener noreferrer" className={linkClass}>
        {token}
      </a>
    ) : (
      <span className="text-gray-800">{token}</span>
    );

    if (variant === "inline") {
      return (
        <span key={`${token}-${i}`}>
          {i > 0 && <span className="text-gray-300 mx-1">·</span>}
          {inner}
        </span>
      );
    }

    return (
      <div key={`${token}-${i}`} className="leading-snug">
        {inner}
      </div>
    );
  });

  return (
    <div
      className={
        variant === "inline"
          ? `inline-flex flex-wrap items-baseline gap-x-0 ${className}`
          : `flex flex-col gap-1 ${className}`
      }
    >
      {nodes}
    </div>
  );
}
