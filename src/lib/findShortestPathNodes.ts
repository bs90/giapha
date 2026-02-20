import type { MemberRow } from './types';

const SPECIAL_ID = 'b9a96ad6-6391-4d8b-8571-3261286d451f';

export function findAllShortestPathNodes(
  startId: string,
  members: MemberRow[]
): Set<string> | null {
  if (startId === SPECIAL_ID) return null;

  const adj = new Map<string, string[]>();

  function addEdge(a: string, b: string) {
    if (!adj.has(a)) adj.set(a, []);
    if (!adj.has(b)) adj.set(b, []);
    adj.get(a)!.push(b);
    adj.get(b)!.push(a);
  }

  // Build married pairs set
  const marriedPairs = new Map<string, [string, string]>();
  for (const m of members) {
    if (m.spouse_id) {
      const sorted = [m.id, m.spouse_id].sort() as [string, string];
      const key = sorted.join('_');
      if (!marriedPairs.has(key)) marriedPairs.set(key, sorted);
    }
  }

  // Add spouse direct adjacency + heart node connections
  for (const [pairKey, [idA, idB]] of marriedPairs) {
    const hId = `heart_${pairKey}`;
    addEdge(idA, hId);
    addEdge(idB, hId);
  }

  for (const m of members) {
    if (!adj.has(m.id)) adj.set(m.id, []);

    const bothParentsSet = m.father_id && m.mother_id;
    const parentsMarriedKey = bothParentsSet
      ? [m.father_id!, m.mother_id!].sort().join('_')
      : null;
    const parentsMarried = parentsMarriedKey && marriedPairs.has(parentsMarriedKey);

    if (parentsMarried) {
      // Route through heart node
      const hId = `heart_${parentsMarriedKey}`;
      addEdge(hId, m.id);
    } else {
      // Direct parent edges
      if (m.father_id) addEdge(m.id, m.father_id);
      if (m.mother_id) addEdge(m.id, m.mother_id);
    }
  }

  function bfs(source: string): Map<string, number> {
    const dist = new Map<string, number>();
    dist.set(source, 0);
    const queue = [source];
    let i = 0;
    while (i < queue.length) {
      const cur = queue[i++];
      const d = dist.get(cur)!;
      for (const nb of adj.get(cur) || []) {
        if (!dist.has(nb)) {
          dist.set(nb, d + 1);
          queue.push(nb);
        }
      }
    }
    return dist;
  }

  const distFromStart = bfs(startId);
  const distFromTarget = bfs(SPECIAL_ID);

  const totalDist = distFromStart.get(SPECIAL_ID);
  if (totalDist === undefined) return null;

  const pathIds = new Set<string>();
  for (const [nodeId, dStart] of distFromStart) {
    const dTarget = distFromTarget.get(nodeId);
    if (dTarget !== undefined && dStart + dTarget === totalDist) {
      pathIds.add(nodeId);
    }
  }
  pathIds.add(SPECIAL_ID);

  // If path goes through a heart node, include BOTH spouses
  for (const [pairKey, [idA, idB]] of marriedPairs) {
    const hId = `heart_${pairKey}`;
    if (pathIds.has(hId)) {
      pathIds.add(idA);
      pathIds.add(idB);
    }
  }

  return pathIds;
}
