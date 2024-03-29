/* eslint-disable */

import axios from 'axios'
import { showAlert } from './alerts.js'

export const login = async (email, password) => {
  try {
    const res = await axios({
      method: 'POST',
      url: '/api/v1/users/login',
      data: {
        email,
        password
      }
    })

    if (res.data.status === 'success') {
      showAlert('success', 'Logged in succesfully')
      window.setTimeout(() => {
        location.assign('/')
      }, 1000)
    }
  } catch (err) {
    showAlert('error', err.response.data.message)
  }
}

export const logout = async () => {
  try {
    const res = await axios({
      method: 'GET',
      url: '/api/v1/users/logout'
    })

    if (res.data.status === 'success') {
      showAlert('success', 'Logged out succesfully')
      window.setTimeout(() => {
        location.reload(true)
      }, 500)
    }
  } catch (err) {
    console.log(err.response)
    showAlert('error', 'Error loggin out! Try again.')
  }
}
