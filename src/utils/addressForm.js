export const emptyAddressForm = {
  fullName: "",
  phoneNumber: "",
  email: "",
  pincode: "",
  addressLine1: "",
  addressLine2: "",
  landmark: "",
  city: "",
  district: "",
  state: "",
  addressType: "home",
  isDefault: false,
};

export const createPrefilledAddressForm = (user) => ({
  ...emptyAddressForm,
  email: user?.email || "",
  phoneNumber: user?.mobile || "",
});
