import { MongoClient } from 'mongodb';
import 'dotenv/config';

const uri = process.env.MONGO_URI;
const client = new MongoClient(uri);

const mockAds = [
  {
    title: 'Toyota BZ4x Limited Ultra',
    year: '2023',
    mileage: '1,200 miles',
    fuel: 'Electric',
    price: '$45,000',
    location: 'Los Angeles, CA',
    image: 'https://images.unsplash.com/photo-1518546305927-5a555bb7020d?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80',
    createdAt: new Date()
  },
  {
    title: 'Tesla Model 3 Dual Motor',
    year: '2022',
    mileage: '14,500 miles',
    fuel: 'Electric',
    price: '$38,500',
    location: 'San Francisco, CA',
    image: 'https://images.unsplash.com/photo-1621416950468-11e43b6c20f0?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80',
    createdAt: new Date(Date.now() - 3600000) // 1 hour ago
  },
  {
    title: 'BMW M4 Competition',
    year: '2021',
    mileage: '22,000 miles',
    fuel: 'Petrol',
    price: '$68,900',
    location: 'Miami, FL',
    image: 'https://images.unsplash.com/photo-1605902711622-cfb43c4437b5?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80',
    createdAt: new Date(Date.now() - 7200000) // 2 hours ago
  },
  {
    title: 'Audi E-Tron GT Sport',
    year: '2022',
    mileage: '8,400 miles',
    fuel: 'Electric',
    price: '$79,000',
    location: 'New York, NY',
    image: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80',
    createdAt: new Date(Date.now() - 10800000) // 3 hours ago
  },
  {
    title: 'Ford Mustang Mach-E',
    year: '2021',
    mileage: '18,200 miles',
    fuel: 'Electric',
    price: '$35,000',
    location: 'Austin, TX',
    image: 'https://images.unsplash.com/photo-1502877338535-766e1456543e?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80',
    createdAt: new Date(Date.now() - 14400000) // 4 hours ago
  },
  {
    title: 'Porsche Taycan 4S',
    year: '2022',
    mileage: '5,100 miles',
    fuel: 'Electric',
    price: '$92,000',
    location: 'Seattle, WA',
    image: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80',
    createdAt: new Date(Date.now() - 18000000) // 5 hours ago
  },
  {
    title: 'Honda Civic Type R',
    year: '2020',
    mileage: '28,000 miles',
    fuel: 'Petrol',
    price: '$34,800',
    location: 'Chicago, IL',
    image: 'https://images.unsplash.com/photo-1606016159991-dfe4f2746ad5?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80',
    createdAt: new Date(Date.now() - 86400000) // 1 day ago
  },
  {
    title: 'Mercedes-Benz C63 AMG',
    year: '2019',
    mileage: '35,000 miles',
    fuel: 'Petrol',
    price: '$59,000',
    location: 'Houston, TX',
    image: 'https://images.unsplash.com/photo-1617531653332-bd46c24f2068?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80',
    createdAt: new Date(Date.now() - 172800000) // 2 days ago
  },
  {
    title: 'Subaru WRX STI',
    year: '2021',
    mileage: '12,400 miles',
    fuel: 'Petrol',
    price: '$41,500',
    location: 'Denver, CO',
    image: 'https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80',
    createdAt: new Date(Date.now() - 259200000) // 3 days ago
  },
  {
    title: 'Hyundai Ioniq 5',
    year: '2023',
    mileage: '3,000 miles',
    fuel: 'Electric',
    price: '$42,000',
    location: 'San Diego, CA',
    image: 'https://images.unsplash.com/photo-1650346910623-3a0d9ee1f2ae?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80',
    createdAt: new Date(Date.now() - 345600000) // 4 days ago
  },
  {
    title: 'Kia EV6 GT-Line',
    year: '2022',
    mileage: '9,800 miles',
    fuel: 'Electric',
    price: '$40,900',
    location: 'Phoenix, AZ',
    image: 'https://images.unsplash.com/photo-1662010021854-e67c538ea7a9?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80',
    createdAt: new Date(Date.now() - 432000000) // 5 days ago
  },
  {
    title: 'Chevrolet Corvette C8',
    year: '2022',
    mileage: '4,500 miles',
    fuel: 'Petrol',
    price: '$72,500',
    location: 'Las Vegas, NV',
    image: 'https://images.unsplash.com/photo-1583121274602-3e2820c69888?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80',
    createdAt: new Date(Date.now() - 518400000) // 6 days ago
  },
  {
    title: 'Lexus RX 350h Hybrid',
    year: '2023',
    mileage: '6,200 miles',
    fuel: 'Hybrid',
    price: '$51,000',
    location: 'Boston, MA',
    image: 'https://images.unsplash.com/photo-1616422285623-13ff0162193c?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80',
    createdAt: new Date(Date.now() - 604800000) // 7 days ago
  },
  {
    title: 'Jeep Wrangler Rubicon 4xe',
    year: '2022',
    mileage: '15,000 miles',
    fuel: 'Hybrid',
    price: '$48,000',
    location: 'Salt Lake City, UT',
    image: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80',
    createdAt: new Date(Date.now() - 691200000) // 8 days ago
  },
  {
    title: 'Toyota RAV4 Hybrid',
    year: '2021',
    mileage: '24,000 miles',
    fuel: 'Hybrid',
    price: '$29,800',
    location: 'Portland, OR',
    image: 'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80',
    createdAt: new Date(Date.now() - 777600000) // 9 days ago
  },
  {
    title: 'Mazda MX-5 Miata',
    year: '2020',
    mileage: '19,500 miles',
    fuel: 'Petrol',
    price: '$26,500',
    location: 'Atlanta, GA',
    image: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80',
    createdAt: new Date(Date.now() - 864000000) // 10 days ago
  },
  {
    title: 'Ford F-150 Lightning',
    year: '2022',
    mileage: '7,800 miles',
    fuel: 'Electric',
    price: '$61,000',
    location: 'Detroit, MI',
    image: 'https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80',
    createdAt: new Date(Date.now() - 950400000) // 11 days ago
  },
  {
    title: 'Rivian R1T Launch Edition',
    year: '2022',
    mileage: '11,000 miles',
    fuel: 'Electric',
    price: '$74,500',
    location: 'Salt Lake City, UT',
    image: 'https://images.unsplash.com/photo-1650346910623-3a0d9ee1f2ae?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80',
    createdAt: new Date(Date.now() - 1036800000) // 12 days ago
  }
];

async function seed() {
  try {
    await client.connect();
    console.log('Connected to DB...');
    const db = client.db('usoom');
    const adsCollection = db.collection('ads');

    // Clear existing ads
    await adsCollection.deleteMany({});
    console.log('Cleared existing ads.');

    // Insert mock ads
    const res = await adsCollection.insertMany(mockAds);
    console.log(`Inserted ${res.insertedCount} mock ads successfully.`);

  } catch (error) {
    console.error('Error seeding data:', error);
  } finally {
    await client.close();
  }
}

seed();
