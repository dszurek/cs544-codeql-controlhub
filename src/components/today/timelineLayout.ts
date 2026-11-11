/** Pure layout math for the mission timeline — kept separate for testing. */

export interface Interval {
  startMin: number; // minutes from midnight
  endMin: number;
}

export interface LaneAssignment {
  lane: number;
  lanes: number; // total lanes in this overlap cluster
}

/**
 * Visible hour range: generous defaults (07–22) stretched to fit
 * whatever is actually scheduled.
 */
export function computeRange(items: Interval[]): { startHour: number; endHour: number } {
  let startHour = 7;
  let endHour = 22;
  for (const it of items) {
    startHour = Math.min(startHour, Math.floor(it.startMin / 60));
    endHour = Math.max(endHour, Math.ceil(it.endMin / 60));
  }
  return { startHour: Math.max(0, startHour), endHour: Math.min(24, endHour) };
}

/**
 * Greedy lane assignment for overlapping intervals. Items in the same
 * transitive overlap cluster share a lane count so they split the row
 * width evenly. Input order is preserved in the output.
 */
export function assignLanes(items: Interval[]): LaneAssignment[] {
  const order = items
    .map((it, i) => ({ it, i }))
    .sort((a, b) => a.it.startMin - b.it.startMin || a.it.endMin - b.it.endMin);

  const result: LaneAssignment[] = items.map(() => ({ lane: 0, lanes: 1 }));
  let cluster: { index: number; lane: number }[] = [];
  let laneEnds: number[] = []; // end time per lane within the cluster
  let clusterMaxEnd = -1;

  const closeCluster = () => {
    const lanes = laneEnds.length;
    for (const m of cluster) result[m.index] = { lane: m.lane, lanes };
  };

  for (const { it, i } of order) {
    if (it.startMin >= clusterMaxEnd && cluster.length > 0) {
      closeCluster();
      cluster = [];
      laneEnds = [];
    }
    let lane = laneEnds.findIndex((end) => end <= it.startMin);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(it.endMin);
    } else {
      laneEnds[lane] = it.endMin;
    }
    cluster.push({ index: i, lane });
    clusterMaxEnd = Math.max(clusterMaxEnd, it.endMin);
  }
  if (cluster.length > 0) closeCluster();

  return result;
}

export function minutesIntoDay(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}
