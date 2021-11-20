import { readFile } from "fs/promises";
import puppeteer from "puppeteer-core";
import { Browser, Page } from "puppeteer-core";
import { extractTimelineEvents, urlForFramework, TimelineEvents, Values, sleep } from "./common";

async function fetchEventsFromPerformanceLog(fileName: string): Promise<TimelineEvents> {
  let contents = await readFile(fileName, { encoding: "utf8" });
  let json = JSON.parse(contents);
  let entries = json["traceEvents"];
  return extractTimelineEvents(entries);
}

/* Initialize puppeteer  */
async function init(executable: string) {
  const width = 1280;
  const height = 800;

  const browser = await puppeteer.launch({
    headless: false,
    // Change path here when chrome isn't found
    executablePath: executable,
    ignoreDefaultArgs: [
      "--enable-automation",
      // "--force-color-profile=srgb"
    ],
    args: [`--window-size=${width},${height}`],
    dumpio: false,
    defaultViewport: {
      width,
      height,
    },
  });
  return browser;
}

/* Run the benchmark: Load the page, wait for page, click on append 1,000 rows.
    Can be run with tracing enabled or disabled.
    Returns timing info from metrics() and if tracing is enabled extract the duration from the timeline.
*/
async function run(page: Page, framework: string, url: string) {
  await page.goto(url);
  await page.waitForSelector("#add");

  let traceFileName = `trace_${framework}.json`;

  await page.tracing.start({
    path: traceFileName,
    screenshots: false,
    categories: ["devtools.timeline", "blink.user_timing"],
  });

  await page.click("#add");
  sleep(200);
  let metricsAfter = await page.metrics();
  await page.tracing.stop();
  let timelineResult = await fetchEventsFromPerformanceLog(traceFileName);
  return (timelineResult.paintEnd - timelineResult.clickStart) / 1000.0;
}

export async function runPuppeteer(executable: string, framework: string) {
  let consoleBuffer: string[] = [];
  const browser = await init(executable);
  try {
    const page = await browser.newPage();
    page.on("console", async (msg) => {
      for (let i = 0; i < msg.args().length; ++i) {
        let val = await msg.args()[i].jsonValue();
        consoleBuffer.push((val as any).toString());
        // console.log(`[CONSOLE puppeteer]: ${val}`);
      }
    });
    let duration = await run(page, framework, urlForFramework(framework));
    sleep(200);
    if (consoleBuffer.length != 1) throw new Error(`Expected 1 console message, but there was none.`);
    // console.log("duration puppeteer", duration);
    return { timeline: duration, client: Number(consoleBuffer[0]) };
  } finally {
    await browser.close();
  }
}
