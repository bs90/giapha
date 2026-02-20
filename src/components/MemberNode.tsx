import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { memo, useContext, useState } from 'react';
import type { MemberNodeData } from '../lib/types';
import { HighlightContext } from '../lib/HighlightContext';

const SPECIAL_ID = 'b9a96ad6-6391-4d8b-8571-3261286d451f';

function MemberNode({ id, data }: NodeProps<Node<MemberNodeData, 'member'>>) {
  const [showUrlInput, setShowUrlInput] = useState(false);
  const pathIds = useContext(HighlightContext);

  const isSpecial = id === SPECIAL_ID;
  const dimmed = pathIds ? !pathIds.has(id) : false;
  const highlighted = pathIds ? pathIds.has(id) : false;

  const classNames = [
    'member-card',
    dimmed ? 'dimmed' : '',
    highlighted ? 'highlighted' : '',
    isSpecial ? 'special' : '',
  ].filter(Boolean).join(' ');

  return (
    <div className={classNames}>
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

export default memo(MemberNode);
