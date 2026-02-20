import { ReactFlow, Background, Controls, MiniMap, Panel } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useCallback, useMemo, useState } from 'react';
import MemberNode from './MemberNode';
import HeartNode from './HeartNode';
import RelationshipDialog from './RelationshipDialog';
import { useMembers } from '../hooks/useMembers';
import { HighlightContext } from '../lib/HighlightContext';
import { findAllShortestPathNodes } from '../lib/findShortestPathNodes';
import type { AppEdge, HeartNodeData } from '../lib/types';

const nodeTypes = { member: MemberNode, heart: HeartNode };

export default function FamilyCanvas() {
  const {
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
  } = useMembers();

  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const pathIds = useMemo(() => {
    if (!hoveredId) return null;
    return findAllShortestPathNodes(hoveredId, membersRef.current);
  }, [hoveredId, membersRef]);

  const styledEdges = useMemo(() => {
    if (!pathIds) return edges;
    return edges.map((edge) => {
      const isOnPath = pathIds.has(edge.source) && pathIds.has(edge.target);
      return {
        ...edge,
        style: { ...edge.style, opacity: isOnPath ? 1 : 0.15 },
      };
    });
  }, [edges, pathIds]);

  const onNodeMouseEnter = useCallback(
    (_event: React.MouseEvent, node: { id: string }) => {
      if (node.id.startsWith('heart_')) return;
      setHoveredId(node.id);
    },
    []
  );

  const onNodeMouseLeave = useCallback(() => {
    setHoveredId(null);
  }, []);

  const onNodeDoubleClick = useCallback(
    (_event: React.MouseEvent, node: { id: string; data: unknown }) => {
      if (!node.id.startsWith('heart_')) return;
      if (!window.confirm('Xoá quan hệ kết hôn này?')) return;
      const data = node.data as HeartNodeData;
      handleDeleteMarriage(data.spouseA, data.spouseB);
    },
    [handleDeleteMarriage]
  );

  const deleteInfo = getDeleteInfo();

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <HighlightContext.Provider value={pathIds}>
        <ReactFlow
          nodes={nodes}
          edges={styledEdges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={handleConnect}
          onNodeDrag={onNodeDrag}
          onNodeDragStop={onNodeDragStop}
          onEdgeClick={handleEdgeClick as (event: React.MouseEvent, edge: AppEdge) => void}
          onNodeDoubleClick={onNodeDoubleClick}
          onNodeMouseEnter={onNodeMouseEnter}
          onNodeMouseLeave={onNodeMouseLeave}
          fitView
          defaultEdgeOptions={{ type: 'smoothstep' }}
        >
          <Background />
          <Controls />
          <MiniMap />
          <Panel position="top-left">
            <button className="add-member-btn" onClick={handleAddMember}>
              + Thêm thành viên
            </button>
          </Panel>
        </ReactFlow>
      </HighlightContext.Provider>

      {pendingConnection && (
        <RelationshipDialog onSelect={confirmRelationship} onCancel={cancelConnection} />
      )}

      {deleteTarget && deleteInfo && (
        <div className="dialog-overlay" onClick={cancelDelete}>
          <div className="dialog" onClick={(e) => e.stopPropagation()}>
            <h3>Xác nhận xoá</h3>
            <p>
              Xoá <strong>{deleteInfo.name}</strong>
              {deleteInfo.descendantCount > 1 &&
                ` và ${deleteInfo.descendantCount - 1} người con cháu`}
              ?
            </p>
            <div className="dialog-buttons">
              <button className="btn-danger" onClick={confirmDelete}>
                Xoá
              </button>
              <button className="btn-cancel" onClick={cancelDelete}>
                Huỷ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
