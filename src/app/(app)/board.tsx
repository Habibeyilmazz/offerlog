"use client";

import Link from "next/link";
import { useOptimistic, useState, useTransition } from "react";
import { moveApplication } from "@/app/actions.ts";
import type { DueState } from "@/lib/format.ts";
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
  const q = query.trim().toLowerCase();
  const visible = q ? optimistic.filter((c) => [c.company, c.role, c.where, c.source].some((f) => f.toLowerCase().includes(q))) : optimistic;

  function move(id: number, stage: Stage) {
    setMovingId(id);
    setError("");
    startTransition(async () => {
      setOptimistic({ id, stage });
      try {
        await moveApplication(id, stage);
      } catch {
        // Offline or a server error: the optimistic move is undone when the transition ends; keep the board and say why.
        const company = cards.find((c) => c.id === id)?.company ?? "the application";
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
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filter by company, role, place or source" />
        </label>
      </div>
    )}
    {error && (
      <p className="error" role="alert">
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
                    className="card"
                    draggable
                    aria-busy={pending && movingId === c.id}
                    onDragStart={(e) => e.dataTransfer.setData("text/plain", String(c.id))}
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
                      onChange={(e) => move(c.id, e.target.value as Stage)}
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
