import { MongoClient } from 'mongodb';

async function run() {
  const uri = "mongodb+srv://root:Usoom2026@cluster0.x6rwiac.mongodb.net/";
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db('usoom');

  // get a user
  const user = await db.collection('users').findOne({});
  if (!user) {
    console.log("No user found");
    return;
  }
  
  // get a token
  const res = await fetch('http://localhost:8000/api/users/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: user.email,
      password: 'Password123!' // hoping this is it, otherwise I'll just check DB
    })
  });
  const data = await res.json();
  const token = data.token;
  
  if (!token) {
    console.log("Failed to login", data);
    return;
  }

  const chatsRes = await fetch('http://localhost:8000/api/chats', {
    headers: { Authorization: `Bearer ${token}` }
  });
  const chatsData = await chatsRes.json();
  const chats = chatsData.chats;
  
  if (!chats || chats.length === 0) {
    console.log("No chats");
    return;
  }
  
  const chatId = chats[0].id;
  console.log("Sending message to chat", chatId);
  
  const sendRes = await fetch(`http://localhost:8000/api/chats/${chatId}/messages`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}` 
    },
    body: JSON.stringify({ text: "Hello from fetch!" })
  });
  
  console.log("Send status:", sendRes.status);
  
  const getRes = await fetch(`http://localhost:8000/api/chats/${chatId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  
  const getResData = await getRes.json();
  console.log("Messages in chat:", JSON.stringify(getResData.chat.messages, null, 2));
  
  await client.close();
}

run().catch(console.error);
