import { useState } from "react";
import { Link } from "react-router-dom";
import { publicSiteBase } from "./api";
import { Heading, PhaseNote } from "./primitives";

export function SettingsWorkspace() {
  const [group, setGroup] = useState("Website");
  const groups = ["Website", "Publishing", "Backups", "System"];
  const rows: Record<string, Array<[string, string]>> = {
    Website: [
      ["Public website", publicSiteBase],
      ["Delivery model", "Independent static website"],
      ["CMS workspace", "/control"],
      [
        "Environment",
        import.meta.env.DEV ? "Local development" : "Production build",
      ],
    ],
    Publishing: [
      ["Release workflow", "Review draft → Publish release"],
      ["Publishing connection", "Not checked"],
      ["Deployment status", "Not checked"],
    ],
    Backups: [
      ["Latest backup", "Not checked"],
      ["Backup storage", "Not checked"],
      ["Restore configuration", "Connection will be wired in Phase 2"],
    ],
    System: [
      ["CMS frontend", "Control center · 0.1.0"],
      ["Backend connection", "Not checked"],
      ["Database", "Not checked"],
      ["Storage", "Not checked"],
      ["Security services", "Not checked"],
    ],
  };
  return (
    <div className="control-page">
      <Heading
        eyebrow="System / Configuration"
        title="Settings"
        body="Website configuration and system information in one workspace."
      />
      <PhaseNote>
        Operational checks and configuration changes will be connected in Phase
        2.
      </PhaseNote>
      <div className="settings-workspace">
        <nav aria-label="Settings groups">
          {groups.map((item) => (
            <button
              key={item}
              aria-current={item === group ? "page" : undefined}
              onClick={() => setGroup(item)}
            >
              {item}
            </button>
          ))}
        </nav>
        <section className="control-panel workspace-editor">
          <h2>{group}</h2>
          <dl className="settings-rows">
            {rows[group].map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>
                  {label === "Public website" ? (
                    <a href={value} target="_blank" rel="noreferrer">
                      {value}
                    </a>
                  ) : (
                    value
                  )}
                </dd>
              </div>
            ))}
          </dl>
          {group === "Website" && (
            <a
              className="control-button"
              href={publicSiteBase}
              target="_blank"
              rel="noreferrer"
            >
              View website
            </a>
          )}
          {group === "Publishing" && (
            <Link className="control-button" to="/control/history">
              Open version history
            </Link>
          )}
          {group === "Backups" && (
            <button
              className="control-button"
              disabled
              title="Backup restore will be connected in Phase 2"
            >
              Restore backup
            </button>
          )}
          {group === "System" && (
            <button
              className="control-button"
              disabled
              title="Health checks will be connected in Phase 2"
            >
              Check connections
            </button>
          )}
        </section>
      </div>
    </div>
  );
}
