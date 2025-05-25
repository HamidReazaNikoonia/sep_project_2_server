/* eslint-disable no-restricted-syntax */
const mongoose = require('mongoose');
const httpStatus = require('http-status');

// Utils
const ApiError = require('../../../utils/ApiError');

const { Address } = require('./order.model');

const createNewAddressByUser = async ({ customerId, newAddress }) => {
  const addressDoc = await Address.create({
    customer: customerId,
    billingAddress: {
      addressLine1: newAddress.addressLine1,
      ...(newAddress.addressLine2 && { addressLine2: newAddress.addressLine2 }),
      ...(newAddress.title && {title: newAddress.title}),
      city: newAddress.city,
      state: newAddress.state,
      postalCode: newAddress.postalCode,
      country: newAddress.country || 'IRAN',
    },
  });

  if (!addressDoc) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Order Not Found');
  }

  return addressDoc;
};

const getAllUserAddress = async ({ customerId }) => {
  const addresses = await Address.find({ customer: customerId });

  if (!addresses) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Order Not Found');
  }

  return addresses;
};

const updateUserAddress = async ({ customerId, shippingAddressId, updatedAddress }) => {
  if (!mongoose.Types.ObjectId.isValid(shippingAddressId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid Address ID');
  }
  console.log(updatedAddress);
  const addresses = await Address.updateOne(
    { customer: customerId, _id: shippingAddressId },
    { $set: {billingAddress: updatedAddress} }
  );

  if (!addresses) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Order Not Found');
  } else if (addresses["ok"] !== 1) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Order Not Update In DB');
  }

  return true;
};

module.exports = {
  createNewAddressByUser,
  getAllUserAddress,
  updateUserAddress,
};
