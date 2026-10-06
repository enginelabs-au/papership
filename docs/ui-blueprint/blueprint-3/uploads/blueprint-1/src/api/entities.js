/**
 * Local-first entity stores (browser localStorage) for dashboard CRUD.
 * Replaces remote entity APIs.
 */
const PREFIX = "cc_dashboard_entity_";

function createEntityStore(entityName) {
  const key = PREFIX + entityName;

  const read = () => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  };

  const write = (items) => {
    localStorage.setItem(key, JSON.stringify(items));
  };

  return {
    async list() {
      return read();
    },
    async create(data) {
      const id = data.id || `local_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
      const rec = { ...data, id, created_at: data.created_at || new Date().toISOString() };
      const items = [rec, ...read()];
      write(items);
      return rec;
    },
    async update(id, patch) {
      const items = read();
      const idx = items.findIndex((x) => x.id === id);
      if (idx === -1) throw new Error(`Entity ${entityName}: not found ${id}`);
      items[idx] = { ...items[idx], ...patch };
      write(items);
      return items[idx];
    },
    async delete(id) {
      write(read().filter((x) => x.id !== id));
    },
  };
}

export const Integration = createEntityStore("Integration");
export const DashboardWidget = createEntityStore("DashboardWidget");
export const RosterEntry = createEntityStore("RosterEntry");
export const ReportSnapshot = createEntityStore("ReportSnapshot");
export const AIInsight = createEntityStore("AIInsight");
