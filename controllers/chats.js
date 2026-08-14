import { getDb } from '../config/db.js';
import { ObjectId } from 'mongodb';

/**
 * Creates or retrieves a chat document in the 'chats' collection.
 * Required fields in document: buyerID, shopID, adID, messages object/array containing { sender, receiver, text, time }.
 */
export async function createChat(req, res) {
  try {
    const db = getDb();
    const chatsCollection = db.collection('chats');

    const buyerID = req.userId ? req.userId.toString() : req.body.buyerID;
    const { shopID, adID } = req.body;

    if (!buyerID) {
      return res.status(400).json({ message: 'Buyer ID is required.' });
    }

    if (!adID) {
      return res.status(400).json({ message: 'Ad ID is required.' });
    }

    const cleanBuyerID = buyerID.toString();
    const cleanShopID = shopID ? shopID.toString() : null;
    const cleanAdID = adID.toString();

    // Check if chat document already exists for this buyer and ad
    const existingChat = await chatsCollection.findOne({
      buyerID: cleanBuyerID,
      adID: cleanAdID,
    });

    if (existingChat) {
      return res.status(200).json({
        message: 'Chat already exists',
        chat: existingChat,
      });
    }

    // Create new chat document
    const newChat = {
      buyerID: cleanBuyerID,
      shopID: cleanShopID,
      adID: cleanAdID,
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await chatsCollection.insertOne(newChat);
    newChat._id = result.insertedId;

    console.log(`Created new chat in 'chats' collection with ID: ${newChat._id}`);

    return res.status(201).json({
      message: 'Chat created successfully',
      chat: newChat,
    });
  } catch (error) {
    console.error('Error creating chat document:', error);
    return res.status(500).json({
      message: 'Internal Server Error',
      error: error.message,
    });
  }
}

/**
 * Gets all chats for the logged in user (as buyer or shop/seller).
 */
export async function getUserChats(req, res) {
  try {
    const db = getDb();
    const chatsCollection = db.collection('chats');
    const shopsCollection = db.collection('shops');
    const usersCollection = db.collection('users');
    const adsCollection = db.collection('ads');

    const userId = req.userId.toString();

    // Check if user has a shop
    const userShop = await shopsCollection.findOne({
      userId: ObjectId.isValid(userId) ? new ObjectId(userId) : userId,
    });

    const userShopId = userShop ? userShop._id.toString() : null;

    const query = {
      $or: [
        { buyerID: userId },
        ...(userShopId ? [{ shopID: userShopId }] : []),
      ],
    };

    const rawChats = await chatsCollection.find(query).sort({ updatedAt: -1 }).toArray();

    const chats = await Promise.all(
      rawChats.map(async (chat) => {
        let chatName = 'Chat';
        let chatImage = 'https://i.pravatar.cc/150?img=11';

        const isBuyer = chat.buyerID === userId;

        if (isBuyer) {
          if (chat.shopID) {
            const shopObj = await shopsCollection.findOne({
              _id: ObjectId.isValid(chat.shopID) ? new ObjectId(chat.shopID) : chat.shopID,
            });
            if (shopObj) {
              chatName = shopObj.name || 'Shop';
              if (shopObj.profilePicture) chatImage = shopObj.profilePicture;
            }
          }
        } else {
          if (chat.buyerID) {
            const buyerObj = await usersCollection.findOne({
              _id: ObjectId.isValid(chat.buyerID) ? new ObjectId(chat.buyerID) : chat.buyerID,
            });
            if (buyerObj) {
              chatName = buyerObj.fullName || 'Buyer';
              if (buyerObj.profilePicture) chatImage = buyerObj.profilePicture;
            }
          }
        }

        let adInfo = null;
        if (chat.adID) {
          const adObj = await adsCollection.findOne({
            _id: ObjectId.isValid(chat.adID) ? new ObjectId(chat.adID) : chat.adID,
          });
          if (adObj) {
            adInfo = {
              id: adObj._id.toString(),
              title: adObj.title,
              price: adObj.price,
              image: adObj.image,
            };
          }
        }

        const lastMsgObj = chat.messages && chat.messages.length > 0
          ? chat.messages[chat.messages.length - 1]
          : null;

        const lastMessage = lastMsgObj ? lastMsgObj.text : 'Chat started';

        return {
          id: chat._id.toString(),
          buyerID: chat.buyerID,
          shopID: chat.shopID,
          adID: chat.adID,
          name: chatName,
          image: chatImage,
          adInfo,
          lastMessage,
          messages: chat.messages || [],
          updatedAt: chat.updatedAt,
          createdAt: chat.createdAt,
        };
      })
    );

    return res.status(200).json({ chats, currentUserId: userId });
  } catch (error) {
    console.error('Error fetching chats:', error);
    return res.status(500).json({
      message: 'Internal Server Error',
      error: error.message,
    });
  }
}

/**
 * Gets a single chat by ID.
 */
export async function getChatById(req, res) {
  try {
    const db = getDb();
    const chatsCollection = db.collection('chats');
    const shopsCollection = db.collection('shops');
    const usersCollection = db.collection('users');
    const adsCollection = db.collection('ads');

    const { chatId } = req.params;
    const userId = req.userId.toString();

    if (!ObjectId.isValid(chatId)) {
      return res.status(400).json({ message: 'Invalid Chat ID format.' });
    }

    const chat = await chatsCollection.findOne({ _id: new ObjectId(chatId) });
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found.' });
    }

    let chatName = 'Chat';
    let chatImage = 'https://i.pravatar.cc/150?img=11';

    const isBuyer = chat.buyerID === userId;

    if (isBuyer) {
      if (chat.shopID) {
        const shopObj = await shopsCollection.findOne({
          _id: ObjectId.isValid(chat.shopID) ? new ObjectId(chat.shopID) : chat.shopID,
        });
        if (shopObj) {
          chatName = shopObj.name || 'Shop';
          if (shopObj.profilePicture) chatImage = shopObj.profilePicture;
        }
      }
    } else {
      if (chat.buyerID) {
        const buyerObj = await usersCollection.findOne({
          _id: ObjectId.isValid(chat.buyerID) ? new ObjectId(chat.buyerID) : chat.buyerID,
        });
        if (buyerObj) {
          chatName = buyerObj.fullName || 'Buyer';
          if (buyerObj.profilePicture) chatImage = buyerObj.profilePicture;
        }
      }
    }

    let adInfo = null;
    if (chat.adID) {
      const adObj = await adsCollection.findOne({
        _id: ObjectId.isValid(chat.adID) ? new ObjectId(chat.adID) : chat.adID,
      });
      if (adObj) {
        adInfo = {
          id: adObj._id.toString(),
          title: adObj.title,
          price: adObj.price,
          image: adObj.image,
        };
      }
    }

    return res.status(200).json({
      chat: {
        id: chat._id.toString(),
        buyerID: chat.buyerID,
        shopID: chat.shopID,
        adID: chat.adID,
        name: chatName,
        image: chatImage,
        adInfo,
        messages: chat.messages || [],
        createdAt: chat.createdAt,
        updatedAt: chat.updatedAt,
      },
      currentUserId: userId,
    });
  } catch (error) {
    console.error('Error fetching chat by ID:', error);
    return res.status(500).json({
      message: 'Internal Server Error',
      error: error.message,
    });
  }
}

