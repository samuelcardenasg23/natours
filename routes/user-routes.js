import { Router } from 'express'
import {
  getAllUsers,
  createUser,
  getUser,
  updateUser,
  deleteUser,
  updateMe,
  deleteMe,
  getMe
} from '../controllers/user-controller.js'
import {
  login,
  signup,
  forgotPassword,
  resetPassword,
  protect,
  updatePassword
} from '../controllers/authController.js'

export const userRouter = Router()

userRouter.post('/signup', signup)
userRouter.post('/login', login)

userRouter.post('/forgotPassword', forgotPassword)
userRouter.patch('/resetPassword/:token', resetPassword)

userRouter.patch('/updateMyPassword', protect, updatePassword)

userRouter.get('/me', protect, getMe, getUser)
userRouter.patch('/updateMe', protect, updateMe)
userRouter.delete('/deleteMe', protect, deleteMe)

userRouter.route('/').get(getAllUsers).post(createUser)

userRouter.route('/:id').get(getUser).patch(updateUser).delete(deleteUser)
