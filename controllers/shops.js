import { getDb } from '../config/db.js';

function getImageUrl(req, imagePath) {
  if (!imagePath) return '';
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://') || imagePath.startsWith('data:')) {
    return imagePath;
  }
  const host = req.get('host');
  const cleanPath = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
  return `http://${host}${cleanPath}`;
}

export async function getAllShops(req, res) {
  try {
    const db = getDb();
    const shopsCollection = db.collection('shops');

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 6;
    const skip = (page - 1) * limit;

    const query = {};

    if (req.query.category) {
      query.category = req.query.category;
    }

    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i');
      query.$or = [
        { name: searchRegex },
        { username: searchRegex },
        { tagline: searchRegex }
      ];
    }

    const totalShops = await shopsCollection.countDocuments(query);
    const shops = await shopsCollection.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    const formattedShops = shops.map(shop => ({
      ...shop,
      coverImage: getImageUrl(req, shop.coverImage),
      profilePicture: getImageUrl(req, shop.profilePicture)
    }));

    return res.status(200).json({
      shops: formattedShops,
      total: totalShops,
      page,
      pages: Math.ceil(totalShops / limit)
    });
  } catch (error) {
    console.error('Error getting shops:', error.message);
    return res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
}
