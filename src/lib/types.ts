import type { Node, Edge } from '@xyflow/react';

export type MemberRow = {
  id: string;
  name: string;
  photo_url: string | null;
  memo: string | null;
  father_id: string | null;
  mother_id: string | null;
  spouse_id: string | null;
  position_x: number;
  position_y: number;
  created_at: string;
};

export type MemberNodeData = {
  name: string;
  photoUrl: string | null;
  memo: string | null;
  fatherId: string | null;
  motherId: string | null;
  spouseId: string | null;
  onUpdateField: (id: string, field: string, value: string) => void;
  onDelete: (id: string) => void;
};

export type MemberNodeType = Node<MemberNodeData, 'member'>;

export type HeartNodeData = {
  spouseA: string;
  spouseB: string;
};

export type HeartNodeType = Node<HeartNodeData, 'heart'>;

export type AppEdge = Edge & {
  data?: { relation: 'father' | 'mother' | 'spouse' | 'heart-child' };
};

export type PendingConnection = {
  sourceId: string;
  targetId: string;
} | null;
