import { useCallback, useEffect, useState } from "react";
import {
  Activity, AudioLines, BarChart3, ChevronRight, CloudDownload,
  Disc3, FolderOpen, Gamepad2, Gauge, HardDrive, LayoutDashboard, Monitor,
  Package, Play, RefreshCw, Settings, ShieldCheck, Shirt, SlidersHorizontal,
  Sparkles, Users, Waves
} from "lucide-react";
import type { DdsComparison, DdsTexture, GameStatus, InstalledModule, LibraryPackage, ModulePreview, PitchInventory, PitchLogReport } from "../electron/preload";
import DepartmentCatalogue from "./components/DepartmentCatalogue";

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
  const [installedModules, setInstalledModules] = useState<InstalledModule[]>([]);
  const [libraryPackages, setLibraryPackages] = useState<LibraryPackage[]>([]);
  const [libraryBusy, setLibraryBusy] = useState(false);
  const [librarySearch, setLibrarySearch] = useState("");
  const [libraryCategory, setLibraryCategory] = useState("all");
  const [moduleActionBusy, setModuleActionBusy] = useState<string | null>(null);
  const [originalDds, setOriginalDds] = useState<DdsTexture | null>(null);
  const [replacementDds, setReplacementDds] = useState<DdsTexture | null>(null);
  const [ddsComparison, setDdsComparison] = useState<DdsComparison | null>(null);
  const [ddsBusy, setDdsBusy] = useState(false);
  const [pitchInventory, setPitchInventory] = useState<PitchInventory | null>(null);
  const [pitchTarget, setPitchTarget] = useState("");
  const [pitchReplacement, setPitchReplacement] = useState("");
  const [pitchId, setPitchId] = useState("studio.custom-pitch");
  const [pitchName, setPitchName] = useState("Custom Pitch Replacement");
  const [pitchBusy, setPitchBusy] = useState(false);
  const [generatedPitch, setGeneratedPitch] = useState<{ id: string; output: string } | null>(null);
  const [pitchLog, setPitchLog] = useState<{ fileName: string; report: PitchLogReport } | null>(null);
  const [pitchLogBusy, setPitchLogBusy] = useState(false);
  const [profiles, setProfiles] = useState<Array<{ id: string; name: string; createdAt: string; enabledLuaModules: string[] }>>([]);
  const [profileBusy, setProfileBusy] = useState(false);
  const refresh = useCallback(async () => {
    setBusy(true);
    try { const [nextStatus, modules] = await Promise.all([window.nextgen.getStatus(), window.nextgen.listInstalledModules()]); setStatus(nextStatus); setInstalledModules(modules); if (nextStatus.startupRecovery.status !== "not-needed") setNotice(nextStatus.startupRecovery.message); }
    catch { setNotice("Unable to read installation status."); }
    finally { setBusy(false); }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  useEffect(() => {
    try { const saved = window.localStorage.getItem("thegodmods.profiles.v1"); if (saved) { const parsed: unknown = JSON.parse(saved); if (Array.isArray(parsed)) setProfiles(parsed.filter(item => item && typeof item.id === "string" && typeof item.name === "string" && Array.isArray(item.enabledLuaModules))); } } catch { setNotice("Saved profiles could not be read. Existing game files were not changed."); }
  }, []);

  const persistProfiles = (next: typeof profiles) => { setProfiles(next); window.localStorage.setItem("thegodmods.profiles.v1", JSON.stringify(next)); };
  const createProfile = () => {
    const name = window.prompt("Name this PES 2017 setup profile:");
    if (!name || !name.trim()) return;
    const managedLuaModules = new Set(installedModules.flatMap(module => module.luaModules));
    const enabledLuaModules = (status?.luaModules ?? []).filter(name => managedLuaModules.has(name));
    const profile = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, name: name.trim().slice(0, 48), createdAt: new Date().toISOString(), enabledLuaModules: [...enabledLuaModules] };
    persistProfiles([...profiles, profile]);
    setNotice(`Saved profile “${profile.name}” with ${enabledLuaModules.length} active Sider Lua module(s).`);
  };
  const applyProfile = async (profile: typeof profiles[number]) => {
    if (!siderReady || profileBusy) return;
    setProfileBusy(true);
    try {
      const managedLuaModules = new Set(installedModules.flatMap(module => module.luaModules));
      const wanted = [...new Set(profile.enabledLuaModules.filter(name => managedLuaModules.has(name)))];
      await window.nextgen.applyLuaActivationProfile(wanted);
      await refresh();
      setNotice(`Applied “${profile.name}”. Sider Lua registrations now match the saved profile.`);
    } catch (error) { setNotice(error instanceof Error ? error.message : "Could not apply profile. Review Sider configuration before launching the game."); await refresh(); }
    finally { setProfileBusy(false); }
  };

  const chooseFolder = async () => {
    const selected = await window.nextgen.chooseGameDirectory();
    if (selected) {
      await refresh();
      setNotice("Game folder selected. Review the detected components below.");
    }
  };

  const scanLibrary = async () => {
    if (libraryBusy) return;
    setLibraryBusy(true);
    try { const packages = await window.nextgen.scanModuleLibrary(); setLibraryPackages(packages); setNotice("Library scan complete: " + packages.length + " package folder(s) inspected. Payload hashes were checked."); }
    catch (error) { setNotice(error instanceof Error ? error.message : "Library scan failed."); }
    finally { setLibraryBusy(false); }
  };
  const previewLibraryPackage = async (packageId: string) => {
    try { const result = await window.nextgen.previewModule(packageId); if (result) { setModulePreview(result); setNotice("Library package revalidated. Review all target changes before installation."); } }
    catch (error) { setNotice(error instanceof Error ? error.message : "Could not preview library package."); }
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
      setGeneratedPitch(null);
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

  const setLuaEnabled = async (moduleName: string, enabled: boolean) => {
    if (moduleActionBusy) return;
    setModuleActionBusy(moduleName);
    try {
      const result = await window.nextgen.setLuaModuleEnabled(moduleName, enabled);
      setNotice(moduleName + (enabled ? " enabled" : " disabled") + " in Sider. " +
        (result.changed ? "Sider configuration backed up and updated." : "Sider configuration already matched."));
      await refresh();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not change module activation.");
    } finally { setModuleActionBusy(null); }
  };

  const setPackageLuaEnabled = async (module: InstalledModule, enabled: boolean) => {
    if (moduleActionBusy) return;
    setModuleActionBusy(module.id);
    try {
      const result = await window.nextgen.setPackageLuaEnabled(module.id, enabled);
      setNotice(module.id + (enabled ? " enabled" : " disabled") + " as a package. " + (result.changed ? "Sider configuration backed up and updated." : "Sider configuration already matched."));
      await refresh();
    } catch (error) { setNotice(error instanceof Error ? error.message : "Could not change package activation."); }
    finally { setModuleActionBusy(null); }
  };

  const uninstallModule = async (module: InstalledModule) => {
    if (moduleActionBusy) return;
    const dependents = installedModules.filter(item => item.dependencies.includes(module.id));
    if (dependents.length) { setNotice("Cannot remove " + module.id + " yet. Required by: " + dependents.map(item => item.id).join(", ")); return; }
    const confirmed = window.confirm("Uninstall " + module.id + "?\n\nManager-owned unchanged files will be removed, approved originals restored, and modified files preserved. This cannot be undone automatically.");
    if (!confirmed) return;
    setModuleActionBusy(module.id);
    try {
      const result = await window.nextgen.uninstallModule(module.id);
      const summary = "Uninstalled " + module.id + ". Removed: " + result.removed.length + "; restored: " + result.restored.length + "; preserved modified: " + result.preservedModified.length + ".";
      setNotice(summary + (result.siderSyncWarning ? " Sider sync warning: " + result.siderSyncWarning : ""));
      await refresh();
    } catch (error) { setNotice(error instanceof Error ? error.message : "Module uninstall failed."); }
    finally { setModuleActionBusy(null); }
  };
  const analyzePitchLog = async () => {
    if (pitchLogBusy) return;
    setPitchLogBusy(true);
    try { const result = await window.nextgen.analyzeSiderPitchLog(); if (result) { setPitchLog(result); setNotice("Analyzed "+result.fileName+": "+result.report.uniqueResources+" distinct pitch resource path(s) referenced in "+result.report.matchedLines+" log line(s). Review raw evidence; classifications are heuristic only."); } }
    catch (error) { setNotice(error instanceof Error ? error.message : "Sider log analysis failed."); }
    finally { setPitchLogBusy(false); }
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
          <div className="brand-mark"><span>G</span></div>
          <div><div className="brand-name">THEGODMODS</div><div className="brand-sub">PES 2017 NEXT GEN MANAGER</div></div>
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
                <div className="eyebrow"><span className="eyebrow-line" /> THEGODMODS · PREMIUM EDITION · EAFC 27 INSPIRED</div>
                <h1>THE NEXT<br /><em>GENERATION</em><br />OF PES 2017.</h1>
                <p>Six departments. One premium ecosystem. Upgrade the look, feel and atmosphere of every match—with safe, transparent mod management.</p>
                <div className="hero-actions"><button className="primary-button" onClick={chooseFolder}><FolderOpen size={17} /> {ready ? "CHANGE GAME FOLDER" : "LOCATE PES 2017"}</button><button className="secondary-button" onClick={() => setActive("Modules")}>EXPLORE MODULES <ChevronRight size={16} /></button></div>
              </div>
              <div className="hero-art"><div className="hero-tag">MORE REALISM.<br />MORE IMMERSION.<br />MORE FOOTBALL.</div><div className="hero-index">THEGODMODS <span>/</span> 2017</div></div>
              <div className="hero-footer"><span>BUILT FOR PES 2017 · INSPIRED BY THE NEXT GENERATION</span><span>MODULAR. REVERSIBLE. YOURS.</span></div>
            </section>

            <div className="section-heading"><div><div className="eyebrow">SYSTEM OVERVIEW</div><h2>Your setup</h2></div><button className="text-button" disabled={busy} onClick={() => void refresh()}>REFRESH STATUS <RefreshCw size={14} /></button></div>
            <div className="stat-grid">
              <div className="stat-card"><div className="stat-top"><span>GAME INSTALLATION</span><Monitor size={17} /></div><div className={ready ? "stat-value good" : "stat-value"}>{ready ? "DETECTED" : "NOT LINKED"}</div><div className="stat-foot">{status?.gameExecutable ?? "Select your PES 2017 directory"}</div></div>
              <div className="stat-card"><div className="stat-top"><span>SIDER RUNTIME</span><Gauge size={17} /></div><div className={siderReady ? "stat-value good" : "stat-value"}>{siderReady ? "READY" : "NOT FOUND"}</div><div className="stat-foot">{status?.siderExecutable ?? "Sider executable and INI required"}</div></div>
              <div className="stat-card"><div className="stat-top"><span>LIVECPK ENGINE</span><SlidersHorizontal size={17} /></div><div className={status?.liveCpkEnabled ? "stat-value good" : "stat-value"}>{status?.liveCpkEnabled ? "ENABLED" : "INACTIVE"}</div><div className="stat-foot">Runtime asset replacement</div></div>
              <div className="stat-card"><div className="stat-top"><span>LUA EXTENSIONS</span><Activity size={17} /></div><div className={status?.luaEnabled ? "stat-value good" : "stat-value"}>{status?.luaEnabled ? "ENABLED" : "INACTIVE"}</div><div className="stat-foot">{status?.luaModules.length ?? 0} module entries detected</div></div>
            </div>

            <div className="lower-grid">
              <section className="panel"><div className="panel-heading"><div><div className="eyebrow">QUICK ACTIONS</div><h3>Control centre</h3></div><BarChart3 size={18} /></div><div className="action-row"><div className="action-icon"><FolderOpen size={18} /></div><div className="action-copy"><strong>Locate game folder</strong><span>Connect your PES 2017 installation</span></div><button className="small-action" onClick={chooseFolder}>SELECT</button></div><div className="action-row"><div className="action-icon"><SlidersHorizontal size={18} /></div><div className="action-copy"><strong>Register installed modules</strong><span>Back up and sync LiveCPK roots and Lua extensions</span></div><button className="small-action" disabled={!siderReady || busy || siderSyncBusy} onClick={syncSiderModules}>{siderSyncBusy ? "SYNCING" : "SYNC"}</button></div><div className="action-row"><div className="action-icon"><Play size={18} /></div><div className="action-copy"><strong>Launch Sider</strong><span>Start the runtime companion</span></div><button className="small-action" disabled={!siderReady} onClick={launchSider}>LAUNCH</button></div><div className="action-row"><div className="action-icon"><CloudDownload size={18} /></div><div className="action-copy"><strong>Module library</strong><span>Scan and validate local module collections</span></div><button className="small-action" onClick={() => setActive("Modules")}>OPEN</button></div></section>
              <section className="panel system-panel"><div className="panel-heading"><div><div className="eyebrow">INSTALLATION REPORT</div><h3>System integrity</h3></div><ShieldCheck size={18} /></div><div className="integrity-row"><span>Game executable</span><b className={ready ? "pill good-pill" : "pill"}>{ready ? "FOUND" : "PENDING"}</b></div><div className="integrity-row"><span>Sider configuration</span><b className={siderReady ? "pill good-pill" : "pill"}>{siderReady ? "FOUND" : "PENDING"}</b></div><div className="integrity-row"><span>Automatic file cleanup</span><b className="pill safe-pill">DISABLED</b></div><div className="integrity-note"><ShieldCheck size={15} /> Unknown files and personal game data are never deleted automatically.</div></section>
            </div>
            <div className="notice"><span className="notice-mark">i</span>{notice}</div>
          </> : active === "Stadiums & Turf" ? <section className="page-placeholder">
            <div className="eyebrow">STADIUM SERVER · LIVECPK</div><h1>PITCH BUILDER</h1>
            <p>Inventory a Stadium Server pitch folder, map one exact resource to a replacement, then package it as a validated installable module.</p>
            <DepartmentCatalogue departmentId="stadiums" onOpenSource={sourceId => void window.nextgen.openContentSource(sourceId)} />
            <div className="panel pitch-panel">
              <div className="panel-heading"><div><div className="eyebrow">STEP 01 · SOURCE INVENTORY</div><h3>Scan stadium resources</h3></div><span className="coming-tag">{pitchInventory ? pitchInventory.fileCount+" FILES" : "NOT SCANNED"}</span></div>
              <p>Choose the stadium folder containing <code>common/bg/model/bg/pitch</code>. The scan is read-only, hashes files and does not modify the stadium.</p>
              <button className="primary-button" disabled={pitchBusy} onClick={async () => { setPitchBusy(true); try { const result = await window.nextgen.scanPitchFolder(); if (result) { setPitchInventory(result); setPitchTarget(""); setPitchReplacement(""); setNotice("Pitch inventory complete: "+result.fileCount+" regular files. Choose the exact DDS resource to replace."); } } catch(error) { setNotice(error instanceof Error ? error.message : "Pitch inventory failed."); } finally { setPitchBusy(false); } }}><FolderOpen size={15}/> {pitchBusy ? "SCANNING..." : "SELECT STADIUM FOLDER & SCAN"}</button>
              {pitchInventory && <><div className="integrity-row"><span>Stadium folder</span><b>{pitchInventory.stadiumFolder}</b></div><div className="integrity-row"><span>Resource subtree</span><b>{pitchInventory.subtree}</b></div><div className="integrity-row"><span>Files fingerprinted</span><b>{pitchInventory.fileCount}</b></div></>}
            </div>
            <div className="panel pitch-panel">
              <div className="panel-heading"><div><div className="eyebrow">STEP 02 · RESOURCE MAPPING</div><h3>Choose one pitch texture</h3></div><span className="coming-tag">ONE RESOURCE PER BUILD</span></div>
              <label className="pitch-label">INVENTORIED DDS RESOURCE</label>
              <select className="pitch-select" value={pitchTarget} disabled={!pitchInventory || pitchBusy} onChange={event => { setPitchTarget(event.target.value); setPitchReplacement(""); }}><option value="">Select an inventoried DDS file…</option>{pitchInventory?.records.filter(item => item.sha256 && item.extension === ".dds" && item.dds?.valid).map(item => <option key={item.path} value={item.path}>{item.path} · {item.dds?.valid ? (item.dds.width+"×"+item.dds.height+" "+(item.dds.format ?? "DDS")) : "DDS header needs review"}</option>)}</select>
              <button className="secondary-button" disabled={!pitchTarget || pitchBusy} onClick={async () => { setPitchBusy(true); try { const file = await window.nextgen.choosePitchReplacement(pitchTarget); if (file) { setPitchReplacement(file); setNotice("Replacement selected: "+file+". The package builder will audit the staged DDS."); } } catch(error) { setNotice(error instanceof Error ? error.message : "Could not select replacement."); } finally { setPitchBusy(false); } }}><FolderOpen size={15}/> {pitchReplacement ? "REPLACEMENT: "+pitchReplacement : "CHOOSE REPLACEMENT DDS"}</button>
              {pitchTarget && <div className="dds-note">Original SHA-256: {pitchInventory?.records.find(item => item.path === pitchTarget)?.sha256}</div>}
            </div>
            <div className="panel pitch-panel">
              <div className="panel-heading"><div><div className="eyebrow">STEP 03 · PACKAGE GENERATION</div><h3>Create installable module</h3></div><span className="coming-tag">PRIVATE USE</span></div>
              <label className="pitch-label">MODULE ID</label><input className="pitch-input" value={pitchId} onChange={event => setPitchId(event.target.value)} placeholder="studio.my-pitch"/>
              <label className="pitch-label">DISPLAY NAME</label><input className="pitch-input" value={pitchName} onChange={event => setPitchName(event.target.value)} placeholder="My Pitch Replacement"/>
              <button className="primary-button" disabled={pitchBusy || !pitchInventory || !pitchTarget || !pitchReplacement || !pitchId.trim() || !pitchName.trim()} onClick={async () => { setPitchBusy(true); try { const result = await window.nextgen.buildPitchModule({inventoryPath:pitchTarget,moduleId:pitchId.trim(),moduleName:pitchName.trim()}); if (result) { setGeneratedPitch({id:result.moduleId,output:result.output}); setActive("Modules"); if (status?.gameDirectory) { try { const preview = await window.nextgen.previewModule(result.moduleId); if (preview) { setModulePreview(preview); setNotice("Built "+result.moduleId+" with "+result.files+" file(s). The generated package has been revalidated; review the installation preview before applying it. Output: "+result.output); } } catch(error) { setNotice("Package was built at "+result.output+", but installation preview failed: "+(error instanceof Error ? error.message : "unknown preview error")); } } else { setNotice("Built "+result.moduleId+" with "+result.files+" file(s). Select your PES 2017 folder, then review the generated package before installing. Output: "+result.output); } } } catch(error) { setNotice(error instanceof Error ? error.message : "Pitch module build failed."); } finally { setPitchBusy(false); } }}>{pitchBusy ? "BUILDING & VALIDATING..." : "BUILD MODULE & REVIEW INSTALL"}</button>
            </div>
            <div className="notice"><span className="notice-mark">i</span>Builder verifies the original resource has not changed since inventory, checks the replacement DDS and creates a private-use package with redistribution disabled. It does not create textures or prove PES loads them. Test one resource at a time with Sider logs and a backed-up game.</div>
          </section> : active === "Graphics" ? <section className="page-placeholder">
            <div className="eyebrow">TEXTURE WORKBENCH · DDS</div><h1>GRAPHICS LAB</h1>
            <p>Inspect real DDS textures, preview decoded pixels and compare original versus replacement data before packaging.</p>
            <DepartmentCatalogue departmentId="graphics" onOpenSource={sourceId => void window.nextgen.openContentSource(sourceId)} />
            <div className="dds-toolbar">
              <button className="primary-button" disabled={ddsBusy} onClick={async () => { setDdsBusy(true); try { const result = await window.nextgen.chooseDds("original"); if (result) { setOriginalDds(result); setDdsComparison(null); setNotice("Original DDS inspected. Choose a replacement to compare."); } } catch (error) { setNotice(error instanceof Error ? error.message : "Could not inspect original DDS."); } finally { setDdsBusy(false); } }}><FolderOpen size={15}/> CHOOSE ORIGINAL DDS</button>
              <button className="secondary-button" disabled={ddsBusy} onClick={async () => { setDdsBusy(true); try { const result = await window.nextgen.chooseDds("replacement"); if (result) { setReplacementDds(result); setDdsComparison(null); setNotice("Replacement DDS inspected. Review the preview and compare."); } } catch (error) { setNotice(error instanceof Error ? error.message : "Could not inspect replacement DDS."); } finally { setDdsBusy(false); } }}>{ddsBusy ? "INSPECTING..." : "CHOOSE REPLACEMENT DDS"}</button>
              <button className="secondary-button" disabled={ddsBusy || !originalDds || !replacementDds} onClick={async () => { setDdsBusy(true); try { const result = await window.nextgen.compareDds(); setDdsComparison(result); setNotice("DDS base-mip pixel comparison complete. This is not a PES compatibility verdict."); } catch (error) { setDdsComparison(null); setNotice(error instanceof Error ? error.message : "DDS comparison failed."); } finally { setDdsBusy(false); } }}>COMPARE TEXTURES</button>
            </div>
            <div className="dds-grid">
              {([{label:"ORIGINAL TEXTURE",value:originalDds},{label:"REPLACEMENT TEXTURE",value:replacementDds}] as const).map(item => <div className="panel dds-card" key={item.label}>
                <div className="panel-heading"><div><div className="eyebrow">{item.label}</div><h3>{item.value ? item.value.format : "No texture selected"}</h3></div><span className="coming-tag">{item.value ? item.value.width+" × "+item.value.height : "AWAITING FILE"}</span></div>
                {item.value ? <><div className="dds-image-wrap"><img src={"data:image/png;base64,"+item.value.previewBase64} alt={item.label+" decoded DDS preview"}/></div><div className="dds-filepath">{item.value.file}</div><div className="integrity-row"><span>Compression / mipmaps</span><b>{item.value.format} · {item.value.mipCount} mip(s)</b></div><div className="integrity-row"><span>Channels</span><b>{item.value.channels}</b></div><div className="integrity-row"><span>Channel mean</span><b>{item.value.channelMean.map(v=>v.toFixed(1)).join(" / ")}</b></div><div className="integrity-row"><span>Alpha mean / below 128</span><b>{item.value.alpha.mean.toFixed(1)} / {item.value.alpha.below128Percent}%</b></div>{item.value.luminance && <div className="integrity-row"><span>Luminance mean / deviation</span><b>{item.value.luminance.mean.toFixed(1)} / {item.value.luminance.standardDeviation.toFixed(1)}</b></div>}<div className="dds-note">{item.value.previewMode}. Base mip only.</div></> : <div className="dds-empty">Choose a DDS file to generate a decoded preview and channel report.</div>}
              </div>)}
            </div>
            {ddsComparison && <div className="panel dds-results"><div className="panel-heading"><div><div className="eyebrow">BASE-MIP PIXEL ANALYSIS</div><h3>Texture comparison</h3></div><span className="coming-tag">{ddsComparison.changedPixelPercent}% PIXELS CHANGED</span></div><div className="integrity-row"><span>Compared texture</span><b>{ddsComparison.width} × {ddsComparison.height} · {ddsComparison.format}</b></div><div className="integrity-row"><span>Pixels analyzed</span><b>{ddsComparison.pixelsCompared.toLocaleString()}</b></div>{Object.entries(ddsComparison.channels).map(([channel,metrics])=><div className="integrity-row" key={channel}><span>{channel} · MAE / RMSE / MAX</span><b>{metrics.meanAbsoluteError} / {metrics.rootMeanSquareError} / {metrics.maximumAbsoluteError}</b></div>)}{ddsComparison.limitations.map(item=><div className="dds-note" key={item}>{item}</div>)}</div>}
            <div className="notice"><span className="notice-mark">i</span>Only BC1, BC2, BC3 and BC5_UNORM are decoded for preview/comparison. BC5 previews show stored R/G channels in false colour. DDS validity and pixel differences do not establish PES 2017 compatibility or visual quality.</div>
          </section> : active === "Modules" ? <section className="page-placeholder">
            <div className="eyebrow">DISCOVER · VALIDATE · INSTALL</div><h1>MODULE LIBRARY</h1>
            <p>Find PES 2017 content from established community libraries, then bring supported packages into the manager for validation and safe installation.</p>
            <div className="panel" style={{marginBottom:18}}>
              <div className="panel-heading"><div><div className="eyebrow">COMMUNITY CONTENT DIRECTORY</div><h3>Find graphics, faces, kits & stadiums</h3></div><span className="coming-tag">PES 2017 SOURCES</span></div>
              <p>These are publisher/community catalogues, not files hosted by this app. Open a source, choose a PES 2017 download, and check its game version, author instructions and permissions before using it.</p>
              <div className="dds-grid">
                <div className="panel"><div className="eyebrow">GRAPHICS · STADIUMS · FACES</div><h3>PES Modding</h3><p>Dedicated PES 2017 categories including graphics, patches, faces and stadium releases.</p><button className="small-action" onClick={() => void window.nextgen.openContentSource("pesmodding")}>BROWSE PES MODDING ↗</button></div>
                <div className="panel"><div className="eyebrow">KITS · BALLS · BOOTS · STADIUMS</div><h3>ModdingWay</h3><p>Large PES 2017 mod index with category browsing and individual creator pages.</p><button className="small-action" onClick={() => void window.nextgen.openContentSource("moddingway")}>BROWSE MODDINGWAY ↗</button></div>
                <div className="panel"><div className="eyebrow">VISUALS · GRAPHICS · TOOLS</div><h3>Nexus Mods</h3><p>Community submissions for PES 2017, including graphics and presentation mods.</p><button className="small-action" onClick={() => void window.nextgen.openContentSource("nexus")}>BROWSE NEXUS MODS ↗</button></div>
                <div className="panel"><div className="eyebrow">PLAYER FACES</div><h3>ProFaceMods</h3><p>Community face library with a dedicated PES 2017 edition and external download links.</p><button className="small-action" onClick={() => void window.nextgen.openContentSource("profacemods")}>BROWSE FACE LIBRARY ↗</button></div>
              </div>
              <div className="panel" style={{marginTop:16}}>
                <div className="eyebrow">FEATURED PES 2017 RELEASE · GRAPHICS + TURF</div>
                <h3>PES 2017 GFX & Pitch from eFootball 2026</h3>
                <p>Community release with natural-colour stadium lighting, random pitch patterns and weather-dependent pitch colours. The publisher lists separate CPK and Superloader versions.</p>
                <div className="integrity-row"><span>Published file size</span><b>325.1 MB archive</b></div>
                <div className="integrity-row"><span>Requirements listed by publisher</span><b>Sider · Superloader v2.8.0 · DpFileList Generator</b></div>
                <p className="dds-note">Important: this is a third-party archive, not a manager-native package. CPK activation requires the external DpFileList workflow; the manager will not silently copy it into the game folder.</p>
                <button className="primary-button" onClick={() => void window.nextgen.openContentSource("gfx-pitch-2026")}>VIEW RELEASE & DOWNLOAD OPTIONS ↗</button>
              </div>
              <div className="dds-note">Downloads remain on their publishers' websites. The manager does not claim ownership, guarantee compatibility, or redistribute third-party files.</div>
            </div>
            <div className="coming-panel"><div className="coming-icon"><Package size={24} /></div><div><h3>Local package library</h3><p>Choose a folder whose immediate subfolders contain module.json and payload folders. Scanning is read-only.</p><button className="primary-button" disabled={libraryBusy} onClick={() => void scanLibrary()}><FolderOpen size={16} /> {libraryBusy ? "SCANNING..." : "SCAN PACKAGE FOLDER"}</button></div></div>
            <div className="library-toolbar"><input value={librarySearch} onChange={event => setLibrarySearch(event.target.value)} placeholder="Search modules, descriptions or IDs..." /><select value={libraryCategory} onChange={event => setLibraryCategory(event.target.value)}><option value="all">All categories</option>{["graphics","stadiums","kits","players","gameplay","audio","scoreboards","tifos","patches","other"].map(category => <option key={category} value={category}>{category}</option>)}</select><span>{libraryPackages.length} PACKAGES</span></div>
            {generatedPitch && !modulePreview && <div className="panel install-preview-panel"><div className="panel-heading"><div><div className="eyebrow">GENERATED PITCH PACKAGE</div><h3>{generatedPitch.id}</h3></div><span className="coming-tag">BUILT</span></div><div className="integrity-row"><span>Package output</span><b>{generatedPitch.output}</b></div><p>Package creation is complete. Select your PES 2017 folder to calculate exact add/replace targets and review installation.</p><button className="primary-button" disabled={!ready} onClick={() => void previewLibraryPackage(generatedPitch.id)}>REVIEW GENERATED PACKAGE</button></div>}
            {modulePreview && <div className="panel install-preview-panel">
              <div className="panel-heading"><div><div className="eyebrow">INSTALLATION REVIEW · EXPLICIT APPROVAL REQUIRED</div><h3>{modulePreview.name}</h3></div><span className="coming-tag">{modulePreview.version}</span></div>
              <div className="integrity-row"><span>Module ID / category</span><b>{modulePreview.id} · {modulePreview.category}</b></div>
              <div className="integrity-row"><span>License</span><b>{modulePreview.license.id} · {modulePreview.license.redistributionAllowed ? "REDISTRIBUTION ALLOWED BY DECLARATION" : "PRIVATE / NO REDISTRIBUTION"}</b></div>
              <div className="integrity-row"><span>New files / replacements</span><b>{modulePreview.files.filter(file => file.action === "add").length} / {modulePreview.files.filter(file => file.action === "replace").length}</b></div>
              {modulePreview.files.map(file => <div className="integrity-row" key={file.target}><span>{file.target}</span><b className={file.action === "replace" ? "pill" : "pill safe-pill"}>{file.action.toUpperCase()}</b></div>)}
              {modulePreview.missingDependencies.length > 0 && <div className="integrity-note">Missing dependencies: {modulePreview.missingDependencies.join(", ")}</div>}
              {modulePreview.conflicts.length > 0 && <div className="integrity-note">Conflicts: {modulePreview.conflicts.join(", ")}</div>}
              {modulePreview.alreadyInstalled && <div className="integrity-note">This module ID is already installed. Upgrade/reinstall is not supported yet.</div>}
              <div className="dds-toolbar"><button className="primary-button" disabled={busy || modulePreview.missingDependencies.length > 0 || modulePreview.conflicts.length > 0 || modulePreview.alreadyInstalled || modulePreview.files.length === 0} onClick={() => void installPreviewedModule()}>APPROVE & INSTALL MODULE</button><button className="secondary-button" onClick={() => setModulePreview(null)}>CANCEL REVIEW</button></div>
              <div className="dds-note">Existing target files are backed up only after explicit approval. The installer rechecks package hashes and target ownership before applying changes.</div>
            </div>}
            {libraryPackages.filter(item => (libraryCategory === "all" || item.category === libraryCategory) && (item.name + " " + item.id + " " + item.description).toLowerCase().includes(librarySearch.toLowerCase())).length === 0 ? <div className="coming-panel"><div className="coming-icon"><Package size={24} /></div><div><h3>{libraryPackages.length ? "No matching packages" : "Your library is empty"}</h3><p>{libraryPackages.length ? "Try another search or category." : "No packages are bundled yet. Scan your own package collection."}</p></div></div> :
              libraryPackages.filter(item => (libraryCategory === "all" || item.category === libraryCategory) && (item.name + " " + item.id + " " + item.description).toLowerCase().includes(librarySearch.toLowerCase())).map(item => <div className="panel library-card" key={item.id}>
                <div className="panel-heading"><div><div className="eyebrow">{item.category.toUpperCase()} · VERSION {item.version}</div><h3>{item.name}</h3></div><span className="coming-tag">{!item.valid ? "INVALID" : item.alreadyInstalled ? "INSTALLED" : item.conflicts.length ? "CONFLICT" : item.missingDependencies.length ? "DEPENDENCIES MISSING" : "HASHES VERIFIED"}</span></div>
                <p>{item.description}</p><div className="integrity-row"><span>Module ID</span><b>{item.id}</b></div><div className="integrity-row"><span>Payload files</span><b>{item.files}</b></div>
                {item.missingDependencies.length > 0 && <div className="integrity-note">Missing dependencies: {item.missingDependencies.join(", ")}</div>}
                {item.conflicts.length > 0 && <div className="integrity-note">Conflicts: {item.conflicts.join(", ")}</div>}
                {item.errors.map(error => <div className="integrity-note" key={error}><ShieldCheck size={14}/>{error}</div>)}
                <button className="small-action" disabled={!item.valid || item.alreadyInstalled || item.missingDependencies.length > 0 || item.conflicts.length > 0} onClick={() => void previewLibraryPackage(item.id)}>REVIEW INSTALLATION</button>
              </div>)}
            <div className="notice"><span className="notice-mark">i</span>Remote downloads are deliberately not enabled until package hosting, publisher identity and distribution permissions are established.</div>
            <div className="section-heading" style={{marginTop: 28}}><div><div className="eyebrow">LOCAL INSTALLATION</div><h2>Installed modules</h2></div><button className="text-button" disabled={busy} onClick={() => void refresh()}>REFRESH <RefreshCw size={14} /></button></div>
            {installedModules.length === 0 ? <div className="coming-panel"><div className="coming-icon"><Package size={24} /></div><div><h3>No managed modules yet</h3><p>Install a validated module package to see it listed here. Existing third-party mods are not automatically claimed or modified.</p></div></div> :
              installedModules.map(module => <div className="panel" key={module.id} style={{marginTop: 10}}>
                <div className="panel-heading"><div><div className="eyebrow">INSTALLED · {module.version}</div><h3>{module.id}</h3></div><span className="coming-tag">{module.files.length} FILES</span></div>
                <div className="integrity-row"><span>Installed</span><b>{new Date(module.installedAt).toLocaleString()}</b></div>
                <div className="integrity-row"><span>Lua extensions</span><b>{module.luaModules.length}</b></div>
                <div className="integrity-row"><span>Dependencies</span><b>{module.dependencies.length ? module.dependencies.join(", ") : "NONE"}</b></div>
                {module.luaModules.length > 0 && module.files.every(file => /^modules\/[A-Za-z0-9_-][A-Za-z0-9_.-]*\.lua$/i.test(file)) && <div className="action-row">
                  <div className="action-copy"><strong>Package activation</strong><span>Lua-only package · changes all its Lua registrations together</span></div>
                  <button className="small-action" disabled={!siderReady || moduleActionBusy !== null} onClick={() => void setPackageLuaEnabled(module, !module.luaModules.every(name => status?.luaModules.includes(name)))}>{moduleActionBusy === module.id ? "SAVING" : module.luaModules.every(name => status?.luaModules.includes(name)) ? "DISABLE PACKAGE" : "ENABLE PACKAGE"}</button>
                </div>}
                {module.luaModules.length > 0 ? module.luaModules.map(name => {
                  const enabled = status?.luaModules.includes(name) ?? false;
                  return <div className="action-row" key={name}><div className="action-icon"><Activity size={17} /></div><div className="action-copy"><strong>{name}</strong><span>{enabled ? "Registered in Sider configuration" : "Not currently registered"}</span></div><button className="small-action" disabled={!siderReady || moduleActionBusy !== null} onClick={() => void setLuaEnabled(name, !enabled)}>{moduleActionBusy === name ? "SAVING" : enabled ? "DISABLE" : "ENABLE"}</button></div>;
                }) : <div className="integrity-note">This package contains no Lua extensions. Its LiveCPK assets are managed through the installed roots.</div>}
                <button className="small-action" style={{marginTop: 14}} disabled={moduleActionBusy !== null || installedModules.some(item => item.dependencies.includes(module.id))} onClick={() => void uninstallModule(module)}>UNINSTALL MODULE</button>
                <details style={{marginTop: 12, color: "#91a0ad", fontSize: 10}}><summary>Show managed files</summary>{module.files.map(file => <div className="integrity-row" key={file}><span>{file}</span><b className="pill safe-pill">OWNED</b></div>)}</details>
              </div>)
            }
            <button className="secondary-button back-button" onClick={() => setActive("Overview")}>BACK TO OVERVIEW <ChevronRight size={16} /></button>
          </section> : active === "Profiles" ? <section className="page-placeholder">
            <div className="eyebrow">SAVE · SWITCH · REPEAT</div><h1>SETUP PROFILES</h1>
            <p>Save and restore Sider Lua activation sets for different PES 2017 experiences. Profiles are stored locally on this PC.</p>
            <div className="panel">
              <div className="panel-heading"><div><div className="eyebrow">CURRENT RUNTIME</div><h3>{status?.luaModules.length ?? 0} active Lua module(s)</h3></div><span className="coming-tag">{siderReady ? "SIDER DETECTED" : "SIDER NOT LINKED"}</span></div>
              <div className="integrity-row"><span>Game folder</span><b>{status?.gameDirectory ?? "Not selected"}</b></div>
              <div className="integrity-row"><span>Active Lua registrations</span><b>{status?.luaModules.length ? status.luaModules.join(", ") : "None detected"}</b></div>
              <button className="primary-button" disabled={!siderReady} onClick={createProfile}>SAVE CURRENT PROFILE</button>
            </div>
            {profiles.length === 0 ? <div className="coming-panel"><div className="coming-icon"><Disc3 size={24}/></div><div><h3>No saved profiles yet</h3><p>Save your current Sider Lua setup to create your first profile.</p></div></div> : profiles.map(profile => <div className="panel library-card" key={profile.id}>
              <div className="panel-heading"><div><div className="eyebrow">LOCAL PROFILE · {new Date(profile.createdAt).toLocaleDateString()}</div><h3>{profile.name}</h3></div><span className="coming-tag">{profile.enabledLuaModules.length} LUA MODULES</span></div>
              <p>{profile.enabledLuaModules.length ? profile.enabledLuaModules.join(" · ") : "No Lua modules enabled in this profile."}</p>
              <div className="dds-toolbar"><button className="primary-button" disabled={!siderReady || profileBusy} onClick={() => void applyProfile(profile)}>{profileBusy ? "APPLYING..." : "APPLY PROFILE"}</button><button className="secondary-button" onClick={() => persistProfiles(profiles.filter(item => item.id !== profile.id))}>DELETE PROFILE</button></div>
            </div>)}
            <div className="notice"><span className="notice-mark">i</span>Profiles currently manage Sider Lua activation only. Direct-file and LiveCPK package activation is not yet reversible, so those assets are never silently toggled by a profile.</div>
            <button className="secondary-button back-button" onClick={() => setActive("Overview")}>BACK TO OVERVIEW <ChevronRight size={16}/></button>
          </section> : active === "Backups" ? <section className="page-placeholder">
            <div className="eyebrow">PROTECT · REVIEW · RESTORE</div><h1>BACKUP VAULT</h1>
            <p>Review original files saved by successful module installs. Restoring a package backup removes that managed mod and puts the saved original files back where safe.</p>
            {installedModules.length === 0 ? <div className="coming-panel"><div className="coming-icon"><HardDrive size={24}/></div><div><h3>No managed package backups</h3><p>Backups appear here after a module replaces existing game files with your approval.</p></div></div> : installedModules.map(module => <div className="panel library-card" key={module.id}>
              <div className="panel-heading"><div><div className="eyebrow">PACKAGE · {module.version}</div><h3>{module.id}</h3></div><span className="coming-tag">{module.backupCount} ORIGINAL BACKUPS</span></div>
              <p>{module.backupCount ? "Original files are stored in the manager's private backup vault. Restoring them uninstalls this package and preserves user-modified files." : "This package added new files only; no original game files were replaced."}</p>
              <div className="integrity-row"><span>Managed files</span><b>{module.files.length}</b></div>
              <div className="integrity-row"><span>Original backups</span><b>{module.backupCount}</b></div>
              <button className="small-action" disabled={!module.backupCount || moduleActionBusy !== null} onClick={() => void uninstallModule(module)}>RESTORE ORIGINALS & REMOVE MOD</button>
            </div>)}
            <div className="notice"><span className="notice-mark">i</span>Restoration is hash-guarded: files edited after installation are preserved rather than overwritten. Keep the manager state folder intact until you have verified your game.</div>
            <button className="secondary-button back-button" onClick={() => setActive("Overview")}>BACK TO OVERVIEW <ChevronRight size={16}/></button>
          </section> : active === "Settings" ? <section className="page-placeholder">
            <div className="eyebrow">APPLICATION · GAME PATH · RECOVERY</div><h1>MANAGER SETTINGS</h1>
            <p>Configure the PES 2017 installation used by the installer and inspect the manager's recovery state.</p>
            <div className="panel">
              <div className="panel-heading"><div><div className="eyebrow">GAME INSTALLATION</div><h3>Managed game directory</h3></div><span className={ready ? "pill good-pill" : "pill"}>{ready ? "VALID EXECUTABLE" : "NOT CONFIGURED"}</span></div>
              <div className="integrity-row"><span>Folder</span><b>{status?.gameDirectory ?? "No folder selected"}</b></div>
              <div className="integrity-row"><span>Executable</span><b>{status?.gameExecutable ?? "Not detected"}</b></div>
              <div className="integrity-row"><span>Sider</span><b>{status?.siderExecutable ?? "Not detected"}</b></div>
              <div className="dds-toolbar"><button className="primary-button" onClick={chooseFolder}><FolderOpen size={15}/> {ready ? "CHANGE GAME FOLDER" : "SELECT GAME FOLDER"}</button><button className="secondary-button" disabled={busy} onClick={() => void refresh()}><RefreshCw size={14}/> REFRESH STATUS</button></div>
            </div>
            <div className="panel" style={{marginTop:14}}>
              <div className="panel-heading"><div><div className="eyebrow">INSTALL RECOVERY</div><h3>Transaction health</h3></div><ShieldCheck size={18}/></div>
              <div className="integrity-row"><span>Recovery state</span><b>{status?.startupRecovery.status.toUpperCase() ?? "CHECKING"}</b></div>
              <p className="dds-note">{status?.startupRecovery.message ?? "Select a game folder to inspect interrupted installation recovery."}</p>
              {status?.startupRecovery.files.map(file => <div className="integrity-row" key={file}><span>{file}</span><b className="pill good-pill">RECOVERED</b></div>)}
            </div>
            <div className="notice"><span className="notice-mark">i</span>The manager keeps game-folder settings and installation journals locally. It does not change Windows registry entries or game files merely by opening this page.</div>
            <button className="secondary-button back-button" onClick={() => setActive("Overview")}>BACK TO OVERVIEW <ChevronRight size={16}/></button>
          </section> : active === "Diagnostics" ? <section className="page-placeholder">
            <div className="eyebrow">RUNTIME EVIDENCE · SIDER LOGS</div><h1>PITCH RESOURCE TRACE</h1>
            <p>Inspect Sider log evidence for references to Stadium Server pitch resources. This is a log parser—not a claim that a texture rendered correctly in PES.</p>
            <div className="panel pitch-panel">
              <div className="panel-heading"><div><div className="eyebrow">LIVECPK · RESOURCE OBSERVABILITY</div><h3>Analyze Sider log</h3></div><span className="coming-tag">{pitchLog ? "REPORT READY" : "AWAITING LOG"}</span></div>
              <p>Select the <code>sider.log</code> created after launching Sider and playing a match in the stadium you want to inspect. Run a fresh log for each controlled test.</p>
              <button className="primary-button" disabled={pitchLogBusy} onClick={() => void analyzePitchLog()}><FolderOpen size={15}/>{pitchLogBusy ? "ANALYZING LOG..." : "SELECT SIDER LOG & ANALYZE"}</button>
            </div>
            {pitchLog && <div className="panel pitch-panel">
              <div className="panel-heading"><div><div className="eyebrow">ANALYSIS · {pitchLog.fileName}</div><h3>Observed pitch references</h3></div><span className="coming-tag">{pitchLog.report.uniqueResources} PATHS</span></div>
              <div className="stat-grid pitch-log-stats">
                <div className="stat-card"><div className="stat-top">MATCHED LINES</div><div className="stat-value">{pitchLog.report.matchedLines}</div><div className="stat-foot">Lines containing pitch subtree</div></div>
                <div className="stat-card"><div className="stat-top">DISTINCT PATHS</div><div className="stat-value">{pitchLog.report.uniqueResources}</div><div className="stat-foot">Unique resource strings</div></div>
                <div className="stat-card"><div className="stat-top">POSITIVE KEYWORDS</div><div className="stat-value good">{pitchLog.report.positiveLines}</div><div className="stat-foot">Heuristic classification only</div></div>
                <div className="stat-card"><div className="stat-top">ISSUE KEYWORDS</div><div className="stat-value">{pitchLog.report.issueLines}</div><div className="stat-foot">Heuristic classification only</div></div>
              </div>
              <div className="integrity-row"><span>Lines scanned</span><b>{pitchLog.report.scannedLines.toLocaleString()} / {pitchLog.report.totalLines.toLocaleString()}{pitchLog.report.truncated ? " · TRUNCATED" : ""}</b></div>
              {pitchLog.report.references.length === 0 ? <div className="integrity-note">No matching pitch subtree references were found in this log. This does not prove that the stadium has no pitch resources.</div> : pitchLog.report.references.slice(0,100).map(item => <div className="integrity-row" key={item.path}><span>{item.path}</span><b>{item.occurrences} refs · {item.positiveOccurrences} positive-keyword · {item.issueOccurrences} issue-keyword</b></div>)}
              <div className="eyebrow" style={{marginTop:18}}>RAW LOG EVIDENCE</div>
              {pitchLog.report.evidence.slice(0,100).map(item => <div className="pitch-log-evidence" key={item.line}><span>#{item.line} · {item.classification.toUpperCase()}</span><code>{item.text}</code></div>)}
              <div className="eyebrow" style={{marginTop:18}}>INTERPRETATION LIMITS</div>
              {pitchLog.report.limitations.map(item => <div className="integrity-note" key={item}>{item}</div>)}
              <button className="secondary-button" style={{marginTop:12}} onClick={() => setPitchLog(null)}>CLEAR REPORT</button>
            </div>}
            <div className="notice"><span className="notice-mark">i</span>For a meaningful capture: back up the stadium, start Sider, launch PES, enter one target stadium, play long enough to load the pitch, exit, then analyze the resulting log. Compare logs before and after a one-resource replacement. Keep the original log for audit.</div>
            <button className="secondary-button back-button" onClick={() => setActive("Overview")}>BACK TO OVERVIEW <ChevronRight size={16}/></button>
          </section> : ["Kits & Equipment", "Players", "Audio & Atmosphere", "Gameplay"].includes(active) ? <section className="page-placeholder">
            <DepartmentCatalogue departmentId={active === "Kits & Equipment" ? "kits" : active === "Players" ? "players" : active === "Audio & Atmosphere" ? "audio" : "gameplay"} onOpenSource={sourceId => void window.nextgen.openContentSource(sourceId)} />
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