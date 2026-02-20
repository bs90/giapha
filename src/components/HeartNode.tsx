import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { memo, useContext } from 'react';
import type { HeartNodeData } from '../lib/types';
import { HighlightContext } from '../lib/HighlightContext';

function HeartNode({ id }: NodeProps<Node<HeartNodeData, 'heart'>>) {
  const pathIds = useContext(HighlightContext);
  const dimmed = pathIds ? !pathIds.has(id) : false;

  return (
    <div className={`heart-node ${dimmed ? 'dimmed' : ''}`} title="Nhấn đúp để xoá kết hôn">
      <span className="heart-icon">❤️</span>
      <Handle type="source" position={Position.Bottom} id="heart-child" />
    </div>
  );
}

export default memo(HeartNode);
