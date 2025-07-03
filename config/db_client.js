import {MongoClient} from "mongodb";
import {env} from "./env.js";

// export const client = new MongoClient(env.MONGODB_URL);
export const client = new MongoClient(env.MONGODB_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  tls: true
});