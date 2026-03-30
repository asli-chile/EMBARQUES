"use client";

import { useCallback, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { useLocale } from "@/lib/i18n";
import { useAuth } from "@/lib/auth/AuthContext";
import { sendEmail } from "@/lib/email/sendEmail";
import {
  buildInformativeEmailHtml,
  getEmailPublicOrigin,
  plainMessageToHtml,
} from "@/lib/email/informativeEmailHtml";
import { sileo } from "sileo";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

function parseEmailList(raw: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of raw.split(/[\s,;]+/)) {
    const e = part.trim().toLowerCase();
    if (!e || !EMAIL_RE.test(e) || seen.has(e)) continue;
    seen.add(e);
    out.push(e);
  }
  return out;
}

export function CorreoInformativoContent() {
  const { t } = useLocale();
  const tr = t.correoInformativo;
  const { isSuperadmin, isAdmin, isEjecutivo, isLoading } = useAuth();

  const [toRaw, setToRaw] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [includeSocial, setIncludeSocial] = useState(true);
  const [sending, setSending] = useState(false);

  const origin = useMemo(() => getEmailPublicOrigin(), []);

  const emails = useMemo(() => parseEmailList(toRaw), [toRaw]);

  const nombreForBody = useMemo(() => {
    if (emails.length === 1) return recipientName.trim() || "cliente";
    return "cliente";
  }, [emails.length, recipientName]);

  const messagePersonalized = useMemo(
    () => message.replace(/\{nombre\}/gi, nombreForBody),
    [message, nombreForBody],
  );

  const htmlBody = useMemo(() => {
    const inner = plainMessageToHtml(messagePersonalized);
    return buildInformativeEmailHtml({
      messageHtml: inner,
      includeSocial,
      origin,
    });
  }, [messagePersonalized, includeSocial, origin]);

  const handleSend = useCallback(async () => {
    if (emails.length === 0) {
      sileo.error({ title: tr.validationNoEmails });
      return;
    }
    if (!subject.trim()) {
      sileo.error({ title: tr.validationSubject });
      return;
    }
    if (!message.trim()) {
      sileo.error({ title: tr.validationMessage });
      return;
    }

    setSending(true);
    let ok = 0;
    const failures: string[] = [];

    for (const to of emails) {
      const singleNombre = recipientName.trim() || "cliente";
      const text =
        emails.length === 1
          ? message.replace(/\{nombre\}/gi, singleNombre)
          : message.replace(/\{nombre\}/gi, "cliente");
      const inner = plainMessageToHtml(text);
      const body = buildInformativeEmailHtml({
        messageHtml: inner,
        includeSocial,
        origin,
      });
      const result = await sendEmail({
        to,
        subject: subject.trim(),
        body,
        sendFrom: "informaciones",
      });
      if (result.success) ok += 1;
      else failures.push(`${to}: ${result.error ?? "error"}`);
    }

    setSending(false);

    if (ok === emails.length) {
      sileo.success({ title: tr.successAll.replace("{n}", String(ok)) });
    } else if (ok > 0) {
      sileo.error({ title: tr.partialError.replace("{ok}", String(ok)).replace("{fail}", String(failures.length)) });
    } else {
      sileo.error({ title: failures[0] ?? tr.sendError });
    }
  }, [emails, subject, message, includeSocial, origin, recipientName, tr]);

  if (isLoading) {
    return (
      <main className="flex-1 min-h-0 overflow-auto bg-neutral-50 p-6 flex items-center justify-center" role="main">
        <p className="text-neutral-500 text-sm">…</p>
      </main>
    );
  }

  if (!isSuperadmin && !isAdmin && !isEjecutivo) {
    return (
      <main className="flex-1 min-h-0 overflow-auto bg-neutral-50 flex flex-col items-center justify-center gap-3 p-8" role="main">
        <Icon icon="lucide:lock" width={40} height={40} className="text-neutral-400" />
        <p className="text-lg font-semibold text-neutral-800">{tr.accessDeniedTitle}</p>
        <p className="text-sm text-neutral-600 text-center max-w-md">{tr.accessDeniedBody}</p>
      </main>
    );
  }

  const inputClass =
    "w-full px-3.5 py-2.5 rounded-lg border border-neutral-200 bg-white text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-blue/25 focus:border-brand-blue transition-colors";
  const labelClass = "block text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1";

  return (
    <main className="flex-1 min-h-0 overflow-auto bg-neutral-50" role="main">
      <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
        <header className="flex flex-col gap-1">
          <h1 className="text-xl md:text-2xl font-bold text-brand-blue tracking-tight">{tr.title}</h1>
          <p className="text-sm text-neutral-600">{tr.subtitle}</p>
        </header>

        <div className="rounded-2xl border border-neutral-200 bg-white shadow-mac-modal p-5 md:p-6 space-y-5">
          <div>
            <label className={labelClass} htmlFor="ci-to">{tr.toLabel}</label>
            <textarea
              id="ci-to"
              value={toRaw}
              onChange={(e) => setToRaw(e.target.value)}
              placeholder={tr.toPlaceholder}
              rows={3}
              className={`${inputClass} resize-y min-h-[88px] font-mono text-sm`}
            />
            <p className="mt-1 text-xs text-neutral-500">{tr.toHint}</p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass} htmlFor="ci-name">{tr.nameLabel}</label>
              <input
                id="ci-name"
                type="text"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                placeholder={tr.namePlaceholder}
                className={inputClass}
                disabled={emails.length !== 1}
              />
              <p className="mt-1 text-xs text-neutral-500">{emails.length === 1 ? tr.nameHintSingle : tr.nameHintMulti}</p>
            </div>
            <div>
              <label className={labelClass} htmlFor="ci-subject">{tr.subjectLabel}</label>
              <input
                id="ci-subject"
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder={tr.subjectPlaceholder}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className={labelClass} htmlFor="ci-msg">{tr.messageLabel}</label>
            <textarea
              id="ci-msg"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={tr.messagePlaceholder}
              rows={10}
              className={`${inputClass} resize-y min-h-[200px]`}
            />
            <p className="mt-1 text-xs text-neutral-500">{tr.messageHint}</p>
          </div>

          <label className="flex items-start gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={includeSocial}
              onChange={(e) => setIncludeSocial(e.target.checked)}
              className="mt-1 rounded border-neutral-300 text-brand-blue focus:ring-brand-blue/30"
            />
            <span className="text-sm text-neutral-700">{tr.includeSocial}</span>
          </label>

          <p className="text-xs text-neutral-500 border-t border-neutral-100 pt-4">{tr.senderNote}</p>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void handleSend()}
              disabled={sending}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-brand-blue text-white text-sm font-semibold hover:bg-brand-blue/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {sending ? (
                <>
                  <Icon icon="typcn:refresh" width={18} height={18} className="animate-spin" />
                  {tr.sending}
                </>
              ) : (
                <>
                  <Icon icon="lucide:send" width={18} height={18} />
                  {tr.send}
                </>
              )}
            </button>
          </div>
        </div>

        <section className="rounded-2xl border border-neutral-200 bg-white shadow-mac-modal overflow-hidden">
          <div className="px-5 py-3 border-b border-neutral-100 bg-neutral-50">
            <h2 className="text-sm font-bold text-neutral-800">{tr.preview}</h2>
            <p className="text-xs text-neutral-500 mt-0.5">{tr.previewHint}</p>
          </div>
          <div
            className="p-4 md:p-5 min-h-[280px] bg-white overflow-auto text-[15px] leading-relaxed [&_a]:text-brand-blue [&_img]:inline-block"
            dangerouslySetInnerHTML={{ __html: htmlBody }}
          />
        </section>
      </div>
    </main>
  );
}
