import { getDb } from '../config/db.js';
import { ObjectId } from 'mongodb';

function getRelativeTime(date) {
  const now = new Date();
  const diffMs = now - new Date(date);
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays} days ago`;
}

function getImageUrl(req, imagePath) {
  if (!imagePath) return 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=300';
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }
  const host = req.get('host');
  const path = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
  return `http://${host}${path}`;
}

export async function getLatestAds(req, res) {
  try {
    const db = getDb();
    const adsCollection = db.collection('ads');

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 6;
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.category) {
      filter.category = req.query.category;
    }
    if (req.query.search) {
      filter.title = { $regex: req.query.search, $options: 'i' };
    }

    const totalAds = await adsCollection.countDocuments(filter);

    const ads = await adsCollection.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    const formattedAds = ads.map(ad => {
      const previewImage = ad.images && ad.images.length > 0 ? ad.images[0] : ad.image;
      return {
        id: ad._id.toString(),
        title: ad.title,
        year: ad.year,
        mileage: ad.mileage,
        fuel: ad.fuel,
        price: ad.price,
        location: ad.location,
        image: getImageUrl(req, previewImage),
        time: getRelativeTime(ad.createdAt),
        createdAt: ad.createdAt
      };
    });

    const hasMore = skip + ads.length < totalAds;

    return res.status(200).json({
      ads: formattedAds,
      hasMore,
      totalCount: totalAds,
      currentPage: page
    });

  } catch (error) {
    console.error('Error fetching latest ads:', error.message);
    return res.status(500).json({
      message: 'Internal Server Error',
      error: error.message
    });
  }
}

export async function createAd(req, res) {
  try {
    const db = getDb();
    const adsCollection = db.collection('ads');

    const {
      title,
      category,
      subCategory,
      condition,
      description,
      price,
      negotiable,
      quantity,
      delivery,
      location,
      year,
      mileage,
      fuel
    } = req.body;

    if (!title || !description) {
      return res.status(400).json({ message: 'Title and description are required.' });
    }

    const filePaths = req.files ? req.files.map(file => `/images/ads/${file.filename}`) : [];

    const shopsCollection = db.collection('shops');
    const userShop = await shopsCollection.findOne({ userId: ObjectId.isValid(req.userId) ? new ObjectId(req.userId) : req.userId });
    if (!userShop) {
      return res.status(400).json({ message: 'You must create a shop before posting an ad.' });
    }

    const newAd = {
      title,
      category,
      subCategory,
      condition,
      description,
      price: price ? (price.toString().startsWith('Rs. ') ? price.toString() : `Rs. ${price}`) : 'Rs. 0',
      negotiable: negotiable === 'true' || negotiable === true,
      quantity: quantity || '0',
      delivery: delivery || 'Pickup',
      location: location || '',
      year: year || new Date().getFullYear().toString(),
      mileage: mileage || '0 miles',
      fuel: fuel || 'Petrol',
      image: filePaths.length > 0 ? filePaths[0] : 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=300',
      images: filePaths,
      shopId: userShop._id,
      createdAt: new Date()
    };

    const result = await adsCollection.insertOne(newAd);

    return res.status(201).json({
      message: 'Ad created successfully',
      adId: result.insertedId,
      ad: newAd
    });

  } catch (error) {
    console.error('Error creating ad:', error.message);
    return res.status(500).json({
      message: 'Internal Server Error',
      error: error.message
    });
  }
}

