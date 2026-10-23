import { databaseReady } from "./database";
export async function GET() { return Response.json({app:"LumaCall V2",database:databaseReady()?"configured":"missing",status:databaseReady()?"ready-for-migration":"setup-required"},{headers:{"cache-control":"no-store"}}); }
