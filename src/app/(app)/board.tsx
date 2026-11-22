"use client";

import Link from "next/link";
import { useEffect, useOptimistic, useRef, useState, useTransition } from "react";
import { moveApplication } from "@/app/actions.ts";
import { type DueState, matches, plural } from "@/lib/format.ts";
import { STAGE_LABELS, STAGES, type Stage } from "@/lib/stages.ts";

export interface CardData {
  id: number;
  company: string;
  role: string;
  stage: Stage;
  salary: string;
  where: string;
  source: string;
  due: { label: string; state: DueState } | null;
}

export function Board({ cards }: { cards: CardData[] }) {
  const [optimistic, setOptimistic] = useOptimistic(cards, (state, move: { id: number; stage: Stage }) =>
    state.map((c) => (c.id === move.id ? { ...c, stage: move.stage } : c)),
  );
  const [pending, startTransition] = useTransition();
  const [movingId, setMovingId] = useState<number | null>(null);
  const [dropStage, setDropStage] = useState<Stage | null>(null);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  // A card moved with its menu remounts in another column, which drops keyboard focus; put it back on that menu.
  const refocus = useRef<number | null>(null);
  useEffect(() => {
    if (refocus.current !== null && document.activeElement === document.body)
      document.querySelector<HTMLElement>(`[data-card="${refocus.current}"] select`)?.focus();
  }, [optimistic]);
  const q = query.trim();
  const visible = q ? optimistic.filter((c) => [c.company, c.role, c.where, c.source].some((f) => matches(f, q))) : optimistic;

  function move(id: number, stage: Stage) {
    setMovingId(id);
    setError("");
    setStatus("");
    const company = cards.find((c) => c.id === id)?.company ?? "the application";
    startTransition(async () => {
      setOptimistic({ id, stage });
      try {
        if (await moveApplication(id, stage)) setStatus(`Moved ${company} to ${STAGE_LABELS[stage]}.`);
        else setError(`${company} was deleted in another tab or window.`);
      } catch {
        // Offline or a server error: the optimistic move is undone when the transition ends; keep the board and say why.
        setError(`Could not move ${company} to ${STAGE_LABELS[stage]}. Check your connection and try again.`);
      }
      setMovingId(null);
    });
  }

  return (
    <>
    {cards.length > 0 && (
      <div className="board-tools">
        <label>
          <span className="sr-only">Filter applications</span>
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setStatus("");
            }}
            placeholder="Filter by company, role, place or source"
          />
        </label>
      </div>
    )}
    {/* Screen readers hear how many cards a filter leaves, as sighted users see the columns shrink. */}
    <p role="status" className="sr-only">
      {status || (q && `Showing ${visible.length} of ${plural(cards.length, "application")}.`)}
    </p>
    {error && (
      <p className="error" role="alert" style={{ marginBottom: 10 }}>
        {error}
      </p>
    )}
    <div className="board">
      {STAGES.map((stage) => {
        const items = visible.filter((c) => c.stage === stage);
        return (
          <section
            key={stage}
            aria-label={STAGE_LABELS[stage]}
            className={`column${dropStage === stage ? " drop-target" : ""}`}
            style={{ "--stage": `var(--st-${stage})` } as React.CSSProperties}
            onDragOver={(e) => {
              e.preventDefault();
              setDropStage(stage);
            }}
            onDragLeave={() => setDropStage(null)}
            onDrop={(e) => {
              e.preventDefault();
              setDropStage(null);
              const id = Number(e.dataTransfer.getData("text/plain"));
              const card = optimistic.find((c) => c.id === id);
              if (card && card.stage !== stage) move(id, stage);
            }}
          >
            <div className="column-head">
              <span className="stage-dot" />
              <h2 style={{ fontSize: "0.95rem" }}>{STAGE_LABELS[stage]}</h2>
              <span className="count">{items.length}</span>
            </div>
            {items.length === 0 ? (
              <p className="empty">{q ? "No matches" : "No applications"}</p>
            ) : (
              <ol>
                {items.map((c) => (
                  <li
                    key={c.id}
                    data-card={c.id}
                    className="card"
                    draggable
                    aria-busy={pending && movingId === c.id}
                    onDragStart={(e) => {
                      refocus.current = null;
                      e.dataTransfer.setData("text/plain", String(c.id));
                    }}
                  >
                    <Link href={`/applications/${c.id}`} className="company">
                      {c.company}
                    </Link>
                    <span className="role">{c.role}</span>
                    {(c.salary || c.where) && (
                      <span className="meta">
                        {c.salary && <span>{c.salary}</span>}
                        {c.where && <span>{c.where}</span>}
                      </span>
                    )}
                    {c.due && <span className={`due ${c.due.state}`} style={{ justifySelf: "start" }}>{c.due.label}</span>}
                    <select
                      aria-label={`Move ${c.company} to stage`}
                      value={c.stage}
                      onChange={(e) => {
                        refocus.current = c.id;
                        move(c.id, e.target.value as Stage);
                      }}
                    >
                      {STAGES.map((s) => (
                        <option key={s} value={s}>
                          {STAGE_LABELS[s]}
                        </option>
                      ))}
                    </select>
                  </li>
                ))}
              </ol>
            )}
          </section>
        );
      })}
    </div>
    </>
  );
}
