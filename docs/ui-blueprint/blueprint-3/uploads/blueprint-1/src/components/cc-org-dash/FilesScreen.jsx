import { useState, useMemo } from "react";
import { Btn, Avi, Modal, F } from "./primitives";
import { FILE_FOLDERS, FILE_DATA } from "./data";
import {
  Home,
  FolderOpen,
  Clock,
  Star,
  Upload,
  LayoutGrid,
  List,
  Plus,
  ChevronRight,
  ChevronDown,
  Users,
  Inbox,
  Trash2,
  ImageIcon,
  MoreHorizontal,
} from "./icons";

const NEUTRAL_ICON = "#6e7781";

/** Dropbox-style left nav: neutral stroke icons only */
function NavIcon({ Icon, active }) {
  return <Icon size={18} color={active ? "#1f2328" : NEUTRAL_ICON} strokeWidth={2} />;
}

export default function FilesScreen({ T, isMobile }) {
  const [folder, setFolder] = useState("root");
  /** null | recents | starred — filters across folders */
  const [viewFilter, setViewFilter] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [viewMode, setViewMode] = useState("list");
  const [uploadModal, setUploadModal] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [starredIds, setStarredIds] = useState(() => new Set());
  const [foldersOpen, setFoldersOpen] = useState(true);

  const allFilesFlat = useMemo(() => [...Object.values(FILE_DATA).flat()], []);

  const files = useMemo(() => {
    let list = [];
    if (viewFilter === "recents") {
      list = [...allFilesFlat].sort((a, b) =>
        (b.modified || "").localeCompare(a.modified || "")
      );
    } else if (viewFilter === "starred") {
      list = allFilesFlat.filter((f) => starredIds.has(f.id));
    } else {
      list = [...(FILE_DATA[folder] ?? [])];
    }
    return list;
  }, [folder, viewFilter, allFilesFlat, starredIds]);

  const selFile = selectedFile
    ? allFilesFlat.find((f) => f.id === selectedFile)
    : null;

  const sidebarBg = T.canvas;
  const mainBg = T.surface;
  const isAllFilesActive = viewFilter === null && folder === "root";
  const isRecentsActive = viewFilter === "recents";
  const isStarredNavActive = viewFilter === "starred";

  const goAllFiles = () => {
    setFolder("root");
    setViewFilter(null);
    setSelectedFile(null);
  };
  const goRecents = () => {
    setViewFilter("recents");
    setSelectedFile(null);
  };
  const goStarredFilter = () => {
    setViewFilter("starred");
    setSelectedFile(null);
  };

  const toggleStar = (e, id) => {
    e.stopPropagation();
    setStarredIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const folderRows = FILE_FOLDERS.filter((f) =>
    ["projects", "reports", "ai", "legal"].includes(f.id)
  );

  const NavRow = ({
    label,
    Icon,
    active,
    onClick,
    indent,
    badge,
  }) => (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: indent ? "6px 12px 6px 28px" : "8px 14px",
        margin: "0 8px",
        borderRadius: 6,
        border: "none",
        background: active ? "rgba(0,0,0,0.06)" : "transparent",
        color: active ? T.t1 : T.t2,
        fontSize: 13,
        fontWeight: active ? 600 : 400,
        cursor: "pointer",
        fontFamily: F.sans,
        textAlign: "left",
        transition: "background .12s",
      }}
      onMouseEnter={(e) => {
        if (!active) e.currentTarget.style.background = T.hover;
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.background = "transparent";
      }}
    >
      {Icon && (
        <span style={{ display: "flex", flexShrink: 0 }}>
          <NavIcon Icon={Icon} active={active} />
        </span>
      )}
      <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {label}
      </span>
      {badge}
    </button>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0, minHeight: 480 }}>
      {/* Header — Dropbox-style action bar */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <div style={{ color: T.t1, fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em" }}>
          Files
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
          <button
            type="button"
            onClick={() => setUploadModal(true)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 14px",
              fontSize: 13,
              fontWeight: 600,
              fontFamily: F.sans,
              color: "#fff",
              background: T.accent,
              border: `1px solid ${T.accent}`,
              borderRadius: 6,
              cursor: "pointer",
            }}
          >
            <Upload size={15} color="#fff" />
            Upload
            <ChevronDown size={14} color="#fff" />
          </button>
          <div style={{ position: "relative" }}>
            <Btn T={T} variant="default" small onClick={() => setCreateOpen((o) => !o)}>
              <Plus size={14} /> Create <ChevronDown size={12} />
            </Btn>
            {createOpen && (
              <div
                onClick={() => setCreateOpen(false)}
                style={{
                  position: "absolute",
                  top: "calc(100% + 4px)",
                  left: 0,
                  zIndex: 20,
                  minWidth: 180,
                  padding: 6,
                  background: T.surface,
                  border: `1px solid ${T.border}`,
                  borderRadius: 8,
                  boxShadow: T.shadowMd,
                }}
              >
                <button
                  type="button"
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    border: "none",
                    background: "none",
                    textAlign: "left",
                    fontSize: 13,
                    color: T.t1,
                    cursor: "pointer",
                    fontFamily: F.sans,
                  }}
                >
                  New folder
                </button>
              </div>
            )}
          </div>
          <Btn T={T} variant="default" small>
            <FolderOpen size={14} color={T.t2} /> Organize <ChevronDown size={12} />
          </Btn>
          <button
            type="button"
            style={{
              padding: "6px 10px",
              border: `1px solid ${T.border}`,
              borderRadius: 6,
              background: T.raised,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
            }}
            aria-label="More actions"
          >
            <MoreHorizontal size={16} color={T.t2} />
          </button>
          <button
            type="button"
            onClick={() => setViewMode((v) => (v === "list" ? "grid" : "list"))}
            style={{
              marginLeft: 4,
              padding: 6,
              border: `1px solid ${T.border}`,
              borderRadius: 6,
              background: T.surface,
              cursor: "pointer",
            }}
            title={viewMode === "list" ? "Grid view" : "List view"}
          >
            {viewMode === "list" ? <LayoutGrid size={16} color={T.t2} /> : <List size={16} color={T.t2} />}
          </button>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          border: `1px solid ${T.border}`,
          borderRadius: 8,
          overflow: "hidden",
          background: mainBg,
          boxShadow: T.shadow,
          flex: 1,
          minHeight: 440,
        }}
      >
        {/* Left sidebar — Dropbox-style */}
        {!isMobile && (
          <div
            style={{
              width: 228,
              flexShrink: 0,
              background: sidebarBg,
              borderRight: `1px solid ${T.border}`,
              paddingTop: 10,
              paddingBottom: 12,
            }}
          >
            <NavRow label="Home" Icon={Home} active={isAllFilesActive} onClick={goAllFiles} />
            <div style={{ margin: "4px 0" }}>
              <div
                style={{
                  padding: "6px 14px 4px",
                  color: T.t2,
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                }}
              >
                All files
              </div>
              <button
                type="button"
                onClick={() => setFoldersOpen((o) => !o)}
                style={{
                  margin: "2px 8px 4px 14px",
                  padding: "4px 6px",
                  border: "none",
                  background: "none",
                  color: T.t3,
                  fontSize: 12,
                  cursor: "pointer",
                  fontFamily: F.sans,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  width: "calc(100% - 16px)",
                }}
              >
                <FolderOpen size={16} color={NEUTRAL_ICON} />
                <span style={{ flex: 1, textAlign: "left", color: T.t1, fontWeight: 500 }}>
                  Browse folders
                </span>
                {foldersOpen ? <ChevronDown size={14} color={T.t3} /> : <ChevronRight size={14} color={T.t3} />}
              </button>
              {foldersOpen &&
                folderRows.map((f) => (
                  <NavRow
                    key={f.id}
                    label={f.label}
                    Icon={FolderOpen}
                    indent
                    active={viewFilter === null && folder === f.id}
                    onClick={() => {
                      setFolder(f.id);
                      setViewFilter(null);
                      setSelectedFile(null);
                    }}
                  />
                ))}
            </div>
            <NavRow label="Recents" Icon={Clock} active={isRecentsActive} onClick={goRecents} />
            <NavRow label="Starred" Icon={Star} active={isStarredNavActive} onClick={goStarredFilter} />
            <NavRow
              label="Photos"
              Icon={ImageIcon}
              active={false}
              onClick={() => {}}
            />
            <NavRow
              label="Shared"
              Icon={Users}
              active={viewFilter === null && folder === "shared"}
              onClick={() => {
                setFolder("shared");
                setViewFilter(null);
                setSelectedFile(null);
              }}
            />
            <NavRow
              label="File requests"
              Icon={Inbox}
              active={false}
              onClick={() => {}}
            />
            <NavRow
              label="Deleted files"
              Icon={Trash2}
              active={viewFilter === null && folder === "trash"}
              onClick={() => {
                setFolder("trash");
                setViewFilter(null);
                setSelectedFile(null);
              }}
            />
          </div>
        )}

        {/* Main file area */}
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
          <div
            style={{
              padding: "10px 16px",
              borderBottom: `1px solid ${T.border}`,
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: T.raised,
              fontSize: 13,
            }}
          >
            <span style={{ color: T.t2, fontWeight: 500 }}>Files</span>
            <ChevronRight size={12} color={T.t3} />
            <span style={{ color: T.t1, fontWeight: 600 }}>
              {viewFilter === "recents"
                ? "Recents"
                : viewFilter === "starred"
                  ? "Starred"
                  : folder === "root"
                    ? "All files"
                    : FILE_FOLDERS.find((x) => x.id === folder)?.label || folder}
            </span>
          </div>

          {viewMode === "list" ? (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["Name", "Modified", "Who can access"].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "12px 18px",
                        textAlign: "left",
                        fontSize: 12,
                        fontWeight: 600,
                        color: T.t2,
                        borderBottom: `1px solid ${T.borderMuted ?? T.border}`,
                        background: T.surface,
                        whiteSpace: "nowrap",
                        letterSpacing: "0.01em",
                      }}
                    >
                      {h}
                      {h === "Name" && (
                        <span style={{ marginLeft: 4, color: T.t3, fontWeight: 400 }}>↑</span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {files.map((f, fi) => (
                  <tr
                    key={f.id}
                    onClick={() => setSelectedFile(f.id === selectedFile ? null : f.id)}
                    style={{
                      background: selectedFile === f.id ? T.accentBg : "transparent",
                      cursor: "pointer",
                      transition: "background .12s ease",
                    }}
                    onMouseEnter={(e) => {
                      if (selectedFile !== f.id) e.currentTarget.style.background = T.hover;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background =
                        selectedFile === f.id ? T.accentBg : "transparent";
                    }}
                  >
                    <td style={{ padding: "14px 18px", borderBottom: fi < files.length - 1 ? `1px solid ${T.borderMuted ?? T.border}` : "none", maxWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                        <span
                          style={{
                            color: T.t1,
                            fontSize: 13,
                            fontWeight: 500,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            flex: 1,
                          }}
                        >
                          {f.name}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => toggleStar(e, f.id)}
                          style={{
                            border: "none",
                            background: "none",
                            padding: 4,
                            cursor: "pointer",
                            flexShrink: 0,
                            opacity: starredIds.has(f.id) ? 1 : 0.45,
                          }}
                          title={starredIds.has(f.id) ? "Unstar" : "Star"}
                        >
                          <Star
                            size={16}
                            color={starredIds.has(f.id) ? T.amber : NEUTRAL_ICON}
                            fill={starredIds.has(f.id) ? T.amber : "none"}
                          />
                        </button>
                      </div>
                    </td>
                    <td
                      style={{
                        padding: "14px 18px",
                        color: T.t3,
                        fontSize: 12,
                        borderBottom: fi < files.length - 1 ? `1px solid ${T.borderMuted ?? T.border}` : "none",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {f.modified}
                    </td>
                    <td
                      style={{
                        padding: "14px 18px",
                        color: T.t2,
                        fontSize: 12,
                        borderBottom: fi < files.length - 1 ? `1px solid ${T.borderMuted ?? T.border}` : "none",
                      }}
                    >
                      {f.shared > 0 ? `${f.shared} people` : "Only you"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div
              style={{
                padding: 16,
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill,minmax(140px,1fr))",
                gap: 12,
              }}
            >
              {files.map((f) => (
                <div
                  key={f.id}
                  onClick={() => setSelectedFile(f.id === selectedFile ? null : f.id)}
                  style={{
                    padding: "14px 12px",
                    background: selectedFile === f.id ? T.accentBg : T.raised,
                    border: `1px solid ${selectedFile === f.id ? T.accentBorder : T.border}`,
                    borderRadius: 8,
                    cursor: "pointer",
                    transition: "all .12s",
                  }}
                >
                  <div
                    style={{
                      height: 72,
                      borderRadius: 6,
                      background: "rgba(110,119,129,0.12)",
                      marginBottom: 10,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <span style={{ fontSize: 11, fontWeight: 600, color: T.t3, fontFamily: F.mono }}>
                      {f.name.slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <div
                    style={{
                      color: T.t1,
                      fontSize: 12,
                      fontWeight: 500,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      marginBottom: 4,
                    }}
                  >
                    {f.name}
                  </div>
                  <div style={{ color: T.t3, fontSize: 11 }}>{f.size}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Detail panel */}
        {!isMobile && (
          <div
            style={{
              width: selFile ? 240 : 0,
              flexShrink: 0,
              borderLeft: `1px solid ${T.border}`,
              overflow: "hidden",
              transition: "width .2s",
              background: T.raised,
            }}
          >
            {selFile && (
              <div style={{ width: 240, padding: 16 }}>
                <div
                  style={{
                    textAlign: "center",
                    padding: "16px 0 14px",
                    borderBottom: `1px solid ${T.border}`,
                    marginBottom: 12,
                  }}
                >
                  <div
                    style={{
                      width: 56,
                      height: 56,
                      margin: "0 auto 12px",
                      borderRadius: 8,
                      background: "rgba(110,119,129,0.15)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <span style={{ fontSize: 14, fontWeight: 700, color: T.t2, fontFamily: F.mono }}>
                      {selFile.name.slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <div
                    style={{
                      color: T.t1,
                      fontSize: 13,
                      fontWeight: 600,
                      lineHeight: 1.35,
                      marginBottom: 4,
                      wordBreak: "break-word",
                    }}
                  >
                    {selFile.name}
                  </div>
                  <div style={{ color: T.t3, fontSize: 12 }}>{selFile.size}</div>
                </div>
                {[
                  ["Modified", selFile.modified],
                  ["Who can access", selFile.shared > 0 ? `${selFile.shared} people` : "Only you"],
                  ["Owner", selFile.owner],
                ].map(([k, v]) => (
                  <div
                    key={k}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 8,
                      padding: "6px 0",
                      borderBottom: `1px solid ${T.border}`,
                      fontSize: 12,
                    }}
                  >
                    <span style={{ color: T.t3 }}>{k}</span>
                    <span
                      style={{
                        color: T.t1,
                        fontWeight: 500,
                        textAlign: "right",
                        wordBreak: "break-word",
                      }}
                    >
                      {v}
                    </span>
                  </div>
                ))}
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 14 }}>
                  <Btn T={T} small variant="accent" full>
                    Download
                  </Btn>
                  <Btn T={T} small variant="default" full>
                    Share
                  </Btn>
                  <Btn T={T} small variant="default" full>
                    Rename
                  </Btn>
                  <Btn T={T} small variant="danger" full>
                    Delete
                  </Btn>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <Modal T={T} open={uploadModal} onClose={() => setUploadModal(false)} title="Upload files">
        <div
          style={{
            border: `2px dashed ${T.border}`,
            borderRadius: 8,
            padding: "36px",
            textAlign: "center",
            marginBottom: 16,
            cursor: "pointer",
            transition: "border-color .15s",
            background: T.raised,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = T.accent;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = T.border;
          }}
        >
          <Upload size={28} color={T.t3} style={{ margin: "0 auto 8px" }} />
          <div style={{ color: T.t1, fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
            Drop files here
          </div>
          <div style={{ color: T.t3, fontSize: 12 }}>or click to browse</div>
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <Btn T={T} variant="default" onClick={() => setUploadModal(false)}>
            Cancel
          </Btn>
          <Btn T={T} variant="accent" onClick={() => setUploadModal(false)}>
            Upload
          </Btn>
        </div>
      </Modal>
    </div>
  );
}
