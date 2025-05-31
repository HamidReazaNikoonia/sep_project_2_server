const ClassNo = require('./classNo.model');

const createClassNo = async (classNoBody) => {
  return ClassNo.create(classNoBody);
};

const getAllClassNos = async () => {
  return ClassNo.find();
};

const deleteClassNoById = async (id) => {
  return ClassNo.findByIdAndDelete(id);
};

module.exports = {
  createClassNo,
  getAllClassNos,
  deleteClassNoById,
};
