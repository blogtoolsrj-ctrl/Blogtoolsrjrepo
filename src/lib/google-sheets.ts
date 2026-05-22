import { google } from 'googleapis';
import { ExtractTripCardDataOutput } from '@/ai/flows/extract-trip-card-data-flow';

// EXACT indices matching your active spreadsheet structure columns
const PC_COLUMN_MAP: Record<string, number> = {
  'V-06': 10, 'V-08': 11, 'V-09': 12, 'V-10': 13, 'V-11': 14,
  'V-42': 15, 'V-43': 16, 'V-44': 17, 'V-45': 18,
  'T-15': 19, 'T-16': 20, 'T-17': 21,
  'S-18': 22, 'S-19': 23, 'S-20': 24, 'S-24': 25,
  'V-25': 26, 'V-26': 27, 'V-27': 28, 'V-28': 29, 'V-29': 30
};

/**
 * Advanced fleet token matcher to translate fuzzy handwriting into standard spreadsheet keys
 */
function normalizePcKey(rawPc: string): string | null {
  if (!rawPc) return null;

  // Strip prefix words, formatting characters, and whitespaces
  const clean = rawPc.toUpperCase()
    .replace(/PC/g, '')
    .replace(/NO/g, '')
    .replace(/[-\s]/g, '');

  // Sub-string pattern validation layer to eliminate index drift errors
  if (clean.includes('42')) return 'V-42';
  if (clean.includes('43')) return 'V-43';
  if (clean.includes('44')) return 'V-44';
  if (clean.includes('45')) return 'V-45';
  if (clean.includes('15')) return 'T-15';
  if (clean.includes('16')) return 'T-16';
  if (clean.includes('17')) return 'T-17';
  if (clean.includes('18')) return 'S-18';
  if (clean.includes('19')) return 'S-19';
  if (clean.includes('20')) return 'S-20';
  // Rule enforcement: '24' matches S-24 column structure explicitly
  if (clean.includes('24')) return 'S-24';
  if (clean.includes('25')) return 'V-25';
  if (clean.includes('26')) return 'V-26';
  if (clean.includes('27')) return 'V-27';
  if (clean.includes('28')) return 'V-28';
  if (clean.includes('29')) return 'V-29';
  if (clean.includes('06') || clean === '6') return 'V-06';
  if (clean.includes('08') || clean === '8') return 'V-08';
  if (clean.includes('09') || clean === '9') return 'V-09';
  if (clean.includes('10')) return 'V-10';
  if (clean.includes('11')) return 'V-11';

  return null;
}

/**
 * Instantiates an authorized JWT auth client directly via system environment variables
 */
function getAuthClient() {
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  let privateKey = process.env.GOOGLE_PRIVATE_KEY;

  if (!clientEmail || !privateKey) {
    throw new Error('Missing Google Credentials configuration environment variables.');
  }

  // Convert literal string sequence "\n" back to real cryptographically structural line breaks
  if (privateKey.includes('\\n')) {
    privateKey = privateKey.replace(/\\n/g, '\n');
  }

  return new google.auth.JWT(
    clientEmail,
    undefined,
    privateKey,
    ['https://www.googleapis.com/auth/spreadsheets']
  );
}

export async function syncTripDataToSheets(
  spreadsheetId: string,
  data: ExtractTripCardDataOutput
) {
  try {
    const auth = getAuthClient();
    const sheets = google.sheets({ version: 'v4', auth });

    const targetTab = `TRIP CARD-${data.shift.toUpperCase()}`;

    // Read current rows to find next entry placement
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${targetTab}!B:C`,
    });

    const rows = response.data.values || [];
    const targetRowIndex = rows.length + 1;

    // Sized array allocation boundary
    const rowValues = new Array(36).fill('');

    // Mapping core layout positions
    rowValues[1] = new Date().toLocaleDateString('en-CA'); // B: Date
    rowValues[2] = data.doorNo;                            // C: Door No
    rowValues[3] = data.operatorName;                      // D: Operator Name
    rowValues[4] = data.metrics.startingHMR;               // E: Starting HMR
    rowValues[5] = data.metrics.closingHMR;                // F: Closing HMR
    rowValues[7] = data.metrics.startingKM;                // H: Starting KM
    rowValues[8] = data.metrics.closingKM;                 // I: Closing KM

    // Map tallies into the corresponding column targets
    if (data.pcTally && typeof data.pcTally === 'object') {
      for (const [rawPcKey, count] of Object.entries(data.pcTally)) {
        if (count === null || count === undefined) continue;
        
        const standardKey = normalizePcKey(rawPcKey);
        if (standardKey && PC_COLUMN_MAP[standardKey] !== undefined) {
          const colIndex = PC_COLUMN_MAP[standardKey];
          rowValues[colIndex] = Number(count);
        }
      }
    }

    // Write row back into Google Sheets
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${targetTab}!A${targetRowIndex}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [rowValues],
      },
    });

    return { success: true, targetRow: targetRowIndex, targetTab };
  } catch (error) {
    console.error('Error syncing data to Google Sheets:', error);
    throw error;
  }
}