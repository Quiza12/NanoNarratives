import fs from 'fs';
import { parse } from 'csv-parse';

const nn = new Map();

fs.createReadStream('./nn.csv')
    .pipe(parse({delimiter: ','}))
    .on('data', function(csvrow) {
        nn.set(csvrow[0], csvrow[1]);
    })
    .on('end',function() {
      printFor('24/05/2022');
    });

function printFor(date) {
  for (let [key, value] of nn.entries()) {
    if (key === date)
      console.log(value);
  }
}
