import { config } from 'dotenv';
config();

import '@/ai/flows/extract-trip-card-data-flow.ts';
import '@/ai/flows/map-and-count-pc-trips-flow.ts';