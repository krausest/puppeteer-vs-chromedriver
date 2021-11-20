import { count } from "console";
import { runChromedriver } from "./benchChromedriver";
import { runPuppeteer } from "./benchPuppeteer";
import { Values } from "./common";

async function main() {
  let executable = process.argv[2];
  if (!executable) throw new Error("must pass path to chrome executable as argument");
  console.log("executable", executable);

  const COUNT = 25;
  const frameworks = ["vanillajs", "svelte"];
  const makeResult = () => ({
    client: new Values(),
    timeline: new Values(),
  });
  for (let framework of frameworks) {
    {
      let ressultsForPuppeteer = makeResult();
      for (let i = 0; i < COUNT + 1; i++) {
        let resPuppeteer = await runPuppeteer(executable, framework);
        // first run is dry run
        if (i > 0) {
          ressultsForPuppeteer.client.values.push(resPuppeteer.client);
          ressultsForPuppeteer.timeline.values.push(resPuppeteer.timeline);
        }
      }
      console.log(`puppeteer result for ${framework}`, ressultsForPuppeteer.timeline.toString());
      // console.log(
      //   `puppeteer details timeline duration for`,
      //   ressultsForPuppeteer.timeline.values.join(", "),
      //   " client duration",
      //   ressultsForPuppeteer.client.values.join(", ")
      // );
    }

    {
      let ressultsForChromedriver = makeResult();
      for (let i = 0; i < COUNT + 1; i++) {
        let resChromedriver = await runChromedriver(executable, framework);
        // first run is dry run
        if (i > 0) {
          ressultsForChromedriver.client.values.push(resChromedriver.client);
          ressultsForChromedriver.timeline.values.push(resChromedriver.timeline);
        }
      }
      console.log(`chromedriver result for ${framework}`, ressultsForChromedriver.timeline.toString());
      // console.log(
      //   `chromedriver details timeline duration for`,
      //   ressultsForChromedriver.timeline.values.join(", "),
      //   " client duration",
      //   ressultsForChromedriver.client.values.join(", ")
      // );
    }
  }
}

main().then(() => {});
