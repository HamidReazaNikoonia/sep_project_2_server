const { Category } = require('./category.model');

const createCategoryWithParent = async (name, parentId = null) => {
  const category = await Category.create({ name, parent: parentId });
  return category;
};

const getFullPath = async (categoryId) => {
  const category = await Category.findById(categoryId);
  if (!category) return null;

  if (!category.path) return [category];

  const pathIds = category.path.split(',');
  return Category.find({ _id: { $in: pathIds } }).sort({ level: 1 });
};

module.exports = {
  createCategoryWithParent,
  getFullPath,
};
