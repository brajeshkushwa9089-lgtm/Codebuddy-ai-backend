import { successResponse } from '../utils/response.js';

export const authController = {
  async getMe(req, res) {
    return successResponse(res, {
      user: req.user,
    });
  },
};