/**
 * Sends a message in an existing chat.
 */
export async function sendMessage(req, res) {
  try {
    const db = getDb();
    const chatsCollection = db.collection('chats');
    const { chatId } = req.params;
    const { receiver, text } = req.body;
    const sender = req.userId.toString();

    if (!text) {
      return res.status(400).json({ message: 'Text is required.' });
    }

    if (!ObjectId.isValid(chatId)) {
      return res.status(400).json({ message: 'Invalid Chat ID format.' });
    }

    const messageObj = {
      sender,
      receiver: receiver || null,
      text,
      time: new Date().toISOString(),
    };

    const result = await chatsCollection.updateOne(
      { _id: new ObjectId(chatId) },
      {
        $push: { messages: messageObj },
        $set: { updatedAt: new Date() },
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: 'Chat not found.' });
    }

    return res.status(200).json({
      message: 'Message sent successfully',
      messageObj,
    });
  } catch (error) {
    console.error('Error sending message:', error);
    return res.status(500).json({
      message: 'Internal Server Error',
      error: error.message,
    });
  }
}

/**
 * Deletes a chat by ID.
 */
export async function deleteChat(req, res) {
  try {
    const db = getDb();
    const chatsCollection = db.collection('chats');
    const { chatId } = req.params;

    if (!ObjectId.isValid(chatId)) {
      return res.status(400).json({ message: 'Invalid Chat ID format.' });
    }

    const result = await chatsCollection.deleteOne({ _id: new ObjectId(chatId) });
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'Chat not found.' });
    }

    return res.status(200).json({ message: 'Chat deleted successfully.' });
  } catch (error) {
    console.error('Error deleting chat:', error);
    return res.status(500).json({
      message: 'Internal Server Error',
      error: error.message,
    });
  }
}

