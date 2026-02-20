import { useCallback, useEffect, useRef, useState } from 'react';
import {
  useNodesState,
  useEdgesState,
  type Connection,
  type OnNodeDrag,
} from '@xyflow/react';
import { supabase } from '../lib/supabase';
import type {
  MemberRow,
  MemberNodeType,
  HeartNodeType,
  AppEdge,
  PendingConnection,
} from '../lib/types';

function memberToNode(
  member: MemberRow,
  onUpdateField: (id: string, field: string, value: string) => void,
  onDelete: (id: string) => void
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
      spouseId: member.spouse_id,
      onUpdateField,
      onDelete,
    },
  };
}

function getMarriedPairs(members: MemberRow[]): Map<string, [string, string]> {
  const pairs = new Map<string, [string, string]>();
  for (const m of members) {
    if (!m.spouse_id) continue;
    const sorted = [m.id, m.spouse_id].sort() as [string, string];
    const key = sorted.join('_');
    if (!pairs.has(key)) pairs.set(key, sorted);
  }
  return pairs;
}

function heartId(pairKey: string): string {
  return `heart_${pairKey}`;
}

function generateHeartNodes(members: MemberRow[]): HeartNodeType[] {
  const pairs = getMarriedPairs(members);
  const hearts: HeartNodeType[] = [];
  const memberMap = new Map(members.map((m) => [m.id, m]));

  for (const [pairKey, [idA, idB]] of pairs) {
    const a = memberMap.get(idA);
    const b = memberMap.get(idB);
    if (!a || !b) continue;

    hearts.push({
      id: heartId(pairKey),
      type: 'heart',
      position: {
        x: (a.position_x + b.position_x) / 2 + 72,
        y: (a.position_y + b.position_y) / 2 + 42,
      },
      draggable: false,
      selectable: false,
      data: { spouseA: idA, spouseB: idB },
    });
  }
  return hearts;
}

