import { By, Capabilities, Condition, logging, WebDriver, WebElement } from "selenium-webdriver";
import * as chrome from "selenium-webdriver/chrome";
import { extractTimelineEvents, urlForFramework, TimelineEvents, Values, sleep } from "./common";

async function fetchEventsFromPerformanceLog(driver: WebDriver): Promise<TimelineEvents> {
  let entries = await driver.manage().logs().get(logging.Type.PERFORMANCE);
  return extractTimelineEvents(entries.map((e) => JSON.parse(e.message).message.params));
}

function init(executable: string): WebDriver {
  let width = 1280;
  let height = 800;

  let args = [
    // "--js-flags=--expose-gc",
    // "--enable-precise-memory-info",
    // "--no-first-run",
    // "--disable-background-networking",
    // "--disable-background-timer-throttling",
    // "--disable-cache",
    // "--disable-translate",
    // "--disable-sync",
    // "--disable-default-apps",
    // "--remote-debugging-port=9999",
    "--disable-extensions",
    `--window-size=${width},${height}`,
  ];

  let caps = new Capabilities({
    browserName: "chrome",
    platform: "ANY",
    version: "stable",
    "goog:chromeOptions": {
      binary: executable,
      args: args,
      perfLoggingPrefs: {
        enableNetwork: true,
        enablePage: true,
        traceCategories: "devtools.timeline,blink.user_timing",
      },
      excludeSwitches: ["enable-automation"],
    },
    "goog:loggingPrefs": {
      browser: "ALL",
      performance: "ALL",
    },
  });

  let service = new chrome.ServiceBuilder().setPort(9998).build();
  var driver = chrome.Driver.createSession(caps, service);

  return driver;
}

/* Run the benchmark: Load the page, wait for page, click on append 1,000 rows.
    Can be run with tracing enabled or disabled.
    Returns timing info from metrics() and if tracing is enabled extract the duration from the timeline.
*/
async function run(driver: WebDriver, framework: string, url: string) {
  await driver.get(url);
  let add = await driver.findElement(By.id("add"));
  await add.click();
  sleep(100);
  let timelineResult = await fetchEventsFromPerformanceLog(driver);
  return (timelineResult.paintEnd - timelineResult.clickStart) / 1000.0;
}

export async function runChromedriver(executable: string, framework: string) {
  let logmatch = /^https:\/\/stefankrause\.net.* (\d+(\.\d+)?)$/;

  let consoleBuffer: string[] = [];
  const driver = await init(executable);
  try {
    let duration = await run(driver, framework, urlForFramework(framework));
    sleep(200);

    let logEntries = await driver.manage().logs().get(logging.Type.BROWSER);
    for (let entry of logEntries) {
      let m = entry.message.match(logmatch);
      if (m) {
        consoleBuffer.push(m[1]);
        // console.log(`[CONSOLE chromedriver]: ${m[1]}`);
      } else {
        // console.log("ignoring log message ", entry.message);
      }
    }
    if (consoleBuffer.length != 1) throw new Error(`Expected 1 console message, but there was none.`);
    // console.log("duration chromedriver", duration);
    return { timeline: duration, client: Number(consoleBuffer[0]) };
  } finally {
    await driver.close();
  }
}
