# Kiến trúc chi tiết

## Deploy Flow
```
Source code: main branch
Build:       npm run build → dist/
Deploy:      npx gh-pages -d dist → gh-pages branch → https://bs90.github.io/giapha/
```

## Supabase Config
- Project URL: `https://kwytxeosvksbgeqquvac.supabase.co`
- Auth email (hardcoded trong PasswordGate.tsx): `trongtb90@gmail.com`
- Anon key: lưu trong `.env.local` (gitignored), bake vào JS lúc build (public, an toàn nhờ RLS)
- RLS enabled trên `members` — 4 policies (SELECT, INSERT, UPDATE, DELETE) cho role `authenticated`
- Bảng `app_settings` đã DROP (không dùng nữa)

## DB Schema
```sql
CREATE TABLE members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT 'Nguoi moi',
  photo_url TEXT,
  memo TEXT,
  father_id UUID REFERENCES members(id) ON DELETE SET NULL,
  mother_id UUID REFERENCES members(id) ON DELETE SET NULL,
  spouse_id  UUID REFERENCES members(id) ON DELETE SET NULL,
  position_x FLOAT NOT NULL DEFAULT 0,
  position_y FLOAT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS Policies (role: authenticated, USING: true)
-- "Authenticated users can read members" ON SELECT
-- "Authenticated users can insert members" ON INSERT (WITH CHECK true)
-- "Authenticated users can update members" ON UPDATE
-- "Authenticated users can delete members" ON DELETE
```

## File Structure
```
.env.local                       — VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY (gitignored)
public/favicon.png               — Favicon 192x192
index.html                       — SPA entry, lang="vi", favicon link
vite.config.ts                   — base: '/giapha/'
src/
  main.tsx                       — React root render
  App.tsx                        — Auth check (Supabase session) → PasswordGate | FamilyCanvas
  App.css                        — All styles (password gate, member card, dialogs, highlight/dim,
                                   heart node)
  lib/
    supabase.ts                  — createClient singleton
    types.ts                     — MemberRow, MemberNodeData, HeartNodeData, AppEdge, PendingConnection
    HighlightContext.ts          — React Context<Set<string>|null> cho hover highlight
    findShortestPathNodes.ts     — BFS dual-distance thuật toán tìm đường ngắn nhất
  components/
    PasswordGate.tsx             — Password-only login (email hardcoded)
    FamilyCanvas.tsx             — ReactFlow canvas + Panel + dialogs + HighlightContext.Provider
    MemberNode.tsx               — Custom node: photo, name, memo (inline edit)
                                   CSS classes: .dimmed, .highlighted, .special
                                   Handles: top (child), bottom (parent)
    HeartNode.tsx                — Virtual node: ❤️ giữa cặp vợ chồng, double-click để xoá
                                   Handle: bottom (source tới con), không có edge nối vào từ spouse
    RelationshipDialog.tsx       — Modal: chọn "Bố", "Mẹ", hoặc "Kết hôn"
  hooks/
    useMembers.ts                — Central hook: fetch, CRUD, auto-save, cascade delete,
                                   marriage (heart nodes, spouse sticking), edge management
```

## Component Flow
```
App.tsx
  ├─ (chưa login) → PasswordGate → supabase.auth.signInWithPassword()
  └─ (đã login)   → FamilyCanvas
                       ├─ ReactFlow (nodes + edges từ useMembers)
                       ├─ RelationshipDialog (khi kéo nối 2 thẻ)
                       └─ ConfirmDeleteDialog (khi nhấn xoá)
```

## Data Flow
```
Supabase DB (members table)
    ↕ fetch / update / insert / delete
membersRef (useRef<MemberRow[]>) — source of truth trong memory
    ↓ transform
React Flow nodes (useNodesState) + edges (useEdgesState)
    ↓ render
MemberNode components trên canvas
```

## Key Patterns
- **Inline edit**: contentEditable + onBlur → optimistic local update + Supabase update
- **Position save**: onNodeDragStop → debounce 300ms → Supabase update
- **Cascade delete**: BFS tìm con cháu → supabase.delete().in('id', [...]) + clear spouse_id
- **Relationship**: onConnect → RelationshipDialog → update father_id/mother_id hoặc spouse_id
- **Edge delete**: onEdgeClick → confirm → set father_id/mother_id = null
- **Marriage delete**: double-click ❤️ → confirm → clear spouse_id cả 2 phía
- **Marriage**: spouse_id bidirectional (cả 2 trỏ vào nhau), sinh virtual heart node client-side
- **Marriage visual**: không có edge nối spouse↔heart, chỉ có ❤️ float giữa 2 thẻ
- **Spouse sticking**: onNodeDrag di chuyển spouse + heart cùng delta, onNodeDragStop persist cả 2
- **Heart node**: virtual (không lưu DB), position = midpoint 2 spouse + offset (72, 42)
- **Edge routing**: nếu cả bố mẹ đều kết hôn → con nối qua heart (tím #8b5cf6) thay vì 2 edge riêng
- **Highlight performance**: HighlightContext + React.memo(), không rebuild nodes khi hover

## React Flow v12 Lưu ý
- Dùng type `OnNodeDrag` (KHÔNG phải `NodeDragHandler` — không tồn tại trong v12)
- `nodeTypes` phải define NGOÀI component để tránh re-render
- `useNodesState`/`useEdgesState` cho React Flow state
- `membersRef` (useRef) làm source of truth — tránh stale closure
- CSS class `nodrag` trên interactive elements (contentEditable, inputs, buttons)
