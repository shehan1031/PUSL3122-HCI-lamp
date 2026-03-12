import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IFurniture {
  type: string;
  label: string;
  icon: string;
  x: number;
  y: number;
  fw: number;
  fh: number;
  color: string;
  opacity: number;
  rotation: number;
}

export interface IDesign extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  client: string;
  roomType: string;
  shape: 'Rectangle' | 'L-Shape' | 'T-Shape';
  roomWidth: number;
  roomLength: number;
  wallColor: string;
  status: 'active' | 'draft' | 'archived';
  designerId: mongoose.Types.ObjectId;
  designerName: string;
  furniture: mongoose.Types.DocumentArray<IFurniture & mongoose.Document>;
  views: number;
  createdAt: Date;
  updatedAt: Date;
}

const FurnitureSchema = new Schema<IFurniture>(
  {
    type:     { type: String, required: true },
    label:    { type: String, required: true },
    icon:     { type: String, default: '📦' },
    x:        { type: Number, default: 100 },
    y:        { type: Number, default: 100 },
    fw:       { type: Number, default: 80 },
    fh:       { type: Number, default: 60 },
    color:    { type: String, default: '#888888' },
    opacity:  { type: Number, default: 1, min: 0, max: 1 },
    rotation: { type: Number, default: 0 },
  },
  { _id: true }
);

const DesignSchema = new Schema<IDesign>(
  {
    name:         { type: String, required: true, trim: true, maxlength: 200 },
    client:       { type: String, required: true, trim: true, maxlength: 200 },
    roomType:     { type: String, required: true, trim: true },
    shape:        { type: String, enum: ['Rectangle', 'L-Shape', 'T-Shape'], default: 'Rectangle' },
    roomWidth:    { type: Number, default: 5, min: 2, max: 30 },
    roomLength:   { type: Number, default: 4, min: 2, max: 30 },
    wallColor:    { type: String, default: '#f5efe6' },
    status:       { type: String, enum: ['active', 'draft', 'archived'], default: 'draft' },
    designerId:   { type: Schema.Types.ObjectId, ref: 'User', required: true },
    designerName: { type: String, required: true },
    furniture:    [FurnitureSchema],
    views:        { type: Number, default: 0 },
  },
  { timestamps: true }
);

DesignSchema.index({ designerId: 1, status: 1 });
DesignSchema.index({ client: 'text', name: 'text' });

const Design: Model<IDesign> =
  mongoose.models.Design || mongoose.model<IDesign>('Design', DesignSchema);

export default Design;
