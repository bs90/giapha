import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { useState } from 'react';
import type { MemberNodeData } from '../lib/types';

export default function MemberNode({ id, data }: NodeProps<Node<MemberNodeData, 'member'>>) {
  const [showUrlInput, setShowUrlInput] = useState(false);

  return (
    <div className="member-card">
      <Handle type="target" position={Position.Top} id="child" />

      <button
        className="delete-btn nodrag"
        onClick={() => data.onDelete(id)}
        title="Xoá"
      >
        ×
      </button>

      <div className="member-photo-wrap" onClick={() => setShowUrlInput(!showUrlInput)}>
        {data.photoUrl ? (
          <img
            src={data.photoUrl}
            alt={data.name}
            className="member-photo"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <div className="member-photo-placeholder">📷</div>
        )}
      </div>

      {showUrlInput && (
        <input
          className="member-photo-input nodrag"
          placeholder="Dán URL ảnh..."
          defaultValue={data.photoUrl || ''}
          autoFocus
          onBlur={(e) => {
            data.onUpdateField(id, 'photo_url', e.target.value);
            setShowUrlInput(false);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
          }}
        />
      )}

      <div
        className="member-name nodrag"
        contentEditable
        suppressContentEditableWarning
        onBlur={(e) => data.onUpdateField(id, 'name', e.currentTarget.textContent || '')}
      >
        {data.name}
      </div>

      <div
        className="member-memo nodrag"
        contentEditable
        suppressContentEditableWarning
        onBlur={(e) => data.onUpdateField(id, 'memo', e.currentTarget.textContent || '')}
      >
        {data.memo || ''}
      </div>

      <Handle type="source" position={Position.Bottom} id="parent" />
    </div>
  );
}
