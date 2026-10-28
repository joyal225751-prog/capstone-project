import 'dotenv/config';
import app from './app.js';
import { connectDB } from './config/db.js';

const port = process.env.PORT || 5000;
try {
  await connectDB(process.env.MONGODB_URI);
  app.listen(port, () => console.log(`CampusFix API listening on port ${port}`));
} catch (error) {
  console.error('Could not start the API:', error.message);
  process.exit(1);
}
