const mongoose = require('mongoose');

const objectId = mongoose.Types.ObjectId;

// Enum Constant
const ListOfIssues = [ " کوتاهی قد", " بیماری قلبی" ];

const ResultReason = ["RelationShip", "Have_Issues"]

const ListOfCheckBox = [
  {
    id: 0,
    title: "خودتان",
    value: false,
  },
  {
    id: 1,
    title: "فرزندان بسر",
    value: false,
  }
]

const consultSchema = mongoose.Schema(
  {
    user_id: {
      type: objectId,
      required: true,
      ref: 'User',
    },
    mariage_type: {
      type: String,
      enum: ["FAMILY", "NON_FAMILY"],
    },
    parent_mariage_type: {
      type: String,
      enum: ["FAMILY", "NON_FAMILY"],
    },
    report: {
      // ListOfIssues: [String],
      ListOfCheckBox: [
        {
          _id: false,
          id: Number,
          title: String,
          value: Boolean
        }
      ],
    },
    result: Boolean,
    result_reason: {
      type: String,
      enum: ResultReason
    }
  },
  {
    timestamps: true,
  }
);

consultSchema.plugin(require('mongoose-autopopulate'));

// referenceSchema.virtual("url").get(function () {
//   return `/product/${this._id}`;
// });


const Consult = mongoose.model('Consult', consultSchema);

module.exports = Consult;
