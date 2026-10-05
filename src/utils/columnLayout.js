/**
 * Pure column layout calculation for 2D card movement & live preview.
 * Supports:
 * - 'above': stacked on top of target card in the same lane
 * - 'below': stacked under target card in the same lane
 * - 'left':  placed in a new lane to the left of target card
 * - 'right': placed in a new lane to the right of target card
 */
export function computeReorderedColumns(columns, draggedColId, targetColId, position) {
  if (!columns || !draggedColId || !targetColId || draggedColId === targetColId) {
    return columns;
  }

  const draggedCol = columns.find(c => c.id === draggedColId);
  const targetCol = columns.find(c => c.id === targetColId);
  if (!draggedCol || !targetCol) return columns;

  // 1. Group all remaining columns (excluding draggedCol) into lanes
  const remainingCols = columns.filter(c => c.id !== draggedColId);
  const laneMap = new Map();
  const laneOrder = [];

  remainingCols.forEach(col => {
    const lid = col.laneId || col.id;
    if (!laneMap.has(lid)) {
      laneMap.set(lid, []);
      laneOrder.push(lid);
    }
    laneMap.get(lid).push(col);
  });

  const targetLaneId = targetCol.laneId || targetCol.id;

  // 2. Insert draggedCol based on position
  if (position === 'above' || position === 'below') {
    // Stack with targetCol in the target's lane
    const cloneDragged = { ...draggedCol, laneId: targetLaneId };
    const targetLaneGroups = laneMap.get(targetLaneId) || [];
    const targetIdx = targetLaneGroups.findIndex(c => c.id === targetColId);

    if (targetIdx !== -1) {
      const insertIdx = position === 'above' ? targetIdx : targetIdx + 1;
      targetLaneGroups.splice(insertIdx, 0, cloneDragged);
    } else {
      targetLaneGroups.push(cloneDragged);
    }
    laneMap.set(targetLaneId, targetLaneGroups);
  } else if (position === 'left' || position === 'right') {
    // Place into a new separate lane adjacent to target's lane
    const newLaneId = `lane-${draggedCol.id}`;
    const cloneDragged = { ...draggedCol, laneId: newLaneId };

    const targetLaneIdx = laneOrder.indexOf(targetLaneId);
    const insertLaneIdx = position === 'left'
      ? Math.max(0, targetLaneIdx !== -1 ? targetLaneIdx : 0)
      : (targetLaneIdx !== -1 ? targetLaneIdx + 1 : laneOrder.length);

    laneOrder.splice(insertLaneIdx, 0, newLaneId);
    laneMap.set(newLaneId, [cloneDragged]);
  } else {
    return columns;
  }

  // 3. Flatten ordered lanes back into columns array
  const result = [];
  laneOrder.forEach(lid => {
    const group = laneMap.get(lid) || [];
    group.forEach(col => {
      result.push({ ...col, laneId: lid });
    });
  });

  return result;
}