function membersToEdges(members: MemberRow[]): AppEdge[] {
  const edges: AppEdge[] = [];
  const pairs = getMarriedPairs(members);

  // Emit parent→child edges (via heart or direct)
  for (const m of members) {
    const bothParentsSet = m.father_id && m.mother_id;
    const parentsMarriedKey = bothParentsSet
      ? [m.father_id!, m.mother_id!].sort().join('_')
      : null;
    const parentsMarried = parentsMarriedKey && pairs.has(parentsMarriedKey);

    if (parentsMarried) {
      // Route through heart node
      const hId = heartId(parentsMarriedKey!);
      edges.push({
        id: `${hId}-child-${m.id}`,
        source: hId,
        target: m.id,
        sourceHandle: 'heart-child',
        targetHandle: 'child',
        type: 'smoothstep',
        data: { relation: 'heart-child' },
        style: { stroke: '#8b5cf6', strokeWidth: 2 },
      });
    } else {
      // Direct parent edges (existing behavior)
      if (m.father_id) {
        edges.push({
          id: `${m.father_id}-father-${m.id}`,
          source: m.father_id,
          target: m.id,
          sourceHandle: 'parent',
          targetHandle: 'child',
          label: 'Bố',
          type: 'smoothstep',
          data: { relation: 'father' },
          style: { stroke: '#2563eb', strokeWidth: 2 },
        });
      }
      if (m.mother_id) {
        edges.push({
          id: `${m.mother_id}-mother-${m.id}`,
          source: m.mother_id,
          target: m.id,
          sourceHandle: 'parent',
          targetHandle: 'child',
          label: 'Mẹ',
          type: 'smoothstep',
          data: { relation: 'mother' },
          style: { stroke: '#db2777', strokeWidth: 2 },
        });
      }
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
  const [nodes, setNodes, onNodesChange] = useNodesState<MemberNodeType | HeartNodeType>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<AppEdge>([]);
  const [pendingConnection, setPendingConnection] = useState<PendingConnection>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const positionTimeouts = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const handleUpdateField = useCallback(async (id: string, field: string, value: string) => {
    membersRef.current = membersRef.current.map((m) =>
      m.id === id ? { ...m, [field]: value } : m
    );

    setNodes((nds) =>
      nds.map((node) => {
        if (node.id !== id) return node;
        const dataKey = field === 'photo_url' ? 'photoUrl' : field;
        return { ...node, data: { ...node.data, [dataKey]: value } } as typeof node;
      })
    );

    await supabase.from('members').update({ [field]: value }).eq('id', id);
  }, [setNodes]);

  const handleDelete = useCallback((id: string) => {
    setDeleteTarget(id);
  }, []);

  const rebuildNodes = useCallback(
    (members: MemberRow[]) => {
      const memberNodes = members.map((m) => memberToNode(m, handleUpdateField, handleDelete));
      const heartNodes = generateHeartNodes(members);
      setNodes([...memberNodes, ...heartNodes]);
      setEdges(membersToEdges(members));
    },
    [setNodes, setEdges, handleUpdateField, handleDelete]
  );

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    const idsToDelete = getDescendantIds(deleteTarget, membersRef.current);

    // Clear spouse_id on spouses of members being deleted
    for (const id of idsToDelete) {
      const m = membersRef.current.find((mem) => mem.id === id);
      if (m?.spouse_id && !idsToDelete.includes(m.spouse_id)) {
        await supabase.from('members').update({ spouse_id: null }).eq('id', m.spouse_id);
        membersRef.current = membersRef.current.map((mem) =>
          mem.id === m.spouse_id ? { ...mem, spouse_id: null } : mem
        );
      }
    }

    const { error } = await supabase.from('members').delete().in('id', idsToDelete);
    if (error) return;

    membersRef.current = membersRef.current.filter((m) => !idsToDelete.includes(m.id));
    rebuildNodes(membersRef.current);
    setDeleteTarget(null);
  }, [deleteTarget, rebuildNodes]);

  const cancelDelete = useCallback(() => setDeleteTarget(null), []);

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

  const onNodeDrag: OnNodeDrag = useCallback(
    (_event, node) => {
      const member = membersRef.current.find((m) => m.id === node.id);
      if (!member?.spouse_id) return;
      const spouse = membersRef.current.find((m) => m.id === member.spouse_id);
      if (!spouse) return;

      // Move spouse by the same delta so they stick together
      const dx = node.position.x - member.position_x;
      const dy = node.position.y - member.position_y;
      const newSpouseX = spouse.position_x + dx;
      const newSpouseY = spouse.position_y + dy;

      const pairKey = [node.id, member.spouse_id].sort().join('_');
      const hId = heartId(pairKey);

      setNodes((nds) =>
        nds.map((n) => {
          if (n.id === member.spouse_id) {
            return { ...n, position: { x: newSpouseX, y: newSpouseY } } as typeof n;
          }
          if (n.id === hId) {
            return {
              ...n,
              position: {
                x: (node.position.x + newSpouseX) / 2 + 72,
                y: (node.position.y + newSpouseY) / 2 + 42,
              },
            } as typeof n;
          }
          return n;
        })
      );
    },
    [setNodes]
  );

  const onNodeDragStop: OnNodeDrag = useCallback(
    (_event, node) => {
      const id = node.id;
      const { x, y } = node.position;

      const member = membersRef.current.find((m) => m.id === id);
      const dx = x - (member?.position_x ?? x);
      const dy = y - (member?.position_y ?? y);

      // Update dragged node position
      membersRef.current = membersRef.current.map((m) =>
        m.id === id ? { ...m, position_x: x, position_y: y } : m
      );

      // Also update spouse position if married
      if (member?.spouse_id) {
        const spouse = membersRef.current.find((m) => m.id === member.spouse_id);
        if (spouse) {
          const newSpouseX = spouse.position_x + dx;
          const newSpouseY = spouse.position_y + dy;
          membersRef.current = membersRef.current.map((m) =>
            m.id === member.spouse_id
              ? { ...m, position_x: newSpouseX, position_y: newSpouseY }
              : m
          );

          // Persist spouse position (debounced)
          const spouseTimeout = positionTimeouts.current.get(member.spouse_id);
          if (spouseTimeout) clearTimeout(spouseTimeout);
          positionTimeouts.current.set(
            member.spouse_id,
            setTimeout(async () => {
              await supabase
                .from('members')
                .update({ position_x: newSpouseX, position_y: newSpouseY })
                .eq('id', member.spouse_id!);
              positionTimeouts.current.delete(member.spouse_id!);
            }, 300)
          );
        }
      }

      // Rebuild edges to update left/right handle assignment
      setEdges(membersToEdges(membersRef.current));

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
    [setEdges]
  );

  const handleConnect = useCallback((connection: Connection) => {
    if (connection.source && connection.target) {
      setPendingConnection({ sourceId: connection.source, targetId: connection.target });
    }
  }, []);

  const confirmRelationship = useCallback(
    async (relation: 'father' | 'mother' | 'spouse') => {
      if (!pendingConnection) return;
      const { sourceId, targetId } = pendingConnection;

      if (relation === 'spouse') {
        // Auto-position: place target next to source
        const source = membersRef.current.find((m) => m.id === sourceId);
        if (source) {
          const newX = source.position_x + 220; // 180px card + 40px gap
          const newY = source.position_y;
          await Promise.all([
            supabase.from('members').update({ spouse_id: targetId }).eq('id', sourceId),
            supabase
              .from('members')
              .update({ spouse_id: sourceId, position_x: newX, position_y: newY })
              .eq('id', targetId),
          ]);
          membersRef.current = membersRef.current.map((m) => {
            if (m.id === sourceId) return { ...m, spouse_id: targetId };
            if (m.id === targetId)
              return { ...m, spouse_id: sourceId, position_x: newX, position_y: newY };
            return m;
          });
        } else {
          await Promise.all([
            supabase.from('members').update({ spouse_id: targetId }).eq('id', sourceId),
            supabase.from('members').update({ spouse_id: sourceId }).eq('id', targetId),
          ]);
          membersRef.current = membersRef.current.map((m) => {
            if (m.id === sourceId) return { ...m, spouse_id: targetId };
            if (m.id === targetId) return { ...m, spouse_id: sourceId };
            return m;
          });
        }

        rebuildNodes(membersRef.current);
      } else {
        const field = relation === 'father' ? 'father_id' : 'mother_id';
        await supabase.from('members').update({ [field]: sourceId }).eq('id', targetId);

        membersRef.current = membersRef.current.map((m) =>
          m.id === targetId ? { ...m, [field]: sourceId } : m
        );

        // Rebuild to handle potential marriage-based edge routing
        rebuildNodes(membersRef.current);
      }

      setPendingConnection(null);
    },
    [pendingConnection, rebuildNodes]
  );

  const cancelConnection = useCallback(() => setPendingConnection(null), []);

  const handleEdgeClick = useCallback(
    async (_event: React.MouseEvent, edge: AppEdge) => {
      const relation = edge.data?.relation;

      if (relation === 'heart-child') {
        if (!window.confirm('Xoá quan hệ cha mẹ này?')) return;

        const childId = edge.target;
        await supabase.from('members').update({ father_id: null, mother_id: null }).eq('id', childId);

        membersRef.current = membersRef.current.map((m) =>
          m.id === childId ? { ...m, father_id: null, mother_id: null } : m
        );

        rebuildNodes(membersRef.current);
      } else {
        // Direct father/mother edge
        if (!window.confirm('Xoá quan hệ này?')) return;
        const field = relation === 'father' ? 'father_id' : 'mother_id';

        await supabase.from('members').update({ [field]: null }).eq('id', edge.target);

        membersRef.current = membersRef.current.map((m) =>
          m.id === edge.target ? { ...m, [field]: null } : m
        );

        rebuildNodes(membersRef.current);
      }
    },
    [rebuildNodes]
  );

  const handleDeleteMarriage = useCallback(
    async (spouseAId: string, spouseBId: string) => {
      await Promise.all([
        supabase.from('members').update({ spouse_id: null }).eq('id', spouseAId),
        supabase.from('members').update({ spouse_id: null }).eq('id', spouseBId),
      ]);

      membersRef.current = membersRef.current.map((m) => {
        if (m.id === spouseAId || m.id === spouseBId) return { ...m, spouse_id: null };
        return m;
      });

      rebuildNodes(membersRef.current);
    },
    [rebuildNodes]
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
      setNodes((nds) => [...nds, memberToNode(data, handleUpdateField, handleDelete)]);
    }
  }, [setNodes, handleUpdateField, handleDelete]);

  const getDeleteInfo = useCallback(() => {
    if (!deleteTarget) return null;
    const member = membersRef.current.find((m) => m.id === deleteTarget);
    const descendantCount = getDescendantIds(deleteTarget, membersRef.current).length;
    return { name: member?.name || '', descendantCount };
  }, [deleteTarget]);

  return {
    nodes,
    edges,
    membersRef,
    onNodesChange,
    onEdgesChange,
    onNodeDrag,
    onNodeDragStop,
    handleConnect,
    handleAddMember,
    handleEdgeClick,
    handleDeleteMarriage,
    pendingConnection,
    confirmRelationship,
    cancelConnection,
    deleteTarget,
    getDeleteInfo,
    confirmDelete,
    cancelDelete,
  };
}
