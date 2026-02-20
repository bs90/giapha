# Thuật toán

## Hover Highlight: findAllShortestPathNodes
**Mục đích**: Khi hover vào 1 thẻ, tìm tất cả node nằm trên CÁC ĐƯỜNG NGẮN NHẤT từ thẻ đó → thẻ đặc biệt (`b9a96ad6-6391-4d8b-8571-3261286d451f`). Chỉ sáng các thẻ + edge trên đường đi, mờ phần còn lại.

**Thuật toán**:
1. Build adjacency list vô hướng từ father_id/mother_id/spouse_id + virtual heart nodes
2. Với married pairs: thêm edge spouse_A↔heart, spouse_B↔heart
3. Với child có cả bố mẹ kết hôn: thêm edge heart↔child (thay vì bố↔child, mẹ↔child)
4. BFS từ start → lấy `dist(start, v)` cho mọi v
5. BFS từ target → lấy `dist(v, target)` cho mọi v
6. Node v nằm trên đường ngắn nhất nếu: `dist(start, v) + dist(v, target) == dist(start, target)`
7. Nếu không tìm được đường → return null → chỉ thẻ hover sáng
8. **Spouse inclusion**: nếu heart node nằm trong path → add CẢ HAI spouse vào pathIds

**Edge dimming**: edge bị mờ nếu một trong 2 đầu không nằm trong pathIds.

**Lưu ý**: Thẻ special LUÔN được add vào pathIds (không bao giờ bị dim).

## Cascade Delete: getDescendantIds
**Mục đích**: Xoá 1 người + tất cả con cháu.

**Thuật toán**: BFS từ memberId, tìm tất cả member có father_id hoặc mother_id trỏ tới node đang xét → thu thập toàn bộ ID → batch delete.

**DB**: `supabase.from('members').delete().in('id', idsToDelete)` — ON DELETE SET NULL cho FK nên thứ tự delete không quan trọng.

**Spouse cleanup**: trước khi xoá, clear `spouse_id` trên spouse của người bị xoá (nếu spouse không bị xoá theo).

## Edge Highlighting Logic
Edge giữa A→B được highlight nếu CẢ HAI A và B đều nằm trong pathIds set:
```typescript
const isRelated = !pathIds || (pathIds.has(source) && pathIds.has(target));
style.opacity = pathIds && !isRelated ? 0.15 : 1;
```

## Marriage: Heart Node + Edge Routing
**Heart node**: virtual React Flow node, không lưu DB. ID format: `heart_${sortedIdA}_${sortedIdB}`.

**Married pair detection**: build set từ `spouse_id` (bidirectional: A→B và B→A).

**Edge routing cho child**:
- Nếu child có `father_id=A`, `mother_id=B` VÀ A kết hôn B → emit 1 edge heart→child (tím)
- Nếu không → emit 2 edge riêng bố→child (xanh) + mẹ→child (hồng)

**Visual**: không có edge nối spouse↔heart. ❤️ chỉ float giữa 2 thẻ, chỉ có edge từ heart→child (tím).

**Xoá kết hôn**: double-click ❤️ → confirm → clear spouse_id cả 2 phía → rebuild nodes/edges.

## Spouse Sticking (kéo cùng nhau)
**onNodeDrag**: tính delta từ vị trí gốc trong `membersRef`, áp dụng cùng delta cho spouse + cập nhật heart midpoint.

**onNodeDragStop**: persist vị trí cả dragged node lẫn spouse vào DB (debounced 300ms).

**Auto-snap khi tạo marriage**: spouse tự động đặt cạnh source (x + 220px, cùng y).
