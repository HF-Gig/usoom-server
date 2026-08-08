import { MongoClient } from 'mongodb';
const uri = "mongodb+srv://root:Usoom2026@cluster0.x6rwiac.mongodb.net/"; 
const client = new MongoClient(uri);
async function run() {
  try {
    await client.connect();
    const db = client.db('usoom');
    const chats = await db.collection('chats').find().toArray();
    chats.forEach(c => {
      console.log('_id type:', typeof c._id, c._id.constructor.name);
    });
  } finally {
    await client.close();
  }
}
run();
