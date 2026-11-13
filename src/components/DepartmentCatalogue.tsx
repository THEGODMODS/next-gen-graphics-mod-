import { useState } from "react";
import { ArrowUpRight, BadgeCheck, Blocks, Search, ShieldCheck, Sparkles } from "lucide-react";
import { getDepartment } from "../catalogue/departments";
import { getGeneratedAssetStatus, getOriginalContentProject } from "../catalogue/original-content";

type Props = { departmentId: string; onOpenSource: (sourceId: string) => void };

export default function DepartmentCatalogue({ departmentId, onOpenSource }: Props) {
  const department = getDepartment(departmentId);
  const [view, setView] = useState<"originals" | "third-party">("originals");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState("All");
  if (!department) return null;
  const visibleSources = department.thirdParty.filter(item => (selectedCategory === "All" || item.categories.includes(selectedCategory)) && (item.name + " " + item.focus + " " + item.note).toLowerCase().includes(search.toLowerCase()));
  const visibleOriginals = department.originals.filter(item => (selectedCategory === "All" || item.categories.includes(selectedCategory)) && (item.name + " " + item.focus).toLowerCase().includes(search.toLowerCase()));
  return <section className="department-catalogue">
    <div className="catalogue-heading">
      <div><div className="eyebrow">THEGODMODS CONTENT NETWORK · {department.strapline}</div><h2>{department.title} Catalogue</h2><p>{department.description}</p></div>
      <div className="catalogue-trust"><ShieldCheck size={17}/><span>VERIFIED INSTALLS ONLY</span></div>
    </div>
    <div className="catalogue-toolbar">
      <div className="catalogue-search"><Search size={15}/><input value={search} onChange={event => setSearch(event.target.value)} placeholder={"Search " + department.title.toLowerCase() + "..."} /></div>
      <div className="catalogue-tabs">
        <button className={view === "originals" ? "selected" : ""} onClick={() => {setView("originals");setSelected(null);}}>THEGODMODS ORIGINALS <span>{department.originals.length}</span></button>
        <button className={view === "third-party" ? "selected" : ""} onClick={() => {setView("third-party");setSelected(null);}}>THIRD-PARTY <span>{department.thirdParty.length}</span></button>
      </div>
    </div>
    <div className="catalogue-subcategories"><span>FILTER BY</span><button className={"catalogue-chip" + (selectedCategory === "All" ? " active" : "")} onClick={() => setSelectedCategory("All")}>All</button>{department.subcategories.map(item => <button className={"catalogue-chip" + (selectedCategory === item ? " active" : "")} key={item} onClick={() => setSelectedCategory(selectedCategory === item ? "All" : item)}>{item}</button>)}</div>
    {view === "originals" ? <div className="catalogue-cards">
      {visibleOriginals.length ? visibleOriginals.map(item => <article className="catalogue-card original-card" key={item.name}>
        <div className="catalogue-card-top"><span className="catalogue-origin"><Sparkles size={13}/> BUILT BY THEGODMODS</span><span className="catalogue-state">{item.status === "in-development" ? "IN DEVELOPMENT" : "STUDIO ROADMAP"}</span></div>
        <div className="catalogue-art"><div className="catalogue-art-mark">GOD<span>MODS</span></div><div className="catalogue-art-line"/><span>{department.id.toUpperCase()} / ORIGINAL SERIES</span></div>
        <h3>{item.name}</h3><p>{item.focus}</p><div className="catalogue-tags">{item.categories.filter(category => selectedCategory === "All" || category === selectedCategory).map(category => <span key={category}>{category}</span>)}</div>
        <div className="catalogue-card-foot"><span><BadgeCheck size={14}/> Original content programme</span><button onClick={() => setSelected(selected === item.name ? null : item.name)}>{selected === item.name ? "HIDE DETAILS" : "PROJECT DETAILS"}</button></div>
        {selected === item.name && (() => {
          const brief = getOriginalContentProject(item.name);
          const generated = getGeneratedAssetStatus(item.name);
          if (!brief) return <div className="catalogue-detail"><b>Production brief unavailable</b><p>This project cannot be released until its content brief is completed.</p></div>;
          return <div className="catalogue-detail">
            <div className="catalogue-brief-state">{generated ? "ORIGINAL SOURCE ASSETS GENERATED · GAME INTEGRATION PENDING" : brief.productionState === "tooling-prototype" ? "AUTHORING TOOLING PROTOTYPE · NOT A CONTENT PACK" : "PRODUCTION BRIEF · ASSETS NOT YET RELEASED"}</div>
            {generated && <><b>Generated premium source assets</b><p>{generated.summary}</p><ul>{generated.files.map(file => <li key={file}><code>{file}</code></li>)}</ul><b>Compatibility status</b><p>{generated.readiness}</p></>}
            <b>Production goal</b><p>{brief.goal}</p>
            <b>Style direction</b><p>{brief.styleDirection}</p>
            <div className="catalogue-brief-grid">
              <div><b>Deliverables</b><ul>{brief.deliverables.map(value => <li key={value}>{value}</li>)}</ul></div>
              <div><b>Required source assets</b><ul>{brief.assetRequirements.map(value => <li key={value}>{value}</li>)}</ul></div>
              <div><b>Acceptance checks</b><ul>{brief.acceptanceChecks.map(value => <li key={value}>{value}</li>)}</ul></div>
              <div><b>Preview plan</b><ul>{brief.previewPlan.map(value => <li key={value}>{value}</li>)}</ul></div>
            </div>
            <b>Rights policy</b><p>{brief.rightsPolicy}</p>
            <b>Install status</b><p>{generated ? "Original source assets are generated and included in the Windows build pipeline, but they are not yet approved for one-click PES installation. Target conversion, resource mapping, compatibility, package validation, rollback tests and real-game evidence must pass first." : "No downloadable payload is approved. Installation remains locked until real assets, rights, compatibility, package hashes, rollback tests and real-game evidence pass release gates."}</p>
          </div>;
        })()}
      </article>) : <div className="catalogue-empty"><Blocks size={22}/><b>No matching original projects</b><span>Try a different search.</span></div>}
    </div> : <div className="catalogue-cards">
      {visibleSources.length ? visibleSources.map(item => <article className="catalogue-card third-party-card" key={item.id + item.name}>
        <div className="catalogue-card-top"><span className="catalogue-origin">EXTERNAL PUBLISHER</span><span className="catalogue-state external">SOURCE ONLY</span></div>
        <div className="catalogue-publisher-mark">{item.name.slice(0,2).toUpperCase()}</div><h3>{item.name}</h3><strong>{item.focus}</strong><p>{item.note}</p><div className="catalogue-tags">{item.categories.filter(category => selectedCategory === "All" || category === selectedCategory).map(category => <span key={category}>{category}</span>)}</div>
        <div className="catalogue-card-foot"><span><ShieldCheck size={14}/> Not verified by THEGODMODS</span><button onClick={() => onOpenSource(item.id)}>VISIT SOURCE <ArrowUpRight size={13}/></button></div>
      </article>) : <div className="catalogue-empty"><Blocks size={22}/><b>No matching third-party sources</b><span>Try a different search.</span></div>}
    </div>}
    <div className="catalogue-release-note"><ShieldCheck size={15}/><span><b>{selectedCategory === "All" ? "Installation is locked until verification." : selectedCategory + " · discovery filter active."}</b> Catalogue listings and project concepts are not installable packages. A real release must have a version-pinned package, verified SHA-256, clear publisher/licence, PES 2017 compatibility and a tested install/rollback path.</span></div>
  </section>;
}