export async function getAdById(req, res) {
  try {
    const db = getDb();
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid Ad ID format.' });
    }

    const adsCollection = db.collection('ads');
    const ad = await adsCollection.findOne({ _id: new ObjectId(id) });

    if (!ad) {
      return res.status(404).json({ message: 'Ad not found.' });
    }

    const usersCollection = db.collection('users');
    const shopsCollection = db.collection('shops');
    let seller = null;
    if (ad.shopId) {
      const shopIdObj = ObjectId.isValid(ad.shopId) ? new ObjectId(ad.shopId) : ad.shopId;
      const adShop = await shopsCollection.findOne(
        typeof shopIdObj === 'string' ? { _id: new ObjectId(shopIdObj) } : { _id: shopIdObj }
      );
      if (adShop) {
        let profilePic = adShop.profilePicture;
        if (profilePic && !profilePic.startsWith('http://') && !profilePic.startsWith('https://') && !profilePic.startsWith('data:')) {
          profilePic = getImageUrl(req, profilePic);
        }
        seller = {
          id: adShop._id.toString(),
          fullName: adShop.name,
          profilePicture: profilePic || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'
        };
      }
    } else if (ad.userId) {
      const sellerId = ObjectId.isValid(ad.userId) ? new ObjectId(ad.userId) : ad.userId;
      const sellerUser = await usersCollection.findOne(
        typeof sellerId === 'string' ? { _id: new ObjectId(sellerId) } : { _id: sellerId }, 
        { projection: { fullName: 1, profilePicture: 1 } }
      );
      if (sellerUser) {
        let profilePic = sellerUser.profilePicture;
        if (profilePic && !profilePic.startsWith('http://') && !profilePic.startsWith('https://') && !profilePic.startsWith('data:')) {
          profilePic = getImageUrl(req, profilePic);
        }
        seller = {
          id: sellerUser._id.toString(),
          fullName: sellerUser.fullName,
          profilePicture: profilePic || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'
        };
      }
    }

    const formattedImages = ad.images ? ad.images.map(img => getImageUrl(req, img)) : [];
    const formattedImage = getImageUrl(req, ad.image);

    const dateObj = new Date(ad.createdAt);
    const formattedDate = `${String(dateObj.getMonth() + 1).padStart(2, '0')}/${String(dateObj.getDate()).padStart(2, '0')}/${dateObj.getFullYear()}`;

    return res.status(200).json({
      id: ad._id.toString(),
      title: ad.title,
      category: ad.category,
      subCategory: ad.subCategory,
      condition: ad.condition,
      description: ad.description,
      price: ad.price,
      quantity: ad.quantity,
      delivery: ad.delivery,
      location: ad.location,
      year: ad.year,
      mileage: ad.mileage,
      fuel: ad.fuel,
      image: formattedImage,
      images: formattedImages.length > 0 ? formattedImages : [formattedImage],
      postedOn: formattedDate,
      shopID: ad.shopId ? ad.shopId.toString() : (seller ? seller.id : null),
      seller
    });

  } catch (error) {
    console.error('Error fetching ad details:', error.message);
    return res.status(500).json({
      message: 'Internal Server Error',
      error: error.message
    });
  }
}

export async function getMyAds(req, res) {
  try {
    const db = getDb();
    const adsCollection = db.collection('ads');

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 6;
    const skip = (page - 1) * limit;

    const userIdObj = ObjectId.isValid(req.userId) ? new ObjectId(req.userId) : req.userId;
    const shopsCollection = db.collection('shops');
    const userShop = await shopsCollection.findOne({ userId: userIdObj });
    const shopId = userShop ? userShop._id : null;

    const filter = {
      $or: [
        { shopId: shopId },
        { shopId: shopId ? shopId.toString() : null },
        { userId: req.userId },
        { userId: userIdObj }
      ]
    };
    if (req.query.search) {
      filter.title = { $regex: req.query.search, $options: 'i' };
    }

    const totalAds = await adsCollection.countDocuments(filter);

    const ads = await adsCollection.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    const formattedAds = ads.map(ad => {
      const previewImage = ad.images && ad.images.length > 0 ? ad.images[0] : ad.image;
      return {
        id: ad._id.toString(),
        title: ad.title,
        year: ad.year,
        mileage: ad.mileage,
        fuel: ad.fuel,
        price: ad.price,
        location: ad.location,
        image: getImageUrl(req, previewImage),
        time: getRelativeTime(ad.createdAt),
        createdAt: ad.createdAt
      };
    });

    const hasMore = skip + ads.length < totalAds;

    return res.status(200).json({
      ads: formattedAds,
      hasMore,
      totalCount: totalAds,
      currentPage: page
    });

  } catch (error) {
    console.error('Error fetching my ads:', error.message);
    return res.status(500).json({
      message: 'Internal Server Error',
      error: error.message
    });
  }
}
