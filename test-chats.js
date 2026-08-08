import { MongoClient } from 'mongodb';
const uri = "mongodb+srv://root:Usoom2026@cluster0.x6rwiac.mongodb.net/"; 
const client = new MongoClient(uri);
async function run() {
  try {
    await client.connect();
    const db = client.db('usoom');
    const chats = await db.collection('chats').find().toArray();
    console.log(JSON.stringify(chats, null, 2));
  } finally {
    await client.close();
  }
}
run();
