# Thuật toán

## Hover Highlight: findAllShortestPathNodes
**Mục đích**: Khi hover vào 1 thẻ, tìm tất cả node nằm trên CÁC ĐƯỜNG NGẮN NHẤT từ thẻ đó → thẻ đặc biệt (`b9a96ad6-6391-4d8b-8571-3261286d451f`). Chỉ sáng các thẻ + edge trên đường đi, mờ phần còn lại.

**Thuật toán**:
1. Build adjacency list vô hướng từ father_id/mother_id
2. BFS từ start → lấy `dist(start, v)` cho mọi v
3. BFS từ target → lấy `dist(v, target)` cho mọi v
4. Node v nằm trên đường ngắn nhất nếu: `dist(start, v) + dist(v, target) == dist(start, target)`
5. Nếu không tìm được đường → return null → chỉ thẻ hover sáng

**Edge dimming**: edge bị mờ nếu một trong 2 đầu không nằm trong pathIds.

**Lưu ý**: Thẻ special LUÔN được add vào pathIds (không bao giờ bị dim).

## Cascade Delete: getDescendantIds
**Mục đích**: Xoá 1 người + tất cả con cháu.

**Thuật toán**: BFS từ memberId, tìm tất cả member có father_id hoặc mother_id trỏ tới node đang xét → thu thập toàn bộ ID → batch delete.

**DB**: `supabase.from('members').delete().in('id', idsToDelete)` — ON DELETE SET NULL cho FK nên thứ tự delete không quan trọng.

## Edge Highlighting Logic
Edge giữa A→B được highlight nếu CẢ HAI A và B đều nằm trong pathIds set:
```typescript
const isRelated = !pathIds || (pathIds.has(source) && pathIds.has(target));
style.opacity = pathIds && !isRelated ? 0.15 : 1;
```
