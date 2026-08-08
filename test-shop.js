import { MongoClient } from 'mongodb';

async function run() {
  const uri = "mongodb+srv://root:Usoom2026@cluster0.x6rwiac.mongodb.net/";
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db('usoom');

  const shop = await db.collection('shops').findOne({});
  console.log("Shop fields:", Object.keys(shop));
  console.log("Shop:", shop);
  await client.close();
}

run().catch(console.error);
