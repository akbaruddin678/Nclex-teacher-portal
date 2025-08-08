const jwt = require("jsonwebtoken");
const config = require("../config/config");

exports.generateToken = (id) => {
  return jwt.sign({ id }, config.jwtSecret, {
    expiresIn: config.jwtExpire,
  });
};
