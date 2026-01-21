import Jimp from 'jimp-compact'
import fs from "fs";
import { parse } from 'csv-parse';

// Image generation settings
const size = 1080; // Instagram tile
const margin = 100;
const textWidthAndHeight = size - margin * 2;
const backgroundColour = "white";

//Fonts
const narrativeFont = await Jimp.loadFont("./fonts/open-sans-light.fnt");
const tagFont = await Jimp.loadFont("./fonts/open-sans-regular.fnt");

//Text
const tag = "@nanonarratives";
const narrativesFile = "nn.csv";
const narratives = new Map();

loadNarratives();

function loadNarratives() {
  console.log("Loading narratives");
  fs.createReadStream(`./${narrativesFile}`)
    .pipe(parse({ delimiter: ',' }))
    .on('data', function (row) {
      narratives.set(row[0], row[1]);
    })
    .on('end', function () {
      narratives.forEach(function (value, key) {
        generateImage(key, value);
      });
    });
}

async function generateImage(date, narrative) {
  const image = new Jimp(size, size, backgroundColour);
  let parsedDate = date.replaceAll("/", "");

  // --- Main centered text ---
  image.print(
    narrativeFont,
    margin,
    margin,
    {
      text: narrative,
      alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
      alignmentY: Jimp.VERTICAL_ALIGN_MIDDLE
    },
    textWidthAndHeight,
    textWidthAndHeight
  );

  // --- Bottom footer text ---
  const footerHeight = 150; // height of the footer area

  image.print(
    tagFont,
    0,
    size - footerHeight, // y-position at the bottom
    {
      text: tag,
      alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
      alignmentY: Jimp.VERTICAL_ALIGN_MIDDLE
    },
    size,               // full width for centering
    footerHeight        // height of the footer box
  );

  console.log(`Generating image for ${parsedDate} - ${narrative}`)
  await image.writeAsync(`./generatedImages/${parsedDate}.jpg`);
}

