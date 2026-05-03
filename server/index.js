import dotenv from 'dotenv';

import app from './src/app.js';
import { connectDB } from './src/config/db.js';

dotenv.config();

const port = Number(process.env.PORT || 8080);

const startServer = async () => {
  try {
    await connectDB();

    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
};

startServer();
