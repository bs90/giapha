import { ReactFlow, Background, Controls, MiniMap, Panel } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import MemberNode from './MemberNode';
import RelationshipDialog from './RelationshipDialog';
import { useMembers } from '../hooks/useMembers';

const nodeTypes = { member: MemberNode };

export default function FamilyCanvas() {
  const {
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
  } = useMembers();

  const deleteInfo = getDeleteInfo();

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={handleConnect}
        onNodeDragStop={onNodeDragStop}
        onEdgeClick={handleEdgeClick}
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
