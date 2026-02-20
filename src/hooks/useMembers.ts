import { useCallback, useEffect, useRef, useState } from 'react';
import {
  useNodesState,
  useEdgesState,
  type Connection,
  type OnNodeDrag,
} from '@xyflow/react';
import { supabase } from '../lib/supabase';
import type { MemberRow, MemberNodeType, AppEdge, PendingConnection } from '../lib/types';

const SPECIAL_ID = 'b9a96ad6-6391-4d8b-8571-3261286d451f';

// Tìm tất cả node nằm trên CÁC ĐƯỜNG NGẮN NHẤT từ startId → targetId
function findAllShortestPathNodes(startId: string, targetId: string, allMembers: MemberRow[]): Set<string> | null {
  if (startId === targetId) return new Set([startId]);

  // Build adjacency list (undirected: parent↔child)
  const adj = new Map<string, string[]>();
  for (const m of allMembers) {
    if (!adj.has(m.id)) adj.set(m.id, []);
    if (m.father_id) {
      if (!adj.has(m.father_id)) adj.set(m.father_id, []);
      adj.get(m.id)!.push(m.father_id);
      adj.get(m.father_id)!.push(m.id);
    }
    if (m.mother_id) {
      if (!adj.has(m.mother_id)) adj.set(m.mother_id, []);
      adj.get(m.id)!.push(m.mother_id);
      adj.get(m.mother_id)!.push(m.id);
    }
  }

  // BFS from start to get distance of every node from start
  const distFromStart = new Map<string, number>();
  distFromStart.set(startId, 0);
  let queue = [startId];
  while (queue.length > 0) {
    const next: string[] = [];
    for (const current of queue) {
      for (const neighbor of adj.get(current) || []) {
        if (!distFromStart.has(neighbor)) {
          distFromStart.set(neighbor, distFromStart.get(current)! + 1);
          next.push(neighbor);
        }
      }
    }
    queue = next;
  }

  if (!distFromStart.has(targetId)) return null; // không nối được

  // BFS from target to get distance of every node from target
  const distFromTarget = new Map<string, number>();
  distFromTarget.set(targetId, 0);
  queue = [targetId];
  while (queue.length > 0) {
    const next: string[] = [];
    for (const current of queue) {
      for (const neighbor of adj.get(current) || []) {
        if (!distFromTarget.has(neighbor)) {
          distFromTarget.set(neighbor, distFromTarget.get(current)! + 1);
          next.push(neighbor);
        }
      }
    }
    queue = next;
  }

  // Node nằm trên đường ngắn nhất nếu: dist(start,v) + dist(v,target) == dist(start,target)
  const shortestDist = distFromStart.get(targetId)!;
  const result = new Set<string>();
  for (const m of allMembers) {
    const ds = distFromStart.get(m.id);
    const dt = distFromTarget.get(m.id);
    if (ds !== undefined && dt !== undefined && ds + dt === shortestDist) {
      result.add(m.id);
    }
  }

  return result;
}

function memberToNode(
  member: MemberRow,
  onUpdateField: (id: string, field: string, value: string) => void,
  onDelete: (id: string) => void,
  onHover: (id: string | null) => void,
  dimmed: boolean,
  highlighted: boolean
): MemberNodeType {
  return {
    id: member.id,
    type: 'member',
    position: { x: member.position_x, y: member.position_y },
    data: {
      name: member.name,
      photoUrl: member.photo_url,
      memo: member.memo,
      fatherId: member.father_id,
      motherId: member.mother_id,
      dimmed,
      highlighted,
      onUpdateField,
      onDelete,
      onHover,
    },
  };
}

