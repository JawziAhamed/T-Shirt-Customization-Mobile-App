import mongoose from 'mongoose';

const sizeSchema = new mongoose.Schema(
  {
    size: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    priceModifier: {
      type: Number,
      default: 0,
    },
  },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },
    description: {
      type: String,
      required: true,
      maxlength: 1500,
    },
    category: {
      type: String,
      default: 'custom-tshirt',
      trim: true,
    },
    categories: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Category',
        },
      ],
      default: [],
    },
    basePrice: {
      type: Number,
      required: true,
      min: 0,
    },
    sizes: {
      type: [sizeSchema],
      default: [],
    },
    colors: {
      type: [String],
      default: [],
    },
    imageUrl: {
      type: String,
      default: '',
    },
    gallery: {
      type: [String],
      default: [],
    },
    defaultTemplates: {
      type: [String],
      default: [],
    },
    customArtworkAllowed: {
      type: Boolean,
      default: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    tags: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

productSchema.index({ name: 'text', description: 'text', category: 'text', tags: 'text' });
productSchema.index({ categories: 1 });

const Product = mongoose.model('Product', productSchema);

export default Product;
