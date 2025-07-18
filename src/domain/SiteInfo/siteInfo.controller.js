/* eslint-disable import/no-extraneous-dependencies */
// controllers/locationController.js
const httpStatus = require('http-status');
const iranCity = require('iran-city');
const catchAsync = require('../../utils/catchAsync');
const ApiError = require('../../utils/ApiError');

/**
 * @desc    Get all provinces with their cities
 * @route   GET /api/locations/provinces
 * @access  Public
 */
// export async function getProvincesWithCities(req, res) {
//   try {
//     const iranInfo = new IranInfo();

//     // Get all provinces
//     const provinces = iranInfo.getAllProvinces();

//     // Get cities for each province
//     const result = provinces.map((province) => {
//       const cities = iranInfo.getCitiesOfProvince(province.id);
//       return {
//         id: province.id,
//         name: province.name,
//         cities: cities.map((city) => ({
//           id: city.id,
//           name: city.name,
//           latitude: city.latitude,
//           longitude: city.longitude,
//         })),
//       };
//     });

//     res.json({
//       success: true,
//       count: result.length,
//       data: result,
//     });
//   } catch (error) {
//     console.error('Error getting provinces:', error);
//     res.status(500).json({
//       success: false,
//       error: 'Server Error',
//     });
//   }
// }

/**
 * @desc    Get all cities
 * @route   GET /api/locations/cities
 * @access  Public
 */

const getAllCities = catchAsync(async (req, res) => {
  const AllCities = iranCity.allCities();

  res.json({
    success: true,
    count: AllCities.length,
    AllCities,
    // data: cities.map((city) => ({
    //   id: city.id,
    //   name: city.name,
    //   provinceId: city.province_id,
    //   latitude: city.latitude,
    //   longitude: city.longitude,
    // })),
  });
});

/**
 * @desc    Get cities of a specific province
 * @route   GET /api/locations/provinces/:provinceId/cities
 * @access  Public
 */
const getCitiesByProvince = catchAsync(async (req, res) => {
  const { provinceId } = req.params;

  if (!provinceId) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid provinceId');
  }

  const AllProvinces = iranCity.allProvinces();

  const curentProvinces = AllProvinces.filter((p) => p.id === parseInt(provinceId, 10));

  const CitiesOfProvince = iranCity.citiesOfProvince(parseInt(provinceId, 10));

  res.status(httpStatus.OK).send({
    province: curentProvinces[0],
    cities: CitiesOfProvince,
  });
});

const getProvince = catchAsync(async (req, res) => {
  const AllProvinces = iranCity.allProvinces();

  res.status(httpStatus.OK).send(AllProvinces);
});

// export async function getCitiesByProvince(req, res) {
//   try {
//     const iranInfo = new IranInfo();
//     const provinceId = parseInt(req.params.provinceId);

//     // Validate province ID
//     const province = iranInfo.getProvince(provinceId);
//     if (!province) {
//       return res.status(404).json({
//         success: false,
//         error: 'Province not found',
//       });
//     }

//     const cities = iranInfo.getCitiesOfProvince(provinceId);

//     res.json({
//       success: true,
//       province: {
//         id: province.id,
//         name: province.name,
//       },
//       count: cities.length,
//       data: cities.map((city) => ({
//         id: city.id,
//         name: city.name,
//         latitude: city.latitude,
//         longitude: city.longitude,
//       })),
//     });
//   } catch (error) {
//     console.error('Error getting province cities:', error);
//     res.status(500).json({
//       success: false,
//       error: 'Server Error',
//     });
//   }
// }

module.exports = {
  getAllCities,
  getCitiesByProvince,
  getProvince,
};
