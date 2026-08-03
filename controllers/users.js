import bcrypt from 'bcrypt';
import { getDb } from '../config/db.js';
import jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb';
import fs from 'fs';
import path from 'path';

function getImageUrl(req, imagePath) {
  if (!imagePath) return '';
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://') || imagePath.startsWith('data:')) {
    return imagePath;
  }
  const host = req.get('host');
  const cleanPath = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
  return `http://${host}${cleanPath}`;
}

export async function registerUser(req, res) {
  try {
    const db = getDb();
    const { fullName, email, password } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({ 
        message: 'All fields (fullName, email, password) are required.' 
      });
    }

    const usersCollection = db.collection('users');

    const existingUser = await usersCollection.findOne({ email: email });
    if (existingUser) {
      return res.status(409).json({ 
        message: 'A user with this email already exists.' 
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = {
      fullName,
      email,
      password: hashedPassword,
      createdAt: new Date()
    };

    const result = await usersCollection.insertOne(newUser);
    
    console.log(`User added with ID: ${result.insertedId}`);

    return res.status(201).json({
      message: 'User created successfully',
      userId: result.insertedId,
      user: { fullName, email }
    });

  } catch (error) {
    console.error('Error adding user:', error.message);
    return res.status(500).json({ 
      message: 'Internal Server Error', 
      error: error.message 
    });
  }
}



export async function loginUser(req, res) {
  try {
    const db = getDb();
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        message: 'Both email and password are required.' 
      });
    }

    const usersCollection = db.collection('users');

    const user = await usersCollection.findOne({ email: email });

    if (!user) {
      return res.status(401).json({ 
        message: 'Invalid email or password.' 
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ 
        message: 'Invalid email or password.' 
      });
    }

    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET || 'fallback_secret_key', 
      { expiresIn: '1h' }
    );

    console.log(`User logged in: ${user.email}`);

    return res.status(200).json({
      message: 'Login successful',
      token: token,
      userId: user._id,
      user: {
        fullName: user.fullName,
        email: user.email,
        profilePicture: getImageUrl(req, user.profilePicture)
      }
    });

  } catch (error) {
    console.error('Error logging in:', error.message);
    return res.status(500).json({ 
      message: 'Internal Server Error', 
      error: error.message 
    });
  }
}

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

export async function getFavorites(req, res) {
  try {
    const db = getDb();
    const usersCollection = db.collection('users');
    const user = await usersCollection.findOne(
      { _id: new ObjectId(req.userId) },
      { projection: { favorites: 1 } }
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const favoriteIds = user.favorites || [];
    const adsCollection = db.collection('ads');
    const queryIds = favoriteIds
      .filter(id => ObjectId.isValid(id))
      .map(id => new ObjectId(id));

    const filter = { _id: { $in: queryIds } };

    if (req.query.search) {
      filter.title = { $regex: req.query.search, $options: 'i' };
    }
    if (req.query.category) {
      filter.category = req.query.category;
    }
    if (req.query.subCategory) {
      filter.subCategory = req.query.subCategory;
    }
    if (req.query.condition) {
      filter.condition = req.query.condition;
    }
    if (req.query.location) {
      filter.location = { $regex: req.query.location, $options: 'i' };
    }

    const ads = await adsCollection.find(filter).toArray();

    const getImageUrl = (imagePath) => {
      if (!imagePath) return 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=300';
      if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
        return imagePath;
      }
      const host = req.get('host');
      const path = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
      return `http://${host}${path}`;
    };

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
        image: getImageUrl(previewImage),
        liked: true,
        time: getRelativeTime(ad.createdAt),
        createdAt: ad.createdAt
      };
    });

    return res.status(200).json({
      favorites: favoriteIds,
      ads: formattedAds
    });
  } catch (error) {
    console.error('Error getting favorites:', error.message);
    return res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
}

