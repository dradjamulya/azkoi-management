import { useRef, useState } from 'react';
import { useStore } from '../store';
import { useUI } from '../App';
import type { AppData } from '../types';
import { createSeed } from '../seed';
import { pullRemote, pushRemote, type SyncConfig } from '../sync';
import { WEEKDAYS, todayISO } from '../lib/format';
import { Field, Seg, Switch } from '../components/UI';
import { IconCloud, IconDownload, IconUpload } from '../components/Icons';

export function SettingsPage() {
  const { data, update, replace, sync, syncConfig, setSyncConfig, toast } = useStore();
  const { theme, setTheme } = useUI();
  const [cfg, setCfg] = useState<SyncConfig>(syncConfig);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const s = data.settings;
  const setS = (patch: Partial<typeof s>) => update((d) => ({ ...d, settings: { ...d.settings, ...patch } }));

  const exportJson = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    a.download = `azkoi-backup-${todayISO()}.json`;
    a.click();
  };

  const importJson = async (file: File) => {
    try {
      const parsed = JSON.parse(await file.text()) as AppData;
      if (parsed.version !== 1 || !Array.isArray(parsed.orders)) throw new Error('Not an AZKOI backup');
      if (confirm(`Replace everything on this device with the backup (${parsed.orders.length} orders, ${parsed.txns.length} ledger entries)?`)) {
        replace(parsed);
        toast('Backup restored');
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Could not read file');
    }
  };

  const cfgReady = cfg.url.trim() && cfg.anonKey.trim() && cfg.workspace.trim();

  const pull = async () => {
    if (!cfgReady) return;
    setBusy(true);
    try {
      const remote = await pullRemote(cfg);
      if (!remote) alert('Nothing in the cloud yet for this workspace. Use "Upload this device" first.');
      else if (confirm(`Replace this device's data with the cloud copy (${remote.orders.length} orders)?`)) {
        replace(remote);
        setSyncConfig({ ...cfg, enabled: true });
        toast('Pulled from cloud — sync is on');
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(false);
    }
  };

  const push = async () => {
    if (!cfgReady) return;
    if (!confirm('Upload this device\'s data to the cloud? It will overwrite what is there.')) return;
    setBusy(true);
    try {
      await pushRemote(cfg, { ...data, updatedAt: new Date().toISOString() });
      setSyncConfig({ ...cfg, enabled: true });
      toast('Uploaded — sync is on');
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="stack" style={{ maxWidth: 860 }}>
      <div className="card">
        <div className="card-head">
          <h2>Business</h2>
        </div>
        <div className="form-grid">
          <Field label="Name">
            <input className="input" value={s.businessName} onChange={(e) => setS({ businessName: e.target.value })} />
          </Field>
          <Field label="City">
            <input className="input" value={s.city} onChange={(e) => setS({ city: e.target.value })} />
          </Field>
          <Field label="Tagline" className="full">
            <input className="input" value={s.tagline} onChange={(e) => setS({ tagline: e.target.value })} />
          </Field>
          <div className="field full">
            <span>Open days (used to suggest the next pickup date)</span>
            <div className="row wrap">
              {[1, 2, 3, 4, 5, 6, 0].map((d) => {
                const on = s.openDays.includes(d);
                return (
                  <button
                    key={d}
                    className={`btn sm${on ? ' primary' : ''}`}
                    onClick={() => setS({ openDays: on ? s.openDays.filter((x) => x !== d) : [...s.openDays, d] })}
                    aria-pressed={on}
                  >
                    {WEEKDAYS[d]}
                  </button>
                );
              })}
            </div>
          </div>
          <Field label="WhatsApp confirmation message" className="full">
            <textarea className="input" rows={6} value={s.waTemplate} onChange={(e) => setS({ waTemplate: e.target.value })} />
          </Field>
          <div className="tiny muted full">
            Placeholders: {'{buyer} {items} {total} {fulfilment} {date} {id}'}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <h2>Appearance</h2>
        </div>
        <Seg
          value={theme}
          onChange={setTheme}
          options={[
            { value: 'system', label: 'Auto' },
            { value: 'light', label: 'Cream (light)' },
            { value: 'dark', label: 'Espresso (dark)' },
          ]}
        />
      </div>

      <div className="card">
        <div className="card-head">
          <div>
            <h2 className="row">
              <IconCloud width={20} /> Sync phone · iPad · laptop
            </h2>
            <div className="sub">
              Right now: <b>{sync.message || 'Saved on this device only'}</b>. Without sync, data lives in this browser only. Connect a free Supabase
              project to share it across devices — steps are in the README.
            </div>
          </div>
        </div>
        <div className="form-grid">
          <Field label="Supabase project URL" className="full">
            <input className="input" placeholder="https://xxxx.supabase.co" value={cfg.url} onChange={(e) => setCfg({ ...cfg, url: e.target.value.trim() })} />
          </Field>
          <Field label="Anon public key" className="full">
            <input className="input" placeholder="eyJhbGciOi…" value={cfg.anonKey} onChange={(e) => setCfg({ ...cfg, anonKey: e.target.value.trim() })} />
          </Field>
          <Field label="Workspace code (same on every device — make it hard to guess)" className="full">
            <input className="input" placeholder="azkoi-xxxx-xxxx" value={cfg.workspace} onChange={(e) => setCfg({ ...cfg, workspace: e.target.value.trim() })} />
          </Field>
        </div>
        <div className="row wrap section-gap">
          <button className="btn" disabled={!cfgReady || busy} onClick={pull}>
            <IconDownload /> Pull from cloud
          </button>
          <button className="btn" disabled={!cfgReady || busy} onClick={push}>
            <IconUpload /> Upload this device
          </button>
          <span className="spacer" />
          {syncConfig.enabled && (
            <Switch
              checked={syncConfig.enabled}
              onChange={(v) => setSyncConfig({ ...syncConfig, enabled: v })}
              label={<span className="small">Auto sync on</span>}
            />
          )}
        </div>
        <div className="tiny muted section-gap">
          First device: “Upload this device”. Every other device: “Pull from cloud”. After that, changes sync automatically.
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <div>
            <h2>Backup</h2>
            <div className="sub">Download everything as a file, or restore one.</div>
          </div>
        </div>
        <div className="row wrap">
          <button className="btn" onClick={exportJson}>
            <IconDownload /> Download backup
          </button>
          <button className="btn" onClick={() => fileRef.current?.click()}>
            <IconUpload /> Restore backup
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void importJson(f);
              e.target.value = '';
            }}
          />
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <div>
            <h2>Reset</h2>
            <div className="sub">Careful — these replace your data on this device (and in the cloud if sync is on).</div>
          </div>
        </div>
        <div className="row wrap">
          <button
            className="btn danger"
            onClick={() => {
              if (confirm('Reload the original data from AZKOI.xlsx? Your changes will be lost.')) {
                replace(createSeed());
                toast('Reset to spreadsheet data');
              }
            }}
          >
            Reset to spreadsheet data
          </button>
          <button
            className="btn danger"
            onClick={() => {
              if (confirm('Clear all orders, ledger entries and tasks? Menu, recipes and ingredients stay.')) {
                replace({ ...data, orders: [], txns: [], tasks: [] });
                toast('Cleared');
              }
            }}
          >
            Clear orders & ledger
          </button>
        </div>
      </div>
    </div>
  );
}
