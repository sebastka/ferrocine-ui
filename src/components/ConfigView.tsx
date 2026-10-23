// The running configuration, section by section (administration page).

import type { ConfigField, ConfigSection, RunningConfig } from '../api.ts';
import { activeChoice, display, showDefault, splitCode } from '../logic/config.ts';
import { CheckIcon } from './icons.tsx';

const OPEN_KEY = 'ferrocine.config.closed';

function closedSections(): Set<string> {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(OPEN_KEY) ?? '[]');
    return new Set(Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);
  } catch {
    return new Set();
  }
}

function rememberOpen(key: string, open: boolean): void {
  try {
    const closed = closedSections();
    if (open) closed.delete(key);
    else closed.add(key);
    localStorage.setItem(OPEN_KEY, JSON.stringify([...closed]));
  } catch {
    // Storage unavailable: the section just opens again next time.
  }
}

export function ConfigView({ config }: { config: RunningConfig }) {
  const closed = closedSections();
  return (
    <div className="config">
      {config.sections.map((s) => (
        <Section key={s.key} section={s} initiallyOpen={!closed.has(s.key)} />
      ))}
    </div>
  );
}

function Section({ section, initiallyOpen }: { section: ConfigSection; initiallyOpen: boolean }) {
  return (
    <details
      className="config-section"
      open={initiallyOpen}
      onToggle={(e) => rememberOpen(section.key, e.currentTarget.open)}
    >
      <summary>
        <span className="config-title">{section.title}</span>
        <span className={`pill ${section.applies === 'reload' ? 'pill-good' : 'pill-busy'}`}>
          {section.applies === 'reload' ? 'Applies at reload' : 'Needs a restart'}
        </span>
      </summary>
      <p className="muted config-description">
        <Described text={section.description} />
      </p>
      {section.fields.length > 0 && <Fields prefix={section.key} fields={section.fields} />}
      {section.items?.map((item, i) => (
        <div key={`${item.title}-${i}`} className="config-item">
          <h4>{item.title}</h4>
          <Fields prefix={`${section.key}[${i}]`} fields={item.fields} />
        </div>
      ))}
      {section.items?.length === 0 && <p className="muted">None configured.</p>}
    </details>
  );
}

function Fields({ prefix, fields }: { prefix: string; fields: ConfigField[] }) {
  return (
    <dl className="config-fields">
      {fields.map((f) => (
        <div key={f.key} className="config-field">
          <dt>
            <code className="config-key">
              <span className="config-prefix">{prefix}.</span>
              {f.key}
            </code>
          </dt>
          <dd>
            <Value field={f} />
            {showDefault(f) && (
              <span className="config-default">
                default: <Plain field={{ ...f, value: f.default }} />
              </span>
            )}
            <p className="config-help">
              <Described text={f.description} />
            </p>
            {f.choices && f.choices.length > 0 && <Choices field={f} />}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function Value({ field }: { field: ConfigField }) {
  if (field.kind === 'secret') {
    return field.set ? <span className="config-value">set</span> : <span className="config-value muted">not set</span>;
  }
  if (Array.isArray(field.value) && field.value.length > 0) {
    return (
      <ul className="chips config-value">
        {field.value.map((v, i) => (
          <li key={`${v}-${i}`} className="chip">
            {v}
          </li>
        ))}
      </ul>
    );
  }
  return <Plain field={field} className="config-value" />;
}

function Plain({ field, className }: { field: ConfigField; className?: string }) {
  const d = display(field.kind, field.value);
  const cls = [className, d.mono ? 'mono' : null, d.muted ? 'muted' : null].filter(Boolean).join(' ');
  return <span className={cls || undefined}>{d.text}</span>;
}

function Choices({ field }: { field: ConfigField }) {
  const active = activeChoice(field);
  return (
    <ul className="config-choices">
      {field.choices?.map((c) => {
        const on = c.value === active;
        return (
          <li key={c.value} className={on ? 'config-choice-on' : 'muted'}>
            <span className="config-choice-mark">{on ? <CheckIcon label="Active" /> : null}</span>
            <code>{c.value}</code>
            <span>
              <Described text={c.description} />
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/** A description with its `code` spans as <code>; text only, never HTML. */
function Described({ text }: { text: string }) {
  return (
    <>
      {splitCode(text).map((p, i) =>
        p.code ? (
          <code key={i} className="config-code">
            {p.text}
          </code>
        ) : (
          p.text
        ),
      )}
    </>
  );
}
