const verifyDevice = (req, res, next) => {
  const deviceSecret = req.headers['x-device-secret'];

  if (!deviceSecret || deviceSecret !== process.env.DEVICE_SECRET) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized: Invalid or missing device secret'
    });
  }

  next();
};

verifyDevice.verifyDevice = verifyDevice;

module.exports = verifyDevice;

