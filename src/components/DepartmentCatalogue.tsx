import { useMemo, useState } from "react";
import { ArrowUpRight, BadgeCheck, Blocks, Search, ShieldCheck, Sparkles } from "lucide-react";
import { getDepartment } from "../catalogue/departments";

type Props = { departmentId: string; onOpenSource: (sourceId: string) => void };

export default function DepartmentCatalogue({ departmentId, onOpenSource }: Props) {
  const department = getDepartment(departmentId);
  const [view, setView] = useState<"originals" | "third-party">("originals");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [subcategory, setSubcategory] = useState("All");
  const filteredSubcategories = useMemo(() => department?.subcategories.filter(item => item.toLowerCase().includes(search.toLowerCase())) ?? [], [department, search]);
  if (!department) return null;
  const visibleSources = department.thirdParty.filter(item => (item.name + " " + item.focus + " " + item.note).toLowerCase().includes(search.toLowerCase()));
  const visibleOriginals = department.originals.filter(item => (item.name + " " + item.focus).toLowerCase().includes(search.toLowerCase()));
  const activeOriginal = department.originals.find(item => item.name === selected);
  const activeSource = department.thirdParty.find(item => item.id + item.name === selected);
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
    <div className="catalogue-subcategories"><span>EXPLORE</span>{department.subcategories.map(item => <button key={item} className={subcategory === item ? "active" : ""} onClick={() => setSubcategory(subcategory === item ? "All" : item)}>{item}</button>)}</div>
    {view === "originals" ? <div className="catalogue-cards">
      {visibleOriginals.length ? visibleOriginals.map(item => <article className="catalogue-card original-card" key={item.name}>
        <div className="catalogue-card-top"><span className="catalogue-origin"><Sparkles size={13}/> BUILT BY THEGODMODS</span><span className="catalogue-state">{item.status === "in-development" ? "IN DEVELOPMENT" : "STUDIO ROADMAP"}</span></div>
        <div className="catalogue-art"><div className="catalogue-art-mark">GOD<span>MODS</span></div><div className="catalogue-art-line"/><span>{department.id.toUpperCase()} / ORIGINAL SERIES</span></div>
        <h3>{item.name}</h3><p>{item.focus}</p>
        <div className="catalogue-card-foot"><span><BadgeCheck size={14}/> Original content programme</span><button onClick={() => setSelected(selected === item.name ? null : item.name)}>{selected === item.name ? "HIDE DETAILS" : "PROJECT DETAILS"}</button></div>
        {selected === item.name && <div className="catalogue-detail"><b>Production status</b><p>This is a THEGODMODS-owned project concept, not a downloadable release yet. The team must create the assets, test them in PES 2017, package them and publish verified hashes before installation is enabled.</p><b>Planned quality gates</b><p>Original asset provenance · PES 2017/Sider compatibility · preview evidence · package manifest · backup and rollback test.</p></div>}
      </article>) : <div className="catalogue-empty"><Blocks size={22}/><b>No matching original projects</b><span>Try a different search.</span></div>}
    </div> : <div className="catalogue-cards">
      {visibleSources.length ? visibleSources.map(item => <article className="catalogue-card third-party-card" key={item.id + item.name}>
        <div className="catalogue-card-top"><span className="catalogue-origin">EXTERNAL PUBLISHER</span><span className="catalogue-state external">SOURCE ONLY</span></div>
        <div className="catalogue-publisher-mark">{item.name.slice(0,2).toUpperCase()}</div><h3>{item.name}</h3><strong>{item.focus}</strong><p>{item.note}</p>
        <div className="catalogue-card-foot"><span><ShieldCheck size={14}/> Not verified by THEGODMODS</span><button onClick={() => onOpenSource(item.id)}>VISIT SOURCE <ArrowUpRight size={13}/></button></div>
      </article>) : <div className="catalogue-empty"><Blocks size={22}/><b>No matching third-party sources</b><span>Try a different search.</span></div>}
    </div>}
    <div className="catalogue-release-note"><ShieldCheck size={15}/><span><b>Installation is locked until verification.</b> Catalogue listings and project concepts are not installable packages. A real release must have a version-pinned package, verified SHA-256, clear publisher/licence, PES 2017 compatibility and a tested install/rollback path.</span></div>
  </section>;
}
