import { useCallback, useEffect, useState } from "react";
import {
  Activity, AudioLines, BarChart3, ChevronRight, CloudDownload,
  Disc3, FolderOpen, Gamepad2, Gauge, HardDrive, LayoutDashboard, Monitor,
  Package, Play, RefreshCw, Settings, ShieldCheck, Shirt, SlidersHorizontal,
  Sparkles, Users, Waves
} from "lucide-react";
import type { GameStatus, ModulePreview } from "../electron/preload";

const navigation = [
  { label: "Overview", icon: LayoutDashboard, group: "WORKSPACE" },
  { label: "Graphics", icon: Sparkles, group: "CONTENT" },
  { label: "Stadiums & Turf", icon: Waves, group: "CONTENT" },
  { label: "Kits & Equipment", icon: Shirt, group: "CONTENT" },
  { label: "Players", icon: Users, group: "CONTENT" },
  { label: "Audio & Atmosphere", icon: AudioLines, group: "CONTENT" },
  { label: "Gameplay", icon: Gamepad2, group: "CONTENT" },
  { label: "Modules", icon: Package, group: "MANAGEMENT" },
  { label: "Profiles", icon: Disc3, group: "MANAGEMENT" },
  { label: "Backups", icon: HardDrive, group: "MANAGEMENT" },
  { label: "Diagnostics", icon: Activity, group: "SYSTEM" },
  { label: "Settings", icon: Settings, group: "SYSTEM" }
];

const categoryCopy: Record<string, string> = {
  Graphics: "Visual modules, lighting, weather and presentation.",
  "Stadiums & Turf": "Stadium environments, pitch surfaces and adboards.",
  "Kits & Equipment": "Kits, boots, balls, gloves and equipment.",
  Players: "Faces, hair, body details and player assets.",
  "Audio & Atmosphere": "Chants, club anthems, crowd audio and tifos.",
  Gameplay: "Gameplay modules and compatible Sider extensions.",
  Modules: "Install, enable, disable and inspect your content packages.",
  Profiles: "Keep separate mod configurations for different setups.",
  Backups: "Restore files changed by the manager.",
  Diagnostics: "Check your PES installation and Sider configuration.",
  Settings: "Application preferences and managed directories."
};

