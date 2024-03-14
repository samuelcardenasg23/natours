import { promisify } from 'node:util'
import crypto from 'node:crypto'
import jwt from 'jsonwebtoken'
import { User } from '../models/userModel.js'
import { catchAsync } from '../utils/catchAsync.js'
import { AppError } from '../utils/appError.js'
import { Email } from '../utils/email.js'

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN
  })

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id)

  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true
  }

  // CHECK THIS LINE LATER FOR PRODUCTION
  if (process.env.NODE_ENV === 'production ') cookieOptions.secure = true

  res.cookie('jwt', token, cookieOptions)

  // Remove password from output
  user.password = undefined

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user
    }
  })
}

export const signup = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
    passwordChangedAt: req.body.passwordChangedAt,
    role: req.body.role
  })

  const url = `${req.protocol}://${req.get('host')}/me`
  // console.log(url)
  await new Email(newUser, url).sendWelcome()

  createSendToken(newUser, 201, res)
})

export const login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body

  // 1) Check if email and password exist
  if (!email || !password) {
    return next(new AppError('Please provide email and password', 400))
  }

  // 2) Check if the user exist && password is correct
  const user = await User.findOne({ email }).select('+password')

  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('Incorrect email or password', 401))
  }

  // 3) If everything is ok, send token to the client
  createSendToken(user, 200, res)
})

export const logout = (req, res) => {
  // res.cookie('jwt', 'loggedout', {
  //   expires: new Date(Date.now() + 10 * 1000),
  //   httpOnly: true
  // })
  res.clearCookie('jwt')

  res.status(200).json({ status: 'success' })
}

export const protect = catchAsync(async (req, res, next) => {
  // 1) Getting the token and check if exists
  let token
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1]
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt
  }

  if (!token) {
    return next(
      new AppError('You are not logged in! Please log in to get access', 401)
    )
  }

  // 2) Verificate token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET)

  // 3) Check if user still exist
  const currentUser = await User.findById(decoded.id)
  if (!currentUser) {
    return next(
      new AppError(
        'The user belonging to this token does not longer exists.',
        401
      )
    )
  }

  // 4) Check if user changed password after the token was issued
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError('User recently changed password! Please log in again.', 401)
    )
  }

  // GRANT ACCESS TO PROTECTED ROUTES
  // STORING THE USER IN CURRENT
  req.user = currentUser
  res.locals.user = currentUser
  next()
})

// Only for rendered pages, no errors
export const isLoggedIn = catchAsync(async (req, res, next) => {
  if (req.cookies.jwt) {
    // Verify token
    const decoded = await promisify(jwt.verify)(
      req.cookies.jwt,
      process.env.JWT_SECRET
    )

    // 2) Check if user still exist
    const currentUser = await User.findById(decoded.id)
    if (!currentUser) {
      return next()
    }

    // 3) Check if user changed password after the token was issued
    if (currentUser.changedPasswordAfter(decoded.iat)) {
      return next()
    }

    // THERE IS A LOGGED IN USER
    // STORING THE USER IN CURRENT
    res.locals.user = currentUser
    return next()
  }
  next()
})

export const restrictTo =
  (...roles) =>
  (req, res, next) => {
    // roles is an array ['admin', 'lead-guide']. role='user'
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action', 403)
      )
    }

    next()
  }

export const forgotPassword = catchAsync(async (req, res, next) => {
  // 1) Get user based on POSTed email
  const user = await User.findOne({ email: req.body.email })
  if (!user) {
    return next(new AppError('There is no user with that email address', 404))
  }

  // 2) Generate the random reset token
  const resetToken = user.createPasswordResetToken()
  await user.save({ validateBeforeSave: false })

  // 3) Sendt it to user's email
  try {
    const resetURL = `${req.protocol}://${req.get('host')}/api/v1/users/resetPassword/${resetToken}`
    await new Email(user, resetURL).sendPasswordReset()

    res.status(200).json({
      status: 'success',
      message: 'Token sent to email'
    })
  } catch (err) {
    user.passwordResetToken = undefined
    user.passwordResetExpires = undefined

    await user.save({ validateBeforeSave: false })

    return next(
      new AppError(
        'There was an error sending the email. Try again later!',
        500
      )
    )
  }
})

export const resetPassword = catchAsync(async (req, res, next) => {
  // 1) Get user based on the token
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex')

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() }
  })

  // 2) If token has not expired and there is user, set the new password
  if (!user) {
    return next(new AppError('Token is invalid or has expired', 400))
  }
  user.password = req.body.password
  user.passwordConfirm = req.body.passwordConfirm
  user.passwordResetToken = undefined
  user.passwordResetExpires = undefined
  await user.save()

  // 3) Update changePasswordAt property for the user

  // 4) Log the user in, send JWT
  createSendToken(user, 200, res)
})

export const updatePassword = catchAsync(async (req, res, next) => {
  // 1) Get user from the collection
  const user = await User.findById(req.user.id).select('+password')

  // 2) Check if POSTed password is correct
  if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
    return next(new AppError('Your current password is wrong', 401))
  }

  // 3) if so, update password
  user.password = req.body.password
  user.passwordConfirm = req.body.passwordConfirm
  await user.save()

  // 4) Log user in, send the JWT
  createSendToken(user, 200, res)
})
