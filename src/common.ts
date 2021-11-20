const jStat = require("jstat").jStat;

export class Values {
  values: number[] = [];
  public statistics() {
    let s = jStat(this.values);
    let r = {
      mean: s.mean(),
      standardDeviation: s.stdev(true),
    };
    return r;
  }
  toString() {
    let s = this.statistics();
    return `${s.mean.toFixed(3)} (${s.standardDeviation.toFixed(3)})`;
  }
}

export interface TimelineEvents {
  clickStart: number;
  paintEnd: number;
}

export function extractTimelineEvents(entries: any[]): TimelineEvents {
  let result = { clickStart: 0, paintEnd: 0 };
  entries.forEach((x) => {
    let e = x;
    // console.log(JSON.stringify(e));
    if (e.name === "EventDispatch") {
      if (e.args.data.type === "click") {
        // console.log("CLICK ",+e.ts);
        result.clickStart = +e.ts;
      }
    } else if (e.name === "Paint" && e.ph === "X") {
      result.paintEnd = Math.max(result.paintEnd, +e.ts + e.dur);
    }
  });
  return result;
}

export const urlForFramework = (name: string) => `https://stefankrause.net/chrome-perf/frameworks/keyed/${name}/index.html`;

export async function sleep(ms: number) {
  await new Promise((res) => globalThis.setTimeout(res, ms, []));
}