export default function App() {
  const [active, setActive] = useState("Overview");
  const [status, setStatus] = useState<GameStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [siderSyncBusy, setSiderSyncBusy] = useState(false);
  const [notice, setNotice] = useState("Select your PES 2017 folder to begin.");
  const [modulePreview, setModulePreview] = useState<ModulePreview | null>(null);
  const refresh = useCallback(async () => {
    setBusy(true);
    try { const nextStatus = await window.nextgen.getStatus(); setStatus(nextStatus); if (nextStatus.startupRecovery.status !== "not-needed") setNotice(nextStatus.startupRecovery.message); }
    catch { setNotice("Unable to read installation status."); }
    finally { setBusy(false); }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const chooseFolder = async () => {
    const selected = await window.nextgen.chooseGameDirectory();
    if (selected) {
      await refresh();
      setNotice("Game folder selected. Review the detected components below.");
    }
  };

  const previewModule = async () => {
    try {
      const result = await window.nextgen.previewModule();
      if (result) { setModulePreview(result); setNotice("Package validated. Review every target before any installation is approved."); }
    } catch (error) { setNotice(error instanceof Error ? error.message : "Module preview failed."); }
  };

  const installPreviewedModule = async () => {
    if (!modulePreview || modulePreview.missingDependencies.length || modulePreview.conflicts.length || modulePreview.alreadyInstalled) return;
    const replacements = modulePreview.files.filter(file => file.action === "replace").map(file => file.target);
    const summary = [
      "Install " + modulePreview.name + " v" + modulePreview.version + "?",
      "",
      "Files to add: " + modulePreview.files.filter(file => file.action === "add").length,
      "Existing files to replace: " + replacements.length,
      ...replacements.map(file => "  • " + file),
      "",
      "Approved replacements will be backed up. Continue?"
    ].join("\\n");
    if (!window.confirm(summary)) return;
    try {
      const result = await window.nextgen.installPreviewedModule();
      setModulePreview(null);
      setNotice("Installed " + result.moduleId + ": " + result.installedFiles.length + " file(s). " + result.backups.length + " backup(s) created.");
      await refresh();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Module installation failed. Check diagnostics before retrying.");
    }
  };

  const syncSiderModules = async () => {
    if (siderSyncBusy) return;
    setSiderSyncBusy(true);
    try {
      const result = await window.nextgen.syncSiderModules();
      setNotice(result.changed
        ? "Sider configuration updated. LiveCPK roots: " + (result.registeredRoots.join(", ") || "none") + ". Lua modules: " + (result.registeredLuaModules.join(", ") || "none") + ". Original INI backup: " + result.backupPath
        : "Sider configuration is already up to date. LiveCPK roots: " + (result.registeredRoots.join(", ") || "none") + ". Lua modules: " + (result.registeredLuaModules.join(", ") || "none") + ".");
      await refresh();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not update Sider configuration.");
    } finally {
      setSiderSyncBusy(false);
    }
  };

  const launchSider = async () => {
    const result = await window.nextgen.launchSider();
    setNotice(result.message);
  };

  const ready = Boolean(status?.gameExecutable);
  const siderReady = Boolean(status?.siderExecutable && status?.siderIni);

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark"><span>NG</span></div>
          <div><div className="brand-name">NEXT GEN</div><div className="brand-sub">PES 2017 PROJECT</div></div>
        </div>
        <div className="sidebar-rule" />
        {["WORKSPACE", "CONTENT", "MANAGEMENT", "SYSTEM"].map(group => (
          <div className="nav-group" key={group}>
            <div className="nav-label">{group}</div>
            {navigation.filter(item => item.group === group).map(item => {
              const Icon = item.icon;
              return <button key={item.label} className={active === item.label ? "nav-item active" : "nav-item"} onClick={() => setActive(item.label)}>
                <Icon size={17} strokeWidth={1.8} /><span>{item.label}</span>{active === item.label && <ChevronRight size={15} className="nav-chevron" />}
              </button>;
            })}
          </div>
        ))}
        <div className="sidebar-bottom">
          <div className="build-label"><span className="status-dot" /> DEVELOPMENT BUILD <span>0.1.0</span></div>
          <div className="sidebar-foot"><ShieldCheck size={15} /> SAFE INSTALLATION ENGINE</div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="breadcrumb">PES 2017 <span>/</span> {active.toUpperCase()}</div>
          <div className="top-actions"><div className="connection"><span className={ready ? "status-dot" : "status-dot muted"} />{ready ? "GAME DETECTED" : "GAME NOT LINKED"}</div><button className="icon-button" title="Refresh status" disabled={busy} onClick={() => void refresh()}><RefreshCw size={16} /></button><div className="avatar">NG</div></div>
        </header>

        <div className="content">
          {active === "Overview" ? <>
            <section className="hero">
              <div className="hero-copy">
                <div className="eyebrow"><span className="eyebrow-line" /> THE NEXT GENERATION STARTS HERE</div>
                <h1>MAKE EVERY<br /><em>MATCH</em> MATTER.</h1>
                <p>Your PES 2017 enhancement hub. Build your setup, manage every module and take control of your matchday experience.</p>
                <div className="hero-actions"><button className="primary-button" onClick={chooseFolder}><FolderOpen size={17} /> {ready ? "CHANGE GAME FOLDER" : "LOCATE PES 2017"}</button><button className="secondary-button" onClick={() => setActive("Modules")}>EXPLORE MODULES <ChevronRight size={16} /></button></div>
              </div>
              <div className="hero-art"><div className="hero-orbit orbit-one" /><div className="hero-orbit orbit-two" /><div className="hero-ball"><div className="ball-panel" /><div className="ball-panel second" /><div className="ball-seam" /></div><div className="hero-tag">ENGINEERED<br />FOR THE PITCH</div><div className="hero-index">01 <span>/</span> 04</div></div>
              <div className="hero-footer"><span>BUILT FOR PES 2017</span><span>MODULAR. REVERSIBLE. YOURS.</span></div>
            </section>

            <div className="section-heading"><div><div className="eyebrow">SYSTEM OVERVIEW</div><h2>Your setup</h2></div><button className="text-button" disabled={busy} onClick={() => void refresh()}>REFRESH STATUS <RefreshCw size={14} /></button></div>
            <div className="stat-grid">
              <div className="stat-card"><div className="stat-top"><span>GAME INSTALLATION</span><Monitor size={17} /></div><div className={ready ? "stat-value good" : "stat-value"}>{ready ? "DETECTED" : "NOT LINKED"}</div><div className="stat-foot">{status?.gameExecutable ?? "Select your PES 2017 directory"}</div></div>
              <div className="stat-card"><div className="stat-top"><span>SIDER RUNTIME</span><Gauge size={17} /></div><div className={siderReady ? "stat-value good" : "stat-value"}>{siderReady ? "READY" : "NOT FOUND"}</div><div className="stat-foot">{status?.siderExecutable ?? "Sider executable and INI required"}</div></div>
              <div className="stat-card"><div className="stat-top"><span>LIVECPK ENGINE</span><SlidersHorizontal size={17} /></div><div className={status?.liveCpkEnabled ? "stat-value good" : "stat-value"}>{status?.liveCpkEnabled ? "ENABLED" : "INACTIVE"}</div><div className="stat-foot">Runtime asset replacement</div></div>
              <div className="stat-card"><div className="stat-top"><span>LUA EXTENSIONS</span><Activity size={17} /></div><div className={status?.luaEnabled ? "stat-value good" : "stat-value"}>{status?.luaEnabled ? "ENABLED" : "INACTIVE"}</div><div className="stat-foot">{status?.luaModules.length ?? 0} module entries detected</div></div>
            </div>

            <div className="lower-grid">
              <section className="panel"><div className="panel-heading"><div><div className="eyebrow">QUICK ACTIONS</div><h3>Control centre</h3></div><BarChart3 size={18} /></div><div className="action-row"><div className="action-icon"><FolderOpen size={18} /></div><div className="action-copy"><strong>Locate game folder</strong><span>Connect your PES 2017 installation</span></div><button className="small-action" onClick={chooseFolder}>SELECT</button></div><div className="action-row"><div className="action-icon"><SlidersHorizontal size={18} /></div><div className="action-copy"><strong>Register installed modules</strong><span>Back up and sync LiveCPK roots and Lua extensions</span></div><button className="small-action" disabled={!siderReady || busy || siderSyncBusy} onClick={syncSiderModules}>{siderSyncBusy ? "SYNCING" : "SYNC"}</button></div><div className="action-row"><div className="action-icon"><Play size={18} /></div><div className="action-copy"><strong>Launch Sider</strong><span>Start the runtime companion</span></div><button className="small-action" disabled={!siderReady} onClick={launchSider}>LAUNCH</button></div><div className="action-row"><div className="action-icon"><CloudDownload size={18} /></div><div className="action-copy"><strong>Module library</strong><span>Package manager foundation in progress</span></div><button className="small-action" onClick={() => setActive("Modules")}>OPEN</button></div></section>
              <section className="panel system-panel"><div className="panel-heading"><div><div className="eyebrow">INSTALLATION REPORT</div><h3>System integrity</h3></div><ShieldCheck size={18} /></div><div className="integrity-row"><span>Game executable</span><b className={ready ? "pill good-pill" : "pill"}>{ready ? "FOUND" : "PENDING"}</b></div><div className="integrity-row"><span>Sider configuration</span><b className={siderReady ? "pill good-pill" : "pill"}>{siderReady ? "FOUND" : "PENDING"}</b></div><div className="integrity-row"><span>Automatic file cleanup</span><b className="pill safe-pill">DISABLED</b></div><div className="integrity-note"><ShieldCheck size={15} /> Unknown files and personal game data are never deleted automatically.</div></section>
            </div>
            <div className="notice"><span className="notice-mark">i</span>{notice}</div>
          </> : active === "Modules" ? <section className="page-placeholder">
            <div className="eyebrow">PACKAGE VALIDATION & SAFETY</div><h1>MODULES</h1>
            <p>Inspect a module package before installation. This preview does not modify your PES directory.</p>
            <div className="coming-panel"><div className="coming-icon"><Package size={24} /></div><div><h3>Package preview</h3><p>Select a folder containing module.json. The manager validates its manifest and payload hashes, then shows every target file and whether it would be added or replaced.</p><button className="primary-button" disabled={!ready} onClick={() => void previewModule()}><FolderOpen size={16} /> SELECT PACKAGE TO PREVIEW</button></div></div>
            {modulePreview && <div className="panel" style={{marginTop: 22, textAlign: "left"}}>
              <div className="panel-heading"><div><div className="eyebrow">{modulePreview.category.toUpperCase()} · VERSION {modulePreview.version}</div><h3>{modulePreview.name}</h3></div><span className="coming-tag">VALIDATED</span></div>
              <p>{modulePreview.description}</p>
              <div className="integrity-row"><span>Module ID</span><b>{modulePreview.id}</b></div>
              <div className="integrity-row"><span>License</span><b>{modulePreview.license.id}</b></div>
              <div className="integrity-row"><span>Redistribution</span><b>{modulePreview.license.redistributionAllowed ? "ALLOWED BY MANIFEST" : "NOT ALLOWED"}</b></div>
              <div className="integrity-row"><span>Dependencies</span><b>{modulePreview.dependencies.length ? modulePreview.dependencies.join(", ") : "NONE"}</b></div>
              {modulePreview.alreadyInstalled && <div className="integrity-note">This module is already installed. Upgrade is not supported yet.</div>}
              {modulePreview.missingDependencies.length > 0 && <div className="integrity-note">Missing dependencies: {modulePreview.missingDependencies.join(", ")}. Install these first.</div>}
              {modulePreview.conflicts.length > 0 && <div className="integrity-note">Conflicts with installed modules: {modulePreview.conflicts.join(", ")}. Installation is blocked.</div>}
              <h3 style={{marginTop: 20}}>File changes ({modulePreview.files.length})</h3>
              {modulePreview.files.map(file => <div className="integrity-row" key={file.target}><span>{file.target}</span><b className={file.action === "replace" ? "pill" : "pill good-pill"}>{file.action.toUpperCase()}</b></div>)}
              <div className="integrity-note"><ShieldCheck size={15} /> Existing files will only be replaced after your confirmation. Backups are retained for uninstall and recovery.</div>
              <button className="primary-button" disabled={modulePreview.alreadyInstalled || modulePreview.missingDependencies.length > 0 || modulePreview.conflicts.length > 0} onClick={() => void installPreviewedModule()}><Package size={16} /> CONFIRM & INSTALL MODULE</button>
            </div>}
            <button className="secondary-button back-button" onClick={() => setActive("Overview")}>BACK TO OVERVIEW <ChevronRight size={16} /></button>
          </section> : <section className="page-placeholder">
            <div className="eyebrow">NEXT GEN MODULE SYSTEM</div><h1>{active.toUpperCase()}</h1><p>{categoryCopy[active] ?? "Manage your PES 2017 Next Gen environment."}</p>
            <div className="coming-panel"><div className="coming-icon"><Package size={24} /></div><div><h3>Module system is being built</h3><p>This section will become operational as the package engine, validation, install transactions and rollback system are implemented. No fake install controls here.</p></div><span className="coming-tag">IN DEVELOPMENT</span></div>
            <button className="secondary-button back-button" onClick={() => setActive("Overview")}>BACK TO OVERVIEW <ChevronRight size={16} /></button>
          </section>}
          <footer className="app-footer"><span>PES 2017 NEXT GEN <b>·</b> DEVELOPMENT BUILD</span><span>BUILT BY THEGODMODS</span></footer>
        </div>
      </main>
    </div>
  );
}