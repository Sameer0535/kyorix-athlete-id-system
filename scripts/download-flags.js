const fs = require('fs');
const path = require('path');
const https = require('https');

const dir = path.resolve(__dirname, '../src/assets/flags');
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

const COUNTRIES = [
  { code: 'IND', iso2: 'in' },
  { code: 'KOR', iso2: 'kr' },
  { code: 'USA', iso2: 'us' },
  { code: 'GBR', iso2: 'gb' },
  { code: 'NEP', iso2: 'np' },
  { code: 'BAN', iso2: 'bd' },
  { code: 'SRI', iso2: 'lk' },
  { code: 'UAE', iso2: 'ae' },
  { code: 'AFG', iso2: 'af' },
  { code: 'ARG', iso2: 'ar' },
  { code: 'AUS', iso2: 'au' },
  { code: 'AUT', iso2: 'at' },
  { code: 'AZE', iso2: 'az' },
  { code: 'BRN', iso2: 'bh' },
  { code: 'BEL', iso2: 'be' },
  { code: 'BHU', iso2: 'bt' },
  { code: 'BRA', iso2: 'br' },
  { code: 'CAN', iso2: 'ca' },
  { code: 'CHI', iso2: 'cl' },
  { code: 'CHN', iso2: 'cn' },
  { code: 'TPE', iso2: 'tw' },
  { code: 'COL', iso2: 'co' },
  { code: 'CRO', iso2: 'hr' },
  { code: 'CUB', iso2: 'cu' },
  { code: 'DEN', iso2: 'dk' },
  { code: 'EGY', iso2: 'eg' },
  { code: 'ESP', iso2: 'es' },
  { code: 'FIN', iso2: 'fi' },
  { code: 'FRA', iso2: 'fr' },
  { code: 'GER', iso2: 'de' },
  { code: 'GRE', iso2: 'gr' },
  { code: 'HKG', iso2: 'hk' },
  { code: 'HUN', iso2: 'hu' },
  { code: 'INA', iso2: 'id' },
  { code: 'IRI', iso2: 'ir' },
  { code: 'IRL', iso2: 'ie' },
  { code: 'ITA', iso2: 'it' },
  { code: 'JOR', iso2: 'jo' },
  { code: 'JPN', iso2: 'jp' },
  { code: 'KAZ', iso2: 'kz' },
  { code: 'KEN', iso2: 'ke' },
  { code: 'KSA', iso2: 'sa' },
  { code: 'KUW', iso2: 'kw' },
  { code: 'MAS', iso2: 'my' },
  { code: 'MDV', iso2: 'mv' },
  { code: 'MEX', iso2: 'mx' },
  { code: 'MGL', iso2: 'mn' },
  { code: 'MAR', iso2: 'ma' },
  { code: 'NED', iso2: 'nl' },
  { code: 'NZL', iso2: 'nz' },
  { code: 'NGR', iso2: 'ng' },
  { code: 'NOR', iso2: 'no' },
  { code: 'OMA', iso2: 'om' },
  { code: 'PAK', iso2: 'pk' },
  { code: 'PER', iso2: 'pe' },
  { code: 'PHI', iso2: 'ph' },
  { code: 'POL', iso2: 'pl' },
  { code: 'POR', iso2: 'pt' },
  { code: 'QAT', iso2: 'qa' },
  { code: 'RSA', iso2: 'za' },
  { code: 'SRB', iso2: 'rs' },
  { code: 'SGP', iso2: 'sg' },
  { code: 'SWE', iso2: 'se' },
  { code: 'SUI', iso2: 'ch' },
  { code: 'THA', iso2: 'th' },
  { code: 'TUN', iso2: 'tn' },
  { code: 'TUR', iso2: 'tr' },
  { code: 'UZB', iso2: 'uz' },
  { code: 'VIE', iso2: 'vn' },
];

function download(item) {
  return new Promise((resolve) => {
    const filePath = path.join(dir, `${item.code}.png`);
    if (fs.existsSync(filePath) && fs.statSync(filePath).size > 100) {
      return resolve();
    }
    const url = `https://flagcdn.com/w160/${item.iso2}.png`;
    https.get(url, (res) => {
      if (res.statusCode === 200) {
        const fileStream = fs.createWriteStream(filePath);
        res.pipe(fileStream);
        fileStream.on('finish', () => {
          fileStream.close();
          resolve();
        });
      } else {
        console.warn(`Failed ${item.code}: status ${res.statusCode}`);
        resolve();
      }
    }).on('error', (err) => {
      console.warn(`Error ${item.code}:`, err.message);
      resolve();
    });
  });
}

async function run() {
  for (const c of COUNTRIES) {
    await download(c);
  }
  console.log('All flags downloaded to src/assets/flags');
}

run();

