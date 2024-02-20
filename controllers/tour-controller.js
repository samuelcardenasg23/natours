import { Tour } from '../models/tourModel.js'
import { APIFeatures } from '../utils/apiFeatures.js'
import { AppError } from '../utils/appError.js'
import { catchAsync } from '../utils/catchAsync.js'
import { createOne, deleteOne, updateOne } from './handlerFactory.js'

const aliasTopTours = (req, res, next) => {
  req.query.limit = '5'
  req.query.sort = '-ratingsAverage,price'
  req.query.fields = 'name,price,ratingsAverage,summary,difficulty'
  next()
}

const getAllTours = catchAsync(async (req, res, next) => {
  // EXECUTE QUERY
  const features = new APIFeatures(Tour.find(), req.query)
    .filter()
    .sort()
    .limitFields()
    .paginate()
  const tours = await features.query

  // SEND RESPONSE
  res.json({
    status: 'success',
    results: tours.length,
    data: {
      tours
    }
  })
})

const getTour = catchAsync(async (req, res, next) => {
  const tour = await Tour.findById(req.params.id).populate('reviews')

  if (!tour) {
    return next(new AppError('No tour found with that ID', 404))
  }

  res.json({
    status: 'success',
    data: {
      tour
    }
  })
})

const createTour = createOne(Tour)

const updateTour = updateOne(Tour)

const deleteTour = deleteOne(Tour)

// export const deleteTour = catchAsync(async (req, res, next) => {
//   const tour = await Tour.findByIdAndDelete(req.params.id)

//   if (!tour) {
//     return next(new AppError('No tour found with that ID', 404))
//   }

//   res.status(204).json({
//     status: 'success',
//     data: null
//   })
// })

const getTourStats = catchAsync(async (req, res, next) => {
  const stats = await Tour.aggregate([
    {
      $match: { ratingsAverage: { $gte: 4.5 } }
    },
    {
      $group: {
        _id: { $toUpper: '$difficulty' },
        numTours: { $sum: 1 },
        numRatings: { $sum: '$ratingsQuantity' },
        avgRating: { $avg: '$ratingsAverage' },
        avgPrice: { $avg: '$price' },
        minPrice: { $min: '$price' },
        maxPrice: { $max: '$price' }
      }
    },
    {
      $sort: { avgPrice: 1 }
    }
  ])

  res.status(200).json({
    status: 'success',
    data: {
      stats
    }
  })
})

const getMonthlyPlan = catchAsync(async (req, res, next) => {
  const year = Number(req.params.year)

  const plan = await Tour.aggregate([
    {
      $unwind: '$startDates'
    },
    {
      $match: {
        startDates: {
          $gte: new Date(`${year}-01-01`),
          $lte: new Date(`${year}-12-31`)
        }
      }
    },
    {
      $group: {
        _id: { $month: '$startDates' },
        numToursStarts: { $sum: 1 },
        tours: { $push: '$name' }
      }
    },
    {
      $addFields: { month: '$_id' }
    },
    {
      $project: {
        _id: 0
      }
    },
    {
      $sort: { numToursStarts: -1 }
    },
    {
      $limit: 12
    }
  ])

  res.status(200).json({
    status: 'success',
    results: plan.length,
    data: {
      plan
    }
  })
})

export {
  aliasTopTours,
  getAllTours,
  getTour,
  createTour,
  updateTour,
  deleteTour,
  getTourStats,
  getMonthlyPlan
}
