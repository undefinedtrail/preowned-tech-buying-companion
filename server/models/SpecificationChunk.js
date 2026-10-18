const mongoose = require('mongoose');

const specificationChunkSchema = new mongoose.Schema(
  {
    specificationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Specification',
      required: true,
      index: true,
    },
    brand: {
      type: String,
      required: true,
      index: true,
    },
    modelName: {
      type: String,
      required: true,
      index: true,
    },
    sourceDoc: {
      type: String,
      required: true,
    },
    sectionTitle: {
      type: String,
      required: true,
    },
    pageNumber: {
      type: Number,
    },
    chunkIndex: {
      type: Number,
      required: true,
    },
    pageContent: {
      type: String,
      required: true,
    },
    // Normalized embedding vector for MongoDB Atlas $vectorSearch
    embedding: {
      type: [Number],
      default: [],
      select: false,
    },
  },
  {
    timestamps: true,
  }
);

specificationChunkSchema.index({ brand: 1, modelName: 1 });

module.exports = mongoose.model('SpecificationChunk', specificationChunkSchema);