function membersToEdges(members: MemberRow[], relatedIds: Set<string> | null): AppEdge[] {
  const edges: AppEdge[] = [];
  for (const m of members) {
    if (m.father_id) {
      const isRelated = !relatedIds || (relatedIds.has(m.father_id) && relatedIds.has(m.id));
      edges.push({
        id: `${m.father_id}-father-${m.id}`,
        source: m.father_id,
        target: m.id,
        sourceHandle: 'parent',
        targetHandle: 'child',
        label: 'Bố',
        type: 'smoothstep',
        data: { relation: 'father' },
        style: {
          stroke: '#2563eb',
          strokeWidth: 2,
          opacity: relatedIds && !isRelated ? 0.15 : 1,
        },
      });
    }
    if (m.mother_id) {
      const isRelated = !relatedIds || (relatedIds.has(m.mother_id) && relatedIds.has(m.id));
      edges.push({
        id: `${m.mother_id}-mother-${m.id}`,
        source: m.mother_id,
        target: m.id,
        sourceHandle: 'parent',
        targetHandle: 'child',
        label: 'Mẹ',
        type: 'smoothstep',
        data: { relation: 'mother' },
        style: {
          stroke: '#db2777',
          strokeWidth: 2,
          opacity: relatedIds && !isRelated ? 0.15 : 1,
        },
      });
    }
  }
  return edges;
}

function getDescendantIds(memberId: string, allMembers: MemberRow[]): string[] {
  const ids: string[] = [memberId];
  const queue = [memberId];
  while (queue.length > 0) {
    const currentId = queue.shift()!;
    for (const m of allMembers) {
      if ((m.father_id === currentId || m.mother_id === currentId) && !ids.includes(m.id)) {
        ids.push(m.id);
        queue.push(m.id);
      }
    }
  }
  return ids;
}

