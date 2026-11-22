"use client";

import { useEffect } from "react";

/**
 * After a form is sent, the page re-renders: a saved panel closes, a deleted item goes, a refused form is remounted
 * to refill it. Each drops keyboard focus to the start of the page. When that happens, put focus back on the same
 * button if its form now shows an error, else on the heading of the section the form was in (or on <main>),
 * so a keyboard or screen reader user carries on where they were.
 */
export function FocusKeeper() {
  useEffect(() => {
    let sent: { form: number; button: string; heading: string; until: number } | null = null;
    const forms = () => [...document.querySelectorAll<HTMLFormElement>("#main form")];
    const onSubmit = (e: Event) => {
      const form = e.target as HTMLFormElement;
      sent = {
        form: forms().indexOf(form),
        button: (e as SubmitEvent).submitter?.textContent ?? "",
        heading: form.closest("section")?.querySelector("h2")?.textContent ?? "",
        until: Date.now() + 30_000,
      };
    };
    const observer = new MutationObserver(() => {
      if (!sent || document.activeElement !== document.body) return;
      const { form, button, heading, until } = sent;
      sent = null;
      if (Date.now() > until) return;
      const same = forms()[form];
      const retry = same?.querySelector("[role=alert]") ? [...same.querySelectorAll("button")].find((b) => b.textContent === button) : undefined;
      const main = document.getElementById("main");
      const target = retry ?? [...(main?.querySelectorAll("h2") ?? [])].find((h) => h.textContent === heading) ?? main;
      if (!target) return;
      if (target !== retry && !target.hasAttribute("tabindex")) target.tabIndex = -1;
      target.focus({ preventScroll: true });
    });
    document.addEventListener("submit", onSubmit, true);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      document.removeEventListener("submit", onSubmit, true);
      observer.disconnect();
    };
  }, []);
  return null;
}
