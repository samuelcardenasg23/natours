import { Tour } from '../models/tourModel.js'
import { catchAsync } from '../utils/catchAsync.js'
import { AppError } from '../utils/appError.js'

const getOverview = catchAsync(async (req, res, next) => {
  // 1) Get tour data from our collection
  const tours = await Tour.find()

  // 2) Build template

  // 3) Render that template using tour data from step 1)

  res.status(200).render('overview', {
    title: 'All tours',
    tours
  })
})

const getTour = catchAsync(async (req, res, next) => {
  // 1) Get the data for the requested tour (including reviews and guides)
  const tour = await Tour.findOne({ slug: req.params.slug }).populate({
    path: 'reviews',
    fields: 'review rating user'
  })

  if (!tour) {
    return next(new AppError('There is no tour with that name.', 404))
  }

  res.status(200).render('tour', {
    title: `${tour.name} Tour`,
    tour
  })
})

const getLoginForm = (req, res) => {
  res.status(200).render('login', {
    title: 'Log in'
  })
}

export { getOverview, getTour, getLoginForm }
