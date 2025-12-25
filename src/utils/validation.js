const validateIranianNationalId = (nationalId) => {
  if (!nationalId || nationalId.length !== 10) {
    return false;
  }

  // Check if all digits are the same
  if (/^(\d)\1{9}$/.test(nationalId)) {
    return false;
  }

  // Calculate check digit
  let sum = 0;
  // eslint-disable-next-line no-plusplus
  for (let i = 0; i < 9; i++) {
    sum += parseInt(nationalId[i], 10) * (10 - i);
  }

  const remainder = sum % 11;
  const checkDigit = remainder < 2 ? remainder : 11 - remainder;

  return parseInt(nationalId[9], 10) === checkDigit;
};

module.exports = {
  validateIranianNationalId,
};
