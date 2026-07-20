import { Address } from "../models/Address.js";

export const listAddresses = async (customerId) =>
  Address.find({ customerId }).sort({ isDefault: -1, createdAt: -1 });

export const getAddress = async (customerId, addressId) => Address.findOne({ _id: addressId, customerId });

const unsetOtherDefaults = async (customerId, exceptAddressId) => {
  await Address.updateMany(
    { customerId, isDefault: true, _id: { $ne: exceptAddressId } },
    { $set: { isDefault: false } },
  );
};

export const createAddress = async (customerId, data) => {
  const isFirstAddress = (await Address.countDocuments({ customerId })) === 0;
  const isDefault = Boolean(data.isDefault) || isFirstAddress;

  const address = await Address.create({ ...data, customerId, isDefault });

  if (isDefault) {
    await unsetOtherDefaults(customerId, address.id);
  }

  return address;
};

export const updateAddress = async (customerId, addressId, data) => {
  const address = await Address.findOneAndUpdate({ _id: addressId, customerId }, { $set: data }, { new: true });

  if (!address) return null;

  if (data.isDefault) {
    await unsetOtherDefaults(customerId, address.id);
  }

  return address;
};

export const deleteAddress = async (customerId, addressId) => {
  const address = await Address.findOneAndDelete({ _id: addressId, customerId });
  if (!address) return null;

  if (address.isDefault) {
    const nextDefault = await Address.findOne({ customerId }).sort({ createdAt: -1 });
    if (nextDefault) {
      nextDefault.isDefault = true;
      await nextDefault.save();
    }
  }

  return address;
};

export const setDefaultAddress = async (customerId, addressId) => {
  const address = await Address.findOne({ _id: addressId, customerId });
  if (!address) return null;

  address.isDefault = true;
  await address.save();
  await unsetOtherDefaults(customerId, address.id);

  return address;
};
