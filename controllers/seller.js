import { getDb } from '../config/db.js';
import { ObjectId } from 'mongodb';

export async function getSellerOverview(req, res) {
  try {
    const db = getDb();
    const adsCollection = db.collection('ads');
    const usersCollection = db.collection('users');

    const userIdQuery = ObjectId.isValid(req.userId) ? new ObjectId(req.userId) : req.userId;

    const postedAdsCount = await adsCollection.countDocuments({
      $or: [
        { userId: req.userId },
        { userId: userIdQuery }
      ]
    });

    const myAds = await adsCollection.find({
      $or: [
        { userId: req.userId },
        { userId: userIdQuery }
      ]
    }).toArray();

    const myAdIds = myAds.map(ad => ad._id.toString());
    const myAdObjIds = myAds.map(ad => ad._id);

    const favoritesCount = await usersCollection.countDocuments({
      favorites: { $in: [...myAdIds, ...myAdObjIds] }
    });

    return res.status(200).json({
      postedAds: postedAdsCount,
      leadsCount: 0,
      monthlyViews: 0,
      favouritesCount: favoritesCount
    });
  } catch (error) {
    console.error('Error fetching seller overview:', error.message);
    return res.status(500).json({
      message: 'Internal Server Error',
      error: error.message
    });
  }
}
