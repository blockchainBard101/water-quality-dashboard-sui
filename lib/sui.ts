import { SuiClient } from '@mysten/sui/client';

export const client = new SuiClient({ 
  url: process.env.NEXT_PUBLIC_SUI_RPC_URL! 
});

export const PACKAGE_ID = process.env.NEXT_PUBLIC_PACKAGE_ID!;
export const EVENT_TYPE = `${PACKAGE_ID}::per_minute::MinuteReadingUpserted`;
export const CLOCK_ID = '0x6';
