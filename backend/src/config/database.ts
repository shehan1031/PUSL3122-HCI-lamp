import mongoose from 'mongoose';

const URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/lamp-studio';

export async function connectDB(): Promise<void> {
  try {
    await mongoose.connect(URI, { bufferCommands: false });
    console.log(`✓ MongoDB connected → ${URI}`);
  } catch (err) {
    console.error('✗ MongoDB failed:', err);
    process.exit(1);
  }
}

mongoose.connection.on('disconnected', () => console.warn('⚠ MongoDB disconnected'));
mongoose.connection.on('error', (e) => console.error('⚠ MongoDB error:', e));

export default connectDB;
