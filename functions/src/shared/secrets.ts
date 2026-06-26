/**
 * Server-side secret handle, shared by every AI callable.
 *
 * Locally the Functions emulator reads `functions/.env` (gitignored); in prod
 * this is a Functions secret. Never `VITE_`-prefixed — the key must not be
 * bundled into the client (PRD §3.6, P6).
 */
import { defineSecret } from "firebase-functions/params";

export const OPENAI_API_KEY = defineSecret("OPENAI_API_KEY");