export async function addFavorite(req, res) {
  try {
    const db = getDb();
    const { adId } = req.params;

    if (!adId) {
      return res.status(400).json({ message: 'Ad ID is required.' });
    }

    const usersCollection = db.collection('users');
    const result = await usersCollection.updateOne(
      { _id: new ObjectId(req.userId) },
      { $addToSet: { favorites: adId } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    return res.status(200).json({ message: 'Ad added to favorites.' });
  } catch (error) {
    console.error('Error adding favorite:', error.message);
    return res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
}

export async function removeFavorite(req, res) {
  try {
    const db = getDb();
    const { adId } = req.params;

    if (!adId) {
      return res.status(400).json({ message: 'Ad ID is required.' });
    }

    const usersCollection = db.collection('users');
    const result = await usersCollection.updateOne(
      { _id: new ObjectId(req.userId) },
      { $pull: { favorites: adId } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    return res.status(200).json({ message: 'Ad removed from favorites.' });
  } catch (error) {
    console.error('Error removing favorite:', error.message);
    return res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
}

export async function getUserProfile(req, res) {
  try {
    const db = getDb();
    const usersCollection = db.collection('users');
    const user = await usersCollection.findOne(
      { _id: new ObjectId(req.userId) },
      { projection: { password: 0 } }
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const shopsCollection = db.collection('shops');
    const shop = await shopsCollection.findOne({ userId: new ObjectId(req.userId) });

    return res.status(200).json({
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone || '',
        country: user.country || '',
        city: user.city || '',
        profilePicture: getImageUrl(req, user.profilePicture),
        emailNotifications: user.emailNotifications ?? false,
        pushNotifications: user.pushNotifications ?? false,
        shop: shop ? {
          id: shop._id,
          username: shop.username,
          name: shop.name,
          category: shop.category,
          tagline: shop.tagline || '',
          about: shop.about,
          email: shop.email,
          phone: shop.phone,
          address: shop.address,
          facebook: shop.facebook || '',
          instagram: shop.instagram || '',
          tiktok: shop.tiktok || '',
          website: shop.website || '',
          coverImage: getImageUrl(req, shop.coverImage),
          profilePicture: getImageUrl(req, shop.profilePicture),
          createdAt: shop.createdAt,
          updatedAt: shop.updatedAt
        } : null
      }
    });
  } catch (error) {
    console.error('Error getting user profile:', error.message);
    return res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
}

export async function updateUserProfile(req, res) {
  try {
    const db = getDb();
    const usersCollection = db.collection('users');
    const { fullName, email, phone, password, oldPassword, country, city, profilePicture, shop, emailNotifications, pushNotifications } = req.body;

    const user = await usersCollection.findOne({ _id: new ObjectId(req.userId) });
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const updateFields = {};

    if (fullName) updateFields.fullName = fullName;
    if (phone !== undefined) updateFields.phone = phone;
    if (country !== undefined) updateFields.country = country;
    if (city !== undefined) updateFields.city = city;
    if (emailNotifications !== undefined) updateFields.emailNotifications = emailNotifications === true || emailNotifications === 'true';
    if (pushNotifications !== undefined) updateFields.pushNotifications = pushNotifications === true || pushNotifications === 'true';
    
    if (profilePicture !== undefined) {
      if (profilePicture && profilePicture.startsWith('data:image/')) {
        const matches = profilePicture.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          const ext = matches[1].split('/')[1] || 'jpg';
          const buffer = Buffer.from(matches[2], 'base64');
          const filename = `${req.userId}-${Date.now()}.${ext}`;
          const pfpDir = path.join('images', 'pfp');
          
          if (!fs.existsSync(pfpDir)) {
            fs.mkdirSync(pfpDir, { recursive: true });
          }
          
          const filePath = path.join(pfpDir, filename);
          fs.writeFileSync(filePath, buffer);
          updateFields.profilePicture = `images/pfp/${filename}`;
        }
      } else if (profilePicture) {
        if (profilePicture.includes('/images/pfp/')) {
          const relativePath = profilePicture.split('/images/pfp/')[1];
          updateFields.profilePicture = `images/pfp/${relativePath}`;
        } else {
          updateFields.profilePicture = profilePicture;
        }
      } else {
        updateFields.profilePicture = '';
      }
    }

    if (email && email.toLowerCase() !== user.email.toLowerCase()) {
      const emailLower = email.toLowerCase();
      const existingUser = await usersCollection.findOne({ 
        email: emailLower,
        _id: { $ne: new ObjectId(req.userId) }
      });
      if (existingUser) {
        return res.status(409).json({ message: 'A user with this email already exists.' });
      }
      updateFields.email = emailLower;
    }

    if (password) {
      if (!oldPassword) {
        return res.status(400).json({ message: 'Old password is required to change your password.' });
      }
      const isPasswordValid = await bcrypt.compare(oldPassword, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ message: 'Incorrect old password.' });
      }
      const hashedPassword = await bcrypt.hash(password, 10);
      updateFields.password = hashedPassword;
    }

    if (Object.keys(updateFields).length > 0) {
      await usersCollection.updateOne(
        { _id: new ObjectId(req.userId) },
        { $set: updateFields }
      );
    }

    if (shop !== undefined) {
      const shopsCollection = db.collection('shops');
      if (shop === null) {
        await shopsCollection.deleteOne({ userId: new ObjectId(req.userId) });
      } else {
        if (shop.username && /\s/.test(shop.username)) {
          return res.status(400).json({ message: 'Username cannot contain spaces.' });
        }
        
        const existingShop = await shopsCollection.findOne({ userId: new ObjectId(req.userId) });
        
        let savedCover = existingShop?.coverImage || '';
        let savedPp = existingShop?.profilePicture || '';

        if (shop.coverImage && shop.coverImage.startsWith('data:image/')) {
          const matches = shop.coverImage.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
          if (matches && matches.length === 3) {
            const ext = matches[1].split('/')[1] || 'jpg';
            const buffer = Buffer.from(matches[2], 'base64');
            const filename = `${req.userId}-${Date.now()}.${ext}`;
            const dir = path.join('images', 'shop_cover');
            if (!fs.existsSync(dir)) {
              fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(path.join(dir, filename), buffer);
            savedCover = `images/shop_cover/${filename}`;
          }
        } else if (shop.coverImage === '') {
          savedCover = '';
        }

        if (shop.profilePicture && shop.profilePicture.startsWith('data:image/')) {
          const matches = shop.profilePicture.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
          if (matches && matches.length === 3) {
            const ext = matches[1].split('/')[1] || 'jpg';
            const buffer = Buffer.from(matches[2], 'base64');
            const filename = `${req.userId}-${Date.now()}.${ext}`;
            const dir = path.join('images', 'shop_pp');
            if (!fs.existsSync(dir)) {
              fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(path.join(dir, filename), buffer);
            savedPp = `images/shop_pp/${filename}`;
          }
        } else if (shop.profilePicture === '') {
          savedPp = '';
        }

        const shopUpdate = {
          ...shop,
          coverImage: savedCover,
          profilePicture: savedPp,
          updatedAt: new Date()
        };
        if (!existingShop) {
          shopUpdate.userId = new ObjectId(req.userId);
          shopUpdate.createdAt = new Date();
        }
        await shopsCollection.updateOne(
          { userId: new ObjectId(req.userId) },
          { $set: shopUpdate },
          { upsert: true }
        );
      }
    }

    const updatedUser = await usersCollection.findOne(
      { _id: new ObjectId(req.userId) },
      { projection: { password: 0 } }
    );

    const shopsCollection = db.collection('shops');
    const updatedShop = await shopsCollection.findOne({ userId: new ObjectId(req.userId) });

    return res.status(200).json({
      message: 'Profile updated successfully',
      user: {
        id: updatedUser._id,
        fullName: updatedUser.fullName,
        email: updatedUser.email,
        phone: updatedUser.phone || '',
        country: updatedUser.country || '',
        city: updatedUser.city || '',
        profilePicture: getImageUrl(req, updatedUser.profilePicture),
        emailNotifications: updatedUser.emailNotifications ?? false,
        pushNotifications: updatedUser.pushNotifications ?? false,
        shop: updatedShop ? {
          id: updatedShop._id,
          username: updatedShop.username,
          name: updatedShop.name,
          category: updatedShop.category,
          tagline: updatedShop.tagline || '',
          about: updatedShop.about,
          email: updatedShop.email,
          phone: updatedShop.phone,
          address: updatedShop.address,
          facebook: updatedShop.facebook || '',
          instagram: updatedShop.instagram || '',
          tiktok: updatedShop.tiktok || '',
          website: updatedShop.website || '',
          coverImage: getImageUrl(req, updatedShop.coverImage),
          profilePicture: getImageUrl(req, updatedShop.profilePicture),
          createdAt: updatedShop.createdAt,
          updatedAt: updatedShop.updatedAt
        } : null
      }
    });
  } catch (error) {
    console.error('Error updating user profile:', error.message);
    return res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
}

export async function createShop(req, res) {
  try {
    const db = getDb();
    const usersCollection = db.collection('users');
    const {
      username,
      shopName,
      category,
      tagline,
      about,
      email,
      phone,
      address,
      facebook,
      instagram,
      tiktok,
      website,
      coverImage,
      profilePicture
    } = req.body;

    if (!username || !shopName || !category || !about || !email || !phone || !address) {
      return res.status(400).json({
        message: 'Compulsory fields (username, shopName, category, about, email, phone, address) are required.'
      });
    }

    if (/\s/.test(username)) {
      return res.status(400).json({ message: 'Username cannot contain spaces.' });
    }

    const user = await usersCollection.findOne({ _id: new ObjectId(req.userId) });
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const shopsCollection = db.collection('shops');
    const existingShop = await shopsCollection.findOne({ userId: new ObjectId(req.userId) });

    let savedCoverImage = existingShop?.coverImage || '';
    let savedProfilePicture = existingShop?.profilePicture || '';

    if (coverImage && coverImage.startsWith('data:image/')) {
      const matches = coverImage.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        const ext = matches[1].split('/')[1] || 'jpg';
        const buffer = Buffer.from(matches[2], 'base64');
        const filename = `${req.userId}-${Date.now()}.${ext}`;
        const dir = path.join('images', 'shop_cover');
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(path.join(dir, filename), buffer);
        savedCoverImage = `images/shop_cover/${filename}`;
      }
    }

    if (profilePicture && profilePicture.startsWith('data:image/')) {
      const matches = profilePicture.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        const ext = matches[1].split('/')[1] || 'jpg';
        const buffer = Buffer.from(matches[2], 'base64');
        const filename = `${req.userId}-${Date.now()}.${ext}`;
        const dir = path.join('images', 'shop_pp');
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(path.join(dir, filename), buffer);
        savedProfilePicture = `images/shop_pp/${filename}`;
      }
    }

    const shop = {
      userId: new ObjectId(req.userId),
      username,
      name: shopName,
      category,
      tagline: tagline || '',
      about,
      email,
      phone,
      address,
      facebook: facebook || '',
      instagram: instagram || '',
      tiktok: tiktok || '',
      website: website || '',
      coverImage: savedCoverImage,
      profilePicture: savedProfilePicture,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await shopsCollection.updateOne(
      { userId: new ObjectId(req.userId) },
      { $set: shop },
      { upsert: true }
    );

    return res.status(201).json({
      message: 'Shop created successfully',
      shop: {
        ...shop,
        coverImage: getImageUrl(req, shop.coverImage),
        profilePicture: getImageUrl(req, shop.profilePicture)
      }
    });
  } catch (error) {
    console.error('Error creating shop:', error.message);
    return res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
}

export async function deleteUserProfile(req, res) {
  try {
    const db = getDb();
    const userIdObj = ObjectId.isValid(req.userId) ? new ObjectId(req.userId) : req.userId;
    
    const shopsCollection = db.collection('shops');
    const adsCollection = db.collection('ads');
    const usersCollection = db.collection('users');

    const userShop = await shopsCollection.findOne({ userId: userIdObj });
    const shopId = userShop ? userShop._id : null;

    const adsFilter = {
      $or: [
        { userId: req.userId },
        { userId: userIdObj }
      ]
    };
    if (shopId) {
      adsFilter.$or.push({ shopId: shopId });
      adsFilter.$or.push({ shopId: shopId.toString() });
    }

    const adsToDelete = await adsCollection.find(adsFilter).toArray();
    console.log(`Found ${adsToDelete.length} ads to delete for user ${req.userId}`);

    for (const ad of adsToDelete) {
      await adsCollection.deleteOne({ _id: ad._id });
      console.log(`Deleted ad: ${ad._id}`);
    }

    if (userShop) {
      await shopsCollection.deleteOne({ _id: userShop._id });
      console.log(`Deleted shop: ${userShop._id}`);
    }

    const deleteResult = await usersCollection.deleteOne({ _id: userIdObj });
    if (deleteResult.deletedCount === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }
    console.log(`Deleted user: ${req.userId}`);

    return res.status(200).json({ message: 'Account and all related data deleted successfully.' });

  } catch (error) {
    console.error('Error deleting user profile:', error.message);
    return res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
}