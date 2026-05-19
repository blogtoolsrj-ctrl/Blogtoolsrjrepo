# **App Name**: ShiftStream OCR

## Core Features:

- Intelligent Trip Card Extraction: Uses Gemini 1.5 Flash to extract text from images, including Hindi-to-English translation of operator names and normalization of shift labels.
- Fuzzy PC Tally Tool: A tool that uses reasoning to map hand-written PC notations to their corresponding standard column IDs based on fuzzy match rules.
- Smart Sheet Row Discovery: Automatically finds the next available row in Google Sheets starting at an anchor index of row 5 by verifying existing operator data.
- Dynamic Google Sheets Sync: Securely pushes extracted metrics and PC counts into shift-specific spreadsheet tabs with zero silent failures.
- Metrics Preview Dashboard: Clean UI to review extracted HMR and KM values before final sheet synchronization to ensure accuracy.
- Failure Notification System: Real-time error visibility that alerts the user with exact system error messages for failed sync attempts.
- Technical Activity Logging: Detailed terminal logging for target row discovery and shift tab identification during processing.

## Style Guidelines:

- Primary color: Deep Cobalt Blue (#3366CC), evoking reliability and industrial professionalism. Background: Desaturated Navy (#1A1E24) for a premium dark-mode dashboard feel.
- Accent color: Electric Azure (#52CEE0) for progress bars, buttons, and highlighting key metric values.
- Headline font: 'Space Grotesk' for a computerized, technical vibe; Body font: 'Inter' for high readability of numerical logs and data tables.
- Minimalistic, thin-stroke geometric icons to represent trucks, clocks, and spreadsheet synchronization status.
- Compact industrial dashboard layout utilizing sidebar navigation and card-based modular sections for step-by-step extraction workflows.
- Precise, rapid transitions between extraction phases with micro-interactions on spreadsheet commit actions.