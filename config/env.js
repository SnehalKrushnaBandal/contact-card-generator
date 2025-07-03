// import {z} from "zod";

// const portSchema = z.coerce.number().min(1).max(65535).default(4000);
// export const PORT = portSchema.parse(process.env.PORT);

import { config } from "dotenv";
import {z} from "zod";

config();

export const env = z.object({
    PORT: z.coerce.number().default(3000),
    MONGODB_URL: z.string(),
    MONGODB_DB_NAME: z.string(),
}).parse(process.env);
