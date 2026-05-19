
import { google } from 'googleapis';
import { JWT } from 'google-auth-library';
import { ExtractTripCardDataOutput } from '@/ai/flows/extract-trip-card-data-flow';

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

// PC mapping to columns (starting from index 9 which is Column J)
const PC_COLUMN_MAP: Record<string, number> = {
  'V-06': 9, 'V-08': 10, 'V-09': 11, 'V-10': 12, 'V-11': 13,
  'V-42': 14, 'V-43': 15, 'V-44': 16, 'V-45': 17,
  'T-15': 18, 'T-16': 19, 'T-17': 20,
  'S-18': 21, 'S-19': 22, 'S-20': 23, 'S-24': 24,
  'V-25': 25, 'V-26': 26, 'V-27': 27, 'V-28': 28, 'V-29': 29,
};

function getAuthClient() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY
    ?.replace(/\\n/g, '\n')
    ?.replace(/"/g, '');

  if (!email || !privateKey) {
    throw new Error('Google Sheets credentials missing in environment variables.');
  }

  return new JWT({
    email,
    key: privateKey,
    scopes: SCOPES,
  });
}

export async function syncTripDataToSheets(
  spreadsheetId: string,
  data: ExtractTripCardDataOutput
) {
  try {
    const auth = getAuthClient();
    const sheets = google.sheets({ version: 'v4', auth });

    const shiftTab = `TRIP CARD-${data.shift}`;
    console.log(`Shift Tab: ${shiftTab}`);

    // Dynamic Row Discovery
    // Fetch all values in Column D (Operator Name)
    const range = `${shiftTab}!D:D`;
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    const rows = response.data.values || [];
    let firstEmptyIndex = rows.length;

    // Find first truly empty cell in Column D
    for (let i = 0; i < rows.length; i++) {
      if (!rows[i][0] || rows[i][0].toString().trim() === '') {
        firstEmptyIndex = i;
        break;
      }
    }

    // Anchor Rule: Start at Row 5 if index < 4 (Row 5 is index 4)
    const targetRow = Math.max(5, firstEmptyIndex + 1);
    console.log(`Target Row Found: ${targetRow}`);

    // Column Mapping
    // B: 1, C: 2, D: 3, E: 4, F: 5, G: 6, H: 7, I: 8, J: 9 onwards
    const values = Array(35).fill(null); // Initialize with enough slots
    
    // Explicit mappings
    values[1] = ''; // Model (User mentioned B: Model, let's keep it empty or if we had it)
    values[2] = data.doorNo; // C: Door No
    values[3] = data.operatorName; // D: Operator Name
    values[4] = data.metrics.startingHMR; // E: Start HMR
    values[5] = data.metrics.closingHMR; // F: Close HMR
    // G is usually a difference column in these logs, skipping
    values[7] = data.metrics.startingKM; // H: Start KM
    values[8] = data.metrics.endingKM; // I: Close KM

    // PC Mapping
    Object.entries(data.pcTally).forEach(([pcName, count]) => {
      const colIndex = PC_COLUMN_MAP[pcName];
      if (colIndex !== undefined) {
        values[colIndex] = count;
      }
    });

    // Update the row
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${shiftTab}!A${targetRow}:AJ${targetRow}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [values],
      },
    });

    return { success: true, targetRow, shiftTab };
  } catch (error: any) {
    console.error('Sheet Sync Error:', error);
    throw new Error(error.message || 'Failed to synchronize with Google Sheets');
  }
}