export function useMembers() {
  const membersRef = useRef<MemberRow[]>([]);
  const [nodes, setNodes, onNodesChange] = useNodesState<MemberNodeType>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<AppEdge>([]);
  const [pendingConnection, setPendingConnection] = useState<PendingConnection>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const positionTimeouts = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const handleUpdateField = useCallback(async (id: string, field: string, value: string) => {
    membersRef.current = membersRef.current.map((m) =>
      m.id === id ? { ...m, [field]: value } : m
    );

    setNodes((nds) =>
      nds.map((node) => {
        if (node.id !== id) return node;
        const dataKey = field === 'photo_url' ? 'photoUrl' : field;
        return { ...node, data: { ...node.data, [dataKey]: value } };
      })
    );

    await supabase.from('members').update({ [field]: value }).eq('id', id);
  }, [setNodes]);

  const handleDelete = useCallback((id: string) => {
    setDeleteTarget(id);
  }, []);

  const handleHover = useCallback((id: string | null) => {
    setHoveredId(id);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    const idsToDelete = getDescendantIds(deleteTarget, membersRef.current);

    const { error } = await supabase.from('members').delete().in('id', idsToDelete);
    if (error) return;

    membersRef.current = membersRef.current.filter((m) => !idsToDelete.includes(m.id));
    setNodes((nds) => nds.filter((n) => !idsToDelete.includes(n.id)));
    setEdges((eds) =>
      eds.filter((e) => !idsToDelete.includes(e.source) && !idsToDelete.includes(e.target))
    );
    setDeleteTarget(null);
  }, [deleteTarget, setNodes, setEdges]);

  const cancelDelete = useCallback(() => setDeleteTarget(null), []);

  // Rebuild nodes and edges whenever hoveredId changes
  useEffect(() => {
    const members = membersRef.current;
    if (members.length === 0) return;

    const pathIds = hoveredId ? findAllShortestPathNodes(hoveredId, SPECIAL_ID, members) : null;

    setNodes(
      members.map((m) => {
        const dimmed = pathIds ? !pathIds.has(m.id) : false;
        const highlighted = pathIds ? pathIds.has(m.id) : false;
        return memberToNode(m, handleUpdateField, handleDelete, handleHover, dimmed, highlighted);
      })
    );
    setEdges(membersToEdges(members, pathIds));
  }, [hoveredId, setNodes, setEdges, handleUpdateField, handleDelete, handleHover]);

  const rebuildNodes = useCallback(
    (members: MemberRow[]) => {
      setNodes(members.map((m) => memberToNode(m, handleUpdateField, handleDelete, handleHover, false, false)));
      setEdges(membersToEdges(members, null));
    },
    [setNodes, setEdges, handleUpdateField, handleDelete, handleHover]
  );

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('members')
        .select('*')
        .order('created_at', { ascending: true });

      if (data) {
        membersRef.current = data;
        rebuildNodes(data);
      }
    }
    load();
  }, [rebuildNodes]);

  const onNodeDragStop: OnNodeDrag = useCallback(
    (_event, node) => {
      const id = node.id;
      const { x, y } = node.position;

      membersRef.current = membersRef.current.map((m) =>
        m.id === id ? { ...m, position_x: x, position_y: y } : m
      );

      const existing = positionTimeouts.current.get(id);
      if (existing) clearTimeout(existing);

      positionTimeouts.current.set(
        id,
        setTimeout(async () => {
          await supabase.from('members').update({ position_x: x, position_y: y }).eq('id', id);
          positionTimeouts.current.delete(id);
        }, 300)
      );
    },
    []
  );

  const handleConnect = useCallback((connection: Connection) => {
    if (connection.source && connection.target) {
      setPendingConnection({ sourceId: connection.source, targetId: connection.target });
    }
  }, []);

  const confirmRelationship = useCallback(
    async (relation: 'father' | 'mother') => {
      if (!pendingConnection) return;
      const { sourceId, targetId } = pendingConnection;
      const field = relation === 'father' ? 'father_id' : 'mother_id';

      await supabase.from('members').update({ [field]: sourceId }).eq('id', targetId);

      membersRef.current = membersRef.current.map((m) =>
        m.id === targetId ? { ...m, [field]: sourceId } : m
      );

      const newEdge: AppEdge = {
        id: `${sourceId}-${relation}-${targetId}`,
        source: sourceId,
        target: targetId,
        sourceHandle: 'parent',
        targetHandle: 'child',
        label: relation === 'father' ? 'Bố' : 'Mẹ',
        type: 'smoothstep',
        data: { relation },
        style: { stroke: relation === 'father' ? '#2563eb' : '#db2777', strokeWidth: 2 },
      };
      setEdges((eds) => [...eds, newEdge]);
      setPendingConnection(null);
    },
    [pendingConnection, setEdges]
  );

  const cancelConnection = useCallback(() => setPendingConnection(null), []);

  const handleEdgeClick = useCallback(
    async (_event: React.MouseEvent, edge: AppEdge) => {
      if (!window.confirm('Xoá quan hệ này?')) return;
      const field = edge.data?.relation === 'father' ? 'father_id' : 'mother_id';

      await supabase.from('members').update({ [field]: null }).eq('id', edge.target);

      membersRef.current = membersRef.current.map((m) =>
        m.id === edge.target ? { ...m, [field]: null } : m
      );

      setEdges((eds) => eds.filter((e) => e.id !== edge.id));
    },
    [setEdges]
  );

  const handleAddMember = useCallback(async () => {
    const { data } = await supabase
      .from('members')
      .insert({
        name: 'Người mới',
        position_x: 100 + Math.random() * 400,
        position_y: 100 + Math.random() * 400,
      })
      .select()
      .single();

    if (data) {
      membersRef.current = [...membersRef.current, data];
      setNodes((nds) => [...nds, memberToNode(data, handleUpdateField, handleDelete, handleHover, false, false)]);
    }
  }, [setNodes, handleUpdateField, handleDelete, handleHover]);

  const getDeleteInfo = useCallback(() => {
    if (!deleteTarget) return null;
    const member = membersRef.current.find((m) => m.id === deleteTarget);
    const descendantCount = getDescendantIds(deleteTarget, membersRef.current).length;
    return { name: member?.name || '', descendantCount };
  }, [deleteTarget]);

  return {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onNodeDragStop,
    handleConnect,
    handleAddMember,
    handleEdgeClick,
    pendingConnection,
    confirmRelationship,
    cancelConnection,
    deleteTarget,
    getDeleteInfo,
    confirmDelete,
    cancelDelete,
  };
}
